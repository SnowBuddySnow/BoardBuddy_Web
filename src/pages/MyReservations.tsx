import { getReservationSeason } from '../lib/reservationSeason';
import { ReservationLayout, ReservationSummary } from '../components/reservation/ReservationLayout';
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

export default function MyReservations({ onBack, onCrewClick }: MyReservationsProps) {
    const todayDate = new Date();

    // Default to the current date, but clamp to the range if outside? 
    // For now, I'll stick to real current date as the starting point.
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
                    // The crewId/viewDate effect below owns the calendar fetch (once, not twice).
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
    const { start: minDate, end: maxDate } = getReservationSeason(todayDate);

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
        <ReservationLayout title="내 예약" onBack={onBack} action={onCrewClick && <button type="button" onClick={onCrewClick}>크루 달력 →</button>}>

            <main className="reservation-content">

                <ReservationSummary title="시즌방 이용" description="예약한 날짜와 확정 상태를 확인하세요." value={`${usageCount}박`} />
                <div className="reservation-workspace">
                    <Calendar
                        className="mb-3"
                        month={currentMonthName}
                        year={currentYear}
                        startDayOfWeek={firstDayOfMonth}
                        totalDays={daysInMonth}
                        selectedDays={selectedDay ? [selectedDay] : []}
                        expandable={false}
                        hideHeader={false}
                        onDayClick={handleDayClick}
                        onPrevMonth={canGoPrev ? handlePrevMonth : undefined}
                        onNextMonth={canGoNext ? handleNextMonth : undefined}
                        renderDay={(day) => {
                            const isSelected = selectedDay === day;
                            const isConfirmed = confirmedDays.includes(day);
                            const isPending = pendingDays.includes(day);
                            const isToday = day === todayDay && isCurrentMonthView;

                            // Base Container Classes
                            let containerClasses = "reservation-date-cell";

                            if (isSelected) {
                                containerClasses += " is-selected";
                            } else if (isToday) {
                                containerClasses += " is-today";
                            } else {
                                containerClasses += " text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50";
                            }

                            // Content (Number or Circle)
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
                                </div>
                            );
                        }}
                    />

                    <aside className="reservation-detail-column">
                        {/* Legend */}
                        <div className="w-full flex justify-end gap-1.5 mb-2">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full reservation-confirmed" />
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">확정</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full reservation-pending" />
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">대기</span>
                            </div>
                        </div>

                        {/* Bottom Action Section */}
                        <div className="w-full mt-5">
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
                                                        role="switch" aria-label="강습 신청" aria-checked={isLessonApplied} className="reservation-toggle w-10 h-6 rounded-full relative transition-colors"
                                                        data-checked={isLessonApplied}
                                                        onClick={handleTeachingToggle}
                                                    >
                                                        <span className="absolute top-1 left-1 bg-white dark:bg-zinc-300 w-4 h-4 rounded-full transition-transform duration-200 ease-in-out data-[checked=true]:translate-x-4"
                                                            data-checked={isLessonApplied}
                                                        />
                                                    </button>
                                                </div>
                                            )}
                                            <div className="reservation-panel flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${isConfirmed ? 'reservation-confirmed' : 'reservation-pending'}`} />
                                                    <span className="text-zinc-900 dark:text-zinc-100 font-bold text-base">
                                                        {currentMonthIndex + 1}/{String(selectedDay).padStart(2, '0')} 예약 {isConfirmed ? '확정' : '대기'}
                                                    </span>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    onClick={handleCancelReservation}
                                                    className="reservation-secondary px-4 text-sm"
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
                                        <div className="reservation-empty mb-4">
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                                {currentMonthIndex + 1}/{selectedDay ? String(selectedDay).padStart(2, '0') : '--'} 예약내역이 없습니다.<br />
                                                예약하시겠습니까?
                                            </p>
                                        </div>
                                        <Button
                                            onClick={handleCreateReservation}
                                            disabled={!selectedDay}
                                            className="reservation-primary w-full h-14 text-base mb-4"
                                        >
                                            예약하기
                                        </Button>
                                    </>
                                );
                            })()}
                        </div>

                    </aside>
                </div>
            </main>
        </ReservationLayout>
    );
}
