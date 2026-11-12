import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConsentResponseInput, ParticipantStatus } from '../types/api';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() }));
vi.mock('../lib/axios', () => ({ default: http }));
vi.mock('../lib/session', async importOriginal => ({
    ...await importOriginal<typeof import('../lib/session')>(),
    getSignupToken: () => 'synthetic-scenario-token',
}));
vi.mock('./devMocks', async importOriginal => ({
    ...await importOriginal<typeof import('./devMocks')>(),
    isDevMode: () => false,
}));

import { cancelEvent, getEventConsents, getEventPaymentInfo, joinEvent, listEventsPage,
    saveEventConsentDraft, saveEventConsentDraftKeepalive, submitEventConsents } from './event';

const responses: ConsentResponseInput[] = [{
    consentItemId: 101, documentVersion: 3, contentHash: 'a'.repeat(64), agreed: true, responseText: null,
}];

describe('event HTTP contracts (not a browser or live-server acceptance test)', () => {
    beforeEach(() => { vi.resetAllMocks(); });
    afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

    it('preserves bounded page metadata and separates dashboard access', async () => {
        const page = { items: [], page: 2, size: 20, hasNext: true };
        http.get.mockResolvedValue({ data: { data: page } });
        expect(await listEventsPage(2, 20, true)).toEqual(page);
        expect(http.get).toHaveBeenCalledWith('/dashboard/events/page', { params: { page: 2, size: 20 } });
    });

    it.each([[-1, 30], [0, 101], [0, 0], [0.5, 20]])('rejects invalid page %s size %s', async (page, size) => {
        await expect(listEventsPage(page, size)).rejects.toThrow('Invalid event page');
        expect(http.get).not.toHaveBeenCalled();
    });

    it.each<ParticipantStatus>(['CONSENT_PENDING', 'PENDING', 'JOINED'])(
        'preserves server join state %s instead of assuming automatic acceptance', async status => {
            const participant = { id: 42, eventId: 10, userId: 20, status };
            http.post.mockResolvedValue({ data: { data: participant } });
            expect(await joinEvent(10)).toEqual(participant);
            expect(http.post).toHaveBeenCalledWith('/events/10/join');
        },
    );

    it('sends final answers atomically with exact document version/hash', async () => {
        const state = { participantStatus: 'PENDING', responses, drafts: [], items: [] };
        http.post.mockResolvedValue({ data: { data: state } });
        expect(await submitEventConsents(10, responses)).toEqual(state);
        expect(http.post).toHaveBeenCalledWith('/events/10/consents/responses', { responses });
    });

    it('round-trips partial server drafts separately from final evidence', async () => {
        const state = { participantStatus: 'CONSENT_PENDING', drafts: responses, responses: [], items: [] };
        http.put.mockResolvedValue({ data: { data: state } });
        http.get.mockResolvedValue({ data: { data: state } });
        expect(await saveEventConsentDraft(10, responses)).toEqual(state);
        expect(await getEventConsents(10)).toEqual(state);
        expect(http.put).toHaveBeenCalledWith('/events/10/consents/draft', { responses });
        expect(http.get).toHaveBeenCalledWith('/events/10/consents');
    });

    it('uses the authenticated keepalive draft endpoint, never the final submission endpoint', () => {
        vi.stubEnv('VITE_API_BASE_URL', 'https://scenario.example.invalid/api');
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchMock);
        saveEventConsentDraftKeepalive(10, responses);
        expect(fetchMock).toHaveBeenCalledWith('https://scenario.example.invalid/api/events/10/consents/draft', {
            method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic-scenario-token' },
            credentials: 'include', keepalive: true, body: JSON.stringify({ responses }),
        });
    });

    it('propagates consent expiry so the page can refresh instead of faking success', async () => {
        const expired = new Error('Consent deadline expired');
        http.post.mockRejectedValue(expired);
        await expect(submitEventConsents(10, responses)).rejects.toBe(expired);
    });

    it('does not convert forbidden bank-detail access into empty/successful payment information', async () => {
        const forbidden = new Error('403: Joined participants only');
        http.get.mockRejectedValue(forbidden);
        await expect(getEventPaymentInfo(10)).rejects.toBe(forbidden);
        expect(http.get).toHaveBeenCalledWith('/events/10/payment-info');
    });

    it('uses the cancellation endpoint and preserves the server result', async () => {
        const participant = { id: 42, status: 'CANCELLED', cancellationReason: 'PARTICIPANT_REQUEST' };
        http.post.mockResolvedValue({ data: { data: participant } });
        expect(await cancelEvent(10)).toEqual(participant);
        expect(http.post).toHaveBeenCalledWith('/events/10/cancel');
    });
});
