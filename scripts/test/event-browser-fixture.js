/**
 * Load through playwright-cli run-code --filename, in a fresh isolated session.
 * This is a synthetic HTTP boundary, NOT a backend, role/security or staging acceptance test.
 * All external browser requests are blocked. No real credential or participant data is used.
 */
async (page) => {
    const origin = 'http://127.0.0.1:5187';
    const apiPrefix = '/__scenario_api';
    const instant = '2026-10-15T00:00:00.000Z';
    await page.clock.install({ time: new Date(instant) });
    const fixtures = new Map();
    const requests = [];
    const blockedExternal = [];
    const unknown = [];
    const dialogs = [];
    const items = [
        { id: 1, category: 'RISK_ACKNOWLEDGEMENT', title: 'Scenario acknowledgement',
            content: 'Synthetic document. No real consent or payment.', responseType: 'CHECKBOX',
            required: true, displayOrder: 0, documentVersion: 1, contentHash: 'a'.repeat(64) },
        { id: 2, category: 'EMERGENCY_CONTACT', title: 'Scenario phone', content: 'Synthetic phone only.',
            responseType: 'PHONE', required: true, displayOrder: 1, documentVersion: 1, contentHash: 'b'.repeat(64) },
    ];
    for (const id of [9101, 9102, 9103, 9104, 9105, 9106, 9107]) {
        fixtures.set(id, {
            id, title: `LOCAL SCENARIO ${id}`, description: 'Isolated local browser test.',
            activityType: 'EVENT', planningMode: 'MANAGER_PLANNED',
            startsAt: '2026-10-16T18:00:00', applicationStartsAt: null,
            locationName: 'Synthetic venue', locationAddress: null, capacity: 2,
            consentWindowMinutes: 10, status: 'OPEN', visibilityType: 'PUBLIC',
            joinPolicy: id === 9102 ? 'APPROVAL_REQUIRED' : 'INSTANT',
            organizerGroupId: 1, organizerGroupName: 'Synthetic hosts', kusbfAssociated: false,
            paymentRequired: true, participationFee: 15000, paymentCurrency: 'KRW',
            paymentDeadlineAt: '2026-10-16T12:00:00', joinedCount: 0, currentUserStatus: null,
            drafts: [], responses: [], dueAt: '2026-10-15T09:10:00',
        });
    }
    fixtures.get(9104).applicationStartsAt = '2026-10-15T09:05:00';
    fixtures.get(9105).joinedCount = 2;
    fixtures.get(9106).status = 'CLOSED';

    await page.context().addInitScript(() => {
        localStorage.setItem('accessToken', 'synthetic-browser-scenario-not-a-real-token');
        localStorage.setItem('accountId', '99001');
        localStorage.setItem('autoLogin', 'true');
        for (const key of ['dev_role_override', 'dev_school_override', 'dev_crew_override', 'dev_event_data_mode']) {
            localStorage.removeItem(key);
        }
    });
    page.on('dialog', async dialog => {
        dialogs.push({ type: dialog.type(), message: dialog.message() });
        // Synthetic confirmation/alerts only, in this session's local application.
        await dialog.accept();
    });
    await page.route('**/*', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin !== origin) {
            blockedExternal.push(`${url.origin}${url.pathname}`);
            return route.abort('blockedbyclient');
        }
        if (!url.pathname.startsWith(apiPrefix)) return route.continue();
        const path = url.pathname.slice(apiPrefix.length);
        const method = request.method();
        const body = request.postDataJSON();
        requests.push({ path, method, body });
        const respond = (data, code = 200, message = 'Synthetic scenario') => route.fulfill({
            status: code, contentType: 'application/json', body: JSON.stringify({ code, message, data }),
        });
        if (path === '/users/me') return respond({ userId: 99001, name: 'Synthetic applicant',
            role: 'MEMBER', userType: 'REGULAR', isRegistered: true, crew: null });
        if (path === '/crews/my-applications') return respond([]);
        if (path === '/operations/context') return respond({ permissions: [] });
        if (path === '/admin/crews') return respond({ crews: [], schools: [], developerAccess: false });
        if (path === '/notifications/unread-count') return respond({ count: 0 });
        if (path === '/notifications') return respond({ items: [], unreadCount: 0 });
        if (path === '/schools') return respond([]);
        if (path === '/events') return respond(Array.from(fixtures.values()));
        const match = /^\/events\/(\d+)(.*)$/.exec(path);
        const event = match && fixtures.get(Number(match[1]));
        if (!event) {
            unknown.push({ path, method });
            return respond(null, 404, 'Unknown synthetic route');
        }
        const suffix = match[2];
        const sheet = () => ({ participantStatus: event.currentUserStatus, consentDueAt: event.dueAt,
            consentCompletedAt: event.currentUserStatus === 'JOINED' ? '2026-10-15T09:01:00' : null,
            items, responses: event.responses, drafts: event.drafts });
        if (suffix === '' && method === 'GET') return respond(event);
        if (suffix === '/refund-policy') return respond({ refundPolicy: 'Synthetic policy; no real bank transfer.' });
        if (suffix === '/join' && method === 'POST') {
            event.currentUserStatus = 'CONSENT_PENDING';
            event.joinedCount = event.joinPolicy === 'INSTANT' ? 1 : 0;
            return respond({ id: event.id, eventId: event.id, userId: 99001, status: event.currentUserStatus,
                consentDueAt: event.dueAt }, 201);
        }
        if (suffix === '/consents' && method === 'GET') return respond(sheet());
        if (suffix === '/consents/draft' && method === 'PUT') {
            if (event.currentUserStatus !== 'CONSENT_PENDING') return respond(null, 400, 'Not pending consent');
            event.drafts = body.responses.map(response => ({ ...response, updatedAt: '2026-10-15T09:01:00' }));
            return respond(sheet());
        }
        if (suffix === '/consents/responses' && method === 'POST') {
            if (event.id === 9103) {
                event.currentUserStatus = 'CANCELLED';
                event.joinedCount = 0;
                event.drafts = [];
                return respond(null, 400, 'Consent deadline has expired and the application was cancelled');
            }
            if (event.id === 9107) return respond(null, 400, 'Synthetic validation failure; application remains pending consent');
            event.responses = body.responses;
            event.drafts = [];
            event.currentUserStatus = event.joinPolicy === 'INSTANT' ? 'JOINED' : 'PENDING';
            return respond(sheet());
        }
        if (suffix === '/payment-info') {
            if (event.currentUserStatus !== 'JOINED') return respond(null, 403, 'Not joined');
            return respond({ paymentRequired: true, participationFee: 15000, paymentCurrency: 'KRW',
                bankName: 'SCENARIO ONLY', bankAccountNumber: 'NOT-A-REAL-ACCOUNT',
                bankAccountHolder: 'Synthetic fixture', paymentDeadlineAt: event.paymentDeadlineAt });
        }
        if (suffix === '/chat-access') {
            if (event.currentUserStatus !== 'JOINED') return respond(null, 403, 'Not joined');
            return respond({ chatUrl: 'https://example.invalid/scenario-chat', chatPasscode: null,
                chatInstructions: 'Synthetic link; do not open.' });
        }
        if (suffix === '/cancel' && method === 'POST') {
            event.currentUserStatus = 'CANCELLED';
            event.joinedCount = 0;
            event.drafts = [];
            return respond({ id: event.id, eventId: event.id, userId: 99001, status: 'CANCELLED' });
        }
        unknown.push({ path, method });
        return respond(null, 404, 'Unknown synthetic route');
    });
    // Expose sanitized diagnostics through a synthetic same-origin endpoint, never app state.
    await page.route(`${origin}/__scenario_diagnostics`, route => route.fulfill({
        contentType: 'application/json', body: JSON.stringify({ requests, unknown, blockedExternal, dialogs }),
    }));
    return { origin, eventIds: Array.from(fixtures.keys()), clock: instant, externalRequests: 'blocked' };
}
