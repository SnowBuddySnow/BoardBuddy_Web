/**
 * Builds an .ics file so the phone's own calendar can remind the member before a booking
 * window opens. A web page cannot push notifications while it is closed, but the device
 * calendar can, without any server work. `opensAt` is the API's Korea-time local timestamp.
 */
const pad = (n: number) => String(n).padStart(2, '0');

const formatUtc = (utc: Date) =>
    `${utc.getUTCFullYear()}${pad(utc.getUTCMonth() + 1)}${pad(utc.getUTCDate())}T${pad(utc.getUTCHours())}${pad(utc.getUTCMinutes())}${pad(utc.getUTCSeconds())}Z`;

/** Korea-time local timestamp ("2026-12-05T21:00:00") as an absolute Date. */
export function kstToDate(kstLocal: string): Date {
    const [date, time = '00:00:00'] = kstLocal.split('T');
    const [y, mo, d] = date.split('-').map(Number);
    const [h, mi, s = 0] = time.split(':').map(Number);
    return new Date(Date.UTC(y, mo - 1, d, h - 9, mi, Math.floor(s)));
}

export const toUtcStamp = (kstLocal: string) => formatUtc(kstToDate(kstLocal));

export function buildOpeningReminder({ opensAt, stayDate, crewName }: { opensAt: string; stayDate: string; crewName?: string }): string {
    const start = toUtcStamp(opensAt);
    const [, m, d] = stayDate.split('-').map(Number);
    const title = `${crewName ? `${crewName} ` : ''}시즌방 ${m}/${d} 예약 오픈`;
    return [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BoardBuddy//Season House//KO', 'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:boardbuddy-open-${stayDate}-${start}@boardbuddy`,
        `DTSTAMP:${formatUtc(new Date())}`,
        `DTSTART:${start}`,
        `DTEND:${start}`,
        `SUMMARY:${title}`,
        'DESCRIPTION:BoardBuddy에서 예약이 열려요.',
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT10M', `DESCRIPTION:${title} 10분 전`, 'END:VALARM',
        'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
}

export function downloadOpeningReminder(input: { opensAt: string; stayDate: string; crewName?: string }) {
    const blob = new Blob([buildOpeningReminder(input)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `boardbuddy-open-${input.stayDate}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
