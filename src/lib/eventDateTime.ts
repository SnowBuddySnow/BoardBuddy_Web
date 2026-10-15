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
