export const installOnboardingBoundary = async (page, { origin = 'http://127.0.0.1:5188' } = {}) => {
    await page.clock.install({ time: new Date('2026-11-13T00:00:00.000Z') });
    const state = { token: 'a'.repeat(43), newUser: true, signupPrefill: null, applied: false, approved: false, unavailable: false, role: 'CREW_MEMBER',
        requests: [], invitations: [], groups: [], profileBody: null, errors: [], unknown: [], traffic: [], credentialInUrl: false, publicAuth: false };
    state.managedEvent = { id: 9101, title: '함께하는 주말 이벤트', description: '가상 운영 이벤트', activityType: 'EVENT', planningMode: 'MANAGER_PLANNED', organizerGroupId: 1, organizerGroupName: '로컬 호스트', startsAt: '2027-01-01T09:00:00', endsAt: '2027-01-01T18:00:00', capacity: 20, joinedCount: 0, status: 'DRAFT', visibilityType: 'PUBLIC', joinPolicy: 'APPROVAL_REQUIRED', kusbfAssociated: false };
    state.participants = [{ id: 71, userId: 99102, userName: '가상 부원', status: 'PENDING', createdAt: '2026-11-13T00:00:00', paymentStatus: null, managerMemo: '' }];
    state.writes = [];
    page.on('pageerror', error => state.errors.push(error.message));
    await page.context().addInitScript(() => {
        window.Kakao = { isInitialized: () => true, init() {}, Auth: { login: ({ success }) => { queueMicrotask(() => success({ access_token: 'synthetic-provider-only' })); } } };
    });
    await page.route('**/*', async route => {
        const request = route.request(); const url = new URL(request.url());
        if (url.origin !== origin) return route.abort('blockedbyclient');
        if (!url.pathname.startsWith('/__scenario_api')) return route.continue();
        if (request.url().includes(state.token)) state.credentialInUrl = true;
        const path = url.pathname.slice('/__scenario_api'.length); const method = request.method();
        state.traffic.push({ path, method });
        const respond = (data, status = 200, message = 'Synthetic scenario') => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ code: status, message, data }) });
        if (path === '/public/crew-invitations/preview') {
            if (request.headers().authorization) state.publicAuth = true;
            return state.unavailable ? respond(null, 404, 'Invitation is unavailable') : respond({ crewName: '가상 크루', schoolName: '한국대학교', expiresAt: '2027-01-01T00:00:00', approvalRequired: true });
        }
        if (path === '/crew-invitations/accept') { state.applied = true; return respond({ crewId: 17, status: state.approved ? 'JOINED' : 'PENDING' }); }
        if (path === '/auth/social/kakao') return respond({ accountId: 99101, accessToken: state.newUser ? 'synthetic-pending' : 'synthetic-active', refreshToken: state.newUser ? null : 'synthetic-refresh', status: state.newUser ? 'PENDING_PROFILE' : 'ACTIVE', userType: 'REGULAR', signupPrefill: state.signupPrefill });
        if (path === '/signup-policy') return respond({ studentEnabled: true, regularEnabled: true, version: 1 });
        if (path === '/schools') return respond([
            { id: 1, name: '한국대학교', schoolCode: 'MAIN', aliases: ['한국대'], emailDomains: [] },
            { id: 2, name: '한국대학교', schoolCode: 'CAMPUS', aliases: ['제2캠퍼스'], emailDomains: ['campus.ac.kr', 'students.mail.campus.ac.kr'] },
        ]);
        if (path === '/accounts/phone-verifications') return respond({ challengeId: 'synthetic-challenge', retryAfterSeconds: 0 }, 202);
        if (path === '/accounts/phone-verifications/synthetic-challenge/confirm') return respond({ accountId: 99101, accessToken: 'synthetic-verified', resolution: 'VERIFIED', status: 'PENDING_PROFILE' });
        if (path === '/accounts/99101/profile') { state.profileBody = request.postDataJSON(); return respond({ accessToken: 'synthetic-active', refreshToken: 'synthetic-refresh' }); }
        if (path === '/accounts/onboarding') return respond({ verifiedPhoneNumber: null });
        if (path === '/users/me') return respond({ userId: 99101, name: '가상 회원', role: state.role, userType: 'REGULAR', isRegistered: true, crew: state.approved ? { crewId: 17, crewName: '가상 크루' } : null });
        if (path === '/crews/17') return respond({ crewId: 17, crew_id: 17, crewName: '가상 크루', name: '가상 크루', univ: '한국대학교', status: 'ACTIVE', role: state.role, member_count: 2, seasonHouseActive: false });
        if (path === '/crews/17/managers') return respond([]);
        if (path === '/operations/context') return respond({ permissions: state.role === 'CREW_CAPTAIN' ? ['PARTIES_CREATE', 'PARTIES_MANAGE', 'EVENT_GROUPS_CREATE', 'EVENT_GROUPS_VIEW', 'EVENT_GROUPS_MANAGE'] : [] });
        if (path === '/admin/crews' && method === 'POST') { const item = { id: 17, name: request.postDataJSON().name, approvalStatus: 'PENDING', status: 'INACTIVE', createdAt: '2026-11-13T00:00:00' }; state.requests.push(item); return respond(item, 201); }
        if (path === '/admin/crews') return respond({ crews: state.requests, schools: [], developerAccess: false });
        if (path === '/notifications/unread-count') return respond({ count: 0 });
        if (path === '/notifications') return respond({ items: [], unreadCount: 0 });
        if (path === '/crews/my-applications') return respond(state.applied ? [{ application_id: 71, crew_id: 17, crew_name: '가상 크루', status: state.approved ? 'APPROVED' : 'PENDING' }] : []);
        if (path === '/dashboard/organizer-groups') return respond(state.groups);
        if (path === '/dashboard/organizer-group-invitations') return respond([]);
        if (path === '/crews/17/invitations' && method === 'POST') {
            const item = { id: `synthetic-${state.invitations.length}`, expiresAt: '2027-01-01T00:00:00', maxUses: request.postDataJSON().maxUses, useCount: 0, revokedAt: null, createdAt: '2026-11-13T00:00:00' };
            state.invitations.unshift(item); return respond({ invitation: item, token: 'b'.repeat(43) });
        }
        if (path === '/crews/17/invitations') return respond(state.invitations);
        if (path.startsWith('/crews/17/invitations/') && method === 'DELETE') { state.invitations.find(item => path.endsWith(item.id)).revokedAt = '2026-11-13T01:00:00'; return respond(null); }
        if (path === '/dashboard/events') return respond([state.managedEvent]);
        if (path === '/dashboard/events/9101' && method === 'PATCH') { const body = request.postDataJSON(); state.writes.push({ path, body }); Object.assign(state.managedEvent, body); return respond(state.managedEvent); }
        if (path === '/dashboard/events/9101') return respond(state.managedEvent);
        if (path === '/dashboard/events/9101/participants') return respond(state.participants);
        if (path.startsWith('/dashboard/events/9101/participants/') && method === 'PATCH') { const body = request.postDataJSON(); state.writes.push({ path, body }); Object.assign(state.participants[0], body); state.managedEvent.joinedCount = state.participants.filter(item => item.status === 'JOINED').length; return respond(state.participants[0]); }
        if (path === '/events/9101/chat-access') return respond({ chatUrl: null, chatPasscode: null, chatInstructions: null });
        if (path === '/dashboard/events/9101/consents') return respond({ items: [], consentWindowMinutes: null, configurationLocked: true });
        if (path === '/dashboard/events/9101/refund-policy') return respond({ refundPolicy: '' });
        if (path === '/dashboard/events/9101/consent-responses') return respond({ eventId: 9101, eventTitle: state.managedEvent.title, items: [], participants: [], canRevealSensitive: false, canExport: false, privateValuesRevealed: false });
        if (path === '/crews/17/calendar') { const month = url.searchParams.get('date').slice(0, 7); return respond({ calendar: [{ date: `${month}-13`, occupancy_status: 'LOW' }, { date: `${month}-14`, occupancy_status: 'MEDIUM' }, { date: `${month}-15`, occupancy_status: 'HIGH' }], my_reservations: [] }); }
        if (path === '/events/9101') return respond({ id: 9101, title: '가상 초대 행사', description: 'Synthetic event', activityType: 'EVENT', planningMode: 'MANAGER_PLANNED', startsAt: '2027-01-01T09:00:00', capacity: 20, joinedCount: 0, status: 'OPEN', visibilityType: 'PUBLIC', joinPolicy: 'APPROVAL_REQUIRED', organizerGroupId: 1, organizerGroupName: 'Synthetic hosts', kusbfAssociated: false, paymentRequired: false, currentUserStatus: null });
        if (path === '/events/9101/refund-policy') return respond({ refundPolicy: '' });
        if (path === '/crews/discover') return respond([{ crewId: 17, crewName: '가상 크루', crewCode: 'TEST', schoolName: '한국대학교', schoolId: 1, memberCount: 2, schoolVerificationRequired: false }]);
        if (path === '/crews/17/applications' && method === 'POST') { state.applied = true; return respond({ crewId: 17, status: 'PENDING' }); }
        if (path === '/events') return respond([]);
        state.unknown.push({ method, path }); return respond(null, 404);
    });
    return state;
};
