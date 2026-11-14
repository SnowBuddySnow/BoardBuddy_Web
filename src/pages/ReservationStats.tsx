import '../components/reservation/crew-calendar.css';
import { getReservationSeason } from '../lib/reservationSeason';
import { ReservationLayout } from '../components/reservation/ReservationLayout';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRightIcon, Smile, ChevronDown, Save, Trash2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Calendar } from '../components/Calendar';
import { getCrewInfo, getReservationDetail, getCrewCalendar, createReservation, cancelReservation, deleteReservation, updateReservationManagement } from '../services/crew';
import { getUserInfo } from '../services/user';
import { ReservationDayResponse, CrewCalendarResponse, PaymentStatus } from '../types/api';


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
    const [submitting, setSubmitting] = useState(false);
    const [showProcessing, setShowProcessing] = useState(false);
    useEffect(() => {
        if (!submitting) return;
        const timer = window.setTimeout(() => setShowProcessing(true), 700);
        return () => window.clearTimeout(timer);
    }, [submitting]);
    const mutationBusy = useRef(false);
    const detailRequests = useRef(new Map<string, Promise<void>>());
    const detailFetchedAt = useRef(new Map<string, number>());
    const [showMySchedule, setShowMySchedule] = useState(false);
    const includeMine = showMySchedule || !readOnly;
    const [crewCapacity, setCrewCapacity] = useState<number | null>(null);
    const [crewId, setCrewId] = useState<number | null>(null);

    // Store fetched reservation details
    const [detailsCache, setDetailsCache] = useState<Record<string, ReservationDayResponse | null>>({});

    // Store monthly calendar data (occupancy statuses)
    const [calendarData, setCalendarData] = useState<CrewCalendarResponse | null>(null);

    // Guest Detail Modal State
    const [selectedMember, setSelectedMember] = useState<{
        role: string;
        name: string;
        phoneNumber?: string;
        inviter?: string;
        reservationTime?: string;
        reservationId?: number;
        canDelete?: boolean;
    } | null>(null);

    // Default groups confirmed/waiting; earliest follows reservation IDs.
    const [sortOrder, setSortOrder] = useState<'default' | 'earliest'>('default');
    const [loadError, setLoadError] = useState('');
    const [managementSavingId, setManagementSavingId] = useState<number | null>(null);

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
        if (readOnly || !crewOpen || mutationBusy.current) return;
        if (!crewId) {
            alert("크루 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        const dateStr = formatDate(selectedDay);

        try {
            mutationBusy.current = true; setShowProcessing(false); setSubmitting(true);
            const result = await createReservation(crewId, [dateStr]);
            const booking = result.results?.find(item => item.date === dateStr);
            if (!booking?.success) { alert(booking?.message || '예약을 신청하지 못했습니다. 접수 기간과 크루 설정을 확인해 주세요.'); return; }
            alert(booking.status === 'WAITING' ? `대기 ${booking.waitlistPosition ?? '-'}번으로 신청되었습니다.` : '예약이 확정되었습니다.');
            // Refresh data
            const calDateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-15`;
            const data = await getCrewCalendar(crewId, calDateStr, includeMine);
            setCalendarData(data);
            await fetchDetailForDay(selectedDay, true);
        } catch (error) {
            console.error("Reservation creation failed:", error);
            alert("예약 신청에 실패했습니다.");
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
            if (!result.success) { alert(result.message || '예약을 취소하지 못했습니다. 다시 확인해 주세요.'); return; }
            alert('예약이 취소되었습니다.');

            // Refresh data
            const calDateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-15`;
            const data = await getCrewCalendar(crewId, calDateStr, includeMine);
            setCalendarData(data);
            await fetchDetailForDay(selectedDay, true);
        } catch (error) {
            console.error("Cancellation failed:", error);
            alert("예약 취소에 실패했습니다.");
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

    const handleReservationManagementSave = async (reservationId: number, paymentStatus: PaymentStatus | null, managerMemo: string | null) => {
        if (readOnly || !crewId || mutationBusy.current) return;
        mutationBusy.current = true;
        try {
            setManagementSavingId(reservationId);
            const updated = await updateReservationManagement(crewId, reservationId, paymentStatus, managerMemo?.trim() || null);
            updateReservationDraft(reservationId, updated);
            alert('예약 관리 정보가 저장되었습니다.');
        } catch (error) {
            console.error('Failed to update reservation management details:', error);
            alert('예약 관리 정보 저장에 실패했습니다.');
        } finally {
            mutationBusy.current = false;
            setManagementSavingId(null);
        }
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
    const currentMemberCount = currentDetail?.confirmedCount ?? 0;
    // Fix: Ensure we fallback to empty array if reservations is undefined
    const currentMemberList = [...(currentDetail?.reservations || [])].filter(member => member.status !== 'CANCELED').sort((a, b) => {
        if (sortOrder === 'earliest') {
            return a.reservationId - b.reservationId; // Ascending Order of ID
        }

        // Confirmed members first, then the server-assigned waiting order.
        return Number(a.status === 'WAITING') - Number(b.status === 'WAITING')
            || (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0)
            || a.reservationId - b.reservationId;
    });

    return (
        <ReservationLayout className="crew-calendar-screen" title={title ?? (readOnly ? "시즌방 캘린더" : "크루 달력")} onBack={onBack} action={!readOnly && onMyCalendarClick && <button type="button" onClick={onMyCalendarClick}>내 예약 →</button>}>

            {submitting && showProcessing && <div role="status" aria-live="polite" className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-5 backdrop-blur-sm">
                <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl">
                    <span aria-hidden="true" className="mx-auto mb-4 block h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-[#162660]" />
                    <h2 className="text-lg font-bold text-[#162660]">예약 요청을 처리하고 있어요</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600"><span className="block">서버의 응답을 기다리고 있어요.</span><span className="block">다시 누르지 않아도 결과를 알려드려요.</span></p>
                </div>
            </div>}
            <main className="reservation-content" aria-busy={submitting}>

                <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs leading-5 text-slate-500">날짜를 선택해 예약 현황을 확인하세요.</p>
                    <button type="button" className="min-h-10 shrink-0 text-xs text-blue-700" onClick={async () => {
                    if (!crewId) return;
                    try {
                        const data = await getCrewCalendar(crewId, formatDate(1), includeMine);
                        setCalendarData(data);
                        if (selectedDay) await fetchDetailForDay(selectedDay, true);
                    } catch { setLoadError('현황을 새로고침하지 못했습니다. 다시 시도해 주세요.'); }
                }}>새로고침</button></div>
                {readOnly && <p className="mb-4 text-xs leading-6 text-zinc-500"><span className="block">현재는 이용 현황만 조회할 수 있어요.</span><span className="block">회색은 현황이 제공되지 않은 날짜예요.</span></p>}
                {loadError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}
                <div className="reservation-workspace">
                    <Calendar
                        variant="crew-classic"
                        className="mb-3"
                        dayDescription={day => ({ LOW: '여유', MEDIUM: '보통', HIGH: '혼잡', '': '현황 없음' }[getOccupancyStatus(day) ?? ''] ?? '현황 없음')}
                        footer={<div className="crew-calendar-legend" aria-label="혼잡도 안내">
                            {(['LOW', 'MEDIUM', 'HIGH', 'NONE'] as const).map(status => <span key={status}>
                                <i aria-hidden="true" className={`crew-occupancy-dot ${{ LOW: 'reservation-dot-low', MEDIUM: 'reservation-dot-medium', HIGH: 'reservation-dot-high', NONE: 'reservation-dot-none' }[status]}`} />
                                {{ LOW: '여유', MEDIUM: '보통', HIGH: '혼잡', NONE: '현황 없음' }[status]}
                            </span>)}
                        </div>}
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
                                    <span aria-hidden="true" className={`crew-occupancy-dot ${colorClass}`} />
                                </div>
                            );
                        }}
                    />

                    <aside className="reservation-detail-column">
                        {/* Bottom Section: Legend or Expanded View */}
                        {isExpanded && !currentDetail ? <p role="status" className="p-4 text-sm text-zinc-500">{loadError ? '이용 현황을 확인할 수 없습니다.' : '날짜별 현황을 확인하는 중...'}</p> : isExpanded ? (
                            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                                {/* Expanded User List Card */}
                                <div className="reservation-panel w-full mb-3">
                                    {/* Card Header */}
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        <div className="w-7 h-7 bg-[#1E3A8A] rounded-[8px] flex items-center justify-center shadow-sm">
                                            <Smile className="w-4 h-4 text-white" strokeWidth={2.5} />
                                        </div>
                                        <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{currentMonthIndex + 1}월 {selectedDay}일</span>
                                        <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">확정 {currentMemberCount}{currentDetail?.capacityLimited === false ? ' · 정원 제한 없음' : `/${currentDetail?.capacity ?? crewCapacity ?? '—'}`} · 대기 {currentDetail?.waitingCount ?? 0}</span>

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

                                    <p className="mb-3 text-xs text-slate-500">{!readOnly && currentDetail?.canManageReservations ? '입금 상태와 메모를 관리할 수 있어요.' : '날짜별 확정 인원과 대기 순서를 확인하세요.'}</p>
                                    {/* Users Grid */}
                                    <div className={`grid gap-y-3 gap-x-4 ${currentDetail?.canManageReservations ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                        {currentMemberList.length > 0 ? (
                                            currentMemberList.map((member) => (
                                                <div key={member.reservationId} className="reservation-member-row">
                                                    <div className="w-10 h-10 bg-zinc-300 dark:bg-zinc-600 rounded-full shrink-0 overflow-hidden relative">
                                                        {/* No profile image available in new DTO yet */}
                                                    </div>
                                                    <div className="flex flex-col items-start gap-0.5 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                                                {member.guestId ? `게스트 #${member.guestId}` : `회원 #${member.participantAccountId}`}
                                                            </span>
                                                            <span className="text-xs text-zinc-500">{member.status === 'WAITING' ? `대기 ${member.waitlistPosition ?? '-'}번` : '확정'}</span>
                                                            {member.guestId && (
                                                                <div className="px-1.5 py-0.5 bg-blue-50 rounded-[4px] flex items-center justify-center">
                                                                    <span className="text-[10px] font-bold text-blue-700">게스트</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {!readOnly && currentDetail?.canManageReservations && (
                                                        <div className="reservation-member-controls">
                                                            <select
                                                                value={member.paymentStatus ?? ''}
                                                                onChange={event => updateReservationDraft(member.reservationId, {
                                                                    paymentStatus: (event.target.value || null) as PaymentStatus | null,
                                                                })}
                                                                className="reservation-input w-24 text-xs"
                                                                aria-label={`예약 ${member.reservationId} 입금 상태`}
                                                            >
                                                                <option value="">미설정</option>
                                                                <option value="UNPAID">미입금</option>
                                                                <option value="PAID">입금 완료</option>
                                                            </select>
                                                            <input
                                                                type="text"
                                                                value={member.managerMemo ?? ''}
                                                                onChange={event => updateReservationDraft(member.reservationId, { managerMemo: event.target.value })}
                                                                placeholder="관리자 메모"
                                                                maxLength={1000}
                                                                className="reservation-input text-xs"
                                                                aria-label={`예약 ${member.reservationId} 관리자 메모`}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleReservationManagementSave(
                                                                    member.reservationId,
                                                                    member.paymentStatus ?? null,
                                                                    member.managerMemo ?? null,
                                                                )}
                                                                disabled={managementSavingId === member.reservationId}
                                                                className="w-8 h-8 shrink-0 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center justify-center text-[#1E3A8A] dark:text-blue-300 hover:bg-white dark:hover:bg-zinc-900 disabled:opacity-50"
                                                                title="입금 상태와 메모 저장"
                                                                aria-label={`예약 ${member.reservationId} 관리 정보 저장`}
                                                            >
                                                                <Save className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-2 text-center text-zinc-400 dark:text-zinc-500 text-sm py-4">
                                                예약자가 없습니다.
                                            </div>
                                        )}
                                    </div>
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

                                {/* Action Button */}
                                {confirmedDays.includes(selectedDay) || pendingDays.includes(selectedDay) ? (
                                    <Button
                                        variant="outline"
                                        disabled={submitting}
                                        onClick={handleCancelReservation}
                                        className="reservation-secondary w-full h-12 text-sm"
                                    >
                                        예약 취소하기
                                    </Button>
                                ) : (
                                    <Button
                                        disabled={submitting || !crewOpen}
                                        onClick={handleCreateReservation}
                                        className="reservation-primary w-full h-14 text-base"
                                    >
                                        {submitting ? '신청 중…' : !crewOpen ? '크루 예약 접수 전' : '예약하기'}
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
            </main>

            {/* Member Detail Modal */}
            {selectedMember && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-6 animate-in fade-in duration-200" onClick={() => setSelectedMember(null)}>
                    <div role="dialog" aria-modal="true" aria-label="예약 정보" className="reservation-modal w-full max-w-sm flex flex-col items-center relative" onClick={(e) => e.stopPropagation()}>


                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">{selectedMember.name}</h3>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-6 font-medium">
                            {selectedMember.role === 'VISITOR' ? '게스트 정보' : '예약 정보'}
                        </p>

                        <div className="w-full space-y-4 mb-6">
                            {selectedMember.role === 'VISITOR' ? (
                                <>
                                    <div className="flex gap-3 text-sm">
                                        <span className="font-bold text-zinc-500 dark:text-zinc-400 w-14 shrink-0 text-right">휴대전화</span>
                                        <span className="text-zinc-900 dark:text-zinc-100 font-medium">{selectedMember.phoneNumber || '-'}</span>
                                    </div>
                                    <div className="flex gap-3 text-sm">
                                        <span className="font-bold text-zinc-500 dark:text-zinc-400 w-14 shrink-0 text-right">초대자</span>
                                        <span className="text-zinc-900 dark:text-zinc-100 font-medium">{selectedMember.inviter || '-'}</span>
                                    </div>
                                    <div className="flex gap-3 text-sm">
                                        <span className="font-bold text-zinc-500 dark:text-zinc-400 w-14 shrink-0 text-right">예약시간</span>
                                        <span className="text-zinc-900 dark:text-zinc-100 font-medium">{selectedMember.reservationTime || '-'}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex gap-3 text-sm">
                                    <span className="font-bold text-zinc-500 dark:text-zinc-400 w-14 shrink-0 text-right">예약시간</span>
                                    <span className="text-zinc-900 dark:text-zinc-100 font-medium">{selectedMember.reservationTime || '-'}</span>
                                </div>
                            )}
                        </div>

                        <div className="w-full flex flex-col gap-2">
                            {/* Force Delete Icon - Bottom Right */}
                            {!readOnly && selectedMember.canDelete && selectedMember.reservationId && (
                                <div className="w-full flex justify-end mb-1">
                                    <button
                                        className="w-9 h-9 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-500 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (readOnly || !crewId || !selectedMember.reservationId) return;
                                            if (confirm(`${selectedMember.name}님의 예약을 삭제하시겠습니까?`)) {
                                                try {
                                                    await deleteReservation(crewId, selectedMember.reservationId);
                                                    alert("예약이 삭제되었습니다.");
                                                    setSelectedMember(null);
                                                    // Refresh data
                                                    const calDateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-15`;
                                                    const data = await getCrewCalendar(crewId, calDateStr, includeMine);
                                                    setCalendarData(data);
                                                    await fetchDetailForDay(selectedDay, true);
                                                } catch (error) {
                                                    console.error("Failed to delete reservation:", error);
                                                    alert("예약 삭제에 실패했습니다.");
                                                }
                                            }
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <Button
                                className="reservation-primary w-full text-sm"
                                onClick={() => setSelectedMember(null)}
                            >
                                닫기
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </ReservationLayout>
    );
}
