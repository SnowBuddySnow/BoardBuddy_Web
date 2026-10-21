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

export const isEventRegistrationAvailable = (
    event: Pick<Event, 'status' | 'startsAt' | 'applicationStartsAt' | 'joinedCount' | 'capacity'>,
    now = Date.now(),
): boolean => event.status === 'OPEN'
    && parseEventDateTime(event.startsAt).getTime() > now
    && (!event.applicationStartsAt || parseEventDateTime(event.applicationStartsAt).getTime() <= now)
    && (event.joinedCount ?? 0) < event.capacity;
