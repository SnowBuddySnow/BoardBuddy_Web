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
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5189', '--strictPort'], { cwd: root, stdio: 'ignore', env: { ...process.env, BOARDBUDDY_VITE_CACHE_DIR: 'node_modules/.vite-management-test', VITE_API_BASE_URL: `${origin}/__scenario_api`, VITE_KAKAO_JAVASCRIPT_KEY: '' } });
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
            if (width < 1024) {
                const nav = page.getByRole('navigation', { name: '하단 메뉴', exact: true });
                assert(await nav.getByRole('button').count() <= 4, 'Bottom navigation is crowded');
                assert(await nav.getByRole('button', { name: /내 정보|알림|예약/ }).count() === 0, 'Secondary actions remain below');
            }
            await page.locator('header[aria-label="계정 메뉴"]').getByRole('button', { name: '내 정보', exact: true }).waitFor();
            // The crew calendar lives in the bottom menu / sidebar; Home's last full-width action must clear the menu.
            const homeAction = page.getByRole('button', { name: /내 참여 일정/ }).first(); await homeAction.scrollIntoViewIfNeeded();
            if (width < 1024) { const button = await homeAction.boundingBox(); const nav = await page.getByRole('navigation', { name: '하단 메뉴', exact: true }).boundingBox(); assert(button && nav && button.y + button.height <= nav.y, 'Bottom menu overlaps home action'); }
            await page.screenshot({ path: `${root}/output/playwright/member-home-${width}.png` });
            await (width < 1024
                ? page.getByRole('navigation', { name: '하단 메뉴', exact: true }).getByRole('button', { name: '시즌방', exact: true })
                : page.getByRole('navigation', { name: '주요 메뉴', exact: true }).getByRole('button', { name: '크루 달력', exact: true })).click();
            await page.getByRole('heading', { name: '크루 달력', exact: true }).waitFor();
            const day = page.getByRole('button', { name: '2026년 11월 15일', exact: true }); await day.waitFor();
            await day.locator('.reservation-dot-high').waitFor();
            assert(await day.locator('.reservation-dot-high').evaluate(element => getComputedStyle(element).backgroundColor) === 'rgb(189, 130, 126)', 'Classic muted occupancy color was overridden');
            const monthReads = state.traffic.filter(item => item.path === '/crews/17/calendar').length;
            await page.getByRole('switch', { name: '내 일정 표시', exact: true }).click();
            assert(await page.getByRole('switch', { name: '내 일정 표시', exact: true }).getAttribute('aria-checked') === 'true', 'Personal overlay did not turn on');
            assert(state.traffic.filter(item => item.path === '/crews/17/calendar').length === monthReads, 'Overlay toggle refetched the same member calendar');
            await day.locator('.reservation-dot-high').waitFor();
            await day.click();
            await page.locator('.reservation-member-row').getByText(state.seedReservation.participantName, { exact: true }).waitFor();
            assert(await page.getByText('회원 #99102', { exact: true }).count() === 0, 'Named member fell back to an internal account ID');
            assert(await page.getByRole('button', { name: /예약하기|예약 취소하기|관리 정보 저장/ }).count() === 0, 'Closed calendar exposed enabled mutations');
            assert(await page.getByRole('combobox', { name: /입금 상태/ }).count() === 0, 'Read-only calendar exposed payment edits');
            await page.getByRole('combobox', { name: '예약자 정렬' }).selectOption('earliest');
            await page.screenshot({ path: `${root}/output/playwright/season-calendar-${name}-${width}.png` }); await fits();
            // Reopen the same crew: application and cancellation refresh the day and own calendar.
            state.seasonOpen = true;
            await page.reload();
            await page.getByRole('button', { name: '2026년 11월 15일', exact: true }).click();
            await page.getByRole('checkbox', {name:'숙박일 기준을 확인하고 동의합니다. *',exact:true}).check();
            let releaseBooking;
            state.bookingGate = new Promise(resolve => { releaseBooking = resolve; });
            try {
                await page.locator('.reservation-content').getByRole('button', { name: '예약하기', exact: true }).click();
                await page.getByText('예약 요청을 처리하고 있어요', { exact: true }).waitFor();
            } finally { releaseBooking(); state.bookingGate = null; }
            { const sheet = page.locator('[aria-labelledby="feedback-result-title"]'); await sheet.waitFor(); await sheet.getByRole('button').first().click(); await sheet.waitFor({ state: 'detached' }); }
            try { await page.getByRole('button', { name: '예약 취소하기', exact: true }).waitFor(); } catch (error) { await page.screenshot({ path: `${root}/output/playwright/season-apply-failure.png` }); console.error(JSON.stringify({ bookings: state.bookings, traffic: state.traffic.slice(-12), unknown: state.unknown, text: await page.locator('body').innerText() })); throw error; }
            assert(state.bookings.length === 1, 'Application did not persist in fixture');
            await page.getByRole('switch', { name: '내 일정 표시', exact: true }).click();
            const ownDay = page.getByRole('button', { name: '2026년 11월 15일', exact: true });
            await ownDay.locator('.reservation-confirmed').waitFor();
            const ownBox = await ownDay.boundingBox(); const markerBox = await ownDay.locator('.reservation-confirmed').boundingBox();
            assert(ownBox && markerBox && markerBox.y >= ownBox.y && markerBox.y + markerBox.height <= ownBox.y + ownBox.height, 'Personal reservation marker overflowed its date cell');
            // Cancelling asks first; backing out keeps the booking.
            await page.getByRole('button', { name: '예약 취소하기', exact: true }).click();
            const confirmCancel = page.getByRole('alertdialog', { name: '예약을 취소할까요?' });
            await confirmCancel.getByRole('button', { name: '돌아가기', exact: true }).click();
            await confirmCancel.waitFor({ state: 'detached' });
            assert(state.bookings.length === 1, 'Backing out of the cancel dialog still cancelled');
            await page.getByRole('button', { name: '예약 취소하기', exact: true }).click();
            await confirmCancel.getByRole('button', { name: '취소하기', exact: true }).click();
            await page.locator('.reservation-content').getByRole('button', { name: '예약하기', exact: true }).waitFor();
            assert(state.bookings.length === 0, 'Cancellation did not refresh');
            state.role = 'CREW_CAPTAIN';
            await page.reload();
            await page.getByRole('button', { name: '2026년 11월 15일', exact: true }).click();
            assert(await page.getByRole('combobox', { name: /입금/ }).count()===0,'Calendar list exposes payment fields');
            assert(await page.getByText('부원 이용권 관리',{exact:true}).count()===0,'Calendar still embeds pass administration');
            await page.getByRole('button',{name:state.seedReservation.participantName,exact:true}).click();
            let personDialog = page.getByRole('dialog');
            assert(await personDialog.getByRole('combobox',{name:'게스트 입금 여부',exact:true}).count()===0,'Member detail exposes guest payment');
            await personDialog.getByRole('textbox',{name:'예약 관리자 메모',exact:true}).fill('부원 이용 확인');
            await personDialog.getByRole('button',{name:'관리 정보 저장',exact:true}).click();
            await personDialog.getByText('관리 정보를 저장했습니다.',{exact:true}).waitFor();
            assert(state.seedReservation.managerMemo==='부원 이용 확인' && state.seedReservation.paymentStatus==='UNPAID','Member memo changed payment');
            await personDialog.getByRole('button',{name:'닫기',exact:true}).click();
            state.seedReservation.guestId=5; state.seedReservation.participantName='가상 게스트'; delete state.seedReservation.participantAccountId;
            await page.reload(); await page.getByRole('button',{name:'2026년 11월 15일',exact:true}).click();
            await page.getByRole('button',{name:'가상 게스트',exact:true}).click();
            personDialog=page.getByRole('dialog');
            await personDialog.getByRole('combobox',{name:'게스트 입금 여부',exact:true}).selectOption('PAID');
            await personDialog.getByRole('textbox',{name:'예약 관리자 메모',exact:true}).fill('게스트 입금 확인');
            await personDialog.getByRole('button',{name:'관리 정보 저장',exact:true}).click();
            await personDialog.getByText('관리 정보를 저장했습니다.',{exact:true}).waitFor();
            assert(state.seedReservation.paymentStatus==='PAID' && state.seedReservation.managerMemo==='게스트 입금 확인','Guest payment was not saved');
            await page.screenshot({path:`${root}/output/playwright/guest-payment-${name}-${width}.png`});
            await personDialog.getByRole('button',{name:'닫기',exact:true}).click();
            delete state.seedReservation.guestId; state.seedReservation.participantAccountId=99102; state.seedReservation.participantName='가상 부원';
            await page.getByRole('button', { name: '다음 달', exact: true }).click(); await page.getByRole('button', { name: '2026년 12월 15일', exact: true }).locator('.reservation-dot-high').waitFor();
            assert(state.writes.filter(item => item.path.includes('reservation')).length === 4, 'Unexpected reservation mutations');
            assert(!state.errors.length && !state.unknown.length, `Fixture errors ${JSON.stringify(state.errors)} ${JSON.stringify(state.unknown)}`);
            state.role = 'CREW_MEMBER'; state.groups = [];
            state.bookings = [{date:'2026-11-15',reservationId:81,participantAccountId:99101,status:'CONFIRMED',teaching:false},{date:'2026-11-16',reservationId:82,participantAccountId:99101,status:'WAITING',waitlistPosition:3}];
            await page.goto(`${origin}/?view=my_reservations`);
            await page.getByRole('heading',{name:'나의 달력',exact:true}).waitFor();
            const personalDay = number => page.getByRole('button',{name:`2026년 11월 ${number}일`,exact:true});
            await personalDay(15).locator('.reservation-confirmed').waitFor();
            await personalDay(16).locator('.reservation-pending').waitFor();
            await personalDay(16).click(); await page.getByText('예약 대기 3번입니다.',{exact:true}).waitFor();
            assert(await page.getByRole('switch',{name:'강습 신청',exact:true}).count()===0,'Waiting member exposed teaching');
            await personalDay(15).click(); await page.getByRole('switch',{name:'강습 신청',exact:true}).click();
            await page.waitForFunction(()=>document.querySelector('[aria-label="강습 신청"]')?.checked);
            assert(state.bookings[0].teaching===true,'Teaching did not persist'); await fits();
            await page.goto(`${origin}/?view=home`);
            await page.getByRole('region',{name:'나의 2주 달력'}).getByRole('button',{name:'2026-11-15 예약 확정',exact:true}).waitFor();
            await page.getByRole('region',{name:'나의 2주 달력'}).getByRole('button',{name:'2026-11-16 예약 대기',exact:true}).waitFor(); await fits();
            const weatherBox = await page.getByRole('region',{name:'휘닉스파크 날씨'}).boundingBox();
            const crewBox = await page.getByRole('heading',{name:'가상 크루와 함께하는 오늘',exact:true}).boundingBox();
            const personalBox = await page.getByRole('region',{name:'나의 2주 달력'}).boundingBox();
            assert(weatherBox && crewBox && personalBox && weatherBox.y < personalBox.y && personalBox.y < crewBox.y,'Home sections are out of order');
            assert(await page.getByText('가상 크루',{exact:true}).count()===0,'Home repeats the crew name above its main card');
            assert(await page.getByRole('button',{name:'크루 설정',exact:true}).count()===0,'Member home exposes crew settings');
            assert((await page.getByRole('button',{name:'2026-11-15 예약 확정',exact:true}).innerText()).trim()==='15','Calendar repeated the status below the date');
            await page.screenshot({path:`${root}/output/playwright/home-calendar-${name}-${width}.png`});
            await page.locator('header[aria-label="계정 메뉴"]').getByRole('button',{name:'내 정보',exact:true}).click();
            await page.getByRole('heading',{name:'내 정보',exact:true}).waitFor();
            await page.getByText('부원',{exact:true}).waitFor();
            assert(await page.locator('[data-buddy-variant="face"]').count()>0,'Small mascot is not head-only');
            await fits(); await page.screenshot({path:`${root}/output/playwright/profile-${name}-${width}.png`});
            state.closedDate = '2026-11-18';
            await page.goto(`${origin}/?view=season_calendar`);
            await page.getByRole('button',{name:'2026년 11월 18일',exact:true}).click();
            await page.getByText('2026.11.18 18:00 오픈 예정입니다. (한국 시간)',{exact:true}).waitFor();
            assert(await page.getByRole('button',{name:'예약 오픈 전',exact:true}).isDisabled(),'Unopened date enabled booking');
            assert(await page.getByRole('button',{name:'2026년 11월 29일',exact:true}).isVisible(),'Selecting a date hid the rest of the month');
            assert(!(await page.locator('body').innerText()).includes('현황 없음'),'Unknown-status legend remains visible');
            for (const role of ['CREW_CAPTAIN','CREW_MANAGER']) {
                state.role = role;
                await page.goto(`${origin}/?view=home`);
                if(width>=1024) {
                    await page.getByRole('heading',{name:'운영 센터',exact:true}).waitFor();
                    await page.getByRole('navigation',{name:'주요 메뉴',exact:true}).getByRole('button',{name:'홈',exact:true}).click();
                }
                await page.getByRole('heading',{name:'가상 크루와 함께하는 오늘',exact:true}).waitFor();
                if(role==='CREW_CAPTAIN') await page.screenshot({path:`${root}/output/playwright/home-crew-settings-${name}-${width}.png`});
                await page.getByRole('button',{name:'크루 설정',exact:true}).click();
                await page.getByRole('heading',{name:'크루 설정',exact:true}).waitFor(); await fits();
                await page.screenshot({path:`${root}/output/playwright/crew-settings-${role}-${name}-${width}.png`});
                assert((await page.getByRole('button',{name:'PIN 재발급',exact:true}).count()>0)===(role==='CREW_CAPTAIN'),'Manager gained captain-only controls');
                await page.getByRole('button',{name:'뒤로 가기',exact:true}).click();
                await page.getByRole('heading',{name:'가상 크루와 함께하는 오늘',exact:true}).waitFor();
                await page.getByRole('navigation',{name:width>=1024?'주요 메뉴':'하단 메뉴',exact:true}).getByRole('button',{name:'내 크루',exact:true}).click();
                await page.getByRole('button',{name:'크루 설정',exact:true}).click();
                await page.getByRole('heading',{name:'크루 설정',exact:true}).waitFor();
                assert(!state.traffic.some(item=>item.path==='/crews/17/managers'),'Crew detail required a separate manager-list request');
                await page.goto(`${origin}/?view=operations_center`);
                await page.getByRole('button',{name:/^크루 설정/}).click();
                await page.getByRole('heading',{name:'크루 설정',exact:true}).waitFor();
                await page.getByRole('button',{name:'뒤로 가기',exact:true}).click();
                await page.getByRole('heading',{name:'운영 센터',exact:true}).waitFor();
            }
            state.role='CREW_MEMBER';
            await page.goto(`${origin}/?view=crew_settings`);
            await page.getByRole('alert').getByText('크루장과 임원진만 설정을 관리할 수 있어요.',{exact:true}).waitFor();
            assert(await page.getByRole('button',{name:'저장하기',exact:true}).count()===0,'Member direct entry exposes the settings form');
            completed.push(`${name}-${width}-participant-save-approve-event-edit-home-calendar`); await context.close();
        } } finally { await browser.close(); }
    }
    console.log(JSON.stringify({ result: 'PASS', completed, boundary: 'Synthetic browser fixtures; no real participant or staging mutation' }));
    writeFileSync(`${root}/output/playwright/mobile-management.json`, JSON.stringify({ result: 'PASS', completed }, null, 2));
} finally { if (server && server.exitCode == null) server.kill('SIGTERM'); }
