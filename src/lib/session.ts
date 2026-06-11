export const SESSION_KEYS = {
    accessToken: 'accessToken',
    refreshToken: 'refreshToken',
    tempAccessToken: 'tempAccessToken',
    autoLogin: 'autoLogin',
    devCrewOverride: 'dev_crew_override',
    devRoleOverride: 'dev_role_override',
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
};

export const getDevCrewOverride = () => localStorage.getItem(SESSION_KEYS.devCrewOverride);

export const getDevRoleOverride = () => localStorage.getItem(SESSION_KEYS.devRoleOverride);

export const hasDevOverride = () => {
    const crewOverride = getDevCrewOverride();
    const roleOverride = getDevRoleOverride();
    return Boolean((crewOverride && crewOverride !== 'server') || (roleOverride && roleOverride !== 'server'));
};
