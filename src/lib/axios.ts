import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
    clearAuthSession,
    getAuthSessionRevision,
    getRefreshToken,
    getSignupToken,
    saveAuthTokens,
} from './session';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
});

interface AuthSessionSnapshot {
    accessToken: string | null;
    refreshToken: string | null;
    revision: number;
}

type SessionRequest = InternalAxiosRequestConfig & {
    _authRetry?: boolean;
    _authSessionRevision?: number;
};

const currentSession = (): AuthSessionSnapshot => ({
    accessToken: getSignupToken(),
    refreshToken: getRefreshToken(),
    revision: getAuthSessionRevision(),
});

const sameSession = (left: AuthSessionSnapshot, right: AuthSessionSnapshot) => (
    left.revision === right.revision
    && left.accessToken === right.accessToken
    && left.refreshToken === right.refreshToken
);

const invalidateSession = (session: AuthSessionSnapshot) => {
    if (!sameSession(session, currentSession())) return;
    clearAuthSession();
    if (window.location.pathname !== '/') window.location.href = '/';
};

let pendingRefresh: { session: AuthSessionSnapshot; promise: Promise<AuthSessionSnapshot> } | null = null;

const refreshSession = async (session: AuthSessionSnapshot): Promise<AuthSessionSnapshot> => {
    let response;
    try {
        // Keep refresh outside apiClient so it cannot intercept itself. A finite
        // timeout releases every waiter when the connection stops responding.
        response = await axios.post<{
            code?: number;
            data?: { accessToken?: unknown; refreshToken?: unknown };
        }>(
            `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/refresh`,
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.refreshToken}`,
                },
                timeout: 15_000,
            },
        );
    } catch (error) {
        // An offline device, timeout or unavailable server does not establish
        // that a refresh credential is invalid. Surface the failure and allow a
        // later explicit retry; never replay an ambiguous network-failed write.
        if (axios.isAxiosError(error) && [400, 401, 403].includes(error.response?.status ?? 0)) {
            invalidateSession(session);
        }
        throw error;
    }

    if (!sameSession(session, currentSession())) {
        throw new axios.CanceledError('Authentication session changed');
    }
    const data = response.data?.data;
    if (response.data?.code !== 200
        || typeof data?.accessToken !== 'string' || !data.accessToken.trim()
        || typeof data?.refreshToken !== 'string' || !data.refreshToken.trim()) {
        throw new Error('Invalid refresh response format');
    }
    saveAuthTokens(data.accessToken, data.refreshToken);
    return currentSession();
};

const getRefreshedSession = (session: AuthSessionSnapshot) => {
    if (pendingRefresh && sameSession(pendingRefresh.session, session)) return pendingRefresh.promise;

    const flight = { session, promise: refreshSession(session) };
    pendingRefresh = flight;
    const release = () => { if (pendingRefresh === flight) pendingRefresh = null; };
    // Both handlers consume cleanup without creating an unhandled rejection.
    void flight.promise.then(release, release);
    return flight.promise;
};

apiClient.interceptors.request.use((config: SessionRequest) => {
    const session = currentSession();
    if (config._authRetry && (config._authSessionRevision !== session.revision
        || !session.accessToken || config.headers.get('Authorization') !== `Bearer ${session.accessToken}`)) {
        throw new axios.CanceledError('Authentication session changed');
    }
    // Onboarding uses its temporary token. Explicit credentials (notably Kakao)
    // must not be replaced or refreshed as a BoardBuddy session.
    if (session.accessToken && !config.headers.has('Authorization')) {
        config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
    // Only the revision is attached to request configs: never copy the refresh
    // credential into a config that a page may log when handling an error.
    config._authSessionRevision = session.accessToken
        && config.headers.get('Authorization') === `Bearer ${session.accessToken}`
        ? session.revision : undefined;
    return config;
});

apiClient.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
        const request = error.config as SessionRequest | undefined;
        const body = error.response?.data as { code?: number; message?: unknown } | undefined;
        const expired = error.response?.status === 401
            && (body?.code === 401 || (typeof body?.message === 'string' && body.message.includes('만료된 JWT 토큰')));
        const session = currentSession();
        if (!expired || !request || !session.accessToken
            || request._authSessionRevision !== session.revision
            || request.headers.get('Authorization') !== `Bearer ${session.accessToken}`) throw error;

        if (request._authRetry || !session.refreshToken) {
            invalidateSession(session);
            throw error;
        }

        // Every waiter gets the same one-replay limit, not just the first request.
        request._authRetry = true;
        const refreshed = await getRefreshedSession(session);
        if (!sameSession(refreshed, currentSession())) {
            throw new axios.CanceledError('Authentication session changed');
        }
        request.headers.Authorization = `Bearer ${refreshed.accessToken}`;
        request._authSessionRevision = refreshed.revision;
        return apiClient(request);
    },
);

export default apiClient;
