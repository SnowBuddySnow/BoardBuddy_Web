import { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, Smile, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Calendar } from '../components/Calendar';
import { getCrewInfo, getReservationDetail, getCrewCalendar, createReservation, cancelReservation, deleteReservation } from '../services/crew';
import { getUserInfo } from '../services/user';
import { ReservationDayResponse, CrewCalendarResponse } from '../types/api';


interface ReservationStatsProps {
    onBack: () => void;
    onMyCalendarClick?: () => void;
    onReservationClick?: () => void;
}


export default function ReservationStats({ onBack, onMyCalendarClick, onReservationClick }: ReservationStatsProps) {
    // ... (lines 16-317)
    {/* Change Link */ }
    <div className="w-full flex justify-end mb-6 pr-2">
        <button
            onClick={onReservationClick}
            className="text-xs font-medium text-zinc-500 flex items-center gap-1 hover:text-zinc-800 transition-colors"
        >
            예약 변경하러 가기 <ChevronRightIcon className="w-3 h-3" />
        </button>
    </div>
    const todayDate = new Date();

    // Default to current date
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

    const [selectedDay, setSelectedDay] = useState<number>(isCurrentMonthView ? todayDay : 0);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showMySchedule, setShowMySchedule] = useState(false);
    const [crewCapacity, setCrewCapacity] = useState<number>(20); // Default, will update
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

    // Sort order state: 'default' (Role/Name) or 'earliest' (Reservation ID)
    const [sortOrder, setSortOrder] = useState<'default' | 'earliest'>('default');

    const formatDate = (day: number) => {
        return `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    // 1. Fetch User Info to get Crew ID
    // 2. Then Fetch Crew Info using that ID
    useEffect(() => {
        const initData = async () => {
            try {
                // Import getUserInfo dynamically or if already imported
                // const { getUserInfo } = await import('../services/user');
                const userData = await getUserInfo();

                if (userData.crew && userData.crew.crewId) {
                    const id = userData.crew.crewId;
                    setCrewId(id);

                    // Now fetch crew info for capacity (still used for expanded view "X/Total")
                    const crewData = await getCrewInfo(id);
                    if (crewData && crewData.dailyCapacity) {
                        setCrewCapacity(crewData.dailyCapacity);
                    }
                }
            } catch (error) {
                console.error("Failed to initialize stats:", error);
            }
        };
        initData();
    }, []); // Run once on mount

    // Fetch Calendar Data (Occupancy Statuses) whenever month/year or crewId or showMySchedule changes
    useEffect(() => {
        const fetchCalendarData = async () => {
            if (!crewId) return;

            // Use 15th of the month as reference date for fetching the month's calendar
            const dateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-15`;

            try {
                const data = await getCrewCalendar(crewId, dateStr, showMySchedule);
                setCalendarData(data);
            } catch (error) {
                console.error("Failed to fetch crew calendar:", error);
            }
        };

        fetchCalendarData();
    }, [crewId, currentYear, currentMonthIndex, showMySchedule]);


    const fetchDetailForDay = async (day: number) => {
        if (!crewId) return; // Wait for crewId

        const dateStr = formatDate(day);
        if (detailsCache[dateStr]) return; // Already cached

        try {
            const data = await getReservationDetail(crewId, dateStr);
            setDetailsCache(prev => ({ ...prev, [dateStr]: data }));
        } catch (error) {
            console.error(`Failed to fetch detail for ${dateStr}:`, error);
        }
    };

    // Effect to fetch detail when selectedDay changes
    useEffect(() => {
        if (selectedDay > 0 && crewId) {
            fetchDetailForDay(selectedDay);
        }
    }, [selectedDay, currentYear, currentMonthIndex, crewId]);


    // Parse My Schedule Data
    const confirmedDays = calendarData?.my_reservations
        ?.filter(r => r.status === 'confirmed')
        .map(r => parseInt(r.date.split('-')[2], 10)) || [];

    const pendingDays = calendarData?.my_reservations
        ?.filter(r => r.status === 'pending' || r.status === 'waiting') // Assuming 'waiting' or 'pending'
        .map(r => parseInt(r.date.split('-')[2], 10)) || [];

    const handleCreateReservation = async () => {
        if (!crewId) {
            alert("크루 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        const dateStr = formatDate(selectedDay);

        try {
            await createReservation(crewId, [dateStr]);
            alert("예약 신청이 완료되었습니다.");
            // Refresh data
            const calDateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-15`;
            const data = await getCrewCalendar(crewId, calDateStr, showMySchedule);
            setCalendarData(data);
            fetchDetailForDay(selectedDay);
        } catch (error) {
            console.error("Reservation creation failed:", error);
            alert("예약 신청에 실패했습니다.");
        }
    };

    const handleCancelReservation = async () => {
        if (!crewId) return;

        const dateStr = formatDate(selectedDay);
        const reservation = calendarData?.my_reservations?.find(r => r.date === dateStr);
        
        if (!reservation) {
            alert("예약 정보를 찾을 수 없습니다.");
            return;
        }

        try {
            await cancelReservation(crewId, reservation.reservation_id);
            alert("예약이 취소되었습니다.");

            // Refresh data
            const calDateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-15`;
            const data = await getCrewCalendar(crewId, calDateStr, showMySchedule);
            setCalendarData(data);
            fetchDetailForDay(selectedDay);
        } catch (error) {
            console.error("Cancellation failed:", error);
            alert("예약 취소에 실패했습니다.");
        }
    };

    const handleDayClick = (day: number) => {
        if (selectedDay === day) {
            setIsExpanded(!isExpanded);
        } else {
            setSelectedDay(day);
            setIsExpanded(false);
        }
    };

    // Navigation Bounds
    const minDate = new Date(2025, 9, 1); // October 2025
    const maxDate = new Date(2026, 4, 31); // May 2026

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
        if (!calendarData?.calendar) return 'LOW'; // Default
        const dateStr = formatDate(day);
        const dayData = calendarData.calendar.find(item => item.date === dateStr);
        return dayData?.occupancy_status || 'LOW';
    };

    const getCrewDayColor = (day: number) => {
        const status = getOccupancyStatus(day);

        switch (status) {
            case 'LOW': return 'bg-[#4CAF50]'; // Green
            case 'MEDIUM': return 'bg-[#F6C555]'; // Yellow
            case 'HIGH': return 'bg-[#FF6B6B]'; // Red
            default: return 'bg-[#4CAF50]';
        }
    };

    const currentDetail = selectedDay ? detailsCache[formatDate(selectedDay)] : null;
    const currentMemberCount = currentDetail?.confirmedCount ?? 0;
    // Fix: Ensure we fallback to empty array if reservations is undefined
    const currentMemberList = (currentDetail?.reservations || []).sort((a, b) => {
        if (sortOrder === 'earliest') {
            return a.reservationId - b.reservationId; // Ascending Order of ID
        }

        // Default: Sort by reservationId
        return a.reservationId - b.reservationId;
    });

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">
            {/* Header */}
            <header className="px-4 pt-2 pb-2 flex items-center justify-between z-10">
                <div className="w-20 flex justify-start">
                    <Button variant="ghost" onClick={onBack} className="-ml-2 gap-1 text-zinc-900 dark:text-zinc-100 hover:bg-transparent">
                        <ChevronLeftIcon className="w-6 h-6" />
                    </Button>
                </div>
                <h1 className="flex-1 text-center text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    크루 달력
                </h1>
                <div className="w-20 flex justify-end">
                    <Button
                        variant="ghost"
                        onClick={onMyCalendarClick}
                        className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400 font-medium px-0 gap-0"
                    >
                        나의 달력 <ChevronRightIcon className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-4 pb-[120px] flex flex-col items-center">

                <Calendar
                    className="mb-3"
                    month={currentMonthName}
                    year={currentYear}
                    startDayOfWeek={firstDayOfMonth}
                    totalDays={daysInMonth}
                    expandable={false}
                    hideHeader={false}
                    selectedDays={[selectedDay]}
                    isCollapsed={isExpanded}
                    onDayClick={handleDayClick}
                    onPrevMonth={canGoPrev ? handlePrevMonth : undefined}
                    onNextMonth={canGoNext ? handleNextMonth : undefined}
                    headerRight={
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">내 일정</span>
                            <div
                                onClick={() => setShowMySchedule(!showMySchedule)}
                                className={`w-10 h-6 rounded-full p-1 relative cursor-pointer transition-colors duration-200 ${showMySchedule ? 'bg-[#4CAF50]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
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
                        let containerClasses = "w-full h-full flex flex-col items-center justify-start pt-1.5 transition-all duration-200 cursor-pointer text-sm font-bold rounded-[10px] overflow-visible";

                        if (isSelected) {
                            containerClasses += " bg-[#333333] dark:bg-zinc-700 text-white shadow-lg";
                        } else if (isToday) {
                            containerClasses += " bg-[#F4F4F5] dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100";
                        } else {
                            containerClasses += " text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50";
                        }

                        // Number Element (Circle if reserved)
                        let numberElement = <span className="text-sm font-bold">{day}</span>;
                        if (isConfirmed || isPending) {
                            const bg = isConfirmed ? 'bg-[#1E3A8A]' : 'bg-[#9CA3AF]';
                            const textColor = 'text-white';
                            // Note: If selected, container is Black.
                            // If we render a Navy Circle inside a Black Box, it works.
                            numberElement = (
                                <div className={`w-8 h-8 -mt-1 rounded-full ${bg} ${textColor} flex items-center justify-center text-sm font-bold shadow-sm`}>
                                    {day}
                                </div>
                            );
                        }

                        return (
                            <div className={containerClasses}>
                                {numberElement}
                                <div className={`w-2 h-2 rounded-full ${colorClass} mt-1`} />
                            </div>
                        );
                    }}
                />

                {/* Bottom Section: Legend or Expanded View */}
                {isExpanded ? (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Expanded User List Card */}
                        <div className="w-full bg-[#F4F4F5] dark:bg-zinc-800 rounded-[20px] p-6 mb-3">
                            {/* Card Header */}
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-7 h-7 bg-[#1E3A8A] rounded-[8px] flex items-center justify-center shadow-sm">
                                    <Smile className="w-4 h-4 text-white" strokeWidth={2.5} />
                                </div>
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">예약 완료</span>
                                <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{currentMemberCount}명/{crewCapacity}</span>

                                <div className="flex-1" /> {/* Spacer */}

                                <div className="relative">
                                    <select
                                        className="appearance-none bg-transparent text-sm font-medium text-zinc-500 pr-6 focus:outline-none text-right"
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value as 'default' | 'earliest')}
                                    >
                                        <option value="default">기본</option>
                                        <option value="earliest">예약순</option>
                                    </select>
                                    <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 w-4 h-4" />
                                </div>
                            </div>

                            {/* Users Grid */}
                            <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                                {currentMemberList.length > 0 ? (
                                    currentMemberList.map((member) => (
                                        <div key={member.reservationId} className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-zinc-300 dark:bg-zinc-600 rounded-full shrink-0 overflow-hidden relative">
                                                {/* No profile image available in new DTO yet */}
                                            </div>
                                            <div className="flex flex-col items-start gap-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                                        {member.guestId ? `게스트 #${member.guestId}` : `회원 #${member.participantAccountId}`}
                                                    </span>
                                                    {member.guestId && (
                                                        <div className="px-1.5 py-0.5 bg-yellow-100 rounded-[4px] flex items-center justify-center">
                                                            <span className="text-[10px] font-bold text-yellow-700">게스트</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-2 text-center text-zinc-400 dark:text-zinc-500 text-sm py-4">
                                        예약자가 없습니다.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Change Link */}
                        <div className="w-full flex justify-end mb-6 pr-2">
                            <button
                                onClick={onReservationClick}
                                className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
                            >
                                예약 변경하러 가기 <ChevronRightIcon className="w-3 h-3" />
                            </button>
                        </div>

                        {/* Action Button */}
                        {confirmedDays.includes(selectedDay) || pendingDays.includes(selectedDay) ? (
                            <Button
                                variant="outline"
                                onClick={handleCancelReservation}
                                className="w-full h-14 bg-white dark:bg-zinc-700 border border-zinc-400 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-600 rounded-[20px] text-zinc-500 dark:text-zinc-300 text-lg font-bold shadow-sm transition-all active:scale-[0.98]"
                            >
                                예약 취소하기
                            </Button>
                        ) : (
                            <Button
                                onClick={handleCreateReservation}
                                className="w-full h-14 bg-[#162660] hover:bg-[#1E3A8A] rounded-[20px] text-white text-lg font-bold shadow-md transition-all active:scale-[0.98]"
                            >
                                예약하기
                            </Button>
                        )}
                    </div>
                ) : (
                    /* Default Legend Section - Simplified for LOW/MEDIUM/HIGH */
                    <div className="w-full bg-[#F4F4F5] dark:bg-zinc-800 rounded-[20px] p-4 flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 ml-4">혼잡도</span>
                        </div>

                        <div className="flex items-center gap-4 mr-2">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-[#4CAF50]" />
                                <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                                    여유
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-[#F6C555]" />
                                <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                                    보통
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-[#FF6B6B]" />
                                <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                                    혼잡
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Member Detail Modal */}
            {selectedMember && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-6 animate-in fade-in duration-200" onClick={() => setSelectedMember(null)}>
                    <div className="bg-white dark:bg-zinc-800 rounded-[24px] p-6 w-full max-w-[280px] shadow-2xl flex flex-col items-center relative" onClick={(e) => e.stopPropagation()}>



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
                            {selectedMember.canDelete && selectedMember.reservationId && (
                                <div className="w-full flex justify-end mb-1">
                                    <button
                                        className="w-9 h-9 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-500 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (!crewId || !selectedMember.reservationId) return;
                                            if (confirm(`${selectedMember.name}님의 예약을 삭제하시겠습니까?`)) {
                                                try {
                                                    await deleteReservation(crewId, selectedMember.reservationId);
                                                    alert("예약이 삭제되었습니다.");
                                                    setSelectedMember(null);
                                                    // Refresh data
                                                    const calDateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-15`;
                                                    const data = await getCrewCalendar(crewId, calDateStr, showMySchedule);
                                                    setCalendarData(data);
                                                    fetchDetailForDay(selectedDay);
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
                                className="w-full bg-[#1E3A8A] text-white rounded-xl py-2.5 text-sm font-bold shadow-md hover:bg-[#172554]"
                                onClick={() => setSelectedMember(null)}
                            >
                                닫기
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
