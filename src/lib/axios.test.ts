// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosAdapter, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

describe('session recovery (synthetic adapters only; no network or real credentials)', () => {
    let client: AxiosInstance;
    let axios: typeof import('axios').default;
    let session: typeof import('./session');
    let refresh: ReturnType<typeof vi.spyOn>;

    const deferred = <T,>() => {
        let resolve!: (value: T) => void;
        let reject!: (error: unknown) => void;
        const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
        return { promise, resolve, reject };
    };
    const tokens = (accessToken = 'synthetic-new-access', refreshToken = 'synthetic-new-refresh') => ({
        data: { code: 200, data: { accessToken, refreshToken } },
    });
    const httpError = (config: InternalAxiosRequestConfig, status = 401) => new axios.AxiosError(
        'Synthetic request failure', 'ERR_BAD_RESPONSE', config, undefined,
        { status, statusText: 'Synthetic failure', data: { code: status, message: 'Expired JWT token' }, headers: {}, config },
    );
    const success = (config: InternalAxiosRequestConfig) => ({
        data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config,
    });
    const install = (adapter: AxiosAdapter) => { client.defaults.adapter = adapter; };

    beforeEach(async () => {
        vi.resetModules();
        localStorage.clear();
        axios = (await import('axios')).default;
        session = await import('./session');
        session.saveAuthTokens('synthetic-old-access', 'synthetic-old-refresh');
        client = (await import('./axios')).default;
        refresh = vi.spyOn(axios, 'post');
        // Any unexpected refresh fails locally instead of reaching an HTTP adapter.
        refresh.mockRejectedValue(new Error('Unexpected synthetic refresh'));
    });
    afterEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    it('refreshes simultaneous expired requests once and replays each with the new token', async () => {
        const gate = deferred<ReturnType<typeof tokens>>();
        refresh.mockReturnValue(gate.promise);
        const seen: string[] = [];
        install(async config => {
            seen.push(String(config.headers.Authorization));
            if (config.headers.Authorization === 'Bearer synthetic-old-access') throw httpError(config);
            return success(config);
        });
        const results = Promise.all([client.get('/events/1'), client.get('/events/2')]);
        await vi.waitFor(() => expect(seen).toHaveLength(2));
        expect(refresh).toHaveBeenCalledOnce();
        gate.resolve(tokens());
        await expect(results).resolves.toHaveLength(2);
        expect(seen).toEqual([
            'Bearer synthetic-old-access', 'Bearer synthetic-old-access',
            'Bearer synthetic-new-access', 'Bearer synthetic-new-access',
        ]);
        expect(session.getRefreshToken()).toBe('synthetic-new-refresh');
        expect(refresh).toHaveBeenCalledWith(expect.stringMatching(/\/auth\/refresh$/), {}, expect.objectContaining({
            timeout: 15_000, headers: expect.objectContaining({ Authorization: 'Bearer synthetic-old-refresh' }),
        }));
    });

    it('limits every queued request to one auth replay when the renewed token is also rejected', async () => {
        const gate = deferred<ReturnType<typeof tokens>>();
        refresh.mockReturnValueOnce(gate.promise).mockResolvedValue(tokens('synthetic-another-access'));
        let attempts = 0;
        install(async config => { attempts += 1; throw httpError(config); });
        const results = Promise.allSettled([client.get('/events/1'), client.get('/events/2')]);
        await vi.waitFor(() => expect(attempts).toBe(2));
        gate.resolve(tokens());
        expect((await results).every(result => result.status === 'rejected')).toBe(true);
        expect(refresh).toHaveBeenCalledOnce();
        expect(attempts).toBe(4);
        expect(session.getAccessToken()).toBeNull();
    });

    it.each(['offline', 'timeout', 'server unavailable'])(
        'preserves the session after a transient refresh failure: %s', async reason => {
            const failure = reason === 'server unavailable'
                ? httpError({ headers: new axios.AxiosHeaders() } as InternalAxiosRequestConfig, 503)
                : new axios.AxiosError('Synthetic interruption', reason === 'timeout' ? 'ECONNABORTED' : 'ERR_NETWORK');
            refresh.mockRejectedValue(failure);
            install(async config => { throw httpError(config); });
            await expect(client.get('/events/1')).rejects.toBe(failure);
            expect(session.getAccessToken()).toBe('synthetic-old-access');
            expect(session.getRefreshToken()).toBe('synthetic-old-refresh');
        },
    );

    it('can recover on a later explicit request after an offline refresh, without retrying a write automatically', async () => {
        refresh.mockRejectedValueOnce(new axios.AxiosError('Synthetic offline', 'ERR_NETWORK')).mockResolvedValueOnce(tokens());
        let writes = 0;
        install(async config => {
            if (config.method === 'post') writes += 1;
            if (config.headers.Authorization === 'Bearer synthetic-old-access') throw httpError(config);
            return success(config);
        });
        await expect(client.post('/events/1/consents', { synthetic: true })).rejects.toThrow('Synthetic offline');
        expect(writes).toBe(1);
        await expect(client.get('/events/1')).resolves.toMatchObject({ status: 200 });
        expect(writes).toBe(1);
        expect(refresh).toHaveBeenCalledTimes(2);
    });

    it.each([400, 401, 403])('clears only the current session on definitive refresh rejection %s', async status => {
        refresh.mockRejectedValue(httpError({ headers: new axios.AxiosHeaders() } as InternalAxiosRequestConfig, status));
        install(async config => { throw httpError(config); });
        await expect(client.get('/events/1')).rejects.toBeInstanceOf(axios.AxiosError);
        expect(session.getAccessToken()).toBeNull();
        expect(session.getRefreshToken()).toBeNull();
    });

    it('does not resurrect a logged-out session when a delayed refresh succeeds', async () => {
        const gate = deferred<ReturnType<typeof tokens>>();
        refresh.mockReturnValue(gate.promise);
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => { throw httpError(config); });
        install(adapter);
        const result = client.get('/events/1').catch(error => error);
        await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce());
        session.clearAuthSession();
        gate.resolve(tokens());
        expect(await result).toBeInstanceOf(Error);
        expect(session.getAccessToken()).toBeNull();
        expect(session.getRefreshToken()).toBeNull();
        expect(adapter).toHaveBeenCalledOnce();
    });

    it.each(['success', 'rejection'])('does not overwrite or clear a newer login after an older refresh %s', async outcome => {
        const gate = deferred<ReturnType<typeof tokens>>();
        refresh.mockReturnValue(gate.promise);
        install(async config => { throw httpError(config); });
        const result = client.get('/events/1').catch(error => error);
        await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce());
        session.saveAuthTokens('synthetic-other-access', 'synthetic-other-refresh');
        if (outcome === 'success') gate.resolve(tokens());
        else gate.reject(httpError({ headers: new axios.AxiosHeaders() } as InternalAxiosRequestConfig));
        expect(await result).toBeInstanceOf(Error);
        expect(session.getAccessToken()).toBe('synthetic-other-access');
        expect(session.getRefreshToken()).toBe('synthetic-other-refresh');
    });

    it('does not replace an explicit provider credential or try BoardBuddy refresh for its rejection', async () => {
        install(async config => {
            expect(config.headers.Authorization).toBe('Bearer synthetic-provider-token');
            throw httpError(config);
        });
        await expect(client.post('/auth/social/kakao', {}, {
            headers: { Authorization: 'Bearer synthetic-provider-token' },
        })).rejects.toBeInstanceOf(axios.AxiosError);
        expect(refresh).not.toHaveBeenCalled();
        expect(session.getAccessToken()).toBe('synthetic-old-access');
    });

    it('does not clear a new login when a delayed request from the previous session returns 401', async () => {
        const gate = deferred<void>();
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => { await gate.promise; throw httpError(config); });
        install(adapter);
        const result = client.get('/events/1').catch(error => error);
        await vi.waitFor(() => expect(adapter).toHaveBeenCalledOnce());
        session.saveAuthTokens('synthetic-other-access', 'synthetic-other-refresh');
        gate.resolve();
        await result;
        expect(refresh).not.toHaveBeenCalled();
        expect(session.getAccessToken()).toBe('synthetic-other-access');
    });

    it('clears an expired signup session without making an impossible refresh request', async () => {
        session.saveTempAccessToken('synthetic-signup-token');
        install(async config => { throw httpError(config); });
        await expect(client.get('/schools')).rejects.toBeInstanceOf(axios.AxiosError);
        expect(refresh).not.toHaveBeenCalled();
        expect(session.getSignupToken()).toBeNull();
    });

    it.each([403, 500])('does not refresh or replay ordinary request failure %s', async status => {
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => { throw httpError(config, status); });
        install(adapter);
        await expect(client.post('/events/1/consents', { synthetic: true })).rejects.toBeInstanceOf(axios.AxiosError);
        expect(refresh).not.toHaveBeenCalled();
        expect(adapter).toHaveBeenCalledOnce();
    });

    it('rejects an incomplete refresh response without losing the existing recovery credential', async () => {
        refresh.mockResolvedValue({ data: { code: 200, data: { accessToken: 'synthetic-incomplete' } } });
        install(async config => {
            if (config.headers.Authorization === 'Bearer synthetic-old-access') throw httpError(config);
            return success(config);
        });
        await expect(client.get('/events/1')).rejects.toThrow();
        expect(session.getAccessToken()).toBe('synthetic-old-access');
        expect(session.getRefreshToken()).toBe('synthetic-old-refresh');
    });

    it('invalidates an old refresh even when a later login receives identical synthetic credentials', async () => {
        const gate = deferred<ReturnType<typeof tokens>>();
        refresh.mockReturnValue(gate.promise);
        install(async config => { throw httpError(config); });
        const result = client.get('/events/1').catch(error => error);
        await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce());
        session.clearAuthSession();
        session.saveAuthTokens('synthetic-old-access', 'synthetic-old-refresh');
        gate.resolve(tokens());
        expect(await result).toBeInstanceOf(axios.CanceledError);
        expect(session.getAccessToken()).toBe('synthetic-old-access');
    });

    it('does not let a previous session block refresh in a newer session', async () => {
        const oldRefresh = deferred<ReturnType<typeof tokens>>();
        const newRefresh = deferred<ReturnType<typeof tokens>>();
        refresh.mockReturnValueOnce(oldRefresh.promise).mockReturnValueOnce(newRefresh.promise);
        install(async config => {
            if (config.headers.Authorization === 'Bearer synthetic-new-session-access') return success(config);
            throw httpError(config);
        });
        const oldResult = client.get('/events/1').catch(error => error);
        await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce());
        session.saveAuthTokens('synthetic-other-access', 'synthetic-other-refresh');
        const newResult = client.get('/events/2');
        await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
        oldRefresh.reject(httpError({ headers: new axios.AxiosHeaders() } as InternalAxiosRequestConfig));
        await oldResult;
        newRefresh.resolve(tokens('synthetic-new-session-access', 'synthetic-new-session-refresh'));
        await expect(newResult).resolves.toMatchObject({ status: 200 });
        expect(session.getRefreshToken()).toBe('synthetic-new-session-refresh');
    });

    it('never attaches recovery credentials to ordinary request/error configs', async () => {
        install(async config => {
            expect(JSON.stringify(config)).not.toContain('synthetic-old-refresh');
            throw httpError(config, 500);
        });
        await expect(client.get('/events/1')).rejects.toBeInstanceOf(axios.AxiosError);
        expect(refresh).not.toHaveBeenCalled();
    });

    it('does not refresh signed-out requests', async () => {
        install(async config => { throw httpError(config); });
        session.clearAuthSession();
        await expect(client.get('/events/1')).rejects.toBeInstanceOf(axios.AxiosError);
        expect(refresh).not.toHaveBeenCalled();
    });

    it('never replays a write after an ambiguous transport failure', async () => {
        const adapter = vi.fn(async () => { throw new axios.AxiosError('Synthetic offline', 'ERR_NETWORK'); });
        install(adapter);
        await expect(client.post('/events/1/consents', { synthetic: true })).rejects.toThrow('Synthetic offline');
        expect(adapter).toHaveBeenCalledOnce();
        expect(refresh).not.toHaveBeenCalled();
        expect(session.getRefreshToken()).toBe('synthetic-old-refresh');
    });

    it('releases all queued callers on interruption and permits a fresh recovery attempt', async () => {
        const gate = deferred<ReturnType<typeof tokens>>();
        const failure = new axios.AxiosError('Synthetic offline', 'ERR_NETWORK');
        refresh.mockReturnValueOnce(gate.promise).mockResolvedValueOnce(tokens());
        let attempts = 0;
        install(async config => {
            attempts += 1;
            if (config.headers.Authorization === 'Bearer synthetic-old-access') throw httpError(config);
            return success(config);
        });
        const results = Promise.allSettled([client.get('/events/1'), client.get('/events/2')]);
        await vi.waitFor(() => expect(attempts).toBe(2));
        gate.reject(failure);
        expect(await results).toEqual([
            { status: 'rejected', reason: failure }, { status: 'rejected', reason: failure },
        ]);
        await expect(client.get('/events/1')).resolves.toMatchObject({ status: 200 });
        expect(refresh).toHaveBeenCalledTimes(2);
    });

    it('cancels a replay if logout happens before its request interceptor dispatches it', async () => {
        refresh.mockResolvedValue(tokens());
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => { throw httpError(config); });
        install(adapter);
        client.interceptors.request.use(config => {
            if ((config as InternalAxiosRequestConfig & { _authRetry?: boolean })._authRetry) session.clearAuthSession();
            return config;
        });
        await expect(client.get('/events/1')).rejects.toBeInstanceOf(axios.CanceledError);
        expect(adapter).toHaveBeenCalledOnce();
        expect(session.getAccessToken()).toBeNull();
    });

    it('does not reinterpret a malformed 401 payload as an authentication exception', async () => {
        let failure: InstanceType<typeof axios.AxiosError>;
        install(async config => {
            failure = httpError(config);
            failure.response!.data = { message: 123 };
            throw failure;
        });
        const result = await client.get('/events/1').catch(error => error);
        expect(result).toBe(failure!);
        expect(refresh).not.toHaveBeenCalled();
    });

    it('recognizes a current session bearer regardless of header-name casing', async () => {
        refresh.mockResolvedValue(tokens());
        install(async config => {
            if (config.headers.get('Authorization') === 'Bearer synthetic-old-access') throw httpError(config);
            expect(config.headers.get('Authorization')).toBe('Bearer synthetic-new-access');
            return success(config);
        });
        await expect(client.get('/events/1', {
            headers: { authorization: 'Bearer synthetic-old-access' },
        })).resolves.toMatchObject({ status: 200 });
        expect(refresh).toHaveBeenCalledOnce();
    });
});
