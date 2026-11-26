export async function runEventGuestVerificationSmoke(browser, origin) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    try {
        const page = await context.newPage();
        const token = 'G'.repeat(43);
        const writes = [];
        await page.route('**/*', async route => {
            const request = route.request();
            const url = new URL(request.url());
            if (url.origin !== origin) return route.abort('blockedbyclient');
            if (!url.pathname.startsWith('/__scenario_api')) return route.continue();
            if (!url.pathname.startsWith('/__scenario_api/public/event-guest-verification/')) {
                throw new Error(`Unexpected signed-out request: ${url.pathname}`);
            }
            const headers = await request.allHeaders();
            if (headers.authorization || url.search || url.hash) throw new Error('Signed-out OTP leaked an auth header or link token into the request URL');
            const body = request.postDataJSON();
            if (request.method() !== 'POST' || body.linkToken !== token) throw new Error('Incorrect guest route request');
            writes.push({ route: url.pathname.split('/').at(-1), body });
            const respond = (data, status = 200) => route.fulfill({
                status, contentType: 'application/json', body: JSON.stringify({ code: status, message: 'Synthetic', data }),
            });
            if (url.pathname.endsWith('/preview')) return respond({
                title: '비회원 인증 시나리오', startsAt: '2027-02-20T14:00:00',
                applicationStartsAt: null, locationName: '테스트 장소', registration: 'OPEN',
            });
            if (url.pathname.endsWith('/confirm')) {
                if (body.challengeId !== 'fixture-challenge' || body.code !== '012345') return respond(null, 400);
                return respond({ proofToken: 'fixture-proof', expiresAt: '2026-10-15T09:15:00' });
            }
            return respond({ challengeId: 'fixture-challenge', expiresInSeconds: 300, retryAfterSeconds: 60 });
        });
        await page.goto(`${origin}/?view=event_guest_verification#eventGuest=${token}`);
        await page.getByRole('heading', { name: '비회원 인증 시나리오' }).waitFor();
        await page.getByLabel('휴대전화 번호', { exact: true }).fill('010-0000-0000');
        await page.getByRole('button', { name: '인증번호 받기', exact: true }).click();
        await page.getByLabel('인증번호 6자리', { exact: true }).fill('000000');
        await page.getByRole('button', { name: '인증번호 확인', exact: true }).click();
        await page.getByRole('alert').filter({ hasText: /인증번호를 확인해 주세요/ }).waitFor();
        await page.getByLabel('인증번호 6자리', { exact: true }).fill('012345');
        await page.getByRole('button', { name: '인증번호 확인', exact: true }).click();
        await page.getByRole('heading', { name: '휴대전화 인증이 완료됐어요' }).waitFor();
        await page.getByText(/참가 신청은 아직 접수되지 않았어요/).waitFor();
        const mutations = writes.filter(entry => entry.route !== 'preview');
        if (!writes.some(entry => entry.route === 'preview')
            || mutations.map(entry => entry.route).join(',') !== 'phone,confirm,confirm'
            || mutations[0].body.phoneNumber !== '010-0000-0000') throw new Error('Unexpected guest verification write sequence');
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) {
            throw new Error('Guest verification screen overflowed on mobile');
        }
        return 'signed-out-event-guest-phone-verification';
    } finally {
        await context.close();
    }
}
