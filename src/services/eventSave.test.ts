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

describe('atomic event configuration transport', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        http.post.mockResolvedValue(result({ id: 1 }));
        http.patch.mockResolvedValue(result({ id: 1 }));
        http.put.mockResolvedValue(result({ id: 1 }));
    });

    it('sends all settings once and publishes the new identity only after success', async () => {
        const pending = deferred(); http.post.mockReturnValue(pending.promise);
        const onCreated = vi.fn();
        const save = saveEventConfiguration({ ...configuration, onCreated });
        expect(onCreated).not.toHaveBeenCalled();
        expect(http.post).toHaveBeenCalledWith('/dashboard/events/configurations', {
            event: payload, consents: consentConfiguration, refundPolicy: 'Synthetic notice',
        });
        expect(http.put).not.toHaveBeenCalled();
        pending.resolve(result({ id: 1 }));
        await expect(save).resolves.toBe(1);
        expect(onCreated).toHaveBeenCalledWith(1);
    });

    it('updates the complete configuration with one request', async () => {
        await expect(saveEventConfiguration({ ...configuration, eventId: 1 })).resolves.toBe(1);
        expect(http.put).toHaveBeenCalledWith('/dashboard/events/1/configuration', {
            event: payload, consents: consentConfiguration, refundPolicy: 'Synthetic notice',
        });
        expect(http.patch).not.toHaveBeenCalled(); expect(http.post).not.toHaveBeenCalled();
    });

    it('never reports an invented identity after a failed create', async () => {
        const cause = new Error('Synthetic failure'); http.post.mockRejectedValue(cause);
        const onCreated = vi.fn();
        const failure = await saveEventConfiguration({ ...configuration, onCreated }).catch(error => error);
        expect(failure).toBeInstanceOf(EventSaveError);
        expect(failure).toMatchObject({ stage: 'event', eventId: null, originalError: cause });
        expect(onCreated).not.toHaveBeenCalled(); expect(http.put).not.toHaveBeenCalled();
    });

    it('keeps existing identity for a retry after update failure', async () => {
        http.put.mockRejectedValueOnce(new Error('Synthetic failure'));
        await expect(saveEventConfiguration({ ...configuration, eventId: 1 })).rejects.toMatchObject({ eventId: 1 });
        await expect(saveEventConfiguration({ ...configuration, eventId: 1 })).resolves.toBe(1);
        expect(http.post).not.toHaveBeenCalled();
    });

    it('leaves historical evidence alone for locked configurations', async () => {
        await saveEventConfiguration({ ...configuration, eventId: 1, configurationLocked: true });
        expect(http.patch).toHaveBeenCalledWith('/dashboard/events/1', payload);
        expect(http.put).not.toHaveBeenCalled();
    });

    it('normalizes an empty refund policy to null', async () => {
        await saveEventConfiguration({ ...configuration, eventId: 1, refundPolicy: '  ' });
        expect(http.put).toHaveBeenCalledWith('/dashboard/events/1/configuration', expect.objectContaining({ refundPolicy: null }));
    });
});
