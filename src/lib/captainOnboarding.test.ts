// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
    claimCaptainOnboarding,
    completeCaptainOnboarding,
    dismissCaptainOnboarding,
} from './captainOnboarding';

describe('captainOnboarding state persistence', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('claims onboarding only once per user and isolates across users', () => {
        expect(claimCaptainOnboarding(101)).toBe(true);
        expect(claimCaptainOnboarding(101)).toBe(false);
        expect(claimCaptainOnboarding(202)).toBe(true);
    });

    it('keeps completed state even if dismiss is called later', () => {
        claimCaptainOnboarding(101);
        completeCaptainOnboarding(101);
        dismissCaptainOnboarding(101);

        expect(localStorage.getItem('boardbuddy_captain_onboarding_v1:101')).toBe('completed');
    });

    it('records dismissed state when dismissed before completion', () => {
        claimCaptainOnboarding(101);
        dismissCaptainOnboarding(101);

        expect(localStorage.getItem('boardbuddy_captain_onboarding_v1:101')).toBe('dismissed');
        expect(claimCaptainOnboarding(101)).toBe(false);
    });
});
