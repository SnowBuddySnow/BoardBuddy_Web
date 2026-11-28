export const NAVER_AUTHORIZE_URL = 'https://nid.naver.com/oauth2.0/authorize';
const PENDING_NAVER_AUTH_KEY = 'bb.naver-oauth.v1';
const PENDING_NAVER_AUTH_MAX_AGE_MS = 10 * 60 * 1000;

export interface PendingNaverAuth {
    state: string;
    autoLogin: boolean;
    createdAt: number;
    invitationToken: string | null;
    invitationEventId?: number;
    organizerInviteToken?: string;
}

export interface NaverOAuthCallback {
    code: string | null;
    state: string | null;
    error: string | null;
    errorDescription: string | null;
}

export const isConfiguredNaverClientId = (value?: string | null): value is string => {
    const trimmed = value?.trim();
    if (!trimmed) return false;
    const normalized = trimmed.toLowerCase();
    return (
        !normalized.startsWith('local-')
        && !normalized.includes('your_')
        && !normalized.includes('your-')
        && !normalized.includes('change-this')
        && !normalized.includes('placeholder')
        && !normalized.includes('development-only')
    );
};

export const getConfiguredNaverClientId = (): string | null => {
    const value = import.meta.env.VITE_NAVER_CLIENT_ID as string | undefined;
    return isConfiguredNaverClientId(value) ? value.trim() : null;
};

export const getNaverRedirectUri = (): string => {
    const configured = (import.meta.env.VITE_NAVER_REDIRECT_URI as string | undefined)?.trim();
    if (configured) return configured;
    return `${window.location.origin}${window.location.pathname}`;
};

export const buildNaverAuthorizeUrl = (
    clientId: string,
    redirectUri: string,
    state: string,
): string => {
    const url = new URL(NAVER_AUTHORIZE_URL);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    return url.toString();
};

export const savePendingNaverAuth = (payload: PendingNaverAuth): void => {
    try {
        sessionStorage.setItem(PENDING_NAVER_AUTH_KEY, JSON.stringify(payload));
    } catch {
        // Ignore storage errors; state check on callback will safely ask the user to retry.
    }
};

export const consumePendingNaverAuth = (now = Date.now()): PendingNaverAuth | null => {
    let raw: string | null = null;
    try {
        raw = sessionStorage.getItem(PENDING_NAVER_AUTH_KEY);
        sessionStorage.removeItem(PENDING_NAVER_AUTH_KEY);
    } catch {
        return null;
    }
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Partial<PendingNaverAuth>;
        if (
            typeof parsed.state !== 'string'
            || !parsed.state.trim()
            || typeof parsed.createdAt !== 'number'
            || !Number.isFinite(parsed.createdAt)
            || parsed.createdAt > now
            || now - parsed.createdAt > PENDING_NAVER_AUTH_MAX_AGE_MS
        ) {
            return null;
        }
        return {
            state: parsed.state,
            autoLogin: Boolean(parsed.autoLogin),
            createdAt: parsed.createdAt,
            invitationToken: typeof parsed.invitationToken === 'string' ? parsed.invitationToken : null,
            invitationEventId: typeof parsed.invitationEventId === 'number' ? parsed.invitationEventId : undefined,
            organizerInviteToken: typeof parsed.organizerInviteToken === 'string' && parsed.organizerInviteToken
                ? parsed.organizerInviteToken
                : undefined,
        };
    } catch {
        return null;
    }
};

export const extractNaverCallbackFromUrl = (): NaverOAuthCallback | null => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    if (!state || (!code && !error)) {
        return null;
    }

    url.searchParams.delete('code');
    url.searchParams.delete('state');
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);

    return {
        code: code?.trim() || null,
        state: state.trim() || null,
        error: error?.trim() || null,
        errorDescription: errorDescription?.trim() || null,
    };
};
