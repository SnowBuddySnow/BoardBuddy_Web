import { useEffect, useRef, useState } from 'react';
import ReservationWindowNotice, {type ReservationAvailability} from '../components/ReservationWindowNotice';
import BuddyNote from '../components/BuddyNote';
import { Calendar } from '../components/Calendar';
import { ReservationLayout } from '../components/reservation/ReservationLayout';
import '../components/reservation/crew-calendar.css';
import { getReservationSeason } from '../lib/reservationSeason';
import { localDateKey, reservationOn, reservationState } from '../lib/personalCalendar';
import { getUserInfo } from '../services/user';
import { getReservationDetail, getCrewInfo, getMyCrewCalendar, createReservation, cancelReservation, applyForTeaching, withdrawFromTeaching } from '../services/crew';
import type { MyReservation } from '../types/api';

export default function MyReservations({ onBack, onCrewClick }: { onBack: () => void; onCrewClick?: () => void }) {
    const [month, setMonth] = useState(() => getReservationSeason().initialDate);
    const [selected, setSelected] = useState(localDateKey(month));
    const [crewId, setCrewId] = useState<number>();
    const [teachingEnabled, setTeachingEnabled] = useState(false);
    const [items, setItems] = useState<MyReservation[]>([]);
    const [usage, setUsage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);
    const revision = useRef(0);
    const loadedMonth = useRef('');
    const [error, setError] = useState('');
    const [refresh, setRefresh] = useState(0);
    const [availability,setAvailability]=useState<ReservationAvailability>();
    useEffect(()=>{ if(!crewId)return; let cancelled=false; setAvailability(undefined); void getReservationDetail(crewId,selected).then(data=>{if(!cancelled)setAvailability(data);}).catch(()=>{if(!cancelled)setAvailability({bookable:false});}); return()=>{cancelled=true;}; },[crewId,selected,refresh]);
    useEffect(() => {
        let cancelled = false;
        void getUserInfo().then(async user => {
            if (!user.crew) throw Error('membership');
            const crew = await getCrewInfo(user.crew.crewId);
            if (!cancelled) { setCrewId(user.crew.crewId); setTeachingEnabled(crew.teachingEnabled === true); }
        }).catch(() => { if (!cancelled) { setError('소속 크루 정보를 불러오지 못했습니다.'); setLoading(false); } });
        return () => { cancelled = true; };
    }, []);
    useEffect(() => {
        if (!crewId) return;
        const request = ++revision.current;
        setLoading(true); setError('');
        const key = localDateKey(month).slice(0,7);
        if (loadedMonth.current !== key) { setItems([]); loadedMonth.current = key; }
        void getMyCrewCalendar(crewId, localDateKey(month)).then(data => {
            if (request === revision.current) { setItems(data.my_reservations); setUsage(data.usage_count); }
        }).catch(() => { if (request === revision.current) setError('예약 현황을 불러오지 못했습니다. 다시 시도해 주세요.'); })
            .finally(() => { if (request === revision.current) setLoading(false); });
        return () => { if (revision.current === request) revision.current = request + 1; };
    }, [crewId, month, refresh]);
    const reservation = reservationOn(items, selected);
    const state = reservationState(reservation?.status);
    const mutate = async (action: 'reserve' | 'cancel' | 'teaching') => {
        if (!crewId || lock.current || loading || error) return;
        lock.current = true; setBusy(true); setError('');
        try {
            if (action === 'reserve') {
                if (availability?.bookable !== true) return;
                const result = await createReservation(crewId, [selected]);
                const booking = result.results?.find(item => item.date === selected);
                if (!booking?.success) throw Error(booking?.message || '신청하지 못했습니다.');
            } else if (reservation && action === 'cancel') {
                const result = await cancelReservation(crewId, reservation.reservation_id);
                if (!result.success) throw Error(result.message || '취소하지 못했습니다.');
            } else if (reservation && (reservation.teaching || (teachingEnabled && state === 'confirmed'))) {
                await (reservation.teaching ? withdrawFromTeaching : applyForTeaching)(crewId, reservation.reservation_id);
            }
            setRefresh(value => value + 1);
        } catch (cause) { setError(cause instanceof Error ? cause.message : '처리하지 못했습니다. 다시 확인해 주세요.'); }
        finally { lock.current = false; setBusy(false); }
    };
    const { start, end } = getReservationSeason();
    const move = (offset: number) => { const next = new Date(month.getFullYear(), month.getMonth()+offset, 1); setMonth(next); setSelected(localDateKey(next)); };
    return <ReservationLayout className="crew-calendar-screen" title="나의 달력" onBack={onBack} action={onCrewClick && <button onClick={onCrewClick}>크루 달력 →</button>}>
        <main className="reservation-content" aria-busy={loading || busy}>
            <div className="mb-3 flex items-center justify-between text-xs text-slate-500"><span>확정·대기 일정을 한눈에 확인하세요.</span><span>시즌방 이용 {usage}박 <button className="ml-2 min-h-10 text-blue-700" onClick={() => setRefresh(value=>value+1)}>새로고침</button></span></div>
            {error && <p role="alert" className="mb-3 text-sm text-red-700">{error} <button onClick={() => setRefresh(value => value+1)}>다시 불러오기</button></p>}
            <div className="reservation-workspace"><Calendar variant="crew-classic" month={`${month.getMonth()+1}월`} year={month.getFullYear()}
                startDayOfWeek={new Date(month.getFullYear(),month.getMonth(),1).getDay()} totalDays={new Date(month.getFullYear(),month.getMonth()+1,0).getDate()}
                selectedDays={[Number(selected.slice(8,10))]} onDayClick={day => setSelected(localDateKey(new Date(month.getFullYear(),month.getMonth(),day)))}
                onPrevMonth={new Date(month.getFullYear(),month.getMonth()-1,1)>=start ? () => move(-1) : undefined}
                onNextMonth={new Date(month.getFullYear(),month.getMonth()+1,1)<=end ? () => move(1) : undefined}
                dayDescription={day => reservationState(reservationOn(items, localDateKey(new Date(month.getFullYear(),month.getMonth(),day)))?.status) === 'confirmed' ? '예약 확정' : reservationOn(items,localDateKey(new Date(month.getFullYear(),month.getMonth(),day))) ? '예약 대기' : '예약 없음'}
                footer={<div className="crew-calendar-legend"><span><i aria-hidden="true" className="h-2 w-2 rounded-full bg-[#162660]" />확정</span><span><i aria-hidden="true" className="h-2 w-2 rounded-full bg-slate-400" />대기</span></div>}
                renderDay={day => {
                    const date=localDateKey(new Date(month.getFullYear(),month.getMonth(),day)); const status=reservationState(reservationOn(items,date)?.status);
                    return <div className={`reservation-date-cell ${date===selected ? 'is-selected' : ''}`}><span className={status ? `${status==='confirmed' ? 'reservation-confirmed' : 'reservation-pending'} flex h-7 w-7 items-center justify-center rounded-full` : ''}>{day}</span></div>;
                }} />
                <aside className="reservation-detail-column"><section className="reservation-panel mt-3 lg:mt-0">
                    <h2 className="font-bold text-[#162660]">{selected.replace(/-/g,'.')}</h2>
                    {!loading && !reservation && !error && <BuddyNote>버디와 다음 시즌방 일정을 준비해 보세요.</BuddyNote>}
                    <p role="status" className="my-3 text-sm text-slate-600">{error ? '예약 현황을 확인할 수 없습니다.' : loading ? '현황을 확인하고 있어요.' : state==='confirmed' ? '예약이 확정되었습니다.' : state==='waiting' ? `예약 대기 ${reservation?.waiting_order ?? '-'}번입니다.` : '예약 내역이 없습니다.'}</p>
                    {(reservation?.teaching || (state==='confirmed' && teachingEnabled)) && <label className="mb-3 flex items-center justify-between text-sm">강습 신청<input type="checkbox" role="switch" aria-label="강습 신청" checked={reservation?.teaching === true} disabled={busy || loading} onChange={() => void mutate('teaching')} /></label>}
                    <ReservationWindowNotice value={reservation ? {bookable:true} : availability} />
                    <button disabled={busy || loading || !!error || (!reservation && availability?.bookable !== true)} onClick={() => void mutate(reservation ? 'cancel' : 'reserve')} className="reservation-primary w-full px-4 py-3">{busy ? '처리 중…' : reservation ? state==='waiting' ? '대기 취소' : '예약 취소' : '예약하기'}</button>
                </section></aside>
            </div>
        </main>
    </ReservationLayout>;
}
