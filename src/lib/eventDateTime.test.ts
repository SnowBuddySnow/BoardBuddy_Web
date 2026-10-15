import { describe, expect, it } from 'vitest';
import { EVENT_TIME_ZONE, parseEventDateTime } from './eventDateTime';

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
});
