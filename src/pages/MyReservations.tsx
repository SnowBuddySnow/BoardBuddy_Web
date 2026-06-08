import { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Calendar } from '../components/Calendar';
import { getUserInfo } from '../services/user';
import { createReservation, cancelReservation, applyForTeaching, withdrawFromTeaching, getMyCrewCalendar } from '../services/crew';
import { MyReservation } from '../types/api';


interface MyReservationsProps {
    onBack: () => void;
    onCrewClick?: () => void;
}

const ChevronLeftIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m15 18-6-6 6-6" />
    </svg>
);




export default function MyReservations({ onBack, onCrewClick }: MyReservationsProps) {
    const todayDate = new Date();

    // Default to the current date, but clamp to the range if outside? 
    // For now, I'll stick to real current date as the starting point.
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

    const [selectedDay, setSelectedDay] = useState<number | null>(isCurrentMonthView ? todayDay : null);
    const [isLessonApplied, setIsLessonApplied] = useState(false);
    const [usageCount, setUsageCount] = useState(0);

    // Store reservations
    const [reservations, setReservations] = useState<MyReservation[]>([]);
    const [crewId, setCrewId] = useState<number | null>(null);

    // Fetch Reservations & Crew Info
    const fetchReservations = async (targetCrewId: number, targetDate: Date) => {
        try {
            const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
            const data = await getMyCrewCalendar(targetCrewId, dateStr);
            setReservations(data.my_reservations);
            setUsageCount(data.usage_count);
        } catch (error) {
            console.error("Failed to fetch my reservations:", error);
        }
    };

    useEffect(() => {
        const initData = async () => {
            // 1. Fetch Crew ID
            try {
                const userData = await getUserInfo();
                if (userData.crew && userData.crew.crewId) {
                    const cId = userData.crew.crewId;
                    setCrewId(cId);
                    // 2. Fetch Reservations using crewId
                    await fetchReservations(cId, viewDate);
                }
            } catch (error) {
                console.error("Failed to fetch user info:", error);
            }
        };
        initData();
    }, []);

    // Update reservations when viewDate changes (if API supports month filtering via date param)
    useEffect(() => {
        if (crewId) {
            fetchReservations(crewId, viewDate);
        }
    }, [viewDate, crewId]);

    const formatDate = (day: number) => {
        return `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const handleCreateReservation = async () => {
        if (!crewId || !selectedDay) return;

        const dateStr = formatDate(selectedDay);

        try {
            await createReservation(crewId, [dateStr]);
            alert("예약 신청이 완료되었습니다.");
            fetchReservations(crewId, viewDate);
        } catch (error) {
            console.error("Reservation creation failed:", error);
            alert("예약 신청에 실패했습니다.");
        }
    };

    const handleCancelReservation = async () => {
        if (!crewId || !selectedDay) return;

        const reservation = getReservationForDay(selectedDay);
        if (!reservation) {
            alert("예약 정보를 찾을 수 없습니다.");
            return;
        }

        try {
            await cancelReservation(crewId, reservation.reservation_id);
            alert("예약이 취소되었습니다.");
            fetchReservations(crewId, viewDate);
        } catch (error) {
            console.error("Cancellation failed:", error);
            alert("예약 취소에 실패했습니다.");
        }
    };

    const handleTeachingToggle = async () => {
        if (!crewId || !selectedDay) return;
        const reservation = getReservationForDay(selectedDay);
        if (!reservation) return;

        try {
            if (isLessonApplied) {
                await withdrawFromTeaching(crewId, reservation.reservation_id);
                setIsLessonApplied(false);
            } else {
                await applyForTeaching(crewId, reservation.reservation_id);
                setIsLessonApplied(true);
            }
            fetchReservations(crewId, viewDate); // Refresh data
        } catch (error) {
            console.error("Failed to toggle teaching:", error);
            alert("처리 중 오류가 발생했습니다.");
            // Revert state on error
            setIsLessonApplied(!isLessonApplied);
        }
    };

    // Filter reservations for current month view
    // Format: YYYY-MM-DD
    const getReservationForDay = (day: number) => {
        const dateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return reservations.find(r => r.date === dateStr);
    };

    // Derived State for Calendar
    // confirmed = status === 'confirmed', pending = otherwise (if any)
    // Note: The mock data had "pending" but the API might only show confirmed or we map status.
    // User sample showed "confirmed". I'll assume anything else is pending or we check status.
    const confirmedDays = reservations
        .filter(r => {
            const d = new Date(r.date);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonthIndex && r.status === 'confirmed';
        })
        .map(r => new Date(r.date).getDate());

    const pendingDays = reservations
        .filter(r => {
            const d = new Date(r.date);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonthIndex && r.status !== 'confirmed';
        })
        .map(r => new Date(r.date).getDate());


    const handleDayClick = (day: number) => {
        setSelectedDay(day);
        const reservation = getReservationForDay(day);
        setIsLessonApplied(reservation?.teaching ?? false);
    };

    // Navigation Bounds
    const minDate = new Date(2025, 9, 1); // October 2025 (Month is 0-indexed: 9=Oct)
    const maxDate = new Date(2026, 4, 31); // May 2026 (Month is 0-indexed: 4=May)

    const handlePrevMonth = () => {
        const newDate = new Date(currentYear, currentMonthIndex - 1, 1);
        if (newDate >= minDate) {
            setViewDate(newDate);
            setSelectedDay(null); // Deselect when changing months
        }
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentYear, currentMonthIndex + 1, 1);
        // We only care about the month/year, so check if the first of the next month is <= maxDate
        if (newDate <= maxDate) {
            setViewDate(newDate);
            setSelectedDay(null); // Deselect when changing months
        }
    };

    // Determine if buttons should be enabled
    const canGoPrev = new Date(currentYear, currentMonthIndex - 1, 1) >= minDate;
    const canGoNext = new Date(currentYear, currentMonthIndex + 1, 1) <= maxDate;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950 relative">
            {/* Header */}
            <header className="px-4 pt-2 pb-2 flex items-center justify-between z-10">
                <div className="w-20 flex justify-start"> {/* Fixed width wrapper */}
                    <Button variant="ghost" onClick={onBack} className="-ml-2 gap-1 text-zinc-900 dark:text-zinc-100 hover:bg-transparent">
                        <ChevronLeftIcon className="w-6 h-6" />
                    </Button>
                </div>
                <h1 className="flex-1 text-center text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    나의 달력
                </h1>
                <div className="w-20 flex justify-end"> {/* Fixed width wrapper */}
                    <Button
                        variant="ghost"
                        onClick={onCrewClick}
                        className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400 font-medium px-0 gap-0"
                    >
                        크루 달력 <ChevronLeftIcon className="w-4 h-4 rotate-180" />
                    </Button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-4 pb-[140px] flex flex-col items-center">

                <Calendar
                    className="mb-3"
                    month={currentMonthName}
                    year={currentYear}
                    startDayOfWeek={firstDayOfMonth}
                    totalDays={daysInMonth}
                    expandable={false}
                    hideHeader={false}
                    onDayClick={handleDayClick}
                    onPrevMonth={canGoPrev ? handlePrevMonth : undefined}
                    onNextMonth={canGoNext ? handleNextMonth : undefined}
                    headerRight={
                        <div className="bg-[#EDF2FF] dark:bg-[#EDF2FF]/30 px-4 py-2 rounded-full flex gap-3 items-center shadow-sm">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">시즌방 이용 횟수 :</span>
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{usageCount}박</span>
                        </div>
                    }
                    renderDay={(day) => {
                        const isSelected = selectedDay === day;
                        const isConfirmed = confirmedDays.includes(day);
                        const isPending = pendingDays.includes(day);
                        const isToday = day === todayDay && isCurrentMonthView;

                        // Base Container Classes
                        let containerClasses = "w-full h-full flex flex-col items-center justify-start pt-1.5 transition-all duration-200 cursor-pointer text-sm font-bold rounded-[10px] overflow-visible";

                        if (isSelected) {
                            containerClasses += " bg-[#333333] dark:bg-zinc-700 text-white shadow-lg";
                        } else if (isToday) {
                            containerClasses += " bg-[#F4F4F5] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100";
                        } else {
                            containerClasses += " text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50";
                        }

                        // Content (Number or Circle)
                        let numberElement = <span className="text-sm font-bold">{day}</span>;


                        if (isConfirmed || isPending) {
                            const bg = isConfirmed ? 'bg-[#1E3A8A]' : 'bg-[#9CA3AF]';
                            const textColor = 'text-white';
                            numberElement = (
                                <div className={`w-8 h-8 -mt-1 rounded-full ${bg} ${textColor} flex items-center justify-center text-sm font-bold shadow-sm`}>
                                    {day}
                                </div>
                            );
                        }

                        return (
                            <div className={containerClasses}>
                                {numberElement}
                            </div>
                        );
                    }}
                />

                {/* Legend */}
                <div className="w-full flex justify-end gap-1.5 mb-2">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#1E3A8A]" />
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">확정</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">대기</span>
                    </div>
                </div>

                {/* Bottom Action Section */}
                <div className="w-full mt-auto">
                    {(() => {
                        const reservation = selectedDay ? getReservationForDay(selectedDay) : null;
                        const isConfirmed = reservation?.status === 'confirmed';

                        // Case: Selected Reservation (Confirmed/Pending)
                        if (reservation) {
                            return (
                                <div className="w-full flex flex-col gap-3 mb-4">
                                    {isConfirmed && (
                                        <div className="flex items-center justify-end gap-2 px-1">
                                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">강습 신청하기</span>
                                            <button
                                                className="w-10 h-6 bg-zinc-200 dark:bg-zinc-700 rounded-full relative transition-colors duration-200 ease-in-out data-[checked=true]:bg-[#1E3A8A]"
                                                data-checked={isLessonApplied}
                                                onClick={handleTeachingToggle}
                                            >
                                                <span className="absolute top-1 left-1 bg-white dark:bg-zinc-300 w-4 h-4 rounded-full transition-transform duration-200 ease-in-out data-[checked=true]:translate-x-4"
                                                    data-checked={isLessonApplied}
                                                />
                                            </button>
                                        </div>
                                    )}
                                    <div className="w-full bg-[#EDF2FF] dark:bg-[#EDF2FF]/30 rounded-[24px] p-5 flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-2.5 h-2.5 rounded-full ${isConfirmed ? 'bg-[#1E3A8A]' : 'bg-[#9CA3AF]'}`} />
                                            <span className="text-zinc-900 dark:text-zinc-100 font-bold text-base">
                                                {currentMonthIndex + 1}/{String(selectedDay).padStart(2, '0')} 예약 {isConfirmed ? '확정' : '대기'}
                                            </span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={handleCancelReservation}
                                            className="bg-white dark:bg-white/20 border-zinc-200 dark:border-zinc-600 text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-white/30 rounded-full px-4 h-9 text-sm font-medium shadow-sm transition-colors"
                                        >
                                            예약 취소
                                        </Button>
                                    </div>
                                </div>
                            );
                        }

                        // Case: No Reservation (Default)
                        return (
                            <>
                                <div className="text-center mb-6">
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                        {currentMonthIndex + 1}/{selectedDay ? String(selectedDay).padStart(2, '0') : '--'} 예약내역이 없습니다.<br />
                                        예약하시겠습니까?
                                    </p>
                                </div>
                                <Button
                                    onClick={handleCreateReservation}
                                    className="w-full h-14 bg-[#162660] hover:bg-[#1E3A8A] rounded-[20px] text-white text-lg font-bold shadow-md transition-all active:scale-[0.98] mb-4"
                                >
                                    예약하기
                                </Button>
                            </>
                        );
                    })()}
                </div>

            </main>
        </div>
    );
}
