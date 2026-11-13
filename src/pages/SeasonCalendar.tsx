import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { getCrewCalendar } from '../services/crew';
import { getUserInfo } from '../services/user';
import type { CrewCalendarResponse } from '../types/api';
import { SEASON_HOUSE_RESERVATIONS_ENABLED } from '../constants/operatingSeason';

const labels = { LOW: '여유', MEDIUM: '보통', HIGH: '혼잡' };
const tones = { LOW: 'bg-emerald-50 text-emerald-800', MEDIUM: 'bg-amber-50 text-amber-900', HIGH: 'bg-rose-50 text-rose-800' };
/** Read-only occupancy: intentionally independent of reservation creation's release hold. */
export default function SeasonCalendar({ onBack }: { onBack: () => void }) {
    const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [data, setData] = useState<CrewCalendarResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        let cancelled = false; setLoading(true); setError(''); setData(null);
        const load = async () => {
            try {
                const user = await getUserInfo();
                if (!user.crew) throw new Error('membership');
                const result = await getCrewCalendar(user.crew.crewId, `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-15`);
                if (!cancelled) setData(result);
            } catch { if (!cancelled) setError('시즌방 현황을 불러오지 못했습니다. 승인된 크루 소속과 연결 상태를 확인해 주세요.'); }
            finally { if (!cancelled) setLoading(false); }
        };
        void load(); return () => { cancelled = true; };
    }, [month, retry]);
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return <main className="min-h-0 flex-1 overflow-y-auto bg-[#FAF8F3] p-4 sm:p-8">
        <div className="mx-auto max-w-3xl space-y-5 text-[#162660]">
            <button type="button" onClick={onBack} className="flex min-h-11 items-center gap-2 text-sm font-bold"><ChevronLeft className="h-4 w-4" />홈으로</button>
            <h1 className="flex items-center gap-3 text-2xl font-black"><CalendarDays />시즌방 캘린더</h1>
            <p className="text-sm leading-7 text-zinc-600">날짜별 시즌방 이용 현황을 조회해요. {!SEASON_HOUSE_RESERVATIONS_ENABLED && '현재 신규 예약은 보류 중이며, 이 화면에서는 예약을 생성하거나 변경하지 않아요.'}</p>
            <section className="rounded-3xl border border-zinc-200 bg-white p-3 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3"><button type="button" aria-label="이전 달" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200"><ChevronLeft /></button><h2 className="font-black">{month.getFullYear()}년 {month.getMonth() + 1}월</h2><button type="button" aria-label="다음 달" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200"><ChevronRight /></button></div>
                {loading ? <p role="status" className="p-6 text-sm">현황을 확인하고 있어요.</p> : error ? <div role="alert" className="p-4 text-sm text-red-700">{error}<button type="button" onClick={() => setRetry(value => value + 1)} className="mt-3 block min-h-11 underline">다시 시도</button></div> : <>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs sm:gap-2">{['일','월','화','수','목','금','토'].map(day => <span key={day} className="py-2 text-zinc-500">{day}</span>)}
                        {Array.from({ length: month.getDay() }, (_, index) => <span key={`blank-${index}`} />)}
                        {Array.from({ length: days }, (_, index) => {
                            const date = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`;
                            const status = data?.calendar.find(item => item.date === date)?.occupancy_status;
                            return <div key={date} aria-label={`${date} ${status ? labels[status] : '현황 없음'}`} className={`flex min-h-16 flex-col items-center justify-center gap-2 rounded-xl px-0.5 sm:min-h-20 ${status ? tones[status] : 'bg-zinc-50 text-zinc-500'}`}><strong>{index + 1}</strong><span className="text-[10px] sm:text-xs">{status ? labels[status] : '현황 없음'}</span></div>;
                        })}
                    </div><p className="mt-5 text-xs leading-6 text-zinc-500">여유 · 보통 · 혼잡은 서버에서 제공한 이용 현황이에요. 현황 없음은 빈방이나 예약 가능을 의미하지 않아요.</p>
                </>}
            </section>
        </div>
    </main>;
}
