import { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { ChevronLeftIcon } from 'lucide-react';
import { Calendar } from '../components/Calendar';
import { createReservation, cancelReservation, getCrewInfo } from '../services/crew';
import { getMyReservations, getUserInfo } from '../services/user';
import { registerGuest, GuestDetail } from '../services/guest';
import { MyReservation } from '../types/api';


interface ReservationProps {
    onBack: () => void;
    isGuest?: boolean;
}

const CheckIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

export default function Reservation({ onBack, isGuest = false }: ReservationProps) {
    const todayDate = new Date();

    // Dynamic View Date State
    const [viewDate, setViewDate] = useState(new Date());
    const currentYear = viewDate.getFullYear();
    const currentMonthIndex = viewDate.getMonth(); // 0-11

    // Check if "Today" is in the currently viewed month/year to highlight it
    const isCurrentMonthView = todayDate.getFullYear() === currentYear && todayDate.getMonth() === currentMonthIndex;
    const todayDay = todayDate.getDate();

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const currentMonthName = monthNames[currentMonthIndex];

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
    const [crew, setCrew] = useState<any>(null); // Use CrewDetail type if imported, but using any for quick integration with existing imports

    // Fetch User Info -> Crew ID -> Crew Detail
    const fetchAllData = async () => {
        try {
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
    };

    useEffect(() => {
        fetchAllData();
    }, []);

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
        const desiredDayIndex = dayMap[crew.reservation_day.toUpperCase()] ?? 6; // Default Sat
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
        const offset = crew.reservation_offset !== undefined ? crew.reservation_offset : 0;
        const openDate = new Date(batchStartDate);
        openDate.setDate(batchStartDate.getDate() - offset);

        // Set Open Time
        const [openHour, openMinute] = (crew.reservation_time || "00:00").split(':').map(Number);
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
    const minDate = new Date(2025, 9, 1); // October 2025
    const maxDate = new Date(2026, 4, 31); // May 2026

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

        // Format dates
        const formattedDates = selectedDays.map(day => {
            return `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        });

        const guestId = isGuest && guestDetail ? guestDetail.id : undefined;

        try {
            await createReservation(crewId, formattedDates, guestId);
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

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950 relative">
            {/* Header */}
            <header className="px-4 pt-2 pb-2 flex items-center justify-between z-10">
                <div className="w-10 flex justify-start">
                    <Button variant="ghost" onClick={onBack} className="-ml-2 gap-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                        <ChevronLeftIcon className="w-6 h-6" />
                    </Button>
                </div>
                <div className="flex-1 flex items-center justify-center relative">
                    <h1 className="text-center text-lg font-bold text-zinc-900 dark:text-zinc-100">{isGuest ? '예약하기' : '예약하기'}</h1>
                    {isGuest && guestDetail && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#F3E5D8] dark:bg-zinc-800 px-3 py-1 rounded-[10px]">
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">게스트: {guestDetail.name}</span>
                        </div>
                    )}
                </div>
                <div className="w-10" />
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto px-4 pb-8 flex flex-col items-center">

                {/* Content Area - Calendar is always visible but blocked by modal if open */}

                {/* INLINE INPUTS REMOVED */}

                <Calendar
                    className="mb-8 p-4"
                    month={currentMonthName}
                    year={currentYear}
                    startDayOfWeek={firstDayOfMonth}
                    totalDays={daysInMonth}
                    // availableDays={availableDays} // Removed static availableDays
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
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm bg-[#162660] hover:bg-[#43A047] transition-colors relative"
                                >
                                    {day}
                                    <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                        <CheckIcon className="w-3 h-3 text-[#162660]" />
                                    </div>
                                </button>
                            );
                        }

                        // Base styles
                        let buttonClasses = "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all relative";

                        if (isAvailable) {
                            // Available Style (Black/Dark)
                            if (isSelected) {
                                // Selected State
                                buttonClasses += " bg-[#F6C555] text-black shadow-sm font-bold scale-110";
                            } else if (isToday) {
                                // Today State (Available)
                                buttonClasses += " bg-zinc-900 dark:bg-zinc-700 text-white font-bold";
                            } else {
                                // Normal Available State
                                buttonClasses += " text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold";
                            }
                        } else {
                            // Unavailable Style (Grey)
                            buttonClasses += " text-zinc-300 dark:text-zinc-700 cursor-default";
                        }

                        return (
                            <button
                                onClick={() => toggleDay(day)}
                                disabled={!isAvailable}
                                className={buttonClasses}
                            >
                                {day}
                            </button>
                        );
                    }}
                />

                <div className="w-full flex justify-center mt-auto">
                    <Button
                        disabled={selectedDays.length === 0 || (isGuest && (!guestName || !guestPhone))}
                        onClick={handleSubmit}
                        className={`
                            w-full h-14 bg-[#162660] rounded-[20px] text-white text-lg font-bold
                            transition-all duration-200 shadow-md
                            ${selectedDays.length === 0 ? 'opacity-50 cursor-not-allowed' : 'opacity-100 hover:bg-[#7A8C9F] hover:scale-[1.02]'}
                        `}
                    >
                        신청하기
                    </Button>
                </div>

            </main>

            {/* Withdrawal Modal */}
            {withdrawDay !== null && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-xs shadow-xl animate-in fade-in zoom-in duration-200">
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
                        className="bg-[#F0F7FF] rounded-[24px] p-4 sm:p-6 w-full max-w-[280px] min-w-0 shadow-2xl flex flex-col items-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold text-[#1E3A8A] mb-1">게스트 등록/조회</h3>
                        <p className="text-[11px] text-zinc-500 mb-6 text-center leading-tight">
                            게스트로 이용할 사용자의 정보를 입력해주세요.
                        </p>

                        <div className="w-full space-y-4 mb-6 min-w-0">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                <label className="text-sm font-bold text-zinc-900 w-16 sm:w-20 shrink-0 text-right whitespace-nowrap">이름</label>
                                <input
                                    type="text"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    className="w-40 sm:w-48 h-10 px-3 rounded-lg border border-transparent bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                                />
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                <label className="text-sm font-bold text-zinc-900 w-16 sm:w-20 shrink-0 text-right whitespace-nowrap">전화번호</label>
                                <input
                                    type="tel"
                                    value={guestPhone}
                                    onChange={(e) => setGuestPhone(e.target.value)}
                                    className="w-40 sm:w-48 h-10 px-3 rounded-lg border border-transparent bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                                />
                            </div>
                        </div>

                        <Button
                            className="w-full bg-[#1E3A8A] hover:bg-[#172554] text-white rounded-xl py-3 text-sm font-bold shadow-md"
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
        </div>
    );
}
