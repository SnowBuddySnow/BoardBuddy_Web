import { beforeEach, describe, expect, it } from 'vitest';
import {
    getAccessToken,
    getRefreshToken,
    getSignupToken,
    saveAuthTokens,
    saveTempAccessToken,
    SESSION_KEYS,
    saveAccountId,
    clearAuthSession,
    initializePhoneConsentPreference,
} from './session';

class MemoryStorage implements Storage {
    private values = new Map<string, string>();

    get length() {
        return this.values.size;
    }

    clear() {
        this.values.clear();
    }

    getItem(key: string) {
        return this.values.get(key) ?? null;
    }

    key(index: number) {
        return Array.from(this.values.keys())[index] ?? null;
    }

    removeItem(key: string) {
        this.values.delete(key);
    }

    setItem(key: string, value: string) {
        this.values.set(key, value);
    }
}

describe('authentication session transitions', () => {
    beforeEach(() => {
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: new MemoryStorage(),
        });
    });

    it('removes stale authenticated tokens before starting signup', () => {
        localStorage.setItem(SESSION_KEYS.accessToken, 'stale-access');
        localStorage.setItem(SESSION_KEYS.refreshToken, 'stale-refresh');

        saveTempAccessToken('signup-access');

        expect(getAccessToken()).toBeNull();
        expect(getRefreshToken()).toBeNull();
        expect(getSignupToken()).toBe('signup-access');
    });

    it('removes the signup token when authenticated tokens are saved', () => {
        localStorage.setItem(SESSION_KEYS.tempAccessToken, 'stale-signup');

        saveAuthTokens('access', 'refresh');

        expect(getAccessToken()).toBe('access');
        expect(getRefreshToken()).toBe('refresh');
        expect(localStorage.getItem(SESSION_KEYS.tempAccessToken)).toBeNull();
        expect(getSignupToken()).toBe('access');
    });
    it('does not transfer an optional phone opt-in to another account', () => {
        saveAccountId(1); localStorage.setItem('phone_sharing_consent_preference', 'always');
        saveAccountId(2); expect(localStorage.getItem('phone_sharing_consent_preference')).toBeNull();
    });
    it('preserves a bound preference for the same person', () => {
        saveAccountId(1); localStorage.setItem('phone_sharing_consent_preference', 'always');
        saveAccountId(1); initializePhoneConsentPreference();
        expect(localStorage.getItem('phone_sharing_consent_preference')).toBe('always');
    });
    it('clears phone opt-in and its owner on logout', () => {
        saveAccountId(1); localStorage.setItem('phone_sharing_consent_preference', 'always');
        clearAuthSession(); expect(localStorage.getItem('phone_sharing_consent_preference')).toBeNull();
        expect(localStorage.getItem('phone_sharing_consent_account_id')).toBeNull();
    });
    it('requires fresh choice for a legacy preference without a trustworthy owner', () => {
        localStorage.setItem('accountId', '1'); localStorage.setItem('phone_sharing_consent_preference', 'always');
        initializePhoneConsentPreference(); expect(localStorage.getItem('phone_sharing_consent_preference')).toBeNull();
        expect(localStorage.getItem('phone_sharing_consent_account_id')).toBe('1');
    });
});
