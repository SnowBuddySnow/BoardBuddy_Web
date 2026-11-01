import type { Event } from '../types/api';

export const EVENT_TIME_ZONE = 'Asia/Seoul';

const localDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;
const offsetDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i;

/** The event API's LocalDateTime values use the backend application clock (Asia/Seoul). */
export const parseEventDateTime = (value: string): Date => {
    const text = value.trim();
    if (localDateTime.test(text)) return new Date(`${text}+09:00`);
    if (offsetDateTime.test(text)) return new Date(text);
    return new Date(Number.NaN);
};

export const formatEventDateTime = (value: string, options: Intl.DateTimeFormatOptions = {}): string => {
    const date = parseEventDateTime(value);
    if (!Number.isFinite(date.getTime())) return '일시 확인 필요';
    return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
        hourCycle: 'h23', timeZoneName: 'short', ...options, timeZone: EVENT_TIME_ZONE,
    }).format(date);
};

/** datetime-local has no offset: its wall-clock fields always represent Korean event time. */
export const formatEventDateTimeInput = (value?: string | null): string => {
    if (!value) return '';
    const date = parseEventDateTime(value);
    if (!Number.isFinite(date.getTime())) return '';
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
        timeZone: EVENT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

export const hasEventStarted = (startsAt: string, now = Date.now()): boolean =>
    // Invalid dates fail closed as well: no admission until the schedule can be verified.
    !(parseEventDateTime(startsAt).getTime() > now);

type RegistrationEvent = Pick<Event, 'status' | 'startsAt' | 'applicationStartsAt' | 'joinedCount' | 'capacity'>
    & Partial<Pick<Event, 'paymentRequired' | 'paymentDeadlineAt' | 'currentUserStatus' | 'joinPolicy' | 'capacityLimited' | 'parentEventId' | 'groupizeAdmissionAllowed'>>;

export type EventRegistrationState = 'AVAILABLE' | 'DRAFT' | 'CLOSED' | 'CANCELLED' | 'UNAVAILABLE'
    | 'JOINED' | 'CONSENT_PENDING' | 'PENDING' | 'REMOVED' | 'STARTED' | 'NOT_OPEN'
    | 'PAYMENT_CLOSED' | 'FULL' | 'INVITE_REQUIRED' | 'ASSIGNMENT_REQUIRED';

/** Shared presentation guard; the API still owns authorization and atomic capacity checks. */
export const getEventRegistrationState = (event: RegistrationEvent, now = Date.now()): EventRegistrationState => {
    if (event.status === 'DRAFT') return 'DRAFT';
    if (event.status === 'CLOSED' || event.status === 'CANCELLED') return event.status;
    if (event.status !== 'OPEN' || !Number.isFinite(now)) return 'UNAVAILABLE';
    if (event.currentUserStatus === 'REMOVED') return 'REMOVED';
    if (event.currentUserStatus === 'JOINED' || event.currentUserStatus === 'CONSENT_PENDING') return event.currentUserStatus;
    // For invite-only events PENDING is an actionable invitation, not an approval request.
    if (event.currentUserStatus === 'PENDING' && event.joinPolicy !== 'INVITE_ONLY') return 'PENDING';
    if (event.parentEventId != null && event.groupizeAdmissionAllowed !== true) return 'ASSIGNMENT_REQUIRED';
    if (hasEventStarted(event.startsAt, now)) return 'STARTED';
    if (event.applicationStartsAt) {
        const opensAt = parseEventDateTime(event.applicationStartsAt).getTime();
        if (!Number.isFinite(opensAt)) return 'UNAVAILABLE';
        if (opensAt > now) return 'NOT_OPEN';
    }
    if (event.paymentRequired && event.paymentDeadlineAt) {
        const deadline = parseEventDateTime(event.paymentDeadlineAt).getTime();
        if (!Number.isFinite(deadline)) return 'UNAVAILABLE';
        if (deadline <= now) return 'PAYMENT_CLOSED';
    }
    const occupied = event.joinedCount ?? 0;
    if (!Number.isSafeInteger(event.capacity) || event.capacity < 1 || !Number.isSafeInteger(occupied) || occupied < 0) return 'UNAVAILABLE';
    if (event.capacityLimited !== false && occupied >= event.capacity) return 'FULL';
    if (event.joinPolicy === 'INVITE_ONLY' && event.currentUserStatus !== 'PENDING') return 'INVITE_REQUIRED';
    return 'AVAILABLE';
};

export const getEventRegistrationLabel = (state: EventRegistrationState): string => {
    if (state === 'ASSIGNMENT_REQUIRED') return '호스트 배정 대기';
    switch (state) {
        case 'DRAFT': return '준비 중인 이벤트';
        case 'CLOSED': return '마감된 모임';
        case 'CANCELLED': return '취소된 모임';
        case 'STARTED': return '신청 마감';
        case 'PAYMENT_CLOSED': return '입금 기한 마감';
        case 'FULL': return '정원이 모두 찼습니다';
        case 'REMOVED': return '참가할 수 없는 이벤트';
        case 'INVITE_REQUIRED': return '초대가 필요합니다';
        default: return '현재 신청할 수 없습니다';
    }
};

export const isEventRegistrationAvailable = (event: RegistrationEvent, now = Date.now()): boolean =>
    getEventRegistrationState(event, now) === 'AVAILABLE';
