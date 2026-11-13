/** Run after event-browser-fixture.js in a fresh local CLI browser; all credentials/data are synthetic. */
async (page) => {
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    const origin = 'http://127.0.0.1:5187';
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    const open = async id => {
        await page.goto(`${origin}/?view=event_detail&eventId=${id}`);
        await page.getByRole('heading', { name: `LOCAL SCENARIO ${id}`, exact: true }).waitFor();
    };
    const begin = async () => {
        await page.getByRole('button', { name: '참여 신청하기', exact: true }).click();
        await page.getByRole('button', { name: '이번만 동의하고 진행', exact: true }).click();
        await page.getByRole('heading', { name: '참가자 응답 시트', exact: true }).waitFor();
    };
    const answer = async () => {
        await page.getByRole('checkbox', { name: '내용을 확인했으며 동의합니다.' }).check();
        await page.getByRole('textbox', { name: 'Scenario phone 응답' }).fill('010-0000-0000');
    };
    const submit = () => page.getByRole('button', { name: /전체 응답 제출/ }).click();
    const completed = [];

    await open(9101); await begin();
    await submit(); // Blank consent must not generate a final POST.
    await page.getByRole('checkbox').check();
    await page.getByRole('textbox', { name: 'Scenario phone 응답' }).fill('invalid-phone');
    await submit();
    await answer(); await submit();
    await page.getByText('이 이벤트에 참여하고 있습니다.', { exact: false }).waitFor();
    await page.getByText('NOT-A-REAL-ACCOUNT', { exact: false }).waitFor();
    await page.getByRole('link', { name: '외부 채팅방 열기' }).waitFor();
    check((await page.locator('body').innerText()).includes('NOT-A-REAL-ACCOUNT'), 'Joined participant must see synthetic payment info');
    check(await page.getByRole('link', { name: '외부 채팅방 열기' }).count() === 1, 'Joined participant must see chat access');
    completed.push('joined-with-required-validation');
    await page.getByRole('button', { name: '이벤트에서 나가기', exact: true }).click();
    await page.getByRole('button', { name: '참여 신청하기', exact: true }).waitFor();
    check(!(await page.locator('body').innerText()).includes('NOT-A-REAL-ACCOUNT'), 'Cancellation must hide bank info');
    completed.push('cancelled-private-details-hidden');

    await open(9102); await begin(); await answer(); await submit();
    try { await page.getByText('승인 대기 중입니다.', { exact: false }).waitFor(); } catch (error) { await page.screenshot({ path: 'output/playwright/event-pending-failure.png', fullPage: true }); console.log((await page.locator('body').innerText()).slice(-2500)); throw error; }
    check(await page.getByRole('link', { name: '외부 채팅방 열기' }).count() === 0, 'Pending approval must not expose chat');
    completed.push('approval-pending');

    await open(9103); await begin(); await answer(); await submit();
    await page.getByRole('button', { name: '참여 신청하기', exact: true }).waitFor();
    check(await page.getByRole('heading', { name: '참가자 응답 시트', exact: true }).count() === 0, 'Expiry must remove the response sheet');
    completed.push('consent-expired');

    await page.clock.setSystemTime(new Date('2026-10-15T00:00:00Z'));
    await open(9104);
    check(await page.getByRole('button', { name: /09:05 신청 시작/ }).isDisabled(), 'Opening must stay closed before Korean opening time');
    await page.clock.fastForward(301000);
    check(await page.getByRole('button', { name: '참여 신청하기', exact: true }).isEnabled(), 'Opening must enable without reload');
    completed.push('korean-opening-time');

    await open(9105);
    check(await page.getByRole('button', { name: '정원이 모두 찼습니다' }).isDisabled(), 'Full event must stay disabled');
    await open(9106);
    check(await page.getByRole('button', { name: '마감된 모임' }).isDisabled(), 'Closed event must stay disabled');
    completed.push('capacity-and-closed-guards');

    await page.clock.setSystemTime(new Date('2026-10-15T00:00:00Z'));
    await open(9107); await begin(); await answer(); await submit();
    check(await page.getByRole('textbox', { name: 'Scenario phone 응답' }).inputValue() === '010-0000-0000', 'Validation failure must keep input');
    check(await page.getByRole('checkbox').isChecked(), 'Validation failure must keep consent');
    const diagnostics = await page.evaluate(() => fetch('/__scenario_diagnostics').then(r => r.json()));
    check(diagnostics.unknown.length === 0, 'No unhandled synthetic routes are allowed');
    check(diagnostics.requests.filter(r => r.method === 'POST' && r.path === '/events/9101/consents/responses').length === 1,
        'Invalid answers must never reach final submission');
    check(!diagnostics.requests.some(r => /events\/9102\/(payment-info|chat-access)/.test(r.path)), 'Pending participants must not fetch private details');
    check(failures.length === 0, `Page errors: ${failures.join(', ')}`);
    completed.push('failed-submit-keeps-input');
    return { result: 'PASS', completed, boundary: 'real browser with synthetic HTTP; not staging acceptance' };
}
