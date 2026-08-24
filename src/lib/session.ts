export const SESSION_KEYS = {
    accessToken: 'accessToken',
    refreshToken: 'refreshToken',
    tempAccessToken: 'tempAccessToken',
    autoLogin: 'autoLogin',
    accountId: 'accountId',
    devCrewOverride: 'dev_crew_override',
    devSchoolOverride: 'dev_school_override',
    devRoleOverride: 'dev_role_override',
    devEventDataMode: 'dev_event_data_mode',
} as const;

export const getAccessToken = () => localStorage.getItem(SESSION_KEYS.accessToken);

export const getRefreshToken = () => localStorage.getItem(SESSION_KEYS.refreshToken);

export const getSignupToken = () => getAccessToken() || localStorage.getItem(SESSION_KEYS.tempAccessToken);

export const isAutoLoginEnabled = () => localStorage.getItem(SESSION_KEYS.autoLogin) === 'true';

export const setAutoLoginPreference = (enabled: boolean) => {
    if (enabled) {
        localStorage.setItem(SESSION_KEYS.autoLogin, 'true');
    } else {
        localStorage.removeItem(SESSION_KEYS.autoLogin);
    }
};

export const getAccountId = () => localStorage.getItem(SESSION_KEYS.accountId);

export const saveAccountId = (accountId: number | string) => {
    localStorage.setItem(SESSION_KEYS.accountId, String(accountId));
};

export const clearAccountId = () => {
    localStorage.removeItem(SESSION_KEYS.accountId);
};

export const saveAuthTokens = (accessToken?: string, refreshToken?: string) => {
    if (accessToken) {
        localStorage.setItem(SESSION_KEYS.accessToken, accessToken);
    }
    if (refreshToken) {
        localStorage.setItem(SESSION_KEYS.refreshToken, refreshToken);
    }
};

export const saveTempAccessToken = (tempAccessToken?: string) => {
    if (tempAccessToken) {
        localStorage.setItem(SESSION_KEYS.tempAccessToken, tempAccessToken);
    }
};

export const clearTempAccessToken = () => {
    localStorage.removeItem(SESSION_KEYS.tempAccessToken);
};

export const clearAuthSession = () => {
    localStorage.removeItem(SESSION_KEYS.accessToken);
    localStorage.removeItem(SESSION_KEYS.refreshToken);
    localStorage.removeItem(SESSION_KEYS.tempAccessToken);
    localStorage.removeItem(SESSION_KEYS.autoLogin);
    localStorage.removeItem(SESSION_KEYS.accountId);
};

export const getDevCrewOverride = () => localStorage.getItem(SESSION_KEYS.devCrewOverride);

export const getDevSchoolOverride = () => localStorage.getItem(SESSION_KEYS.devSchoolOverride);

export const getDevRoleOverride = () => localStorage.getItem(SESSION_KEYS.devRoleOverride);

export const getDevEventDataMode = () => localStorage.getItem(SESSION_KEYS.devEventDataMode);

export const hasDevOverride = () => {
    const crewOverride = getDevCrewOverride();
    const schoolOverride = getDevSchoolOverride();
    const roleOverride = getDevRoleOverride();
    const eventDataMode = getDevEventDataMode();
    return Boolean(
        (crewOverride && crewOverride !== 'server')
        || (schoolOverride && schoolOverride !== 'server')
        || (roleOverride && roleOverride !== 'server')
        || (eventDataMode && eventDataMode !== 'server'),
    );
};
