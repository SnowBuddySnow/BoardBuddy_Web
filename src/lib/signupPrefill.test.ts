// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAuthSession, saveAuthTokens } from './session';
import { getSignupPrefill, setSignupPrefill } from './signupPrefill';

describe('signupPrefill session isolation', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        clearAuthSession();
        setSignupPrefill(0, undefined);
    });

    it('returns stored prefill only for the matching account and auth session revision', () => {
        localStorage.setItem('accountId', '501');
        saveAuthTokens('access-a', 'refresh-a');

        setSignupPrefill(501, { name: '홍길동', phoneNumber: '01012345678', gender: 'MALE' });
        expect(getSignupPrefill()).toEqual({ name: '홍길동', phoneNumber: '01012345678', gender: 'MALE' });

        // Switching account invalidates in-memory prefill
        localStorage.setItem('accountId', '502');
        expect(getSignupPrefill()).toEqual({});

        // Session revision bump (e.g. logout/re-login) also invalidates stale prefill
        localStorage.setItem('accountId', '501');
        clearAuthSession();
        localStorage.setItem('accountId', '501');
        expect(getSignupPrefill()).toEqual({});
    });
});
