import { getReservationSeason } from '../lib/reservationSeason';
import { ReservationLayout, ReservationSummary } from '../components/reservation/ReservationLayout';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '../components/Button';
import { Calendar } from '../components/Calendar';
import { createReservation, cancelReservation, getCrewInfo } from '../services/crew';
import { getMyReservations, getUserInfo } from '../services/user';
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

    // Guest State
    const [guestName, setGuestName] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [guestDetail, setGuestDetail] = useState<GuestDetail | null>(null);
    const [isGuestModalOpen, setIsGuestModalOpen] = useState(isGuest); // Open modal on mount if isGuest is true

    // Existing Reservations (Fetched from API)
    const [myReservations, setMyReservations] = useState<MyReservation[]>([]);

    // User's Crew ID
    const [crewId, setCrewId] = useState<number | null>(null);

    // Phone Sharing Consent State
    const [showPhoneConsentModal, setShowPhoneConsentModal] = useState(false);

    // Fetch Reservations on Mount


    // Crew Details for Reservation Settings
    // Fetch Reservations Helper
    // Fetch Reservations Helper
    const fetchReservations = async () => {
        try {
            // In Guest Mode, do NOT fetch user reservations
            if (isGuest) {
                setMyReservations([]);
                return;
            }
            const data = await getMyReservations();
            setMyReservations(data);
        } catch (error) {
            console.error("Failed to fetch my reservations:", error);
        }
    };

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

            if (!isGuest) {
                const reservations = await getMyReservations();
                setMyReservations(reservations);
            }
        } catch (error) {
            console.error("Failed to load data:", error);
        }
    }, [guestCrewId, isGuest]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // Derived state: reserved days for the current month view
    const reservedDays = myReservations
        .filter(r => {
            const d = new Date(r.date);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonthIndex && (r.status === 'confirmed' || r.status === 'created' || r.status === 'pending');
        })
        .map(r => new Date(r.date).getDate());

    const [withdrawDay, setWithdrawDay] = useState<number | null>(null);

    // Reservation Rules Calculation
    const isDayAvailable = (day: number) => {
        if (!crew) return false;

        // 1. Construct Target Date
        const targetDate = new Date(currentYear, currentMonthIndex, day);
        targetDate.setHours(0, 0, 0, 0);

        const today = new Date();
        // today.setHours(0, 0, 0, 0); // Keep time for precision comparison if needed, or clear for date-only

        if (targetDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
            return false; // Past dates unavailable
        }

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

        // 4. Compare with Now
        // If Now >= OpenDate, it is available.
        return new Date() >= openDate;
    };

    const toggleDay = (day: number) => {
        // If it's an existing reservation, trigger withdrawal
        if (reservedDays.includes(day)) {
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
        if (withdrawDay !== null && crewId) {
            try {
                const dateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(withdrawDay).padStart(2, '0')}`;
                const reservation = myReservations.find(r => r.date === dateStr);
                if (!reservation) {
                    alert("예약 정보를 찾을 수 없습니다.");
                    return;
                }
                await cancelReservation(crewId, reservation.reservation_id);
                alert("예약이 취소되었습니다.");

                // Refresh list
                await fetchReservations();
            } catch (error) {
                console.error("Cancellation failed:", error);
                alert("예약 취소에 실패했습니다.");
            } finally {
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
        if (selectedDays.length === 0) return;

        if (!crewId) {
            alert("크루 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
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
            const result = await createReservation(crewId, formattedDates, guestId);
            const failed = result.results?.filter(item => !item.success) ?? [];
            if (!result.results?.length || failed.length) {
                alert(`예약하지 못한 날짜가 있습니다. 아직 오픈되지 않은 날짜는 크루 달력에서 오픈 시각을 확인해 주세요. ${failed.map(item => item.date).join(', ')}`);
                return;
            }
            alert("예약 신청이 완료되었습니다."); // Simple feedback
            setSelectedDays([]); // Clear selection
            // Refresh list so the new reservation appears as "reserved" immediately
            await fetchReservations();
            // Optional: onBack(); 
        } catch (error) {
            console.error("Reservation creation failed:", error);
            alert("예약 신청에 실패했습니다.");
        }
    };

    const handleConfirmConsent = async (always: boolean) => {
        if (always) {
            localStorage.setItem('phone_sharing_consent_preference', 'always');
        }
        setShowPhoneConsentModal(false);
        await executeSubmitReservation();
    };

    return (
        <ReservationLayout title="예약하기" onBack={onBack} action={isGuest && guestDetail ? <span className="reservation-chip px-3 py-2">{guestDetail.name} · 게스트</span> : undefined}>

            {/* Content */}
            <main className="reservation-content">

                <ReservationSummary title={crew?.name || '시즌방 예약'} description={isGuest ? '게스트로 이용할 날짜를 선택해주세요.' : '이용할 날짜를 선택해주세요.'} value={selectedDays.length > 0 ? `${selectedDays.length}일` : undefined} />
                <div className="reservation-workspace">
                    <Calendar
                        className="mb-5"
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
                                        aria-label={`${currentYear}년 ${currentMonthName} ${day}일 예약 취소`}
                                        className="reservation-day is-reserved"
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
                        <div className="reservation-selection" role="status">
                            {selectedDays.length ? <><strong>선택한 날짜</strong><br />{[...selectedDays].sort((a, b) => a - b).map(day => `${currentMonthIndex + 1}월 ${day}일`).join(', ')}</> : '예약할 날짜를 선택하면 여기에 표시됩니다.'}
                        </div>
                        <div className="w-full flex justify-center">
                            <Button
                                disabled={selectedDays.length === 0 || (isGuest && (!guestName || !guestPhone))}
                                onClick={handleSubmit}
                                className="reservation-primary w-full h-14 text-base"
                            >
                                {selectedDays.length ? `${selectedDays.length}일 예약 신청` : '날짜를 선택해주세요'}
                            </Button>
                        </div>

                    </aside>
                </div>
            </main>

            {/* Withdrawal Modal */}
            {withdrawDay !== null && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
                    <div role="dialog" aria-modal="true" aria-label="예약 취소" className="reservation-modal w-full max-w-sm">
                        <h3 className="text-xl font-bold mb-2">예약 취소</h3>
                        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">{currentMonthIndex + 1}월 {withdrawDay}일</span> 예약을 취소하시겠습니까?
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="secondary"
                                onClick={() => setWithdrawDay(null)}
                                className="flex-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 border-transparent"
                            >
                                돌아가기
                            </Button>
                            <Button
                                variant="primary"
                                onClick={confirmWithdraw}
                                className="flex-1 bg-red-500 hover:bg-red-600 border-red-500 hover:border-red-600 text-white"
                            >
                                취소하기
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Guest Info Modal */}
            {isGuestModalOpen && (
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 sm:p-6 animate-in fade-in duration-200"
                    onClick={onBack}
                >
                    <div
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
                    </div>
                </div>
            )}

            {/* Phone Sharing Consent Modal */}
            {showPhoneConsentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPhoneConsentModal(false)} />
                    <div role="dialog" aria-modal="true" aria-label="전화번호 제공 동의" className="reservation-modal w-full max-w-sm relative z-10">
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
                    </div>
                </div>
            )}
        </ReservationLayout>
    );
}
