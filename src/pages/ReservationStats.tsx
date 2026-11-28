import StayPolicyConsent from '../components/reservation/StayPolicyConsent';
import StayAnnouncementPanel from '../components/reservation/StayAnnouncementPanel';
import ReservationMemberDetail from '../components/reservation/ReservationMemberDetail';
import { completeStay } from '../services/seasonStays';
import ReservationWindowNotice from '../components/ReservationWindowNotice';
import BuddyNote from '../components/BuddyNote';
import '../components/reservation/crew-calendar.css';
import { getReservationSeason } from '../lib/reservationSeason';
import { ReservationLayout } from '../components/reservation/ReservationLayout';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRightIcon, Smile, ChevronDown, RefreshCw } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { SkeletonCard } from '../components/Skeleton';
import { useFeedback } from '../components/feedback/feedbackContext';
import { Button } from '../components/Button';
import { Calendar } from '../components/Calendar';
import { getCrewInfo, getReservationDetail, getCrewCalendar, createReservation, cancelReservation, deleteReservation, applyForTeaching, withdrawFromTeaching, updateReservationManagement } from '../services/crew';
import { reservationState } from '../lib/personalCalendar';
import { getUserInfo } from '../services/user';
import { ReservationDayResponse, CrewCalendarResponse, PaymentStatus, ReservationBookingResponse } from '../types/api';


interface ReservationStatsProps {
    onBack: () => void;
    readOnly?: boolean;
    title?: string;
    onMyCalendarClick?: () => void;
    onReservationClick?: () => void;
}


export default function ReservationStats({ onBack, onMyCalendarClick, onReservationClick, readOnly = false, title }: ReservationStatsProps) {
    const todayDate = new Date();

    // Default to current date
    const [viewDate, setViewDate] = useState(() => getReservationSeason().initialDate);
    const currentYear = viewDate.getFullYear();
    const currentMonthIndex = viewDate.getMonth(); // 0-11

    // Check if "Today" is in the currently viewed month/year to highlight it
    const isCurrentMonthView = todayDate.getFullYear() === currentYear && todayDate.getMonth() === currentMonthIndex;
    const todayDay = todayDate.getDate();

    const currentMonthName = `${currentMonthIndex + 1}월`;

    // Calculate days in current month
    const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();

    // Calculate start day of week (0=Sun, 1=Mon, etc.)
    const firstDayOfMonth = new Date(currentYear, currentMonthIndex, 1).getDay();

    const [selectedDay, setSelectedDay] = useState<number>(readOnly ? 0 : isCurrentMonthView ? todayDay : 0);
    const [isExpanded, setIsExpanded] = useState(!readOnly && isCurrentMonthView);
    const [crewOpen, setCrewOpen] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const { showResult, toast } = useFeedback();
    const [submitting, setSubmitting] = useState(false);
    const [showProcessing, setShowProcessing] = useState(false);
    useEffect(() => {
        if (!submitting) return;
        const timer = window.setTimeout(() => setShowProcessing(true), 700);
        return () => window.clearTimeout(timer);
    }, [submitting]);
    const [policyDate, setPolicyDate] = useState('');
    const [completingId, setCompletingId] = useState<number>();
    const mutationBusy = useRef(false);
    const detailRequests = useRef(new Map<string, Promise<void>>());
    const detailFetchedAt = useRef(new Map<string, number>());
    const [showMySchedule, setShowMySchedule] = useState(false);
    const includeMine = showMySchedule || !readOnly;
    const [crewCapacity, setCrewCapacity] = useState<number | null>(null);
    const [crewId, setCrewId] = useState<number | null>(null);
    const [teachingEnabled, setTeachingEnabled] = useState(false);

    // Store fetched reservation details
    const [detailsCache, setDetailsCache] = useState<Record<string, ReservationDayResponse | null>>({});

    // Store monthly calendar data (occupancy statuses)
    const [calendarData, setCalendarData] = useState<CrewCalendarResponse | null>(null);

    const [selectedMember, setSelectedMember] = useState<ReservationBookingResponse | null>(null);

    // Default groups confirmed/waiting; earliest follows reservation IDs.
    const [sortOrder, setSortOrder] = useState<'default' | 'earliest'>('default');
    const [loadError, setLoadError] = useState('');

    const formatDate = useCallback((day: number) => {
        return `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }, [currentYear, currentMonthIndex]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const user = await getUserInfo();
                if (!user.crew) throw new Error('membership');
                const crew = await getCrewInfo(user.crew.crewId);
                if (cancelled) return;
                setCrewId(user.crew.crewId);
                setCrewOpen(crew.seasonHouseActive !== false);
                setTeachingEnabled(crew.teachingEnabled === true);
                if (crew.dailyCapacity) setCrewCapacity(crew.dailyCapacity);
            } catch { if (!cancelled) setLoadError('크루 정보를 불러오지 못했습니다. 승인된 소속과 연결 상태를 확인해 주세요.'); }
        };
        void load(); return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!crewId) return;
        let cancelled = false;
        setLoadError(''); setCalendarData(null);
        getCrewCalendar(crewId, `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-15`, includeMine)
            .then(data => { if (!cancelled) setCalendarData(data); })
            .catch(() => { if (!cancelled) setLoadError('달력 현황을 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요.'); });
        return () => { cancelled = true; };
    }, [crewId, currentYear, currentMonthIndex, includeMine]);

    const fetchDetailForDay = useCallback(async (day: number, refresh = false) => {
        if (!crewId) return; // Wait for crewId

        const dateStr = formatDate(day);
        if (!refresh && Date.now() - (detailFetchedAt.current.get(dateStr) ?? 0) < 15_000) return;
        const pending = detailRequests.current.get(dateStr);
        if (pending) {
            await pending;
            if (!refresh) return;
        }
        const request = (async () => {
            try {
                const data = await getReservationDetail(crewId, dateStr);
                setDetailsCache(prev => ({ ...prev, [dateStr]: data }));
                detailFetchedAt.current.set(dateStr, Date.now());
                setLoadError('');
            } catch (error) {
                setLoadError('날짜별 이용 현황을 불러오지 못했습니다. 다시 확인해 주세요.');
                console.error(`Failed to fetch detail for ${dateStr}:`, error);
            }
        })().finally(() => detailRequests.current.delete(dateStr));
        detailRequests.current.set(dateStr, request);
        return request;
    }, [crewId, formatDate]);

    // Effect to fetch detail when selectedDay changes
    useEffect(() => {
        if (selectedDay > 0 && crewId) {
            fetchDetailForDay(selectedDay);
        }
    }, [selectedDay, crewId, fetchDetailForDay]);


    // Parse My Schedule Data
    const confirmedDays = calendarData?.my_reservations
        ?.filter(r => r.status === 'confirmed')
        .map(r => parseInt(r.date.split('-')[2], 10)) || [];

    const pendingDays = calendarData?.my_reservations
        ?.filter(r => r.status === 'pending' || r.status === 'waiting') // Assuming 'waiting' or 'pending'
        .map(r => parseInt(r.date.split('-')[2], 10)) || [];

    const handleCreateReservation = async () => {
        if (policyDate !== formatDate(selectedDay)) return;
        if (readOnly || !crewOpen || mutationBusy.current || !detailsCache[formatDate(selectedDay)]?.bookable) return;
        if (!crewId) {
            alert("크루 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        const dateStr = formatDate(selectedDay);

        try {
            mutationBusy.current = true; setShowProcessing(false); setSubmitting(true);
            const result = await createReservation(crewId, [dateStr], undefined, 1);
            const booking = result.results?.find(item => item.date === dateStr);
            if (!booking?.success) { showResult({ tone: 'error', title: '예약하지 못했어요', body: booking?.message || '접수 기간과 크루 설정을 확인해 주세요.' }); return; }
            setPolicyDate('');
            showResult(booking.status === 'WAITING'
                ? { tone: 'waiting', title: `${currentMonthIndex + 1}/${selectedDay} 대기 ${booking.waitlistPosition ?? '-'}번으로 신청했어요`, body: '자리가 나면 자동으로 확정되고 알림으로 알려드려요.', actions: onMyCalendarClick ? [{ label: '닫기' }, { label: '내 일정 보기', primary: true, onClick: onMyCalendarClick }] : undefined }
                : { tone: 'success', title: `${currentMonthIndex + 1}/${selectedDay} 예약이 확정됐어요`, body: teachingEnabled ? '강습이 필요하면 아래에서 바로 신청할 수 있어요.' : '즐거운 시즌방 되세요!' });
            // Refresh data
            const calDateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-15`;
            const data = await getCrewCalendar(crewId, calDateStr, includeMine);
            setCalendarData(data);
            await fetchDetailForDay(selectedDay, true);
        } catch (error) {
            console.error("Reservation creation failed:", error);
            showResult({ tone: 'error', title: '예약 신청에 실패했어요', body: '연결 상태를 확인한 뒤 다시 시도해 주세요.' });
        } finally { mutationBusy.current = false; setSubmitting(false); }
    };

    const handleCancelReservation = async () => {
        if (readOnly || mutationBusy.current) return;
        if (!crewId) return;

        const dateStr = formatDate(selectedDay);
        const reservation = calendarData?.my_reservations?.find(r => r.date === dateStr);
        
        if (!reservation) {
            alert("예약 정보를 찾을 수 없습니다.");
            return;
        }

        try {
            mutationBusy.current = true; setShowProcessing(false); setSubmitting(true);
            const result = await cancelReservation(crewId, reservation.reservation_id);
            if (!result.success) { showResult({ tone: 'error', title: '예약을 취소하지 못했어요', body: result.message || '다시 확인해 주세요.' }); return; }
            toast({ message: `${currentMonthIndex + 1}/${selectedDay} 예약을 취소했어요.` });

            // Refresh data
            const calDateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-15`;
            const data = await getCrewCalendar(crewId, calDateStr, includeMine);
            setCalendarData(data);
            await fetchDetailForDay(selectedDay, true);
        } catch (error) {
            console.error("Cancellation failed:", error);
            toast({ message: '예약 취소에 실패했어요. 다시 시도해 주세요.', tone: 'error' });
        } finally { mutationBusy.current = false; setSubmitting(false); }
    };

    // Same rule as 나의 달력: a crew with teaching enabled lets a confirmed booking opt in,
    // and an existing request can always be withdrawn.
    const handleToggleTeaching = async () => {
        if (readOnly || mutationBusy.current || !crewId || !selectedDay) return;
        const mine = calendarData?.my_reservations?.find(r => r.date === formatDate(selectedDay));
        if (!mine) return;
        try {
            mutationBusy.current = true; setSubmitting(true);
            await (mine.teaching ? withdrawFromTeaching : applyForTeaching)(crewId, mine.reservation_id);
            const data = await getCrewCalendar(crewId, `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-15`, includeMine);
            setCalendarData(data);
            await fetchDetailForDay(selectedDay, true);
        } catch {
            toast({ message: '강습 신청 상태를 바꾸지 못했어요. 다시 시도해 주세요.', tone: 'error' });
        } finally { mutationBusy.current = false; setSubmitting(false); }
    };

    const updateReservationDraft = (reservationId: number, updates: { paymentStatus?: PaymentStatus | null; managerMemo?: string | null }) => {
        if (!selectedDay) return;
        const dateKey = formatDate(selectedDay);
        setDetailsCache(current => {
            const detail = current[dateKey];
            if (!detail) return current;
            return {
                ...current,
                [dateKey]: {
                    ...detail,
                    reservations: detail.reservations.map(reservation => (
                        reservation.reservationId === reservationId ? { ...reservation, ...updates } : reservation
                    )),
                },
            };
        });
    };

    // Manager bulk handling for the selected day.
    type MemberFilter = 'all' | 'unpaid' | 'incomplete' | 'teaching';
    const [memberFilter, setMemberFilter] = useState<MemberFilter>('all');
    const [checkedIds, setCheckedIds] = useState<number[]>([]);
    const [bulkBusy, setBulkBusy] = useState(false);
    const [bulkDay, setBulkDay] = useState(selectedDay);
    if (bulkDay !== selectedDay) { setBulkDay(selectedDay); setCheckedIds([]); setMemberFilter('all'); }
    const todayKey = `${todayDate.getFullYear()}-${String(todayDate.getMonth()+1).padStart(2,'0')}-${String(todayDate.getDate()).padStart(2,'0')}`;
    const isPastSelected = selectedDay > 0 && formatDate(selectedDay) < todayKey;
    const memberMatches = (member: ReservationBookingResponse, filter: MemberFilter) =>
        filter === 'unpaid' ? Boolean(member.guestId) && member.paymentStatus !== 'PAID'
        : filter === 'incomplete' ? isPastSelected && member.status === 'CONFIRMED' && !member.stayCompleted
        : filter === 'teaching' ? member.teachingRequested === true
        : true;

    const runBulk = async (kind: 'paid' | 'complete') => {
        if (!crewId || bulkBusy) return;
        const members = (shownDetail?.reservations ?? []).filter(member => checkedIds.includes(member.reservationId)
            && (kind === 'paid' ? memberMatches(member, 'unpaid') : memberMatches(member, 'incomplete')));
        if (!members.length) return;
        setBulkBusy(true);
        const done: ReservationBookingResponse[] = [];
        try {
            for (const member of members) {
                if (kind === 'paid') await updateReservationManagement(crewId, member.reservationId, 'PAID', member.managerMemo ?? null);
                else await completeStay(crewId, member.reservationId, true);
                done.push(member);
            }
        } catch {
            toast({ message: `${done.length}명까지 처리하고 멈췄어요. 다시 시도해 주세요.`, tone: 'error' });
        } finally {
            setBulkBusy(false);
            setCheckedIds([]);
            await fetchDetailForDay(selectedDay, true);
        }
        if (!done.length || done.length < members.length) return;
        const day = selectedDay;
        toast({
            message: `${done.length}명 ${kind === 'paid' ? '입금 확인' : '이용 완료'} 처리했어요.`,
            actionLabel: '되돌리기',
            onAction: () => {
                void (async () => {
                    try {
                        for (const member of done) {
                            if (kind === 'paid') await updateReservationManagement(crewId, member.reservationId, member.paymentStatus ?? 'UNPAID', member.managerMemo ?? null);
                            else await completeStay(crewId, member.reservationId, false);
                        }
                        toast({ message: '되돌렸어요.' });
                    } catch { toast({ message: '되돌리지 못했어요. 명단에서 직접 확인해 주세요.', tone: 'error' }); }
                    finally { await fetchDetailForDay(day, true); }
                })();
            },
        });
    };

    const [refreshing, setRefreshing] = useState(false);
    const handleRefresh = async () => {
        if (!crewId || refreshing) return;
        setRefreshing(true);
        try {
            const data = await getCrewCalendar(crewId, formatDate(1), includeMine);
            setCalendarData(data);
            if (selectedDay) await fetchDetailForDay(selectedDay, true);
        } catch { setLoadError('현황을 새로고침하지 못했습니다. 다시 시도해 주세요.'); }
        finally { setRefreshing(false); }
    };

    const handleDayClick = (day: number) => {
        setSelectedDay(day);
        setIsExpanded(true);
    };

    // Navigation Bounds
    const { start: minDate, end: maxDate } = getReservationSeason(todayDate);

    const handlePrevMonth = () => {
        const newDate = new Date(currentYear, currentMonthIndex - 1, 1);
        if (newDate >= minDate) {
            setViewDate(newDate);
            setSelectedDay(0);
            setIsExpanded(false);
        }
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentYear, currentMonthIndex + 1, 1);
        if (newDate <= maxDate) {
            setViewDate(newDate);
            setSelectedDay(0);
            setIsExpanded(false);
        }
    };

    const canGoPrev = new Date(currentYear, currentMonthIndex - 1, 1) >= minDate;
    const canGoNext = new Date(currentYear, currentMonthIndex + 1, 1) <= maxDate;

    // Get Occupancy Status from Calendar Data
    const getOccupancyStatus = (day: number) => {
        if (!calendarData?.calendar) return null;
        const dateStr = formatDate(day);
        const dayData = calendarData.calendar.find(item => item.date === dateStr);
        return dayData?.occupancy_status ?? null;
    };

    const getCrewDayColor = (day: number) => {
        const status = getOccupancyStatus(day);

        switch (status) {
            case 'LOW': return 'reservation-dot-low';
            case 'MEDIUM': return 'reservation-dot-medium';
            case 'HIGH': return 'reservation-dot-high';
            default: return 'reservation-dot-none';
        }
    };

    const currentDetail = selectedDay ? detailsCache[formatDate(selectedDay)] : null;
    // Keep the last loaded day on screen (dimmed) while the next day loads, instead of
    // swapping the whole panel for a loading line and back, which made it flicker.
    const [lastDetail, setLastDetail] = useState<ReservationDayResponse | null>(null);
    if (currentDetail && currentDetail !== lastDetail) setLastDetail(currentDetail);
    const shownDetail = currentDetail ?? lastDetail;
    const detailPending = !currentDetail && Boolean(lastDetail) && !loadError;
    const currentMemberCount = shownDetail?.confirmedCount ?? 0;
    // Fix: Ensure we fallback to empty array if reservations is undefined
    const currentMemberList = [...(shownDetail?.reservations || [])].filter(member => member.status !== 'CANCELED').sort((a, b) => {
        if (sortOrder === 'earliest') {
            return a.reservationId - b.reservationId; // Ascending Order of ID
        }

        // Confirmed members first, then the server-assigned waiting order.
        return Number(a.status === 'WAITING') - Number(b.status === 'WAITING')
            || (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0)
            || a.reservationId - b.reservationId;
    });

    return (
        <ReservationLayout className="crew-calendar-screen" title={title ?? "크루 달력"} onBack={onBack} action={!readOnly && onMyCalendarClick && <button type="button" onClick={onMyCalendarClick}>내 예약 →</button>}>

            {submitting && showProcessing && <div role="status" aria-live="polite" className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-5 backdrop-blur-sm">
                <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl">
                    <span aria-hidden="true" className="mx-auto mb-4 block h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-[#162660]" />
                    <BuddyNote><h2 className="text-lg font-bold text-[#162660]">예약 요청을 처리하고 있어요</h2></BuddyNote>
                    <p className="mt-2 text-sm leading-6 text-slate-600"><span className="block">서버의 응답을 기다리고 있어요.</span><span className="block">다시 누르지 않아도 결과를 알려드려요.</span></p>
                </div>
            </div>}
            <main className="reservation-content" aria-busy={submitting}>

                {readOnly && <p className="mb-4 text-xs leading-6 text-zinc-500"><span className="block">현재는 이용 현황만 조회할 수 있어요.</span></p>}
                {loadError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}
                <div className="reservation-workspace">
                    <Calendar
                        variant="crew-classic"
                        className="mb-3"
                        dayDescription={day => ({ LOW: '여유', MEDIUM: '보통', HIGH: '혼잡', '': '현황 없음' }[getOccupancyStatus(day) ?? ''] ?? '현황 없음')}
                        footer={<><div className="crew-calendar-legend" aria-label="혼잡도 안내">
                            {(['LOW', 'MEDIUM', 'HIGH'] as const).map(status => <span key={status}>
                                <i aria-hidden="true" className={`crew-occupancy-dot ${{ LOW: 'reservation-dot-low', MEDIUM: 'reservation-dot-medium', HIGH: 'reservation-dot-high', NONE: 'reservation-dot-none' }[status]}`} />
                                {{ LOW: '여유', MEDIUM: '보통', HIGH: '혼잡', NONE: '현황 없음' }[status]}
                            </span>)}
                        </div></>}
                        month={currentMonthName}
                        year={currentYear}
                        startDayOfWeek={firstDayOfMonth}
                        totalDays={daysInMonth}
                        expandable={false}
                        hideHeader={false}
                        selectedDays={[selectedDay]}
                        isCollapsed={false}
                        onDayClick={handleDayClick}
                        onPrevMonth={canGoPrev ? handlePrevMonth : undefined}
                        onNextMonth={canGoNext ? handleNextMonth : undefined}
                        headerRight={
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => void handleRefresh()} disabled={refreshing} aria-label="새로고침" title="새로고침"
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white hover:text-zinc-800 disabled:opacity-60">
                                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                                </button>
                                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">내 일정</span>
                                <div
                                    onClick={() => setShowMySchedule(current => !current)}
                                    role="switch" aria-checked={showMySchedule} aria-label="내 일정 표시" tabIndex={0}
                                    onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setShowMySchedule(current => !current); } }}
                                    className={`reservation-toggle w-10 h-6 rounded-full p-1 relative cursor-pointer ${showMySchedule ? 'is-on' : ''}`}
                                >
                                    <div className={`w-4 h-4 bg-white dark:bg-zinc-300 rounded-full shadow-sm transition-transform duration-200 ${showMySchedule ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                            </div>
                        }
                        renderDay={(day) => {
                            const isSelected = selectedDay === day;
                            const isToday = day === todayDay && isCurrentMonthView;
                            const colorClass = getCrewDayColor(day);

                            const isConfirmed = showMySchedule && confirmedDays.includes(day);
                            const isPending = showMySchedule && pendingDays.includes(day);

                            // Base classes
                            let containerClasses = `reservation-date-cell${isConfirmed || isPending ? ' has-personal-reservation' : ''}`;

                            if (isSelected) {
                                containerClasses += " is-selected";
                            } else if (isToday) {
                                containerClasses += " is-today";
                            } else {
                                containerClasses += " text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50";
                            }

                            // Number Element (Circle if reserved)
                            let numberElement = <span className="text-sm font-bold">{day}</span>;
                            if (isConfirmed || isPending) {
                                const bg = isConfirmed ? 'reservation-confirmed' : 'reservation-pending';
                                numberElement = (
                                    <div className={`w-8 h-8 -mt-1 rounded-full ${bg} flex items-center justify-center text-sm font-bold shadow-sm`}>
                                        {day}
                                    </div>
                                );
                            }

                            return (
                                <div className={containerClasses}>
                                    {numberElement}
                                    {getOccupancyStatus(day) && <span aria-hidden="true" className={`crew-occupancy-dot ${colorClass}`} />}
                                </div>
                            );
                        }}
                    />

                    <aside className="reservation-detail-column">
                        {/* Bottom Section: Legend or Expanded View */}
                        {isExpanded && !shownDetail ? (loadError ? <p role="status" className="p-4 text-sm text-zinc-500">이용 현황을 확인할 수 없습니다.</p> : <SkeletonCard label="날짜별 현황을 확인하는 중" lines={3} className="mb-3" />) : isExpanded ? (
                            <div aria-busy={detailPending} className={`w-full transition-opacity duration-200 ${detailPending ? 'pointer-events-none opacity-60' : ''}`}>
                                {/* Expanded User List Card */}
                                <div className="reservation-panel w-full mb-3">
                                    {/* Card Header */}
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        <div className="w-7 h-7 bg-[#1E3A8A] rounded-[8px] flex items-center justify-center shadow-sm">
                                            <Smile className="w-4 h-4 text-white" strokeWidth={2.5} />
                                        </div>
                                        <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{currentMonthIndex + 1}월 {selectedDay}일</span>
                                        <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">확정 {currentMemberCount}{shownDetail?.capacityLimited === false ? ' · 정원 제한 없음' : `/${shownDetail?.capacity ?? crewCapacity ?? '—'}`} · 대기 {shownDetail?.waitingCount ?? 0}</span>

                                        <div className="flex-1" /> {/* Spacer */}

                                        <div className="relative shrink-0">
                                            <select
                                                aria-label="예약자 정렬"
                                                className="reservation-input reservation-sort appearance-none text-xs font-medium"
                                                value={sortOrder}
                                                onChange={(e) => setSortOrder(e.target.value as 'default' | 'earliest')}
                                            >
                                                <option value="default">기본</option>
                                                <option value="earliest">예약순</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 w-4 h-4" />
                                        </div>
                                    </div>

                                    {!readOnly && shownDetail?.canManageReservations && <p className="mb-3 text-xs text-slate-500">이름을 누르면 상세 정보를 관리할 수 있어요.</p>}
                                    {!readOnly && shownDetail?.canManageReservations && currentMemberList.length > 0 && (
                                        <div role="group" aria-label="명단 필터" className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
                                            {([['all', '전체'], ['unpaid', '입금 미확인'], ['incomplete', '이용 완료 전'], ['teaching', '강습 신청']] as const).map(([key, label]) => {
                                                const count = currentMemberList.filter(member => memberMatches(member, key)).length;
                                                if (key === 'incomplete' && !isPastSelected) return null;
                                                return <button key={key} type="button" aria-pressed={memberFilter === key} onClick={() => { setMemberFilter(key); setCheckedIds([]); }}
                                                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${memberFilter === key ? 'bg-[#28384e] text-white' : 'bg-white text-zinc-600'}`}>{label} {count}</button>;
                                            })}
                                        </div>
                                    )}
                                    {/* Users Grid */}
                                    <div className={`grid gap-y-3 gap-x-4 ${shownDetail?.canManageReservations ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                        {currentMemberList.length > 0 ? (
                                            currentMemberList.filter(member => readOnly || !shownDetail?.canManageReservations || memberMatches(member, memberFilter)).map((member) => (
                                                <div key={member.reservationId} className="reservation-member-row">
                                                    {!readOnly && shownDetail?.canManageReservations && (
                                                        <input type="checkbox" aria-label={`${member.participantName || '예약자'} 선택`} className="h-4 w-4 shrink-0 accent-[#28384e]"
                                                            checked={checkedIds.includes(member.reservationId)}
                                                            onChange={event => setCheckedIds(ids => event.target.checked ? [...ids, member.reservationId] : ids.filter(id => id !== member.reservationId))} />
                                                    )}
                                                    {/* The reservation API has no profile photo yet, so show the name's initial. */}
                                                    <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-xs font-black text-brand-navy">
                                                        {(member.participantName || (member.guestId ? '게' : '회')).trim().charAt(0)}
                                                    </span>
                                                    <div className="flex min-w-0 items-center gap-1.5">
                                                        <button type="button" onClick={() => setSelectedMember(member)} className="min-h-10 min-w-0 truncate text-left text-sm font-bold text-zinc-800 dark:text-zinc-300">
                                                            {member.participantName || (member.guestId ? `게스트 #${member.guestId}` : `회원 #${member.participantAccountId}`)}
                                                        </button>
                                                        {member.status === 'WAITING' && <span className="shrink-0 text-xs text-zinc-500">대기 {member.waitlistPosition ?? '-'}번</span>}
                                                    </div>
                                                    {!readOnly && shownDetail?.canManageReservations && member.status === 'CONFIRMED' && formatDate(selectedDay) < `${todayDate.getFullYear()}-${String(todayDate.getMonth()+1).padStart(2,'0')}-${String(todayDate.getDate()).padStart(2,'0')}` && <button className="min-h-10 rounded-lg border border-slate-200 px-2 text-xs text-blue-700" disabled={completingId != null} onClick={async () => { if (!crewId || completingId != null) return; setCompletingId(member.reservationId); try { await completeStay(crewId, member.reservationId, !member.stayCompleted); await fetchDetailForDay(selectedDay, true); } catch { toast({ message: '이용 완료 상태를 저장하지 못했어요.', tone: 'error' }); } finally { setCompletingId(undefined); } }}>{completingId === member.reservationId ? '저장 중…' : member.stayCompleted ? '이용 완료 취소' : '이용 완료 확인'}</button>}

                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-2 text-center text-zinc-400 dark:text-zinc-500 text-sm py-4">
                                                예약자가 없습니다.
                                            </div>
                                        )}
                                    </div>
                                    {!readOnly && shownDetail?.canManageReservations && checkedIds.length > 0 && (() => {
                                        const checked = currentMemberList.filter(member => checkedIds.includes(member.reservationId));
                                        const payable = checked.filter(member => memberMatches(member, 'unpaid')).length;
                                        const completable = checked.filter(member => memberMatches(member, 'incomplete')).length;
                                        return (
                                            <div role="toolbar" aria-label="선택한 예약 일괄 처리" className="sticky bottom-0 mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-[#28384e] px-3 py-2.5 text-white">
                                                <span className="mr-auto text-xs font-bold">{checked.length}명 선택</span>
                                                <button type="button" disabled={bulkBusy || !payable} onClick={() => void runBulk('paid')} className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold disabled:opacity-40">입금 확인{payable ? ` ${payable}` : ''}</button>
                                                {isPastSelected && <button type="button" disabled={bulkBusy || !completable} onClick={() => void runBulk('complete')} className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold disabled:opacity-40">이용 완료{completable ? ` ${completable}` : ''}</button>}
                                                <button type="button" disabled={bulkBusy} onClick={() => setCheckedIds([])} className="rounded-lg px-2 py-1.5 text-xs font-bold text-white/80">선택 해제</button>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {!readOnly && <>
                                {/* Change Link */}
                                {onReservationClick && <div className="w-full flex justify-end mb-3 pr-2">
                                    <button
                                        disabled={!onReservationClick}
                                        onClick={onReservationClick}
                                        className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
                                    >
                                        예약 변경하러 가기 <ChevronRightIcon className="w-3 h-3" />
                                    </button>
                                </div>}

                                {(() => {
                                    const mine = calendarData?.my_reservations?.find(r => r.date === formatDate(selectedDay));
                                    if (!mine || !(mine.teaching || (teachingEnabled && reservationState(mine.status) === 'confirmed'))) return null;
                                    return <label className="mb-3 flex min-h-12 items-center justify-between rounded-xl border border-[#ebe7dd] bg-white px-3 text-sm font-bold text-zinc-800">강습 신청<input type="checkbox" role="switch" aria-label="강습 신청" checked={mine.teaching === true} disabled={submitting} onChange={() => void handleToggleTeaching()} /></label>;
                                })()}
                                <ReservationWindowNotice key={formatDate(selectedDay)} value={currentDetail ?? undefined} stayDate={formatDate(selectedDay)} onOpened={() => { void fetchDetailForDay(selectedDay, true); }} />
                                {!confirmedDays.includes(selectedDay) && !pendingDays.includes(selectedDay) && <StayPolicyConsent dates={[formatDate(selectedDay)]} checked={policyDate === formatDate(selectedDay)} onChange={checked => setPolicyDate(checked ? formatDate(selectedDay) : '')} disabled={submitting} />}
                                {/* Action Button */}
                                {confirmedDays.includes(selectedDay) || pendingDays.includes(selectedDay) ? (
                                    <Button
                                        variant="outline"
                                        disabled={submitting}
                                        onClick={() => setConfirmCancel(true)}
                                        className="reservation-secondary w-full h-12 text-sm"
                                    >
                                        예약 취소하기
                                    </Button>
                                ) : (
                                    <Button
                                        disabled={submitting || !crewOpen || currentDetail?.bookable !== true || policyDate !== formatDate(selectedDay)}
                                        onClick={handleCreateReservation}
                                        className="reservation-primary w-full h-14 text-base"
                                    >
                                        {submitting ? '신청 중…' : !crewOpen ? '크루 예약 접수 전' : currentDetail?.bookable !== true ? '예약 오픈 전' : '예약하기'}
                                    </Button>
                                )}
                                </>}
                            </div>
                        ) : (
                            /* Default Legend Section - Simplified for LOW/MEDIUM/HIGH */
                            <div className="reservation-legend w-full">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 ml-4">혼잡도</span>
                                </div>

                                <div className="flex items-center gap-4 mr-2">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full reservation-dot-low" />
                                        <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                                            여유
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full reservation-dot-medium" />
                                        <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                                            보통
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full reservation-dot-high" />
                                        <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                                            혼잡
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            {!readOnly && crewId && selectedDay > 0 && currentDetail?.canManageReservations && <StayAnnouncementPanel key={`${crewId}-${formatDate(selectedDay)}`} crewId={crewId} date={formatDate(selectedDay)} confirmedCount={Number(currentDetail.confirmedCount)} />}
            </main>

            {selectedMember && crewId && <ReservationMemberDetail key={selectedMember.reservationId} crewId={crewId} date={formatDate(selectedDay)} member={selectedMember}
                canManage={!readOnly && currentDetail?.canManageReservations === true}
                onSaved={updated => updateReservationDraft(selectedMember.reservationId, updated)} onClose={() => setSelectedMember(null)}
                onDelete={async () => {
                    await deleteReservation(crewId, selectedMember.reservationId);
                    setSelectedMember(null);
                    const data = await getCrewCalendar(crewId, `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-15`, includeMine);
                    setCalendarData(data); await fetchDetailForDay(selectedDay, true);
                }} />}

            <ConfirmDialog
                open={confirmCancel}
                title={pendingDays.includes(selectedDay) ? '예약 대기를 취소할까요?' : '예약을 취소할까요?'}
                confirmLabel="취소하기"
                busy={submitting}
                onConfirm={() => { void handleCancelReservation().finally(() => setConfirmCancel(false)); }}
                onCancel={() => setConfirmCancel(false)}
            >
                <strong className="text-zinc-900">{currentMonthIndex + 1}월 {selectedDay}일</strong> {pendingDays.includes(selectedDay) ? '대기를 취소하면 순번이 사라져요.' : '예약을 취소하면 되돌릴 수 없어요.'}
            </ConfirmDialog>
        </ReservationLayout>
    );
}
