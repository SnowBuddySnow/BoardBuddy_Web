export interface ReservationAvailability { bookable?: boolean; opensAt?: string | null; unavailableReason?: string | null }
function availabilityCopy(value?: ReservationAvailability) {
    if (!value) return '예약 가능 여부를 확인하고 있어요.';
    if (value.bookable) return '';
    if (value.opensAt) { const [date,time]=value.opensAt.split('T'); return `${date.replace(/-/g,'.')} ${time.slice(0,5)} 오픈 예정입니다. (한국 시간)`; }
    return value.unavailableReason==='PAST_DATE' ? '지난 날짜는 예약할 수 없어요.' : value.unavailableReason==='CREW_CLOSED' ? '크루 예약 접수가 닫혀 있어요.' : '아직 예약할 수 없는 날짜예요. 크루 오픈 일정을 확인해 주세요.';
}
export default function ReservationWindowNotice({ value }: {value?:ReservationAvailability}) {
    const message=availabilityCopy(value);
    return message ? <p role="status" className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-xs leading-5 text-slate-600">{message}</p> : null;
}
