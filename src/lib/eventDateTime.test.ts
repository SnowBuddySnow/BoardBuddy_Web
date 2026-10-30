import { describe, expect, it } from 'vitest';
import { EVENT_TIME_ZONE, formatEventDateTime, formatEventDateTimeInput, getEventRegistrationState, isEventRegistrationAvailable, parseEventDateTime } from './eventDateTime';

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

    it.each([
        [{ currentUserStatus: 'JOINED' as const }, 'JOINED'],
        [{ currentUserStatus: 'CONSENT_PENDING' as const }, 'CONSENT_PENDING'],
        [{ currentUserStatus: 'PENDING' as const, joinPolicy: 'APPROVAL_REQUIRED' as const }, 'PENDING'],
        [{ currentUserStatus: 'REMOVED' as const }, 'REMOVED'],
        [{ joinPolicy: 'INVITE_ONLY' as const }, 'INVITE_REQUIRED'],
        [{ paymentRequired: true, paymentDeadlineAt: '2026-10-25T18:00:00' }, 'PAYMENT_CLOSED'],
        [{ paymentRequired: true, paymentDeadlineAt: 'invalid' }, 'UNAVAILABLE'],
        [{ capacity: Number.NaN }, 'UNAVAILABLE'], [{ capacity: 0 }, 'UNAVAILABLE'],
        [{ joinedCount: -1 }, 'UNAVAILABLE'],
    ])('aligns new-admission state and count for %o', (change, expected) => {
        const candidate = { ...openEvent, ...change };
        const now = Date.parse('2026-10-25T09:00:00Z');
        expect(getEventRegistrationState(candidate, now)).toBe(expected);
        expect(isEventRegistrationAvailable(candidate, now)).toBe(false);
    });

    it('keeps invitation acceptance and cancelled-user reapplication available when otherwise eligible', () => {
        const now = Date.parse('2026-10-25T09:00:00Z');
        expect(isEventRegistrationAvailable({ ...openEvent, joinPolicy: 'INVITE_ONLY', currentUserStatus: 'PENDING' }, now)).toBe(true);
        expect(isEventRegistrationAvailable({ ...openEvent, currentUserStatus: 'CANCELLED' }, now)).toBe(true);
    });

    it('closes payment-required admission exactly at the Korean deadline, not before or for free events', () => {
        const paid = { ...openEvent, paymentRequired: true, paymentDeadlineAt: '2026-10-25T19:00:00' };
        expect(isEventRegistrationAvailable(paid, Date.parse('2026-10-25T09:59:59Z'))).toBe(true);
        expect(isEventRegistrationAvailable(paid, Date.parse('2026-10-25T10:00:00Z'))).toBe(false);
        expect(isEventRegistrationAvailable({ ...paid, paymentRequired: false }, Date.parse('2026-10-25T10:00:00Z'))).toBe(true);
    });
});


describe('Groupize admission presentation', () => {
    const date = '2035-08-18T10:00:00';
    const now = Date.parse('2035-08-17T00:00:00Z');
    it('does not mark an unlimited applicant pool full at its stored numeric capacity', () => {
        expect(getEventRegistrationState({ status: 'OPEN', startsAt: date, capacity: 1,
            capacityLimited: false, joinedCount: 100 }, now)).toBe('AVAILABLE');
    });
    it('directs unassigned members to host allocation instead of advertising child signup', () => {
        expect(getEventRegistrationState({ status: 'OPEN', startsAt: date, capacity: 2,
            parentEventId: 42, currentUserStatus: null }, now)).toBe('ASSIGNMENT_REQUIRED');
    });
});
