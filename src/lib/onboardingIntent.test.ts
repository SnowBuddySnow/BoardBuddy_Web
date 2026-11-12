// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { beginOnboardingLogin, captureCrewInvitation, clearCrewInvitationIntent, crewInvitationUrl, getCrewInvitationIntent, isCurrentOnboardingLogin, rememberCrewApplication } from './onboardingIntent';
const token = 'a'.repeat(43);
describe('tab-scoped invitation continuation', () => {
    beforeEach(() => { vi.useRealTimers(); sessionStorage.clear(); clearCrewInvitationIntent(); window.history.replaceState(null, '', '/'); });
    const visit = (hash = token, eventId = '7') => { window.history.replaceState(null, '', `/?view=crew_invite&eventId=${eventId}#crewInvite=${hash}`); captureCrewInvitation(); };
    it('captures proof before telemetry and removes it from the address while surviving reload reads', () => {
        visit(); expect(window.location.href).not.toContain(token);
        expect(getCrewInvitationIntent()).toMatchObject({ token, eventId: 7 });
        captureCrewInvitation(); expect(getCrewInvitationIntent()?.token).toBe(token);
        expect(crewInvitationUrl(token)).toContain(`#crewInvite=${token}`);
        expect(crewInvitationUrl(token).split('#')[0]).not.toContain(token);
    });
    it('does not accept an arbitrary return URL or an invalid ID', () => {
        visit(token, '//evil.example'); expect(getCrewInvitationIntent()?.eventId).toBeUndefined();
        expect(crewInvitationUrl(token)).not.toContain('evil.example');
        visit('invalid'); expect(getCrewInvitationIntent()).toBeNull();
    });
    it('binds login to its original invitation and cancels stale or replaced attempts', () => {
        visit(); const first = beginOnboardingLogin(); expect(isCurrentOnboardingLogin(first)).toBe(true);
        const next = beginOnboardingLogin(); expect(isCurrentOnboardingLogin(first)).toBe(false); expect(isCurrentOnboardingLogin(next)).toBe(true);
        visit('b'.repeat(43)); expect(isCurrentOnboardingLogin(next)).toBe(false);
    });
    it('replaces account-specific receipts when a different invitation is opened', () => {
        visit(); rememberCrewApplication(5, '99101'); expect(getCrewInvitationIntent()?.receipt).toEqual({ crewId: 5, accountId: '99101' });
        visit('b'.repeat(43)); expect(getCrewInvitationIntent()?.receipt).toBeUndefined();
    });
    it('expires local continuation and can explicitly discard it', () => {
        visit(); vi.useFakeTimers(); vi.setSystemTime(Date.now() + 8 * 24 * 60 * 60 * 1000);
        expect(getCrewInvitationIntent()).toBeNull();
        vi.useRealTimers(); visit(); clearCrewInvitationIntent(); expect(getCrewInvitationIntent()).toBeNull();
    });
    it('does not recover an old proof from malformed storage or trust stored redirect metadata', () => {
        visit(); sessionStorage.setItem('bb.crew-invitation.v1', '{broken'); expect(getCrewInvitationIntent()).toBeNull();
        sessionStorage.setItem('bb.crew-invitation.v1', JSON.stringify({ token, receivedAt: Date.now(), eventId: 'https://evil.example' }));
        expect(getCrewInvitationIntent()?.eventId).toBeUndefined();
    });
    it('binds the original internal event as well as the invitation credential', () => {
        visit(); const attempt = beginOnboardingLogin(); visit(token, '8'); expect(isCurrentOnboardingLogin(attempt)).toBe(false);
    });
});
