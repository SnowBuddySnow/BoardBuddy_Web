// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
    clearGuestInvitationFromUrl,
    formatGuestCode,
    guestInvitationUrl,
    parseGuestCode,
    readGuestInvitationFromSearch,
} from './guestInvitation';

describe('guestInvitation helpers', () => {
    it('builds shareable links that round-trip through parseGuestCode and readGuestInvitationFromSearch', () => {
        const seasonUrl = guestInvitationUrl({ type: 'SEASON', id: 12 }, 'https://boardbuddy.kr/');
        expect(seasonUrl).toBe('https://boardbuddy.kr/?view=guest_access&type=SEASON&id=12');
        expect(parseGuestCode(seasonUrl)).toEqual({ type: 'SEASON', id: 12 });
        expect(readGuestInvitationFromSearch(new URL(seasonUrl).search)).toEqual({ type: 'SEASON', id: 12 });
        expect(formatGuestCode({ type: 'SEASON', id: 12 })).toBe('BB:SEASON:12');

        const eventUrl = guestInvitationUrl({ type: 'EVENT', id: 34 }, 'https://boardbuddy.kr/?foo=bar#hash');
        expect(eventUrl).toBe('https://boardbuddy.kr/?view=guest_access&type=EVENT&id=34');
        expect(parseGuestCode(eventUrl)).toEqual({ type: 'EVENT', id: 34 });
        expect(readGuestInvitationFromSearch('?type=event&id=34')).toEqual({ type: 'EVENT', id: 34 });
    });

    it('rejects zero, negative, non-numeric, and unsafe ids', () => {
        expect(parseGuestCode('BB:SEASON:0')).toBeNull();
        expect(parseGuestCode('BB:EVENT:99999999999999999999')).toBeNull();
        expect(readGuestInvitationFromSearch('?type=SEASON&id=0')).toBeNull();
        expect(readGuestInvitationFromSearch('?type=EVENT&id=12abc')).toBeNull();
        expect(readGuestInvitationFromSearch('?type=OTHER&id=12')).toBeNull();
        expect(() => guestInvitationUrl({ type: 'SEASON', id: 0 }, 'https://boardbuddy.kr/')).toThrow();
    });

    it('clears type and id query parameters without disturbing view', () => {
        window.history.replaceState(null, '', '/?view=guest_access&type=SEASON&id=12');
        clearGuestInvitationFromUrl();
        expect(window.location.search).toBe('?view=guest_access');
    });
});
