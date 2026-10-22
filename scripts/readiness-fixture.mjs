/** Local visual QA only. Serves the real dist/ bundle and synthetic read-only HTTP fixtures.
 * No provider login, real tokens, proxy, production API, or persistent data is used.
 * Build: VITE_API_BASE_URL=/api pnpm build
 * Run: node scripts/readiness-fixture.mjs (http://127.0.0.1:4174/__fixture)
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const dist = resolve(import.meta.dirname, '../dist');
const port = 4174;
const requests = [];
const base = { capacity: 15, joinedCount: 1, joinPolicy: 'INSTANT', visibilityType: 'PUBLIC',
    status: 'OPEN', planningMode: 'MANAGER_PLANNED', activityType: 'OTHER', currentUserStatus: null,
    organizerGroupId: 2, organizerGroupName: '테스트 전용 호스트', createdByUserId: 7,
    description: '합성 데이터로 화면과 모바일 접근성을 확인하는 테스트입니다. 실제 모임이 아닙니다.',
    locationName: '테스트 장소 — 실제 방문하지 마세요', kusbfAssociated: false };
const events = [
    { ...base, id: 11, title: '테스트 전용 · 지난 이벤트 (신청 불가)', startsAt: '2026-09-09T19:33:00', endsAt: '2026-09-11T18:33:00' },
    { ...base, id: 12, title: '테스트 전용 · 아주 긴 제목의 모바일 이벤트 참가 화면 확인', startsAt: '2099-10-25T20:00:00', endsAt: '2099-10-25T22:00:00' },
];
const consent = { configurationLocked: true, consentWindowMinutes: 10, items: [{ id: 101, category: 'OTHER',
    title: '테스트 전용 안내', content: '실제 동의서가 아닙니다.', responseType: 'CHECKBOX', required: true,
    displayOrder: 0, documentVersion: 1, contentHash: 'synthetic-only' }] };
const crew = { crewId: 1, crewName: '테스트 전용 크루', seasonHouseActive: true, memberCount: 2,
    dailyCapacity: 10, isCapacityLimited: true, reservationOpenDay: 'FRIDAY', reservationOpenTime: '18:00',
    reservationOpenOffsetDays: 3, reservationPeriodLimitDays: 7, schoolVerificationRequired: false };
const bootstrap = `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Local synthetic readiness fixture</title><body style="font:18px system-ui;max-width:650px;margin:40px auto;padding:20px">
<h1>LOCAL SYNTHETIC FIXTURE</h1><p>Not production. No real accounts, invitations, messages or payments.</p>
<button id="member">Start synthetic member</button> <button id="host">Start synthetic host</button>
<script>for(const role of ['member','host'])document.getElementById(role).onclick=()=>{localStorage.clear();
localStorage.setItem('accessToken','synthetic-local-'+role);localStorage.setItem('autoLogin','true');
location.href='/?view=home';};</script></body></html>`;
const json = (res, data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ code: status, message: 'Synthetic local fixture', data })); };
const server = createServer(async (req, res) => {
    const path = new URL(req.url, `http://127.0.0.1:${port}`).pathname;
    if (path === '/__fixture') { res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }); res.end(bootstrap); return; }
    if (path === '/__fixture/requests') { json(res, requests); return; }
    if (path.startsWith('/api/')) {
        requests.push({ method: req.method, path });
        if (req.method !== 'GET') { json(res, null, 405); return; } // Visual QA cannot mutate even synthetic rows.
        if (/reservations|calendar|usage-statistics|^\/api\/guests/.test(path)) { json(res, null, 403); return; }
        const host = req.headers.authorization === 'Bearer synthetic-local-host';
        const user = { userId: 7, name: '테스트 전용 멤버', userType: 'REGULAR', role: 'CREW_MEMBER',
            crew: { crewId: 1, crewName: crew.crewName }, phoneNumberSharingConsent: true };
        let data;
        if (path === '/api/users/me') data = user;
        else if (path === '/api/crews/1') data = crew;
        else if (path === '/api/operations/context') data = { permissions: host ? ['PARTIES_MANAGE', 'EVENT_GROUPS_VIEW', 'RESERVATIONS_MANAGE'] : [] };
        else if (path === '/api/admin/crews') data = { developerAccess: false, crews: [], schools: [] };
        else if (path === '/api/schools') data = [];
        else if (path === '/api/notifications') data = { items: [], unreadCount: 0 };
        else if (path === '/api/dashboard/organizer-groups') data = host ? [{ id: 2, name: base.organizerGroupName }] : [];
        else if (path === '/api/crews/my-applications') data = [];
        else if (path === '/api/events' || path === '/api/dashboard/events') data = events;
        else if (/^\/api\/(dashboard\/)?events\/\d+$/.test(path)) data = events.find(event => event.id === Number(path.split('/').at(-1)));
        else if (path.endsWith('/refund-policy')) data = { refundPolicy: '테스트 전용 환불 안내입니다. 실제 결제는 없습니다.' };
        else if (path.endsWith('/consents')) data = consent;
        else if (path.endsWith('/participants')) data = [{ id: 1, userId: 8, eventId: 12, status: 'JOINED' }];
        else { json(res, null, 404); return; }
        json(res, data); return;
    }
    try {
        const target = resolve(dist, `.${path === '/' ? '/index.html' : decodeURIComponent(path)}`);
        if (!target.startsWith(`${dist}${sep}`)) { res.writeHead(403); res.end(); return; }
        const bytes = await readFile(target);
        const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' }[extname(target)] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(bytes);
    } catch { res.writeHead(404); res.end('Fixture asset not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Read-only synthetic QA: http://127.0.0.1:${port}/__fixture`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
