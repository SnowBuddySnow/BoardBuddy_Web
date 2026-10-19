import { describe, expect, it } from 'vitest';
import { EVENT_TIME_ZONE, formatEventDateTime, formatEventDateTimeInput, isEventRegistrationAvailable, parseEventDateTime } from './eventDateTime';

describe('event API timestamps', () => {
    it.each([
        ['2026-10-09T18:00:00', '2026-10-09T09:00:00.000Z'],
        ['2026-10-09T18:00', '2026-10-09T09:00:00.000Z'],
        ['2026-10-09T00:00:00', '2026-10-08T15:00:00.000Z'],
        ['2026-10-09T18:00:00.123456', '2026-10-09T09:00:00.123Z'],
        ['2026-10-09T18:00:00Z', '2026-10-09T18:00:00.000Z'],
        ['2026-10-09T18:00:00+09:00', '2026-10-09T09:00:00.000Z'],
        ['2026-10-09T18:00:00-07:00', '2026-10-10T01:00:00.000Z'],
    ])('parses %s without depending on the device timezone', (input, expected) => {
        expect(parseEventDateTime(input).toISOString()).toBe(expected);
    });

    it.each(['', 'not-a-date', '2026-10-09', '10/09/2026 18:00', '2026-10-09T25:00:00'])(
        'does not treat invalid/non-contract text %s as an opening time', input => {
            expect(Number.isNaN(parseEventDateTime(input).getTime())).toBe(true);
        },
    );

    it('displays an explicitly offset instant as Korean event time', () => {
        const time = new Intl.DateTimeFormat('en-GB', {
            timeZone: EVENT_TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false,
        }).format(parseEventDateTime('2026-10-09T09:00:00Z'));
        expect(time).toBe('18:00');
    });

    it.each([
        ['2026-10-25T18:00:00', '2026-10-25T18:00'],
        ['2026-10-25T09:00:00Z', '2026-10-25T18:00'],
        ['2026-11-01T01:30:00-07:00', '2026-11-01T17:30'],
        ['2026-11-01T01:30:00-08:00', '2026-11-01T18:30'],
        ['2026-10-25T15:00:00Z', '2026-10-26T00:00'],
        [null, ''], ['invalid', ''],
    ])('keeps editor input %s in Korean time', (input, expected) => {
        expect(formatEventDateTimeInput(input)).toBe(expected);
    });

    it('formats list/manager timestamps consistently, with an explicit timezone and invalid fallback', () => {
        expect(formatEventDateTime('2026-10-25T09:00:00Z')).toBe(formatEventDateTime('2026-10-25T18:00:00'));
        expect(formatEventDateTime('2026-10-25T09:00:00Z')).toContain('18:00');
        expect(formatEventDateTime('2026-10-25T09:00:00Z')).toContain('GMT+9');
        expect(formatEventDateTime('invalid')).toBe('일시 확인 필요');
    });

    const openEvent = { status: 'OPEN' as const, startsAt: '2026-10-25T20:00:00',
        applicationStartsAt: '2026-10-25T18:00:00', capacity: 2, joinedCount: 0 };
    it('opens at exactly the Korean instant, independently of device timezone', () => {
        expect(isEventRegistrationAvailable(openEvent, Date.parse('2026-10-25T08:59:59Z'))).toBe(false);
        expect(isEventRegistrationAvailable(openEvent, Date.parse('2026-10-25T09:00:00Z'))).toBe(true);
        expect(isEventRegistrationAvailable(openEvent, Date.parse('2026-10-25T11:00:00Z'))).toBe(false);
    });
    it.each([
        { status: 'DRAFT' as const }, { status: 'CLOSED' as const }, { joinedCount: 2 },
        { startsAt: 'invalid' }, { applicationStartsAt: 'invalid' },
    ])('never advertises an unavailable event: %o', change => {
        expect(isEventRegistrationAvailable({ ...openEvent, ...change }, Date.parse('2026-10-25T09:00:00Z'))).toBe(false);
    });
});
