// Explicit, localhost-only sandbox. Never connects to staging or production.
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { installOnboardingBoundary } from '../test/onboarding-browser-boundary.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const origin = 'http://127.0.0.1:5175';
const initScripts = [];
let handle;
const state = await installOnboardingBoundary({
    clock: { install() {} }, on() {},
    context: () => ({ addInitScript(callback) { initScripts.push(`(${callback.toString()})();`); } }),
    route(_pattern, callback) { handle = callback; },
}, { origin });
const previewPrefill = {name:'김버디',gender:'FEMALE',phoneNumber:'+82 10-0000-0000',missingConsentScopes:[]};
state.signupPrefill = previewPrefill;
const initialEvent = structuredClone(state.managedEvent);
const initialParticipants = structuredClone(state.participants);
const localKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
function seasonDemo(role) {
    const today = new Date(); const key = offset => { const date = new Date(today); date.setDate(date.getDate()+offset); return localKey(date); };
    const year = today.getMonth() < 3 ? today.getFullYear()-1 : today.getFullYear();
    Object.assign(state, { role, approved: true, seasonOpen: true, groups: [], nextBookingId: 90, stayAnnouncements: [], notifications: [],
        seasonPasses: {99101:{registered:true,name:'5박권',startsOn:`${year}-10-01`,endsOn:`${year+1}-03-31`,totalNights:5}},
        bookings: [{date:key(-2),reservationId:80,participantAccountId:99101,participantName:'가상 회원',status:'CONFIRMED',stayCompleted:true},
            {date:key(-1),reservationId:81,participantAccountId:99101,participantName:'가상 회원',status:'CONFIRMED',stayCompleted:true},
            {date:key(1),reservationId:82,participantAccountId:99101,participantName:'가상 회원',status:'CONFIRMED'},
            {date:key(2),reservationId:83,participantAccountId:99101,participantName:'가상 회원',status:'WAITING',waitlistPosition:3}] });
}
process.env.VITE_API_BASE_URL = `${origin}/__scenario_api`;
process.env.VITE_KAKAO_JAVASCRIPT_KEY = '';
process.env.VITE_GLITCHTIP_DSN = '';
const server = await createServer({ root, cacheDir: 'node_modules/.vite-ui-preview', mode: 'development', server: { host: '127.0.0.1', port: 5175, strictPort: true }, plugins: [{
    name: 'explicit-local-preview',
    transformIndexHtml(html) {
        return html.replace(/<script src="https:\/\/developers.kakao.com[^>]+><\/script>/, '')
            .replace('<head>', `<head><script>${initScripts.join('\n')}</script><style>#preview-banner{min-height:5rem;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;background:#162660;color:white;font:12px system-ui;padding:0 8px}#preview-banner button{background:#FCCA59;color:#162660;border:0;border-radius:8px;padding:8px;flex-shrink:0}button[aria-label="개발 시뮬레이션 열기"]{display:none}#root>div{height:calc(100dvh - var(--preview-height, 5rem))}</style>`)
            .replace('<body>', `<body><aside id="preview-banner"><span>가상 데이터 미리보기<br/>실제 로그인·문자 없음</span><button id="preview-approve">가상 승인</button><button id="preview-reset">처음부터</button><button id="preview-home">크루 미가입 홈</button><button id="preview-operator">운영자 보기</button><button id="preview-season">시즌방 보기</button><button id="preview-season-manager">시즌방 운영</button><button id="preview-manager-crew">매니저 크루(온보딩)</button></aside><script>addEventListener('DOMContentLoaded',()=>{new ResizeObserver(()=>document.documentElement.style.setProperty('--preview-height',document.getElementById('preview-banner').offsetHeight+'px')).observe(document.getElementById('preview-banner'));document.getElementById('preview-approve').onclick=async()=>{await fetch('/__preview/approve',{method:'POST'});dispatchEvent(new Event('focus'));};document.getElementById('preview-operator').onclick=async()=>{await fetch('/__preview/operator',{method:'POST'});localStorage.setItem('accessToken','synthetic-active');localStorage.setItem('accountId','99101');localStorage.setItem('boardbuddy_captain_onboarding_v1:99101','completed');location.assign('/?view=dashboard_event_detail&eventId=9101');};document.getElementById('preview-season').onclick=async()=>{await fetch('/__preview/season',{method:'POST'});localStorage.setItem('accessToken','synthetic-active');localStorage.setItem('accountId','99101');localStorage.setItem('dev_operating_mode','BOTH');location.assign('/?view=season_calendar');};document.getElementById('preview-season-manager').onclick=async()=>{await fetch('/__preview/season-manager',{method:'POST'});localStorage.setItem('accessToken','synthetic-active');localStorage.setItem('accountId','99101');localStorage.setItem('boardbuddy_captain_onboarding_v1:99101','completed');localStorage.setItem('dev_operating_mode','BOTH');location.assign('/?view=season_calendar');};document.getElementById('preview-manager-crew').onclick=async()=>{await fetch('/__preview/season-manager',{method:'POST'});localStorage.setItem('accessToken','synthetic-active');localStorage.setItem('accountId','99101');localStorage.setItem('boardbuddy_captain_onboarding_v1:99101','completed');localStorage.setItem('dev_operating_mode','BOTH');location.assign('/?view=crew_detail');};document.getElementById('preview-home').onclick=async()=>{await fetch('/__preview/unaffiliated',{method:'POST'});localStorage.clear();sessionStorage.clear();localStorage.setItem('accessToken','synthetic-active');localStorage.setItem('accountId','99101');localStorage.setItem('dev_operating_mode','BOTH');location.assign('/?view=home');};document.getElementById('preview-reset').onclick=async()=>{await fetch('/__preview/reset',{method:'POST'});localStorage.clear();sessionStorage.clear();location.assign('/');};});</script>`);
    },
    configureServer(vite) {
        const previewPolicy = {
            active: true, dailyCapacity: 12, capacityLimited: true, teachingEnabled: true,
            openDayOfWeek: 'WEDNESDAY', openTimeKst: '20:00:00', openOffsetDays: 0, bookingWindowDays: 7,
            cancelCutoffDayOffset: 0, cancelCutoffTimeKst: '04:00:00',
            guestEnabled: true, guestApprovalMode: 'INVITE_WITH_MANAGER_APPROVAL', guestDailyCapacity: 3, guestPerNightFeeKrw: 25000,
        };
        const previewNotes = {
            101: [{ id: 1, membershipId: 101, category: 'CLEANING', occurredOn: '2026-11-20', penaltyDelta: 0, content: '대청소 분리수거 담당 완료', authorName: '가상 회원', createdAt: '2026-11-20T19:00:00' }],
            102: [{ id: 2, membershipId: 102, category: 'PENALTY', occurredOn: '2026-11-22', penaltyDelta: 1, content: '퇴실 체크리스트 미제출', authorName: '가상 회원', createdAt: '2026-11-22T10:30:00' }],
            103: [],
            104: [],
        };
        let nextPreviewNoteId = 10;
        const previewMemberCharges = {
            501: { id: 901, chargeKind: 'PASS_FEE', memberSeasonPassId: 501, reservationId: null, amountKrw: 150000, paymentStatus: 'PAID', depositorName: '김민수', paidAt: '2026-11-10T12:00:00', note: '시즌 10박권' },
            502: { id: 902, chargeKind: 'PASS_FEE', memberSeasonPassId: 502, reservationId: null, amountKrw: 150000, paymentStatus: 'PAID', depositorName: '박서연', paidAt: '2026-11-11T15:00:00', note: '시즌 10박권' },
        };
        const previewStayCharges = {
            7002: { id: 910, chargeKind: 'STAY_USAGE_FEE', memberSeasonPassId: null, reservationId: 7002, amountKrw: 15000, paymentStatus: 'UNPAID', depositorName: null, paidAt: null, note: '정규 부원 실제 이용금' },
            7090: { id: 911, chargeKind: 'STAY_USAGE_FEE', memberSeasonPassId: null, reservationId: 7090, amountKrw: 25000, paymentStatus: 'UNPAID', depositorName: null, paidAt: null, note: '게스트 1박 이용금' },
        };
        const previewGuestApproval = { 7090: 'PENDING_APPROVAL' };
        const previewCanceled = new Set();

        const buildMatrixPreview = (from, to) => {
            const start = new Date(`${from}T00:00:00`);
            const end = new Date(`${to}T00:00:00`);
            const todayIso = localKey(new Date());
            const dateKeys = [];
            for (const cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) dateKeys.push(localKey(cur));
            const pick = (offset) => dateKeys[Math.min(Math.max(offset, 0), dateKeys.length - 1)] ?? from;
            const d1 = pick(2), d2 = pick(3), d3 = pick(5), d4 = pick(6), d5 = pick(9);

            const memberDefs = [
                { membershipId: 101, accountId: 99101, name: '김민수', studentNumber: '20231001', role: 'CREW_CAPTAIN', passId: 501, totalNights: 10, used: 2, reserved: 2, cells: [
                    { date: d1, reservationId: 7001, status: 'CONFIRMED', stayCompleted: true },
                    { date: d3, reservationId: 7003, status: 'CONFIRMED', stayCompleted: false },
                ] },
                { membershipId: 102, accountId: 99102, name: '박서연', studentNumber: '20241012', role: 'CREW_MEMBER', passId: 502, totalNights: 10, used: 1, reserved: 2, cells: [
                    { date: d2, reservationId: 7002, status: 'CONFIRMED', stayCompleted: false },
                    { date: d4, reservationId: 7004, status: 'WAITING', stayCompleted: false, waitlistPosition: 1 },
                ] },
                { membershipId: 103, accountId: 99103, name: '이도현', studentNumber: '20221008', role: 'CREW_MANAGER', passId: null, totalNights: null, used: 0, reserved: 1, cells: [
                    { date: d1, reservationId: 7005, status: 'CONFIRMED', stayCompleted: true },
                    { date: d5, reservationId: 7006, status: 'CONFIRMED', stayCompleted: false },
                ] },
                { membershipId: 104, accountId: 99104, name: '정하은', studentNumber: '20251021', role: 'CREW_MEMBER', passId: null, totalNights: null, used: 0, reserved: 1, cells: [
                    { date: d3, reservationId: 7007, status: 'CONFIRMED', stayCompleted: false },
                ] },
            ];

            const members = memberDefs.map((m) => {
                const notes = previewNotes[m.membershipId] ?? [];
                const cells = {};
                for (const c of m.cells) {
                    if (previewCanceled.has(c.reservationId)) continue;
                    cells[c.date] = {
                        reservationId: c.reservationId, status: c.status, stayCompleted: c.stayCompleted,
                        waitlistPosition: c.waitlistPosition ?? null, teachingRequested: false, managerMemo: null,
                        usageCharge: previewStayCharges[c.reservationId] ?? null,
                    };
                }
                return {
                    membershipId: m.membershipId, accountId: m.accountId, name: m.name, studentNumber: m.studentNumber, role: m.role,
                    pass: m.passId ? {
                        passId: m.passId, planId: 1, name: '시즌 10박권', startsOn: '2026-11-01', endsOn: '2027-03-31',
                        totalNights: m.totalNights, usedNights: m.used, reservedNights: m.reserved,
                        remainingNights: m.totalNights - m.used - m.reserved, perNightFeeKrw: 15000,
                        passCharge: previewMemberCharges[m.passId] ?? null,
                    } : null,
                    penaltyPoints: notes.reduce((sum, n) => sum + n.penaltyDelta, 0),
                    noteCount: notes.length,
                    latestNotePreview: notes[0]?.content ?? null,
                    cells,
                };
            });

            const guestCells = {};
            if (!previewCanceled.has(7090) && previewGuestApproval[7090] !== 'REJECTED') {
                guestCells[d3] = {
                    reservationId: 7090, status: previewGuestApproval[7090] ?? 'PENDING_APPROVAL', stayCompleted: false,
                    waitlistPosition: null, teachingRequested: false, managerMemo: '초대 게스트',
                    usageCharge: previewStayCharges[7090] ?? null,
                };
            }
            const guests = [{
                guestId: 301, guestCode: 'GST00000301', name: '최지훈', maskedPhone: '010-****-4821',
                phoneVerifiedAt: '2026-11-23T14:20:00', invitedByName: '김민수', cells: guestCells,
            }];

            const days = dateKeys.map((date) => {
                let confirmedCount = 0, confirmedGuestCount = 0, waitingCount = 0, pendingApprovalCount = 0;
                for (const m of members) {
                    const c = m.cells[date];
                    if (c?.status === 'CONFIRMED') confirmedCount++;
                    if (c?.status === 'WAITING') waitingCount++;
                }
                for (const g of guests) {
                    const c = g.cells[date];
                    if (c?.status === 'CONFIRMED') { confirmedCount++; confirmedGuestCount++; }
                    if (c?.status === 'PENDING_APPROVAL') pendingApprovalCount++;
                }
                return {
                    date, pastCutoff: date <= todayIso,
                    cancelCutoffAtKst: `${date}T${previewPolicy.cancelCutoffTimeKst}`,
                    confirmedCount, confirmedGuestCount, waitingCount, pendingApprovalCount,
                };
            });

            return {
                crewId: 17, crewName: '가상 크루', from, to,
                serverNowKst: `${todayIso}T12:00:00`,
                policy: previewPolicy,
                passPlans: [{ id: 1, name: '시즌 10박권', startsOn: '2026-11-01', endsOn: '2027-03-31', totalNights: 10, passFeeKrw: 150000, perNightFeeKrw: 15000, active: true }],
                days,
                internalEvents: [
                    { eventId: 9101, publicCode: 'EVT00009101', title: '시즌방 정기 대청소', activityType: 'CLEANING', startsAt: `${d2}T10:00:00`, endsAt: `${d2}T12:00:00` },
                    { eventId: 9102, publicCode: 'EVT00009102', title: '초보자 강습 캠프', activityType: 'CAMP', startsAt: `${d4}T09:00:00`, endsAt: `${d4}T17:00:00` },
                ],
                members, guests,
            };
        };

        vite.middlewares.use(async (req, res, next) => {
            if (req.url === '/__preview/reset' && req.method === 'POST') {
                Object.assign(state, { managedEvent: structuredClone(initialEvent), participants: structuredClone(initialParticipants), writes: [], bookings: [], seasonPasses: {}, stayAnnouncements: [], notifications: [], seasonOpen: false, nextBookingId: 80, seedReservation: { reservationId: 77, participantAccountId: 99102, status: 'CONFIRMED', paymentStatus: 'UNPAID', managerMemo: null }, newUser: true, signupPrefill: previewPrefill, signupEmailProofs: {}, approved: false, applied: false, role: 'CREW_MEMBER', requests: [], invitations: [], groups: [], profileBody: null });
                res.end('{}'); return;
            }
            if (req.url === '/__preview/unaffiliated' && req.method === 'POST') {
                Object.assign(state, { newUser: false, approved: false, applied: false, role: 'CREW_MEMBER', requests: [], groups: [] });
                res.end('{}'); return;
            }
            if (req.url === '/__preview/season' && req.method === 'POST') {
                seasonDemo('CREW_MEMBER');
                res.end('{}'); return;
            }
            if (req.url === '/__preview/season-manager' && req.method === 'POST') { seasonDemo('CREW_CAPTAIN'); res.end('{}'); return; }
            if (req.url === '/__preview/operator' && req.method === 'POST') {
                Object.assign(state, { role: 'CREW_CAPTAIN', approved: true, seasonOpen: true, groups: [{ id: 1, name: '로컬 호스트', role: 'OWNER' }] });
                res.end('{}'); return;
            }
            if (req.url === '/__preview/approve' && req.method === 'POST') {
                state.seasonOpen = true;
                state.approved = state.applied || state.requests.length > 0;
                if (state.requests.length) { state.role = 'CREW_CAPTAIN'; state.groups = [{ id: 1, name: '로컬 호스트', role: 'OWNER' }]; state.requests.forEach(item => item.approvalStatus = 'APPROVED'); }
                res.end('{}'); return;
            }
            if (!req.url?.startsWith('/__scenario_api')) return next();
            let body = ''; for await (const chunk of req) body += chunk;
            const parsedUrl = new URL(`${origin}${req.url}`);
            const apiPath = parsedUrl.pathname.slice('/__scenario_api'.length);
            const json = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ code: status, message: 'Local preview', data })); };
            if (apiPath === '/operations/context' && state.role === 'CREW_CAPTAIN') {
                return json({ permissions: ['RESERVATIONS_MANAGE', 'CREW_MEMBERS_MANAGE', 'CREW_MANAGERS_ASSIGN', 'PARTIES_CREATE', 'PARTIES_MANAGE', 'EVENT_GROUPS_CREATE', 'EVENT_GROUPS_VIEW', 'EVENT_GROUPS_MANAGE'] });
            }
            if (apiPath === '/crews/17/season-house/matrix' && req.method === 'GET') {
                const today = new Date();
                const defFrom = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
                const defTo = localKey(new Date(today.getFullYear(), today.getMonth() + 1, 0));
                return json(buildMatrixPreview(parsedUrl.searchParams.get('from') || defFrom, parsedUrl.searchParams.get('to') || defTo));
            }
            if (apiPath === '/crews/17/season-house/policy' && req.method === 'PUT') {
                const p = body ? JSON.parse(body) : {};
                Object.assign(previewPolicy, p);
                if (p.alwaysOpen) { previewPolicy.openDayOfWeek = null; previewPolicy.openTimeKst = null; }
                if (p.clearGuestDailyCapacity) previewPolicy.guestDailyCapacity = null;
                return json(previewPolicy);
            }
            if (apiPath === '/crews/17/season-house/charges' && req.method === 'PUT') {
                const p = body ? JSON.parse(body) : {};
                const record = { id: Date.now(), chargeKind: p.chargeKind, memberSeasonPassId: p.memberSeasonPassId ?? null, reservationId: p.reservationId ?? null, amountKrw: p.amountKrw ?? 0, paymentStatus: p.paymentStatus ?? 'UNPAID', depositorName: p.depositorName ?? null, paidAt: p.paymentStatus === 'PAID' ? new Date().toISOString() : null, note: p.note ?? null };
                if (p.chargeKind === 'PASS_FEE' && p.memberSeasonPassId) previewMemberCharges[p.memberSeasonPassId] = record;
                if (p.chargeKind === 'STAY_USAGE_FEE' && p.reservationId) previewStayCharges[p.reservationId] = record;
                return json(record);
            }
            const noteMatch = apiPath.match(/^\/crews\/17\/season-house\/members\/(\d+)\/notes(?:\/(\d+))?$/);
            if (noteMatch) {
                const mid = Number(noteMatch[1]);
                previewNotes[mid] = previewNotes[mid] ?? [];
                if (req.method === 'GET') return json(previewNotes[mid]);
                if (req.method === 'POST') {
                    const p = body ? JSON.parse(body) : {};
                    const created = { id: nextPreviewNoteId++, membershipId: mid, category: p.category || 'GENERAL', occurredOn: p.occurredOn || null, penaltyDelta: Number(p.penaltyDelta || 0), content: p.content || '', authorName: '가상 회원', createdAt: new Date().toISOString() };
                    previewNotes[mid].unshift(created);
                    return json(created, 201);
                }
                if (req.method === 'DELETE' && noteMatch[2]) {
                    const nid = Number(noteMatch[2]);
                    previewNotes[mid] = previewNotes[mid].filter((n) => n.id !== nid);
                    return json(null);
                }
            }
            const approveMatch = apiPath.match(/^\/crews\/17\/season-house\/reservations\/(\d+)\/approval$/);
            if (approveMatch && req.method === 'POST') {
                const rid = Number(approveMatch[1]);
                const p = body ? JSON.parse(body) : {};
                previewGuestApproval[rid] = p.approve ? 'CONFIRMED' : 'REJECTED';
                return json(null);
            }
            const overrideMatch = apiPath.match(/^\/crews\/17\/season-house\/reservations\/(\d+)\/override$/);
            if (overrideMatch && req.method === 'DELETE') {
                previewCanceled.add(Number(overrideMatch[1]));
                return json(null);
            }
            try {
                await handle({ request: () => ({ url: () => `${origin}${req.url}`, method: () => req.method, headers: () => req.headers, postDataJSON: () => body ? JSON.parse(body) : {} }),
                    fulfill({ status, contentType, body: response }) { res.writeHead(status, { 'Content-Type': contentType }); res.end(response); },
                    abort() { res.writeHead(403); res.end(); }, continue() { res.writeHead(404); res.end(); },
                });
            } catch { res.writeHead(500); res.end('{"message":"Local fixture failed"}'); }
        });
    },
}] });
await server.listen();
console.log(`Local UI sandbox: ${origin} (synthetic data only)`);
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, async () => { await server.close(); process.exit(0); });
