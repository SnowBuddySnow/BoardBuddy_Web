import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { installOnboardingBoundary } from './onboarding-browser-boundary.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const origin = 'http://127.0.0.1:5188';
let server; let browser;
const completed = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
try {
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5188', '--strictPort'], {
        cwd: root, stdio: 'ignore', env: { ...process.env, VITE_API_BASE_URL: `${origin}/__scenario_api`, VITE_OPERATING_MODE_OVERRIDE: 'OFF_SEASON', VITE_KAKAO_JAVASCRIPT_KEY: '' },
    });
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
        if (server.exitCode != null) throw new Error('Isolated Vite server exited; port 5188 must be free.');
        try { if ((await fetch(origin)).ok) { ready = true; break; } } catch { /* server startup */ }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error('Onboarding scenario server did not become ready.');
    browser = await chromium.launch({ headless: true, ...(process.env.CI ? {} : { channel: 'chrome' }) });
    mkdirSync(`${root}/output/playwright`, { recursive: true });
    for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
        const context = await browser.newContext({ viewport, hasTouch: viewport.width < 1024, isMobile: viewport.width < 1024, serviceWorkers: 'block' });
        await context.addInitScript(() => { localStorage.setItem('tempAccessToken', 'synthetic-only'); localStorage.setItem('accountId', '99101'); });
        const page = await context.newPage();
        const boundary = await installOnboardingBoundary(page);
        const { unknown, errors } = boundary;
        if (viewport.width === 390) {
            await page.goto(`${origin}/?view=crew_invite&eventId=9101#crewInvite=${boundary.token}`);
            await page.getByRole('heading', { name: '함께할 크루가 기다리고 있어요.' }).waitFor();
            assert(!(await page.url()).includes(boundary.token), 'Invitation proof remained in the address');
            await page.reload();
            await page.screenshot({ path: `${root}/output/playwright/member-invitation-preview.png` });
            await page.getByRole('button', { name: '회원가입 이어서 하기', exact: true }).click();
        } else await page.goto(`${origin}/?view=user_info`);
        await page.getByRole('textbox', { name: '실명 *', exact: true }).fill('가상 회원');
        const school = page.getByRole('combobox', { name: '학교 *', exact: true });
        await school.fill('제2캠퍼스'); await school.press('ArrowDown'); await school.press('Enter');
        assert(await school.inputValue() === '한국대학교', 'Keyboard school selection failed');
        if (viewport.width === 390) {
            await school.fill('제2캠퍼스'); await page.getByRole('option').tap();
            assert(await school.inputValue() === '한국대학교', 'Touch school selection failed');
        }
        await page.getByRole('textbox', { name: /^학번/ }).fill('20260001');
        await page.getByRole('radio', { name: '여자', exact: true }).check();
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Signup overflows at ${viewport.width}`);
        if ([390, 1440].includes(viewport.width)) await page.screenshot({ path: `${root}/output/playwright/signup-${viewport.width}.png` });
        await page.getByRole('button', { name: '다음', exact: true }).click();
        await page.getByRole('textbox', { name: '휴대전화번호 *', exact: true }).fill('01000000000');
        await page.getByRole('button', { name: '인증번호 받기', exact: true }).click();
        await page.getByRole('textbox', { name: '인증번호 *', exact: true }).fill('123456');
        await page.getByRole('button', { name: '인증번호 확인', exact: true }).click();
        await page.getByText('본인 확인 완료', { exact: true }).waitFor();
        await page.getByRole('button', { name: '다음', exact: true }).click();
        const finish = page.getByRole('button', { name: '필수 약관 전체 동의 후 가입 완료', exact: true });
        assert(!await finish.isEnabled(), 'Consent was preselected');
        const read = page.getByRole('button', { name: '보드버디 서비스 이용약관 자세히 보기', exact: true });
        if (viewport.width === 390) await page.setViewportSize({ width: 390, height: 480 });
        await read.click();
        const dialog = page.getByRole('dialog');
        await dialog.waitFor();
        const box = await dialog.boundingBox();
        assert(box && box.x >= 0 && box.y >= 0 && box.width <= viewport.width && box.height <= (page.viewportSize()?.height || viewport.height), 'Terms dialog clips viewport');
        if (viewport.width === 390) { const action = await dialog.getByRole('button', { name: '이 약관에 동의', exact: true }).boundingBox(); assert(action && action.y >= 0 && action.y + action.height <= 480, 'Terms action is unreachable in a compact mobile viewport'); }
        const content = dialog.getByRole('region', { name: '약관 본문' });
        await content.focus(); await content.press('End');
        if ([390, 1440].includes(viewport.width)) await page.screenshot({ path: `${root}/output/playwright/signup-terms-${viewport.width}.png` });
        await dialog.getByRole('button', { name: '닫기', exact: true }).click();
        assert(!await page.getByRole('checkbox', { name: /보드버디 서비스 이용약관/ }).isChecked(), 'Reading changed consent');
        assert(await read.evaluate(el => el === document.activeElement), 'Terms focus was not restored');
        if (viewport.width === 390) {
            await page.setViewportSize(viewport);
            const agreement = page.getByRole('checkbox', { name: /보드버디 서비스 이용약관/ });
            await agreement.tap(); assert(await agreement.isChecked(), 'Touch consent did not toggle');
            await agreement.tap(); assert(!await agreement.isChecked(), 'Touch consent could not be withdrawn');
        }
        await read.click(); await dialog.getByRole('button', { name: '이 약관에 동의', exact: true }).click();
        assert(!await finish.isEnabled(), 'One required agreement enabled signup');
        await page.getByRole('checkbox', { name: '필수 약관 모두 동의', exact: true }).check();
        assert(await page.getByRole('radio', { name: '제공할 때마다 확인', exact: true }).isChecked(), 'Required consent changed optional sharing');
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Terms overflows at ${viewport.width}`);
        await finish.click();
        await page.waitForFunction(() => localStorage.getItem('accessToken') === 'synthetic-active');
        assert(boundary.profileBody?.schoolId === 2, 'Duplicate school name lost the selected ID');
        if (viewport.width === 390) {
            await page.getByRole('button', { name: '이 크루에 가입 신청', exact: true }).click();
            await page.getByRole('heading', { name: '가입 신청을 보냈어요.' }).waitFor();
            assert(!boundary.traffic.some(item => /payment-info|chat-access|\/members$/.test(item.path)), 'Pending invitation attempted private data');
            await page.screenshot({ path: `${root}/output/playwright/member-approval-pending.png` });
            boundary.approved = true;
            await page.getByRole('button', { name: '승인 상태 새로고침', exact: true }).click();
            await page.getByRole('button', { name: '크루로 계속하기', exact: true }).click();
            await page.waitForFunction(() => new URL(location.href).searchParams.get('view') === 'event_detail');
            assert(new URL(page.url()).searchParams.get('eventId') === '9101', 'Original event destination was lost');
            assert(!boundary.credentialInUrl && !boundary.publicAuth, 'Invitation leaked into an HTTP URL or public credentials');
            completed.push('new-member-invitation-signup-pending-approval-return');
        }
        if (viewport.width === 320) {
            await page.getByRole('button', { name: '내 크루 찾기', exact: true }).click();
            await page.getByRole('heading', { name: '내 동아리를 찾아볼까요?' }).waitFor();
            await page.getByPlaceholder('크루명, 학교명 또는 크루 코드 검색').fill('가상');
            await page.getByRole('button', { name: '가입', exact: true }).click();
            await page.getByRole('textbox', { name: '4자리 가입 PIN', exact: true }).fill('1234');
            await page.getByRole('button', { name: '가입 신청', exact: true }).click();
            await page.getByText('운영진 승인 대기', { exact: true }).waitFor();
            await page.screenshot({ path: `${root}/output/playwright/member-no-invitation-pending.png` });
            await page.reload();
            await page.getByText('운영진 승인 대기', { exact: true }).waitFor();
            boundary.approved = true;
            await page.getByRole('button', { name: '가입 상태 새로고침', exact: true }).click();
            await page.getByRole('heading', { name: '크루 연결 완료', exact: true }).waitFor();
            assert(!boundary.traffic.some(item => item.path === '/crew-invitations/accept'), 'Normal signup required an invitation');
            completed.push('no-invitation-signup-search-pin-pending-reload-approved');
        }
        assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`);
        assert(unknown.length === 0, `Unexpected synthetic API calls: ${JSON.stringify(unknown)}`);
        completed.push(`signup-school-phone-consent-${viewport.width}`);
        await context.close();
    }
    {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
        const page = await context.newPage(); const state = await installOnboardingBoundary(page); state.newUser = false;
        await page.goto(`${origin}/?view=crew_invite#crewInvite=${state.token}`);
        await page.getByRole('button', { name: '로그인하고 계속하기', exact: true }).click();
        await page.getByRole('button', { name: 'Kakao Login', exact: true }).click();
        await page.getByRole('button', { name: '이 크루에 가입 신청', exact: true }).click();
        await page.getByRole('heading', { name: '가입 신청을 보냈어요.' }).waitFor();
        assert(!state.traffic.some(item => item.path === '/accounts/phone-verifications'), 'Existing member was sent through signup again');
        state.unavailable = true;
        await page.reload();
        await page.getByRole('heading', { name: '가입 신청을 보냈어요.' }).waitFor();
        assert(!state.credentialInUrl && !state.publicAuth && state.unknown.length === 0 && state.errors.length === 0, 'Existing-member invitation boundary failed');
        state.unavailable = false;
        await page.evaluate(() => { location.hash = 'crewInvite=' + 'c'.repeat(43); });
        await page.getByRole('heading', { name: '함께할 크루가 기다리고 있어요.' }).waitFor();
        assert(!page.url().includes('c'.repeat(43)), 'Replacement invitation proof was not removed');
        completed.push('same-tab-replacement-restarts-invitation-review');
        completed.push('existing-member-login-continuation-and-pending-reload'); await context.close();
    }
    {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
        await context.addInitScript(() => { localStorage.setItem('accessToken', 'synthetic-active'); localStorage.setItem('accountId', '99101'); });
        const page = await context.newPage(); const state = await installOnboardingBoundary(page);
        state.requests = [{ id: 17, name: '가상 크루', approvalStatus: 'PENDING', status: 'INACTIVE' }];
        await page.goto(`${origin}/?view=onboarding`);
        await page.getByText('2. 관리자 검토 중', { exact: true }).waitFor();
        assert(await page.getByRole('button', { name: '새 초대 링크 만들기' }).count() === 0, 'Pending president received invitation tools');
        await page.screenshot({ path: `${root}/output/playwright/captain-approval-pending.png` });
        state.approved = true; state.role = 'CREW_CAPTAIN';
        await page.getByRole('button', { name: '승인 상태 새로고침', exact: true }).click();
        await page.getByRole('button', { name: '새 초대 링크 만들기', exact: true }).click();
        const qr = page.getByRole('img', { name: '크루 가입 신청 초대 QR', exact: true }); await qr.waitFor();
        assert(await qr.evaluate(image => image.complete && image.naturalWidth > 0), 'Invitation QR did not render');
        const url = await page.getByRole('textbox', { name: '새 초대 링크', exact: true }).inputValue();
        assert(new URL(url).hash.includes('crewInvite=') && !new URL(url).search.includes('b'.repeat(43)), 'Issued invitation proof entered a query string');
        await page.screenshot({ path: `${root}/output/playwright/captain-member-invitation.png` });
        await page.getByRole('button', { name: '링크 회수', exact: true }).click();
        await qr.waitFor({ state: 'detached' });
        await page.getByRole('button', { name: '첫 행사 준비하기', exact: true }).click();
        await page.waitForFunction(() => new URL(location.href).searchParams.get('view') === 'dashboard_groups');
        assert(state.unknown.length === 0 && state.errors.length === 0, `Captain boundary failed: ${JSON.stringify(state.unknown)}`);
        completed.push('president-approval-invitation-qr-revoke-first-event'); await context.close();
    }
    const report = { result: 'PASS', completed, boundary: 'Local browser with synthetic HTTP; not staging acceptance or real legal consent.' };
    writeFileSync(`${root}/output/playwright/onboarding-browser.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
} finally { if (browser) await browser.close(); if (server && server.exitCode == null) server.kill('SIGTERM'); }
