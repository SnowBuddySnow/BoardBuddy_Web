
import { Calendar } from '../components/Calendar';
import { useState, useEffect } from 'react';
import { getUserInfo, getMyReservations } from '../services/user';
import { getCrewInfo, getMyApplications } from '../services/crew';
import { UserDetail, CrewDetail, MyReservation, MyApplication } from '../types/api';
import { Bus, Mountain, UserPlus, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind } from 'lucide-react';
import { getWeather, WeatherData } from '../services/weather';

// Icons



const CircleArrowRightIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" className="opacity-20" />
        <path d="m10 8 4 4-4 4" />
    </svg>
);

const CheckSquareIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
);

const SnowflakeDecorIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M2 12h20" />
        <path d="M12 2v20" />
        <path d="m4.93 4.93 14.14 14.14" />
        <path d="m4.93 19.07 14.14-14.14" />
    </svg>
);

interface HomeProps {
    onMakeReservationClick: () => void;
    onGuestReservationClick: () => void;
    onCheckScheduleClick: () => void;
    onCalendarClick: () => void;
    onTeamClick: () => void;
    onSearchClick: () => void;
    hasCrew?: boolean;
    onJoinCrew?: () => void;
}

export default function Home({
    onMakeReservationClick,
    onGuestReservationClick,
    // onCheckScheduleClick, // Commented out to fix lint "never read"
    onCalendarClick,
    onTeamClick,
    onSearchClick,
    hasCrew: initialHasCrew = true,
    // onJoinCrew // Commented out to fix lint "never read"
}: HomeProps) {
    const [userInfo, setUserInfo] = useState<UserDetail | null>(null);
    const [crewDetail, setCrewDetail] = useState<CrewDetail | null>(null);
    const [myReservations, setMyReservations] = useState<MyReservation[]>([]);
    const [myApplications, setMyApplications] = useState<MyApplication[]>([]);
    // Use prop as initial, but can be updated by data
    const [hasCrew, setHasCrew] = useState(initialHasCrew);
    const [isDebugNoCrew] = useState(false);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [currentDate, setCurrentDate] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getUserInfo();
                setUserInfo(data);
                if (data.crew) {
                    setHasCrew(true);
                    try {
                        const cDetail = await getCrewInfo(data.crew.crewId);
                        setCrewDetail(cDetail);
                    } catch (e) {
                        console.error("Failed to fetch crew detail", e);
                    }
                } else {
                    setHasCrew(false);
                    // Only fetch applications if no crew
                    try {
                        const apps = await getMyApplications();
                        setMyApplications(apps);
                    } catch (e) {
                        console.error("Failed to fetch applications", e);
                    }
                }

                // Fetch Reservations
                try {
                    const reservations = await getMyReservations();
                    setMyReservations(reservations);
                } catch (e) {
                    console.error("Failed to fetch reservations", e);
                }

            } catch (err) {
                console.error("Failed to fetch user info", err);
            }
        };
        fetchData();

        // Fetch Weather
        getWeather().then(data => {
            setWeather(data);
        }).catch(err => console.error("Weather fetch failed", err));

        // Set Current Date
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weekday = days[now.getDay()];
        setCurrentDate(`${year}. ${month}. ${day} ${weekday}`);

    }, []);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8F9FA] dark:bg-zinc-950 relative">
            {/* Header */}
            <header className="px-4 pt-4 pb-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <h1 className="text-[20px] font-black italic text-zinc-900 dark:text-zinc-100 font-['Joti_One']">BoardBuddy</h1>
                    {/* Shark Image removed due to missing file */}
                </div>
                <div className="flex items-center gap-2">
                    {/* 
                        <button
                            onClick={() => {
                                console.log('Toggling debug mode. Current:', isDebugNoCrew, 'HasCrew:', hasCrew);
                                setIsDebugNoCrew(prev => !prev);
                            }}
                            className={`text-[10px] px-2 py-1 rounded border mr-2 transition-colors ${isDebugNoCrew
                                ? 'bg-blue-100 text-blue-600 border-blue-200 hover:bg-blue-200'
                                : 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200'
                                }`}
                        >
                            {isDebugNoCrew ? 'Show My Crew' : 'Simulate No Crew'}
                        </button>
                        */}
                    {/* <Button variant="ghost" size="icon" onClick={onSearchClick} className="text-zinc-900 dark:text-zinc-100 cursor-pointer">
                        <BellIcon className="w-[24px] h-[24px]" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-zinc-900 dark:text-zinc-100 cursor-pointer">
                        <SettingsIcon className="w-[24px] h-[24px]" />
                    </Button> */}
                </div>
            </header>

            {/* Content Area with bottom padding for menu */}
            <main className="flex-1 overflow-y-auto pb-[110px]">

                {/* Team Info */}
                <div className="px-4 mb-8">
                    {!isDebugNoCrew && hasCrew && userInfo?.crew ? (
                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mb-1">{crewDetail?.univ || userInfo.school}</div>
                                <div
                                    onClick={onTeamClick}
                                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                    <h2 className="text-2xl font-bold truncate max-w-[200px] text-zinc-900 dark:text-zinc-100">{userInfo.crew.crewName}</h2>
                                    <CircleArrowRightIcon className="w-5 h-5 text-[#FCD34D] shrink-0" />
                                </div>
                            </div>

                            {/* External Link Buttons */}
                            <div className="flex items-center gap-3 mb-1">
                                <a
                                    href="https://skibus.purplebus.co.kr/Pp/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400 shadow-sm"
                                    aria-label="Bus Reservation"
                                >
                                    <Bus className="w-5 h-5" />
                                </a>
                                <a
                                    href="https://phoenixhnr.co.kr/m/static/pyeongchang/snowpark/slope-lift"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400 shadow-sm"
                                    aria-label="Slope Status"
                                >
                                    <Mountain className="w-5 h-5" />
                                </a>
                            </div>
                        </div>
                    ) : myApplications.some(app => app.status === 'PENDING') ? (
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1 py-2">
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                    {myApplications.find(app => app.status === 'PENDING')?.crew_name}에 가입 신청 성공
                                </h2>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    크루 운영진 승인 대기중
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <div
                                onClick={onSearchClick}
                                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity py-2"
                            >
                                <h2 className="text-2xl font-bold text-zinc-400 dark:text-zinc-500">탭해서 크루에 가입하세요</h2>
                                <CircleArrowRightIcon className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                            </div>
                            {/* 
                                <Button
                                    size="small"
                                    variant="outline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onJoinCrew?.();
                                    }}
                                    className="text-xs h-8 px-3"
                                >
                                    가입 (Debug)
                                </Button>
                                */}
                        </div>
                    )}
                </div>

                {hasCrew && (
                    <>
                        {/* Action Cards */}
                        <div className="px-4 mb-4 grid grid-cols-2 gap-4">
                            {/* Reservation Card */}
                            <button
                                onClick={onMakeReservationClick}
                                className="bg-[#FCD34D] dark:bg-[#FCD34D] aspect-square rounded-[20px] p-5 flex flex-col items-center justify-center text-zinc-900 dark:text-zinc-900 hover:brightness-110 transition-all shadow-sm gap-2"
                            >
                                <div className="w-12 h-12 rounded-full bg-white dark:bg-white flex items-center justify-center shadow-sm">
                                    <CheckSquareIcon className="w-6 h-6 text-zinc-900 dark:text-zinc-900" />
                                </div>
                                <span className="font-bold text-lg">예약하기</span>
                            </button>

                            {/* Upcoming Schedule Card - Commented out as requested
                            <button
                                onClick={onCheckScheduleClick}
                                className="bg-[#D6E6F5] aspect-square rounded-[20px] p-5 flex flex-col hover:brightness-95 transition-all shadow-sm overflow-hidden relative text-left"
                            >
                                <div className="text-zinc-500 font-bold text-sm mb-3 w-full">다가오는 일정</div>

                                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 w-full flex-1 flex flex-col justify-center gap-1 border-l-4 border-[#1E3A8A]">
                                    <div className="text-lg font-bold text-zinc-900">12월 30일</div>
                                    <div className="text-sm text-zinc-500 font-medium">예약 확정</div>
                                </div>
                            </button>
                            */}
                            {/* Guest Reservation Card */}
                            <button
                                onClick={onGuestReservationClick}
                                className="bg-[#D6E6F5] dark:bg-[#D6E6F5]/30 aspect-square rounded-[20px] p-5 flex flex-col items-center justify-center text-zinc-900 dark:text-zinc-100 hover:brightness-110 dark:hover:bg-[#D6E6F5]/40 transition-all shadow-sm gap-2"
                            >
                                <div className="w-12 h-12 rounded-full bg-white dark:bg-white/20 flex items-center justify-center shadow-sm">
                                    <UserPlus className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
                                </div>
                                <span className="font-bold text-lg">게스트 예약하기</span>
                            </button>
                        </div>

                        {/* Calendar Section */}
                        <div className="px-4 mb-8">
                            <div
                                onClick={onCalendarClick}
                                className="bg-[#F1E4D1] dark:bg-zinc-800 rounded-[20px] p-4 shadow-sm cursor-pointer hover:brightness-95 dark:hover:bg-zinc-700 transition-all"
                            >
                                <span className="font-bold text-zinc-500 dark:text-zinc-400 ml-2 text-sm block mb-2">나의 달력</span>
                                <Calendar
                                    month={(() => {
                                        const today = new Date();
                                        const monthNames = [
                                            "January", "February", "March", "April", "May", "June",
                                            "July", "August", "September", "October", "November", "December"
                                        ];
                                        return monthNames[today.getMonth()];
                                    })()}
                                    year={new Date().getFullYear()}
                                    startDayOfWeek={(() => {
                                        const today = new Date();
                                        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
                                        return firstDayOfMonth;
                                    })()}
                                    totalDays={(() => {
                                        const today = new Date();
                                        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                                        // Extend by 14 days to show next month's data if near end of month
                                        return daysInMonth + 14;
                                    })()}
                                    expandable={false}
                                    hideHeader={true}
                                    maxWeeks={2}
                                    compact={true}
                                    className="rounded-[20px] bg-transparent"
                                    startWeekIndex={(() => {
                                        const today = new Date();
                                        const todayDay = today.getDate();
                                        const firstDayOfWeek = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
                                        return Math.floor((todayDay + firstDayOfWeek - 1) / 7);
                                    })()}
                                    renderDay={(day) => {
                                        const today = new Date();
                                        const currentYear = today.getFullYear();
                                        const currentMonth = today.getMonth();
                                        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

                                        let targetYear = currentYear;
                                        let targetMonth = currentMonth;
                                        let displayDay = day;

                                        // Handle overflow to next month
                                        if (day > daysInMonth) {
                                            displayDay = day - daysInMonth;
                                            targetMonth = currentMonth + 1;
                                            if (targetMonth > 11) {
                                                targetMonth = 0;
                                                targetYear = currentYear + 1;
                                            }
                                        }

                                        const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(displayDay).padStart(2, '0')}`;
                                        const reservation = myReservations.find(r => r.date === dateStr);
                                        const isConfirmed = reservation?.status === 'confirmed';
                                        const isPending = reservation && reservation.status !== 'confirmed';

                                        // Base Container Classes
                                        const containerClasses = "w-full h-full flex flex-col items-center justify-start pt-1.5 transition-all duration-200 text-sm font-bold rounded-[10px]";

                                        // Content (Number or Circle)
                                        let numberElement = <span className="text-sm font-medium text-zinc-500 dark:text-zinc-300">{displayDay}</span>;

                                        if (isConfirmed || isPending) {
                                            const bg = isConfirmed ? 'bg-[#1E3A8A]' : 'bg-[#93C5FD]'; // 확정: 남색, 대기: 연한 남색
                                            const textColor = 'text-white';
                                            numberElement = (
                                                <div className={`w-8 h-8 -mt-1 rounded-full ${bg} ${textColor} flex items-center justify-center text-sm font-medium shadow-sm`}>
                                                    {displayDay}
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
                            </div>
                        </div>

                        {/* Weather Banner */}
                        <div className="w-full bg-gradient-to-r from-[#F8CACC] to-[#A0C4FF] min-h-[120px] flex items-center justify-between relative overflow-hidden">
                            {/* Background decoration */}
                            <div className="absolute left-2 bottom-[-1px] opacity-60">
                                <SnowflakeDecorIcon className="w-24 h-24 text-white" />
                            </div>
                            <div className="absolute left-22 top-2 opacity-40">
                                <SnowflakeDecorIcon className="w-12 h-12 text-white" />
                            </div>

                            <div className="z-10 pl-40 py-6">
                                <div className="font-bold text-lg text-white">휘닉스파크</div>
                                <div className="text-sm text-white/90">{currentDate}</div>
                                <div className="text-xs text-white/80 mt-1">{weather?.weatherLabel}</div>
                            </div>
                            <div className="z-10 pr-8 flex flex-col items-end">
                                <div className="text-5xl font-light text-white flex items-start">
                                    {weather ? Math.round(weather.temperature) : '--'}<span className="text-2xl align-top">°</span>
                                </div>
                                <div className="text-white mt-1">
                                    {/* Dynamic Icon based on weather code */}
                                    {(() => {
                                        if (!weather) return <Sun className="w-8 h-8" />;
                                        const code = weather.weatherCode;
                                        if (code === 0 || code === 1) return <Sun className="w-8 h-8" />;
                                        if (code === 2 || code === 3) return <Cloud className="w-8 h-8" />;
                                        if ([45, 48].includes(code)) return <Wind className="w-8 h-8" />;
                                        if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return <CloudRain className="w-8 h-8" />;
                                        if ([71, 73, 75, 77, 85, 86].includes(code)) return <CloudSnow className="w-8 h-8" />;
                                        if ([95, 96, 99].includes(code)) return <CloudLightning className="w-8 h-8" />;
                                        return <Sun className="w-8 h-8" />;
                                    })()}
                                </div>
                            </div>
                        </div>
                    </>
                )}


            </main >
        </div >
    );
}
