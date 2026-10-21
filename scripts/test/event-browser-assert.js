/** Read-only assertions for the current CLI-driven synthetic scenario. */
async (page) => {
    const id = Number(new URL(page.url()).searchParams.get('eventId'));
    const state = await page.evaluate(async eventId => {
        const event = await fetch(`/__scenario_api/events/${eventId}`).then(response => response.json());
        const diagnostics = await fetch('/__scenario_diagnostics').then(response => response.json());
        return { event: event.data, diagnostics };
    }, id);
    const text = await page.locator('body').innerText();
    const checks = [];
    const check = (condition, message) => {
        if (!condition) throw new Error(`Scenario ${id}: ${message}`);
        checks.push(message);
    };
    const { event, diagnostics } = state;
    const privateRequests = diagnostics.requests.filter(request =>
        request.path.startsWith(`/events/${id}/`) && /payment-info|chat-access/.test(request.path));
    check(diagnostics.unknown.length === 0, 'no unhandled synthetic API routes');
    check(await page.getByRole('navigation', { name: '하단 메뉴' }).count() === 0,
        'mobile detail page has no overlapping bottom navigation');
    if (id === 9101 && event.currentUserStatus === 'JOINED') {
        check(text.includes('이 이벤트에 참여하고 있습니다.'), 'confirmed participation is displayed');
        check(text.includes('NOT-A-REAL-ACCOUNT'), 'joined participant sees synthetic payment information');
        check(await page.getByRole('link', { name: '외부 채팅방 열기' }).count() === 1, 'joined participant sees chat access');
        check(!text.includes('입금 확인 대기'), 'page does not invent an unpaid status absent from the API');
        check(diagnostics.requests.filter(request => request.method === 'POST'
            && request.path === '/events/9101/consents/responses').length === 1,
        'invalid local inputs did not generate final-submission requests');
        check(diagnostics.dialogs.some(dialog => dialog.message.includes('필수 동의 항목'))
            && diagnostics.dialogs.some(dialog => dialog.message.includes('올바른 전화번호')),
        'required-consent and invalid-phone cases were exercised');
    } else if (id === 9101 && event.currentUserStatus === 'CANCELLED') {
        check(!text.includes('NOT-A-REAL-ACCOUNT'), 'cancelled participant no longer sees bank information');
        check(await page.getByRole('link', { name: '외부 채팅방 열기' }).count() === 0, 'cancelled participant no longer sees chat access');
        check(await page.getByRole('button', { name: '참여 신청하기', exact: true }).isEnabled(), 'reapplication is available');
    } else if (id === 9102) {
        check(event.currentUserStatus === 'PENDING', 'server outcome remains pending approval');
        check(text.includes('승인 대기 중입니다.'), 'pending approval is displayed');
        check(diagnostics.dialogs.some(dialog => dialog.message === '응답 시트가 제출되었습니다. 호스트 승인 후 참가가 확정됩니다.'),
            'success dialog does not falsely confirm participation');
        check(privateRequests.length === 0 && !text.includes('NOT-A-REAL-ACCOUNT'), 'pending approval never requests bank/chat access');
    } else if (id === 9103) {
        check(event.currentUserStatus === 'CANCELLED', 'expired application is cancelled on the synthetic server');
        check(!text.includes('참가자 응답 시트') && !text.includes('자리가 임시 확보되었습니다'),
            'expired form and held-seat claim are removed');
        check(await page.getByRole('button', { name: '참여 신청하기', exact: true }).isEnabled(), 'reapplication is available after expiry');
    } else if (id === 9104) {
        const now = await page.evaluate(() => Date.now());
        if (now < Date.parse(`${event.applicationStartsAt}+09:00`)) {
            check(await page.getByRole('button', { name: /09:05 신청 시작/ }).isDisabled(), 'signup is disabled before the Korean opening instant');
        } else {
            check(await page.getByRole('button', { name: '참여 신청하기', exact: true }).isEnabled(), 'signup enables at the Korean opening instant');
        }
        check(text.includes('10월 16일 (금) 18:00'), 'event display time stays Korean in this device timezone');
    } else if (id === 9105) {
        check(await page.getByRole('button', { name: '정원이 모두 찼습니다' }).isDisabled(), 'full-event signup is disabled');
    } else if (id === 9106) {
        check(await page.getByRole('button', { name: '마감된 모임' }).isDisabled(), 'closed-event signup is disabled');
    } else if (id === 9107) {
        check(event.currentUserStatus === 'CONSENT_PENDING', 'ordinary validation failure leaves consent pending');
        check(await page.getByRole('textbox', { name: 'Scenario phone 응답' }).inputValue() === '010-0000-0000',
            'ordinary validation failure preserves typed phone response');
        check(await page.getByRole('checkbox').isChecked(), 'ordinary validation failure preserves checked consent');
        check(diagnostics.dialogs.at(-1)?.message.includes('Synthetic validation failure'), 'server validation error is shown');
    } else {
        throw new Error(`Scenario ${id} has not reached an asserted outcome`);
    }
    return { scenario: id, timezone: await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone),
        result: 'PASS', checks, boundary: 'local rendered UI with synthetic HTTP; not live backend acceptance' };
}
