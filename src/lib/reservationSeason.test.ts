import { describe, expect, it } from 'vitest';
import { getReservationSeason } from './reservationSeason';

describe('reservation season calendar', () => {
    it.each([
        [new Date(2026, 10, 10), 2026, 10],
        [new Date(2027, 0, 10), 2026, 0],
        [new Date(2027, 4, 31), 2026, 4],
        [new Date(2027, 5, 1), 2027, 9],
        [new Date(2027, 8, 30), 2027, 9],
        [new Date(2027, 9, 1), 2027, 9],
    ])('opens the current or upcoming winter for %s', (date, year, month) => {
        const season = getReservationSeason(date);
        expect(season.start).toEqual(new Date(year, 9, 1));
        expect(season.end).toEqual(new Date(year + 1, 4, 31));
        expect(season.initialDate.getMonth()).toBe(month);
        expect(season.initialDate >= season.start && season.initialDate <= season.end).toBe(true);
    });
});
