// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('../lib/axios', () => ({ default: http }));
vi.mock('../lib/session', () => ({ getDevCrewOverride: () => null, hasDevOverride: () => false }));

import { applyToCrew } from './crew';

describe('crew admission HTTP contract', () => {
    beforeEach(() => vi.resetAllMocks());

    it.each(['JOINED', 'PENDING'] as const)('preserves the backend %s outcome', async status => {
        const result = { crewId: 11, status };
        http.post.mockResolvedValue({ data: { data: result } });
        expect(await applyToCrew(11, '0123')).toEqual(result);
        expect(http.post).toHaveBeenCalledWith('/crews/11/applications', { crewPIN: '0123' });
    });

    it('treats an older backend empty response as pending review', async () => {
        http.post.mockResolvedValue({ data: { data: null } });
        expect(await applyToCrew(11, '0123')).toEqual({ crewId: 11, status: 'PENDING' });
    });

    it('propagates PIN rejection without inventing an admission', async () => {
        const error = new Error('Invalid crew PIN');
        http.post.mockRejectedValue(error);
        await expect(applyToCrew(11, '0000')).rejects.toBe(error);
    });
});
