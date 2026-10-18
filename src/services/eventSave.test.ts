import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConsentConfigurationInput } from '../types/api';
import type { CreateEventPayload } from './event';

const http = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn(), put: vi.fn() }));
vi.mock('../lib/axios', () => ({ default: http }));
vi.mock('./devMocks', async original => ({ ...await original<typeof import('./devMocks')>(), isDevMode: () => false }));
import { EventSaveError, saveEventConfiguration } from './eventSave';

const payload: CreateEventPayload = { title: 'Synthetic draft', startsAt: '2026-10-25T18:00:00',
    planningMode: 'MANAGER_PLANNED', capacity: 2, visibilityType: 'LINK_ONLY', joinPolicy: 'INSTANT', organizerGroupId: 2 };
const consentConfiguration: ConsentConfigurationInput = { consentWindowMinutes: 10, items: [{
    category: 'OTHER', title: 'TEST ONLY', content: 'No legal effect.', responseType: 'CHECKBOX', required: true, displayOrder: 0,
}] };
const configuration = { payload, consentConfiguration, refundPolicy: '  Synthetic notice  ' };
const result = (data: unknown = {}) => ({ data: { data } });
function deferred() {
    let resolve!: (value: ReturnType<typeof result>) => void;
    const promise = new Promise<ReturnType<typeof result>>(done => { resolve = done; });
    return { promise, resolve };
}

describe('sequential event configuration transport', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        http.post.mockResolvedValue(result({ id: 1 }));
        http.patch.mockResolvedValue(result({ id: 1 }));
        http.put.mockResolvedValue(result());
    });

    it('retains the created identity before consent, and waits for consent commit before refund', async () => {
        const consent = deferred();
        http.put.mockReturnValueOnce(consent.promise).mockResolvedValue(result());
        const onCreated = vi.fn();
        const save = saveEventConfiguration({ ...configuration, onCreated });
        await vi.waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
        expect(onCreated).toHaveBeenCalledWith(1);
        expect(http.put).toHaveBeenLastCalledWith('/dashboard/events/1/consents', consentConfiguration);
        consent.resolve(result());
        await expect(save).resolves.toBe(1);
        expect(http.put).toHaveBeenLastCalledWith('/dashboard/events/1/refund-policy', { refundPolicy: 'Synthetic notice' });
    });

    it('waits for the existing event update before either configuration write', async () => {
        const update = deferred();
        http.patch.mockReturnValue(update.promise);
        const save = saveEventConfiguration({ ...configuration, eventId: 1 });
        expect(http.put).not.toHaveBeenCalled();
        update.resolve(result({ id: 1 }));
        await expect(save).resolves.toBe(1);
        expect(http.post).not.toHaveBeenCalled();
        expect(http.patch).toHaveBeenCalledWith('/dashboard/events/1', payload);
    });

    it.each(['event', 'consents', 'refund'] as const)('reports a %s failure without pretending the whole workflow is atomic', async stage => {
        const cause = new Error('Synthetic failure');
        if (stage === 'event') http.post.mockRejectedValue(cause);
        else if (stage === 'consents') http.put.mockRejectedValueOnce(cause);
        else http.put.mockResolvedValueOnce(result()).mockRejectedValueOnce(cause);
        const onCreated = vi.fn();
        const failure = await saveEventConfiguration({ ...configuration, onCreated }).catch(error => error);
        expect(failure).toBeInstanceOf(EventSaveError);
        expect(failure).toMatchObject({ stage, eventId: stage === 'event' ? null : 1, originalError: cause });
        expect(onCreated).toHaveBeenCalledTimes(stage === 'event' ? 0 : 1);
        expect(http.put).toHaveBeenCalledTimes(stage === 'event' ? 0 : stage === 'consents' ? 1 : 2);
    });

    it('reconciles the same draft after a partial failure, never POSTing a second event', async () => {
        let eventId: number | null = null;
        http.put.mockRejectedValueOnce(new Error('Synthetic consent failure'));
        await expect(saveEventConfiguration({ ...configuration, onCreated: id => { eventId = id; } })).rejects.toBeInstanceOf(EventSaveError);
        expect(eventId).toBe(1);
        await expect(saveEventConfiguration({ ...configuration, eventId: eventId! })).resolves.toBe(1);
        expect(http.post).toHaveBeenCalledTimes(1);
        expect(http.patch).toHaveBeenCalledWith('/dashboard/events/1', payload);
    });

    it('normalizes an empty refund policy to null', async () => {
        await saveEventConfiguration({ ...configuration, eventId: 1, refundPolicy: '  ' });
        expect(http.put).toHaveBeenLastCalledWith('/dashboard/events/1/refund-policy', { refundPolicy: null });
    });
});
