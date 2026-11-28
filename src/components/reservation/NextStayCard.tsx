import { useCallback, useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import BuddyMascot from '../BuddyMascot';
import { SkeletonCard } from '../Skeleton';
import WaitlistProgress from './WaitlistProgress';
import { applyForTeaching, getMyCrewCalendar, withdrawFromTeaching } from '../../services/crew';
import { localDateKey, reservationState } from '../../lib/personalCalendar';
import { useFeedback } from '../feedback/feedbackContext';
import type { MyReservation } from '../../types/api';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** "D-day" for a YYYY-MM-DD stay date, counted in local days. */
function dDay(date: string) {
    const [y, m, d] = date.split('-').map(Number);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86_400_000);
    return diff === 0 ? '오늘' : diff === 1 ? '내일' : `D-${diff}`;
}

/**
 * Home's first card for members: the nearest upcoming stay with its status and the one or two
 * actions that matter. Teaching sign-up only appears for crews that enable it.
 */
export default function NextStayCard({ crewId, teachingEnabled, onOpenCalendar, onBook }: {
    crewId: number;
    teachingEnabled: boolean;
    onOpenCalendar: () => void;
    onBook: () => void;
}) {
    const [next, setNext] = useState<MyReservation | null | undefined>(undefined);
    const [failed, setFailed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [revision, setRevision] = useState(0);
    const { toast } = useFeedback();

    useEffect(() => {
        let cancelled = false;
        const now = new Date();
        const today = localDateKey(now);
        const months = [localDateKey(now).slice(0, 7), localDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 1)).slice(0, 7)];
        setFailed(false);
        void Promise.all(months.map(month => getMyCrewCalendar(crewId, `${month}-01`)))
            .then(results => {
                if (cancelled) return;
                const upcoming = results.flatMap(result => result.my_reservations ?? [])
                    .filter(item => item.date.slice(0, 10) >= today && reservationState(item.status))
                    .sort((a, b) => a.date.localeCompare(b.date));
                setNext(upcoming[0] ?? null);
            })
            .catch(() => { if (!cancelled) { setFailed(true); setNext(null); } });
        return () => { cancelled = true; };
    }, [crewId, revision]);

    const toggleTeaching = useCallback(async () => {
        if (!next || busy) return;
        setBusy(true);
        try {
            await (next.teaching ? withdrawFromTeaching : applyForTeaching)(crewId, next.reservation_id);
            toast({ message: next.teaching ? '강습 신청을 취소했어요.' : '강습을 신청했어요.' });
            setRevision(value => value + 1);
        } catch {
            toast({ message: '강습 신청 상태를 바꾸지 못했어요. 다시 시도해 주세요.', tone: 'error' });
        } finally { setBusy(false); }
    }, [busy, crewId, next, toast]);

    if (next === undefined) return <SkeletonCard label="다음 숙박을 불러오는 중" lines={2} />;
    if (failed) return null;

    if (!next) {
        return (
            <section aria-label="다음 숙박" className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
                <BuddyMascot size={52} />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-brand-navy">다가오는 숙박이 없어요</p>
                    <p className="mt-0.5 text-xs text-zinc-500">버디와 다음 시즌방 일정을 잡아볼까요?</p>
                </div>
                <button type="button" onClick={onBook} className="shrink-0 rounded-xl bg-brand-navy px-3 py-2 text-xs font-bold text-white hover:bg-brand-navy-deep">날짜 고르기</button>
            </section>
        );
    }

    const date = next.date.slice(0, 10);
    const [, m, d] = date.split('-').map(Number);
    const weekday = WEEKDAYS[new Date(date + 'T12:00:00').getDay()];
    const waiting = reservationState(next.status) === 'waiting';
    const showTeaching = teachingEnabled && !waiting;

    return (
        <section aria-label="다음 숙박" className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-black text-brand-navy">다음 숙박</p>
                <span className="rounded-full bg-brand-navy/5 px-2 py-0.5 text-[11px] font-black text-brand-navy">{dDay(date)}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-zinc-900">{m}월 {d}일 ({weekday})</h2>
                {!waiting && <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">확정</span>}
                {next.teaching && <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">강습 신청됨</span>}
            </div>
            {waiting && <div className="mt-3"><WaitlistProgress position={next.waiting_order} /></div>}
            <div className="mt-3 flex items-center gap-2">
                {showTeaching && (
                    <label className="flex min-h-10 flex-1 items-center justify-between gap-2 rounded-xl bg-zinc-50 px-3 text-xs font-bold text-zinc-700">
                        강습 신청
                        <input type="checkbox" role="switch" aria-label="강습 신청" checked={next.teaching === true} disabled={busy} onChange={() => void toggleTeaching()} />
                    </label>
                )}
                <button type="button" onClick={onOpenCalendar} className={`flex min-h-10 items-center justify-center gap-1 rounded-xl border border-zinc-200 px-3 text-xs font-bold text-brand-navy hover:bg-zinc-50 ${showTeaching ? '' : 'flex-1'}`}>
                    일정 보기<ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </section>
    );
}
