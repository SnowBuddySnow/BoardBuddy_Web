import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { downloadOpeningReminder, kstToDate } from '../lib/calendarReminder';

export interface ReservationAvailability { bookable?: boolean; opensAt?: string | null; unavailableReason?: string | null }

function availabilityCopy(value?: ReservationAvailability) {
    if (!value) return '예약 가능 여부를 확인하고 있어요.';
    if (value.bookable) return '';
    if (value.opensAt) { const [date,time]=value.opensAt.split('T'); return `${date.replace(/-/g,'.')} ${time.slice(0,5)} 오픈 예정입니다. (한국 시간)`; }
    return value.unavailableReason==='PAST_DATE' ? '지난 날짜는 예약할 수 없어요.' : value.unavailableReason==='CREW_CLOSED' ? '크루 예약 접수가 닫혀 있어요.' : '아직 예약할 수 없는 날짜예요. 크루 오픈 일정을 확인해 주세요.';
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Remaining time until `target`, refreshed every second; calls onDone once when it reaches zero. */
function useCountdown(targetMs: number | null, onDone?: () => void) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (targetMs == null) return;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [targetMs]);
    const left = targetMs == null ? null : Math.max(0, targetMs - now);
    useEffect(() => {
        if (left === 0) onDone?.();
        // onDone is intentionally read once when the countdown finishes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [left === 0]);
    return left;
}

export default function ReservationWindowNotice({ value, stayDate, crewName, onOpened }: {
    value?: ReservationAvailability;
    /** The stay date (YYYY-MM-DD) the window belongs to; enables the calendar reminder. */
    stayDate?: string;
    crewName?: string;
    /** Called when the countdown reaches the opening time, so the caller can refetch. */
    onOpened?: () => void;
}) {
    const message = availabilityCopy(value);
    const opensAt = !value?.bookable && value?.opensAt ? value.opensAt : null;
    const targetMs = opensAt ? kstToDate(opensAt).getTime() : null;
    const [startedBefore] = useState(() => targetMs != null && targetMs > Date.now());
    const left = useCountdown(targetMs != null && (startedBefore || targetMs > Date.now()) ? targetMs : null, onOpened);
    if (!message) return null;
    if (!opensAt || left == null) return <p role="status" className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-xs leading-5 text-slate-600">{message}</p>;

    const days = Math.floor(left / 86_400_000);
    const hours = Math.floor((left % 86_400_000) / 3_600_000);
    const minutes = Math.floor((left % 3_600_000) / 60_000);
    const seconds = Math.floor((left % 60_000) / 1000);
    const units = days > 0 ? [[days, '일'], [hours, '시간'], [minutes, '분']] : [[hours, '시간'], [minutes, '분'], [seconds, '초']];
    return (
        <section aria-label="예약 오픈 안내" className="mb-3 rounded-xl bg-slate-100 px-3 py-3">
            <p role="status" className="text-xs leading-5 text-slate-600">{message}</p>
            {left > 0 ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-baseline gap-1 text-brand-navy" aria-label={`오픈까지 ${days ? `${days}일 ` : ''}${hours}시간 ${minutes}분 남음`}>
                        {units.map(([n, unit]) => (
                            <span key={unit} className="flex items-baseline gap-0.5">
                                <span className="rounded-md bg-white px-1.5 py-0.5 text-sm font-black tabular-nums shadow-[0_1px_0_rgba(22,38,96,0.08)]">{days > 0 || unit === '시간' ? n : pad(n as number)}</span>
                                <span className="text-[11px] font-bold text-slate-500">{unit}</span>
                            </span>
                        ))}
                        <span className="ml-1 text-[11px] font-bold text-slate-500">남음</span>
                    </p>
                    {stayDate && (
                        <button type="button" onClick={() => downloadOpeningReminder({ opensAt, stayDate, crewName })}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white px-2.5 text-xs font-bold text-brand-navy hover:bg-brand-navy/5">
                            <BellRing className="h-3.5 w-3.5" />캘린더에 오픈 알림 추가
                        </button>
                    )}
                </div>
            ) : <p className="mt-1 text-xs font-bold text-brand-navy">예약이 열렸어요. 현황을 불러오고 있어요.</p>}
        </section>
    );
}
