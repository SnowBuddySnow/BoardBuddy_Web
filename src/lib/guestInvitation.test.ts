// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
    clearGuestInvitationFromUrl,
    extractGuestInvitationToken,
    formatGuestCode,
    formatGuestTokenCode,
    guestInvitationTokenUrl,
    guestInvitationUrl,
    parseGuestCode,
    readGuestInvitationEntryFromUrl,
    readGuestInvitationFromSearch,
} from './guestInvitation';

const VALID_TOKEN = 'a'.repeat(43);

describe('guestInvitation helpers', () => {
    it('builds and parses single-use token invitation URLs in fragment without putting secret in query string', () => {
        const tokenUrl = guestInvitationTokenUrl(VALID_TOKEN, 'https://boardbuddy.kr/');
        expect(tokenUrl).toBe(`https://boardbuddy.kr/?view=guest_access#guestInvite=${VALID_TOKEN}`);
        expect(extractGuestInvitationToken(tokenUrl)).toBe(VALID_TOKEN);
        expect(extractGuestInvitationToken(formatGuestTokenCode(VALID_TOKEN))).toBe(VALID_TOKEN);
        expect(readGuestInvitationEntryFromUrl(tokenUrl)).toBe(`BB:GUEST:${VALID_TOKEN}`);
    });

    it('builds shareable destination links that round-trip through parseGuestCode and readGuestInvitationFromSearch', () => {
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

    it('rejects malformed tokens and invalid ids', () => {
        expect(extractGuestInvitationToken('https://boardbuddy.kr/?view=guest_access#guestInvite=short')).toBeNull();
        expect(parseGuestCode('BB:SEASON:0')).toBeNull();
        expect(parseGuestCode('BB:EVENT:99999999999999999999')).toBeNull();
        expect(readGuestInvitationFromSearch('?type=SEASON&id=0')).toBeNull();
        expect(readGuestInvitationFromSearch('?type=EVENT&id=12abc')).toBeNull();
        expect(() => guestInvitationTokenUrl('short', 'https://boardbuddy.kr/')).toThrow();
        expect(() => guestInvitationUrl({ type: 'SEASON', id: 0 }, 'https://boardbuddy.kr/')).toThrow();
    });

    it('clears guest invitation hash and query parameters without disturbing view', () => {
        window.history.replaceState(null, '', `/?view=guest_access&type=SEASON&id=12#guestInvite=${VALID_TOKEN}`);
        clearGuestInvitationFromUrl();
        expect(window.location.search).toBe('?view=guest_access');
        expect(window.location.hash).toBe('');
    });
});
