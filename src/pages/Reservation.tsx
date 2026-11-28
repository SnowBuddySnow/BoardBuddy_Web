import '../components/reservation/crew-calendar.css';
import { overlayMotion, dialogMotion } from '../lib/motion';
import { m, AnimatePresence } from 'motion/react';
import StayPolicyConsent from '../components/reservation/StayPolicyConsent';
import ReservationWindowNotice from '../components/ReservationWindowNotice';
import SeasonPassCard from '../components/reservation/SeasonPassCard';
import { getReservationSeason } from '../lib/reservationSeason';
import { ReservationLayout } from '../components/reservation/ReservationLayout';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '../components/Button';
import { Calendar } from '../components/Calendar';
import { createReservation, cancelReservation, getCrewInfo, getMyCrewCalendar } from '../services/crew';
import { getUserInfo } from '../services/user';
import { reservationState } from '../lib/personalCalendar';
import ConfirmDialog from '../components/ConfirmDialog';
import { useFeedback } from '../components/feedback/feedbackContext';
import { registerGuest, GuestDetail } from '../services/guest';
import { CrewDetail, MyReservation } from '../types/api';


interface ReservationProps {
    onBack: () => void;
    isGuest?: boolean;
    guestCrewId?: number;
}

const CheckIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

export default function Reservation({ onBack, isGuest = false, guestCrewId }: ReservationProps) {
    const todayDate = new Date();

    // Dynamic View Date State
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

    // Selected days for NEW reservation
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [policyDates, setPolicyDates] = useState('');
    const selectionKey = `${currentYear}-${currentMonthIndex}-${[...selectedDays].sort((a,b)=>a-b).join(',')}`;
    const [submittingStay, setSubmittingStay] = useState(false);
    const stayLock = useRef(false);

    // Guest State
    const [guestName, setGuestName] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [guestDetail, setGuestDetail] = useState<GuestDetail | null>(null);
    const [isGuestModalOpen, setIsGuestModalOpen] = useState(isGuest); // Open modal on mount if isGuest is true

    // Existing Reservations (Fetched from API)
    const [myReservations, setMyReservations] = useState<MyReservation[]>([]);

    // User's Crew ID
    const [crewId, setCrewId] = useState<number | null>(null);
    const [passRevision, setPassRevision] = useState(0);

    // Phone Sharing Consent State
    const [showPhoneConsentModal, setShowPhoneConsentModal] = useState(false);

    // Fetch Reservations on Mount


    // Crew Details for Reservation Settings
    // Fetch Reservations Helper
    // Fetch Reservations Helper
    // Same source as 나의 달력 (per crew, per month), so both screens show the same bookings,
    // waiting ones included.
    const monthKey = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
    const fetchReservations = useCallback(async () => {
        if (isGuest || !crewId) {
            setMyReservations([]);
            return;
        }
        try {
            const data = await getMyCrewCalendar(crewId, `${monthKey}-01`);
            setMyReservations(data.my_reservations ?? []);
        } catch (error) {
            console.error("Failed to fetch my reservations:", error);
        }
    }, [crewId, isGuest, monthKey]);

    useEffect(() => { void fetchReservations(); }, [fetchReservations]);

    // Crew Details for Reservation Settings
    const [crew, setCrew] = useState<CrewDetail | null>(null);

    // Fetch User Info -> Crew ID -> Crew Detail
    const fetchAllData = useCallback(async () => {
        try {
            if (isGuest && guestCrewId) {
                setCrewId(guestCrewId);
                setCrew(await getCrewInfo(guestCrewId));
                return;
            }
            const userData = await getUserInfo();
            if (userData.crew && userData.crew.crewId) {
                const cId = userData.crew.crewId;
                setCrewId(cId);

                // Fetch full crew info
                // Fetch full crew info
                // Dynamically import or use existing import if added
                // const { getCrewInfo } = await import('../services/crew');
                const crewData = await getCrewInfo(cId);
                setCrew(crewData);
            }

        } catch (error) {
            console.error("Failed to load data:", error);
        }
    }, [guestCrewId, isGuest]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // Derived state: reserved days for the current month view
    const monthReservations = myReservations.filter(r => r.date.slice(0, 7) === monthKey && reservationState(r.status));
    const reservedDays = monthReservations.map(r => Number(r.date.slice(8, 10)));
    const waitingDays = monthReservations.filter(r => reservationState(r.status) === 'waiting').map(r => Number(r.date.slice(8, 10)));

    const [withdrawDay, setWithdrawDay] = useState<number | null>(null);
    const [withdrawing, setWithdrawing] = useState(false);
    const [consentSheetOpen, setConsentSheetOpen] = useState(false);
    const { showResult, toast } = useFeedback();
    // Keeps the date in the dialog text while it animates out after closing.
    const shownWithdrawDay = useRef<number | null>(null);
    if (withdrawDay !== null) shownWithdrawDay.current = withdrawDay;

    // Reservation Rules Calculation
    /** When booking for `day` opens, from the crew's weekly opening rule (null without crew info). */
    const openDateFor = (day: number) => {
        if (!crew) return null;
        const targetDate = new Date(currentYear, currentMonthIndex, day);
        targetDate.setHours(0, 0, 0, 0);

        // 2. Identify Batch Start (Previous or Same 'reservation_day')
        // JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat
        const dayMap: { [key: string]: number } = {
            "SUNDAY": 0, "MONDAY": 1, "TUESDAY": 2, "WEDNESDAY": 3, "THURSDAY": 4, "FRIDAY": 5, "SATURDAY": 6
        };
        const reservationDay = crew.reservation_day || crew.reservationOpenDay || 'SATURDAY';
        const desiredDayIndex = dayMap[reservationDay.toUpperCase()] ?? 6; // Default Sat
        const targetDayIndex = targetDate.getDay();

        // Calculate difference to rewind to the most recent desired day
        let diff = targetDayIndex - desiredDayIndex;
        if (diff < 0) {
            diff += 7;
        }

        // batchStartDate = targetDate - diff days
        const batchStartDate = new Date(targetDate);
        batchStartDate.setDate(targetDate.getDate() - diff);
        batchStartDate.setHours(0, 0, 0, 0);

        // 3. Apply Offset to get Open DateTime
        const offset = crew.reservation_offset ?? crew.reservationOpenOffsetDays ?? 0;
        const openDate = new Date(batchStartDate);
        openDate.setDate(batchStartDate.getDate() - offset);

        // Set Open Time
        const [openHour, openMinute] = (crew.reservation_time || crew.reservationOpenTime || "00:00").split(':').map(Number);
        openDate.setHours(openHour, openMinute, 0, 0);

        return openDate;
    };

    const isDayAvailable = (day: number) => {
        const openDate = openDateFor(day);
        if (!openDate) return false;
        const today = new Date();
        if (new Date(currentYear, currentMonthIndex, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
            return false; // Past dates unavailable
        }
        return new Date() >= openDate;
    };

    // The earliest not-yet-open date in view and when it opens, for the countdown banner.
    const [, setOpenTick] = useState(0);
    const nextOpening = (() => {
        if (!crew) return null;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        for (let day = 1; day <= daysInMonth; day++) {
            if (new Date(currentYear, currentMonthIndex, day) < today || isDayAvailable(day)) continue;
            const openDate = openDateFor(day);
            if (!openDate || openDate <= new Date()) continue;
            const pad = (n: number) => String(n).padStart(2, '0');
            return {
                day,
                stayDate: `${monthKey}-${pad(day)}`,
                opensAt: `${openDate.getFullYear()}-${pad(openDate.getMonth() + 1)}-${pad(openDate.getDate())}T${pad(openDate.getHours())}:${pad(openDate.getMinutes())}:00`,
            };
        }
        return null;
    })();

    const isPastDay = (day: number) => {
        const now = new Date();
        return new Date(currentYear, currentMonthIndex, day) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
    };

    const toggleDay = (day: number) => {
        // An upcoming booking of mine opens the cancel confirmation; past stays stay read-only.
        if (reservedDays.includes(day)) {
            if (isPastDay(day)) return;
            setWithdrawDay(day);
            return;
        }

        // Selection logic for NEW reservation
        if (!isDayAvailable(day)) return;

        setSelectedDays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day]
        );
    };

    const confirmWithdraw = async () => {
        if (withdrawDay !== null && crewId && !withdrawing) {
            setWithdrawing(true);
            try {
                const dateStr = `${monthKey}-${String(withdrawDay).padStart(2, '0')}`;
                const reservation = myReservations.find(r => r.date.slice(0, 10) === dateStr);
                if (!reservation) {
                    alert("예약 정보를 찾을 수 없습니다.");
                    return;
                }
                await cancelReservation(crewId, reservation.reservation_id);
                setPassRevision(value => value + 1);
                toast({ message: `${currentMonthIndex + 1}/${withdrawDay} 예약을 취소했어요.` });

                // Refresh list
                await fetchReservations();
            } catch (error) {
                console.error("Cancellation failed:", error);
                toast({ message: '예약 취소에 실패했어요. 다시 시도해 주세요.', tone: 'error' });
            } finally {
                setWithdrawing(false);
                setWithdrawDay(null);
            }
        }
    };

    // Navigation Bounds
    const { start: minDate, end: maxDate } = getReservationSeason(todayDate);

    const handlePrevMonth = () => {
        const newDate = new Date(currentYear, currentMonthIndex - 1, 1);
        if (newDate >= minDate) {
            setViewDate(newDate);
            setSelectedDays([]); // Reset selection on month change
        }
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentYear, currentMonthIndex + 1, 1);
        if (newDate <= maxDate) {
            setViewDate(newDate);
            setSelectedDays([]); // Reset selection
        }
    };

    const canGoPrev = new Date(currentYear, currentMonthIndex - 1, 1) >= minDate;
    const canGoNext = new Date(currentYear, currentMonthIndex + 1, 1) <= maxDate;

    // Submit Reservation
    const handleSubmit = async () => {
        if (selectedDays.length === 0 || policyDates !== selectionKey || stayLock.current) return;

        if (!crewId) {
            alert("크루 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }
        if (isGuest && crew?.seasonHouseGuestEnabled === false) {
            alert("이 크루는 현재 시즌방 게스트 예약을 사용하지 않습니다.");
            return;
        }

        // Check phone sharing consent preference if NOT guest
        if (!isGuest) {
            const consentPref = localStorage.getItem('phone_sharing_consent_preference') || 'each_time';
            if (consentPref !== 'always') {
                setShowPhoneConsentModal(true);
                return;
            }
        }

        await executeSubmitReservation();
    };

    const executeSubmitReservation = async () => {
        if (stayLock.current || policyDates !== selectionKey) return;
        if (crewId == null) {
            alert("크루 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        // Format dates
        const formattedDates = selectedDays.map(day => {
            return `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        });

        const guestId = isGuest && guestDetail ? guestDetail.id : undefined;

        try {
            stayLock.current = true; setSubmittingStay(true);
            const result = await createReservation(crewId, formattedDates, guestId, 1);
            const failed = result.results?.filter(item => !item.success) ?? [];
            if (!result.results?.length || failed.length) {
                const reason = failed.find(item => item.message)?.message;
                showResult({ tone: 'error', title: '예약하지 못한 날짜가 있어요', body: reason ?? `아직 오픈되지 않은 날짜는 크루 달력에서 오픈 시각을 확인해 주세요. (${failed.map(item => item.date.slice(5).replace('-', '/')).join(', ')})` });
                return;
            }
            const waiting = result.results.filter(item => item.status === 'WAITING').length;
            const confirmed = result.results.length - waiting;
            showResult({
                tone: waiting && !confirmed ? 'waiting' : 'success',
                title: `${result.results.length}일 예약 신청을 마쳤어요`,
                body: [confirmed ? `확정 ${confirmed}일` : '', waiting ? `대기 ${waiting}일 (자리가 나면 자동 확정 후 알림)` : ''].filter(Boolean).join(' · '),
            });
            setPassRevision(value => value + 1);
            setPolicyDates(''); setSelectedDays([]); // Clear selection
            // Refresh list so the new reservation appears as "reserved" immediately
            await fetchReservations();
            // Optional: onBack(); 
        } catch (error) {
            console.error("Reservation creation failed:", error);
            showResult({ tone: 'error', title: '예약 신청에 실패했어요', body: '연결 상태를 확인한 뒤 다시 시도해 주세요.' });
        } finally { stayLock.current = false; setSubmittingStay(false); }
    };

    const handleConfirmConsent = async (always: boolean) => {
        if (always) {
            localStorage.setItem('phone_sharing_consent_preference', 'always');
        }
        setShowPhoneConsentModal(false);
        await executeSubmitReservation();
    };

    return (
        <ReservationLayout className="crew-calendar-screen reservation-picker" title="예약하기" onBack={onBack} action={isGuest && guestDetail ? <span className="reservation-chip px-3 py-2">{guestDetail.name} · 게스트</span> : undefined}>

            {/* Content */}
            <main className="reservation-content">

                <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs leading-5 text-slate-500">{isGuest ? '게스트로 이용할 날짜를 선택하세요.' : '예약 가능한 날짜를 여러 개 선택할 수 있어요.'}</p>
                    {crew?.name && <span className="shrink-0 text-xs font-bold text-brand-navy">{crew.name}</span>}
                </div>
                {!isGuest && crewId && <SeasonPassCard crewId={crewId} refreshKey={passRevision} compact />}
                {nextOpening && (
                    <div className="mb-3">
                        <p className="mb-1 px-1 text-[11px] font-black text-brand-navy">{currentMonthIndex + 1}월 {nextOpening.day}일부터 다음 예약 오픈</p>
                        <ReservationWindowNotice key={nextOpening.opensAt} value={{ bookable: false, opensAt: nextOpening.opensAt }} stayDate={nextOpening.stayDate} crewName={crew?.name} onOpened={() => setOpenTick(value => value + 1)} />
                    </div>
                )}
                <div className="reservation-workspace">
                    <Calendar
                        variant="crew-classic"
                        className="mb-3"
                        footer={<div className="crew-calendar-legend" aria-label="날짜 표시 안내">
                            <span><i aria-hidden="true" className="reservation-legend-swatch is-selected" />선택</span>
                            <span><i aria-hidden="true" className="reservation-legend-swatch is-reserved" />내 예약</span>
                            <span><i aria-hidden="true" className="reservation-legend-swatch is-unavailable" />예약 불가</span>
                        </div>}
                        month={currentMonthName}
                        year={currentYear}
                        startDayOfWeek={firstDayOfMonth}
                        totalDays={daysInMonth}
                        selectedDays={selectedDays}
                        hideHeader={false}
                        onPrevMonth={canGoPrev ? handlePrevMonth : undefined}
                        onNextMonth={canGoNext ? handleNextMonth : undefined}
                        renderDay={(day) => {
                            const isReserved = reservedDays.includes(day);
                            const isSelected = selectedDays.includes(day);
                            // Recalculate availability here or pass it in. Check if day is valid.
                            // Ideally we compute full availability in logic above to keep render clean,
                            // but local logic 'isDayAvailable' calls are fine if not too heavy.
                            const isAvailable = isDayAvailable(day);

                            // "Today" check
                            // We highlight today specifically if needed, but for availability:
                            const isToday = day === todayDay && isCurrentMonthView;

                            if (isReserved) {
                                return (
                                    <button
                                        onClick={() => toggleDay(day)}
                                        disabled={isPastDay(day)}
                                        aria-label={`${currentYear}년 ${currentMonthName} ${day}일 내 예약${waitingDays.includes(day) ? '(대기)' : ''}${isPastDay(day) ? ' · 지난 날짜' : ' · 취소하려면 누르세요'}`}
                                        className={`reservation-day is-reserved${waitingDays.includes(day) ? ' is-waiting' : ''}`}
                                    >
                                        {day}
                                        <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                            <CheckIcon className="w-3 h-3 text-[#162660]" />
                                        </div>
                                    </button>
                                );
                            }

                            const buttonClasses = `reservation-day ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`;

                            return (
                                <button
                                    onClick={() => toggleDay(day)}
                                    disabled={!isAvailable}
                                    aria-label={`${currentYear}년 ${currentMonthName} ${day}일`}
                                    aria-pressed={isSelected}
                                    className={buttonClasses}
                                >
                                    {day}
                                </button>
                            );
                        }}
                    />

                    <aside className="reservation-detail-column">
                        <section className="reservation-panel mb-3" role="status" aria-label="선택한 날짜">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-sm font-bold text-zinc-900">선택한 날짜</h2>
                                {selectedDays.length > 0 && <span className="text-xs font-bold text-brand-navy">{selectedDays.length}일</span>}
                            </div>
                            {selectedDays.length ? (
                                <ul className="mt-2 flex flex-wrap gap-1.5">
                                    {[...selectedDays].sort((a, b) => a - b).map(day => <li key={day} className="rounded-full bg-brand-navy/5 px-2.5 py-1 text-xs font-bold text-brand-navy">{currentMonthIndex + 1}월 {day}일</li>)}
                                </ul>
                            ) : <p className="mt-1.5 text-xs text-slate-500">달력에서 예약할 날짜를 골라 주세요.</p>}
                        </section>
                        <div className="hidden lg:block">
                        <StayPolicyConsent dates={selectedDays.map(day => `${currentYear}-${String(currentMonthIndex+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`)} checked={policyDates === selectionKey} onChange={checked => setPolicyDates(checked ? selectionKey : '')} disabled={submittingStay} />
                        <div className="w-full flex justify-center">
                            <Button
                                disabled={submittingStay || policyDates !== selectionKey || selectedDays.length === 0 || (isGuest && (!guestName || !guestPhone))}
                                onClick={handleSubmit}
                                className="reservation-primary w-full h-14 text-base"
                            >
                                {selectedDays.length ? `${selectedDays.length}일 예약 신청` : '날짜를 선택해주세요'}
                            </Button>
                        </div>
                        </div>

                    </aside>
                </div>

                {/* Mobile: the decision stays under the thumb while the calendar scrolls. */}
                <div className="sticky bottom-0 z-20 -mx-4 mt-3 border-t border-zinc-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
                    <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-zinc-900">{selectedDays.length ? `${selectedDays.length}일 선택` : '날짜를 선택해 주세요'}</p>
                            <p className="truncate text-xs text-zinc-500">{selectedDays.length ? [...selectedDays].sort((a, b) => a - b).map(day => `${currentMonthIndex + 1}/${day}`).join(', ') : '예약 가능한 날짜를 눌러 고를 수 있어요'}</p>
                        </div>
                        <Button
                            disabled={submittingStay || selectedDays.length === 0 || (isGuest && (!guestName || !guestPhone))}
                            onClick={() => { if (policyDates === selectionKey) void handleSubmit(); else setConsentSheetOpen(true); }}
                            className="reservation-primary h-12 shrink-0 px-5 text-sm"
                        >
                            {selectedDays.length ? `${selectedDays.length}일 예약 신청` : '예약 신청'}
                        </Button>
                    </div>
                </div>
            </main>

            {/* Mobile consent step, opened from the sticky bar. */}
            <AnimatePresence>{consentSheetOpen && (
                <m.div {...overlayMotion} className="fixed inset-0 z-[2000] flex items-end justify-center bg-zinc-950/45 p-3 lg:hidden"
                    onClick={event => { if (event.target === event.currentTarget) setConsentSheetOpen(false); }}>
                    <m.div {...dialogMotion} role="dialog" aria-modal="true" aria-label="숙박일 기준 확인" className="w-full max-w-md rounded-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
                        <StayPolicyConsent dates={selectedDays.map(day => `${monthKey}-${String(day).padStart(2,'0')}`)} checked={policyDates === selectionKey} onChange={checked => setPolicyDates(checked ? selectionKey : '')} disabled={submittingStay} />
                        <div className="mt-3 flex gap-2">
                            <button type="button" onClick={() => setConsentSheetOpen(false)} className="min-h-12 flex-1 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700">닫기</button>
                            <button type="button" disabled={submittingStay || policyDates !== selectionKey} onClick={() => { setConsentSheetOpen(false); void handleSubmit(); }}
                                className="min-h-12 flex-[2] rounded-xl bg-brand-navy text-sm font-bold text-white disabled:opacity-50">동의하고 {selectedDays.length}일 예약 신청</button>
                        </div>
                    </m.div>
                </m.div>
            )}</AnimatePresence>

            {/* Withdrawal confirmation */}
            <ConfirmDialog
                open={withdrawDay !== null}
                title="예약을 취소할까요?"
                confirmLabel="취소하기"
                busy={withdrawing}
                onConfirm={() => void confirmWithdraw()}
                onCancel={() => setWithdrawDay(null)}
            >
                <strong className="text-zinc-900">{currentMonthIndex + 1}월 {shownWithdrawDay.current}일</strong> 예약을 취소하면 되돌릴 수 없어요. 다시 이용하려면 새로 예약해야 해요.
            </ConfirmDialog>

            {/* Guest Info Modal */}
            <AnimatePresence>{isGuestModalOpen && (
                <m.div {...overlayMotion}
                    className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 sm:p-6"
                    onClick={onBack}
                >
                    <m.div {...dialogMotion}
                        role="dialog" aria-modal="true" aria-label="게스트 정보" className="reservation-modal w-full max-w-sm min-w-0 flex flex-col items-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold text-[#1E3A8A] mb-1">게스트 정보</h3>
                        <p className="text-[11px] text-zinc-500 mb-6 text-center leading-tight">
                            게스트로 이용할 사용자의 정보를 입력해주세요.
                        </p>

                        <div className="w-full space-y-4 mb-6 min-w-0">
                            <div className="space-y-2 min-w-0">
                                <label htmlFor="reservation-guest-name" className="text-sm font-bold text-zinc-900 block">이름</label>
                                <input
                                    id="reservation-guest-name"
                                    type="text"
                                    autoComplete="name"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    className="reservation-input w-full"
                                />
                            </div>
                            <div className="space-y-2 min-w-0">
                                <label htmlFor="reservation-guest-phone" className="text-sm font-bold text-zinc-900 block">전화번호</label>
                                <input
                                    id="reservation-guest-phone"
                                    type="tel"
                                    autoComplete="tel"
                                    value={guestPhone}
                                    onChange={(e) => setGuestPhone(e.target.value)}
                                    className="reservation-input w-full"
                                />
                            </div>
                        </div>

                        <Button
                            className="reservation-primary w-full text-sm"
                            disabled={!guestName || !guestPhone}
                            onClick={async () => {
                                try {
                                    const guest = await registerGuest(guestName, guestPhone);
                                    setGuestDetail(guest);
                                    setIsGuestModalOpen(false);
                                } catch (e) {
                                    console.error("Failed to register guest", e);
                                    alert("게스트 조회/등록에 실패했습니다.");
                                }
                            }}
                        >
                            예약하기
                        </Button>
                    </m.div>
                </m.div>
            )}</AnimatePresence>

            {/* Phone Sharing Consent Modal */}
            <AnimatePresence>{showPhoneConsentModal && (
                <m.div {...overlayMotion} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPhoneConsentModal(false)} />
                    <m.div {...dialogMotion} role="dialog" aria-modal="true" aria-label="전화번호 제공 동의" className="reservation-modal w-full max-w-sm relative z-10">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-3 text-center">
                            전화번호 제공 동의
                        </h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 text-center leading-relaxed">
                            예약 확인, 안내 및 안전 연락 등 원활한 모임 운영을 위해 시즌방 운영진에게 본인의 전화번호를 제공하시겠습니까?
                            <br />
                            <span className="text-xs text-zinc-400 dark:text-zinc-500 block mt-2.5 leading-normal">
                                * '항상 동의' 선택 시 마이페이지 계정 관리에서 설정을 변경하기 전까지 더 이상 동의 여부를 묻지 않습니다.
                            </span>
                        </p>
                        <div className="flex flex-col gap-2">
                            <Button
                                onClick={() => handleConfirmConsent(true)}
                                className="reservation-primary w-full text-sm"
                            >
                                항상 동의하고 진행
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleConfirmConsent(false)}
                                className="reservation-secondary w-full h-11 text-sm"
                            >
                                이번만 동의하고 진행
                            </Button>
                            <button
                                onClick={() => setShowPhoneConsentModal(false)}
                                className="w-full h-10 text-xs text-zinc-400 hover:text-zinc-600 font-semibold"
                            >
                                취소
                            </button>
                        </div>
                    </m.div>
                </m.div>
            )}</AnimatePresence>
        </ReservationLayout>
    );
}
