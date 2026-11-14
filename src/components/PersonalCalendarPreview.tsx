import { useEffect, useState } from 'react';
import { getMyCrewCalendar } from '../services/crew';
import { localDateKey, reservationOn, reservationState } from '../lib/personalCalendar';
import type { MyReservation } from '../types/api';

export default function PersonalCalendarPreview({ crewId, onOpen }: { crewId: number; onOpen: () => void }) {
    const [days] = useState(() => Array.from({length:14}, (_,offset) => { const date=new Date(); date.setHours(12,0,0,0); date.setDate(date.getDate()-date.getDay()+offset); return date; }));
    const [items, setItems] = useState<MyReservation[]>([]);
    const [loading,setLoading] = useState(true);
    const [failed,setFailed] = useState(false);
    useEffect(() => {
        let cancelled=false;
        const months=[...new Set(days.map(date => localDateKey(date).slice(0,7)))];
        setLoading(true); setFailed(false); setItems([]);
        void Promise.all(months.map(month=>getMyCrewCalendar(crewId, `${month}-01`))).then(results => { if(!cancelled) setItems(results.flatMap(item=>item.my_reservations)); })
            .catch(()=>{if(!cancelled)setFailed(true);}).finally(()=>{if(!cancelled)setLoading(false);});
        return ()=>{cancelled=true;};
    },[crewId,days]);
    return <section aria-label="나의 2주 달력" className="mx-4 rounded-[20px] bg-[#f3f4f6] p-3">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-[#162660]">나의 달력 <span className="ml-1 text-xs font-normal text-slate-400">{[...new Set(days.map(date=>date.getMonth()+1))].join('·')}월</span></h2><button onClick={onOpen} className="min-h-10 text-xs text-blue-700">전체 보기 →</button></div>
        {loading || failed ? <p role="status" className="text-xs text-slate-500">{failed ? '현황을 불러오지 못했습니다. 전체 보기에서 다시 확인해 주세요.' : '일정을 확인하고 있어요.'}</p> : <>
            <div className="grid grid-cols-7 gap-1 rounded-2xl bg-white p-2">{['일','월','화','수','목','금','토'].map(day=><span key={day} className="pb-1 text-center text-[10px] text-slate-400">{day}</span>)}{days.map(date=>{const key=localDateKey(date);const state=reservationState(reservationOn(items,key)?.status);return <button key={key} onClick={onOpen} aria-label={`${key} ${state==='confirmed'?'예약 확정':state==='waiting'?'예약 대기':'예약 없음'}`} className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-lg bg-white text-xs"><span className={`flex h-6 w-6 items-center justify-center rounded-full ${state==='confirmed'?'bg-[#162660] text-white':state==='waiting'?'bg-slate-400 text-white':'text-slate-700'}`}>{date.getDate()}</span>{state&&<span className="text-[9px] text-slate-500">{state==='confirmed'?'확정':'대기'}</span>}</button>;})}</div>
            <div className="mt-3 flex justify-end gap-3 text-[10px] text-slate-500"><span className="flex items-center gap-1"><i aria-hidden="true" className="h-2 w-2 rounded-full bg-[#162660]" />확정</span><span className="flex items-center gap-1"><i aria-hidden="true" className="h-2 w-2 rounded-full bg-slate-400" />대기</span></div>
        </>}
    </section>;
}
