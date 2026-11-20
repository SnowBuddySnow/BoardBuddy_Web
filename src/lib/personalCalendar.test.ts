import { describe, expect, it } from 'vitest';
import type { MyReservation } from '../types/api';
import { localDateKey, reservationOn, reservationState } from './personalCalendar';

describe('personalCalendar helpers', () => {
    it('formats local dates with zero-padded month and day', () => {
        expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
        expect(localDateKey(new Date(2026, 10, 20))).toBe('2026-11-20');
    });

    it('normalizes confirmed, waiting/pending, and ignored reservation states', () => {
        expect(reservationState('CONFIRMED')).toBe('confirmed');
        expect(reservationState('confirmed')).toBe('confirmed');
        expect(reservationState('WAITING')).toBe('waiting');
        expect(reservationState('pending')).toBe('waiting');
        expect(reservationState('CANCELED')).toBeNull();
        expect(reservationState(undefined)).toBeNull();
    });

    it('finds active reservation matching YYYY-MM-DD and ignores canceled entries', () => {
        const items: MyReservation[] = [
            { reservation_id: 1, date: '2026-11-20T00:00:00', status: 'CANCELED', teaching: false },
            { reservation_id: 2, date: '2026-11-20T00:00:00', status: 'CONFIRMED', teaching: true },
            { reservation_id: 3, date: '2026-11-21', status: 'WAITING', teaching: false },
        ];

        expect(reservationOn(items, '2026-11-20')?.reservation_id).toBe(2);
        expect(reservationOn(items, '2026-11-21')?.reservation_id).toBe(3);
        expect(reservationOn(items, '2026-11-22')).toBeUndefined();
    });
});
