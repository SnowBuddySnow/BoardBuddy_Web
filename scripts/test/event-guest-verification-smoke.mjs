export async function runEventGuestVerificationSmoke(browser, origin) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    try {
        const page = await context.newPage();
        const token = 'G'.repeat(43);
        const receiptCode = 'EG-01234567';
        const phone = '010-0000-0000';
        const writes = [];
        let application = null;
        await page.route('**/*', async route => {
            const request = route.request();
            const url = new URL(request.url());
            if (url.origin !== origin) return route.abort('blockedbyclient');
            if (!url.pathname.startsWith('/__scenario_api')) return route.continue();
            if (!url.pathname.startsWith('/__scenario_api/public/event-guest-')) {
                throw new Error(`Unexpected signed-out request: ${url.pathname}`);
            }
            const headers = await request.allHeaders();
            if (headers.authorization || url.search || url.hash || request.method() !== 'POST') {
                throw new Error('Signed-out guest request has an unexpected credential or method');
            }
            const body = request.postDataJSON();
            if ((body.linkToken === token) === (body.receiptCode === receiptCode)) throw new Error('Guest scope must be unambiguous');
            writes.push({ url: url.pathname, body });
            const respond = (data, status = 200) => route.fulfill({
                status, contentType: 'application/json', body: JSON.stringify({ code: status, message: 'Synthetic', data }),
            });
            if (url.pathname.endsWith('/preview')) return respond({
                title: '비회원 신청 시나리오', startsAt: '2027-02-20T14:00:00',
                applicationStartsAt: null, locationName: '테스트 장소', registration: 'OPEN', optionalQuestion: '선호 게임',
            });
            if (url.pathname.endsWith('/phone')) {
                if (body.phoneNumber !== phone) return respond(null, 400);
                return respond({ challengeId: 'fixture-challenge', expiresInSeconds: 300, retryAfterSeconds: 60 });
            }
            if (url.pathname.endsWith('/confirm')) {
                if (body.challengeId !== 'fixture-challenge' || body.code !== '012345') return respond(null, 400);
                return respond({ proofToken: 'test-otp-proof', expiresAt: '2026-10-15T09:15:00' });
            }
            if (body.proofToken !== 'test-otp-proof') return respond(null, 403);
            if (url.pathname.endsWith('/event-guest-applications')) {
                if (body.phoneNumber !== phone || body.school !== '푸른대학교' || body.crew !== '외부 크루'
                    || body.name !== '이토큰' || body.answer !== '협력 게임' || body.privacyVersion !== 1) {
                    return respond(null, 400);
                }
                application = {
                    receiptCode, eventTitle: '비회원 신청 시나리오', startsAt: '2027-02-20T14:00:00',
                    name: body.name, school: body.school, crew: body.crew, maskedPhone: '010-****-0000',
                    question: '선호 게임', answer: body.answer, status: 'JOINED', appliedAt: '2027-01-15T14:00:00',
                    canCancel: true, canApprove: false, eventCancelled: false,
                };
                return respond(application);
            }
            if (url.pathname.endsWith('/lookup')) return respond(application);
            if (url.pathname.endsWith('/cancel') && application) {
                application = { ...application, status: 'CANCELLED', canCancel: false };
                return respond(application);
            }
            throw new Error(`Unknown guest endpoint: ${url.pathname}`);
        });
        page.on('dialog', async dialog => { await dialog.accept(); });
        const requestCode = async () => {
            await page.getByLabel('휴대전화 번호', { exact: true }).fill(phone);
            await page.getByRole('button', { name: '인증번호 받기', exact: true }).click();
        };
        const verify = async code => {
            await page.getByLabel('인증번호 6자리', { exact: true }).fill(code);
            await page.getByRole('button', { name: '인증번호 확인', exact: true }).click();
        };
        await page.goto(`${origin}/?view=event_guest_verification#eventGuest=${token}`);
        await page.getByRole('heading', { name: '비회원 신청 시나리오' }).waitFor();
        await requestCode();
        await verify('000000');
        await page.getByRole('alert').filter({ hasText: /인증번호를 확인해 주세요/ }).waitFor();
        await verify('012345');
        await page.getByLabel('소속 학교', { exact: true }).fill('푸른대학교');
        await page.getByLabel('소속 크루', { exact: true }).fill('외부 크루');
        await page.getByLabel('이름', { exact: true }).fill('이토큰');
        await page.getByLabel('선호 게임 (선택)', { exact: true }).fill('협력 게임');
        await page.getByRole('checkbox', { name: /개인정보 수집·이용/ }).check();
        await page.getByRole('button', { name: '참가 신청하기', exact: true }).click();
        const receipt = page.getByRole('region', { name: '비회원 신청 내역' });
        await receipt.getByText(receiptCode, { exact: true }).waitFor();
        const lookupLink = await receipt.getByLabel('신청 조회 링크').inputValue();
        await page.goto(lookupLink);
        await page.getByRole('heading', { name: '비회원 신청 조회' }).waitFor();
        await requestCode();
        await verify('012345');
        await receipt.getByText('협력 게임', { exact: true }).waitFor();
        await receipt.getByRole('button', { name: '신청 취소', exact: true }).click();
        await receipt.getByRole('heading', { name: '참가 취소', exact: true }).waitFor();
        const writesAfterPreview = writes.filter(entry => !entry.url.endsWith('/preview')).map(entry => entry.url.split('/').at(-1));
        if (writesAfterPreview.join(',') !== 'phone,confirm,confirm,event-guest-applications,phone,confirm,lookup,cancel') {
            throw new Error('Unexpected guest application write sequence');
        }
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) {
            throw new Error('Guest application screen overflowed on mobile');
        }
        return 'signed-out-guest-apply-reverify-lookup-cancel';
    } finally {
        await context.close();
    }
}
