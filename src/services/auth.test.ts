import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ post: vi.fn(), clear: vi.fn(), refresh: vi.fn() }));
vi.mock('axios', () => ({ default: { post: mocks.post } }));
vi.mock('../lib/session', () => ({ clearAuthSession: mocks.clear, getRefreshToken: mocks.refresh }));
import { signOut } from './auth';

describe('server-backed sign out', () => {
    beforeEach(() => { vi.resetAllMocks(); mocks.refresh.mockReturnValue('synthetic-refresh'); });
    it('clears this browser immediately and awaits remote revocation before navigation can finish', async () => {
        let resolve!: () => void;
        mocks.post.mockImplementation(() => {
            expect(mocks.clear).toHaveBeenCalledOnce();
            return new Promise<void>(done => { resolve = done; });
        });
        let finished = false;
        const pending = signOut().then(() => { finished = true; });
        expect(finished).toBe(false);
        expect(mocks.post).toHaveBeenCalledWith(expect.stringMatching(/\/auth\/logout$/), {}, {
            headers: { Authorization: 'Bearer synthetic-refresh' }, timeout: 5_000,
        });
        resolve(); await pending; expect(finished).toBe(true);
    });
    it('does not restore credentials when the device is offline', async () => {
        mocks.post.mockRejectedValue(new Error('offline'));
        await expect(signOut()).resolves.toBeUndefined();
        expect(mocks.clear).toHaveBeenCalledOnce();
    });
    it('can sign out an incomplete signup without a refresh token', async () => {
        mocks.refresh.mockReturnValue(null);
        await signOut(); expect(mocks.clear).toHaveBeenCalledOnce(); expect(mocks.post).not.toHaveBeenCalled();
    });
});
