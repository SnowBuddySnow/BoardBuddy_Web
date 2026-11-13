import { chromium, webkit } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { installOnboardingBoundary } from './onboarding-browser-boundary.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const origin = 'http://127.0.0.1:5189';
const assert = (condition, message) => { if (!condition) throw Error(message); };
let server; const completed = [];
try {
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5189', '--strictPort'], { cwd: root, stdio: 'ignore', env: { ...process.env, VITE_API_BASE_URL: `${origin}/__scenario_api`, VITE_KAKAO_JAVASCRIPT_KEY: '' } });
    let ready = false;
    for (let i = 0; i < 100; i++) { if (server.exitCode != null) throw Error('Mobile fixture server exited'); try { if ((await fetch(origin)).ok) { ready = true; break; } } catch { /* startup */ } await new Promise(resolve => setTimeout(resolve, 100)); }
    assert(ready, 'Server not ready'); mkdirSync(`${root}/output/playwright`, { recursive: true });
    for (const [name, engine, widths] of [['chromium', chromium, [320, 390, 768, 1440]], ['webkit', webkit, [390]]]) {
        const browser = await engine.launch({ headless: true, ...(!process.env.CI && name === 'chromium' ? { channel: 'chrome' } : {}) });
        try { for (const width of widths) {
            const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 1024, hasTouch: width < 1024, serviceWorkers: 'block' });
            await context.addInitScript(() => { localStorage.setItem('accountId', '99101'); localStorage.setItem('accessToken', 'synthetic-active'); localStorage.setItem('boardbuddy_captain_onboarding_v1:99101', 'completed'); });
            const page = await context.newPage(); page.setDefaultTimeout(30000); page.setDefaultNavigationTimeout(60000); page.on('dialog', dialog => dialog.accept());
            const state = await installOnboardingBoundary(page, { origin }); state.approved = true; state.role = 'CREW_CAPTAIN'; state.groups = [{ id: 1, name: '로컬 호스트' }];
            const fits = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}/${width} horizontal overflow`);
            await page.goto(`${origin}/?view=dashboard_event_detail&eventId=9101`);
            await page.getByRole('heading', { name: '참가자 목록 (1)' }).waitFor(); await fits();
            await page.getByRole('combobox', { name: '가상 부원 입금 상태', exact: true }).selectOption('PAID');
            await page.getByRole('textbox', { name: '가상 부원 호스트 메모', exact: true }).fill('모바일 확인');
            await page.screenshot({ path: `${root}/output/playwright/mobile-management-before-save.png` });
            await page.getByRole('button', { name: '가상 부원 관리 정보 저장', exact: true }).click();
            assert(state.participants[0].managerMemo === '모바일 확인' && state.participants[0].paymentStatus === 'PAID', 'Management save lost input');
            await page.getByTitle('멤버 승인', { exact: true }).click();
            await page.waitForFunction(() => document.body.innerText.includes('참가 확정 1명'));
            assert(state.participants[0].status === 'JOINED', 'Participant not approved');
            await page.screenshot({ path: `${root}/output/playwright/management-${name}-${width}.png` });
            await page.getByRole('button', { name: '수정하기', exact: true }).click();
            await page.getByPlaceholder('예: Summer Beach Skate & Surf').fill('모바일에서 수정한 이벤트'); await fits();
            await page.getByRole('button', { name: '수정 사항 저장', exact: true }).click();
            await page.waitForURL('**/?view=dashboard_parties');
            await page.getByText('모바일에서 수정한 이벤트', { exact: true }).waitFor();
            await page.reload(); await page.getByText('모바일에서 수정한 이벤트', { exact: true }).waitFor();
            assert(state.managedEvent.title === '모바일에서 수정한 이벤트', 'Event configuration not saved');
            // A closed crew remains read-only; one selection opens the status panel.
            state.role = 'CREW_MEMBER'; state.groups = [];
            await page.goto(`${origin}/?view=home`);
            await page.getByRole('heading', { name: '가상 크루와 함께하는 오늘' }).waitFor(); await fits();
            const calendar = page.getByRole('button', { name: /날짜별 이용 현황 조회/ }); await calendar.scrollIntoViewIfNeeded();
            if (width < 1024) { const button = await calendar.boundingBox(); const nav = await page.getByRole('navigation', { name: '하단 메뉴', exact: true }).boundingBox(); assert(button && nav && button.y + button.height <= nav.y, 'Bottom menu overlaps home action'); }
            await page.screenshot({ path: `${root}/output/playwright/member-home-${width}.png` });
            await calendar.click(); await page.getByRole('heading', { name: '시즌방 캘린더', exact: true }).waitFor();
            const day = page.getByRole('button', { name: '2026년 11월 15일', exact: true }); await day.waitFor();
            await day.locator('.reservation-dot-high').waitFor();
            const monthReads = state.traffic.filter(item => item.path === '/crews/17/calendar').length;
            await page.getByRole('switch', { name: '내 일정 표시', exact: true }).click();
            assert(state.traffic.filter(item => item.path === '/crews/17/calendar').length === monthReads, 'Overlay toggle refetched the same member calendar');
            await day.locator('.reservation-dot-high').waitFor();
            await day.click(); await page.getByText('회원 #99102', { exact: true }).waitFor();
            assert(await page.getByRole('button', { name: /예약하기|예약 취소하기|관리 정보 저장/ }).count() === 0, 'Closed calendar exposed enabled mutations');
            assert(await page.getByRole('combobox', { name: /입금 상태/ }).count() === 0, 'Read-only calendar exposed payment edits');
            await page.getByRole('combobox', { name: '예약자 정렬' }).selectOption('earliest');
            await page.screenshot({ path: `${root}/output/playwright/season-calendar-${name}-${width}.png` }); await fits();
            // Reopen the same crew: application and cancellation refresh the day and own calendar.
            state.seasonOpen = true;
            await page.reload();
            await page.getByRole('button', { name: '2026년 11월 15일', exact: true }).click();
            await page.locator('.reservation-content').getByRole('button', { name: '예약하기', exact: true }).click();
            try { await page.getByRole('button', { name: '예약 취소하기', exact: true }).waitFor(); } catch (error) { await page.screenshot({ path: `${root}/output/playwright/season-apply-failure.png` }); console.error(JSON.stringify({ bookings: state.bookings, traffic: state.traffic.slice(-12), unknown: state.unknown, text: await page.locator('body').innerText() })); throw error; }
            assert(state.bookings.length === 1, 'Application did not persist in fixture');
            await page.getByRole('button', { name: '예약 취소하기', exact: true }).click();
            await page.locator('.reservation-content').getByRole('button', { name: '예약하기', exact: true }).waitFor();
            assert(state.bookings.length === 0, 'Cancellation did not refresh');
            state.role = 'CREW_CAPTAIN';
            await page.reload();
            await page.getByRole('button', { name: '2026년 11월 15일', exact: true }).click();
            await page.getByRole('combobox', { name: '예약 77 입금 상태', exact: true }).selectOption('PAID');
            await page.getByRole('textbox', { name: '예약 77 관리자 메모', exact: true }).fill('시즌방 입금 확인');
            await page.getByRole('button', { name: '예약 77 관리 정보 저장', exact: true }).click();
            assert(state.seedReservation.paymentStatus === 'PAID' && state.seedReservation.managerMemo === '시즌방 입금 확인', 'Season management lost edits');
            await page.getByRole('button', { name: '다음 달', exact: true }).click(); await page.getByRole('button', { name: '2026년 12월 15일', exact: true }).locator('.reservation-dot-high').waitFor();
            assert(state.writes.filter(item => item.path.includes('reservation')).length === 3, 'Unexpected reservation mutations');
            assert(!state.errors.length && !state.unknown.length, `Fixture errors ${JSON.stringify(state.errors)} ${JSON.stringify(state.unknown)}`);
            completed.push(`${name}-${width}-participant-save-approve-event-edit-home-calendar`); await context.close();
        } } finally { await browser.close(); }
    }
    console.log(JSON.stringify({ result: 'PASS', completed, boundary: 'Synthetic browser fixtures; no real participant or staging mutation' }));
    writeFileSync(`${root}/output/playwright/mobile-management.json`, JSON.stringify({ result: 'PASS', completed }, null, 2));
} finally { if (server && server.exitCode == null) server.kill('SIGTERM'); }
