import { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, UserIcon, Pencil, ExternalLink, Crown } from 'lucide-react';
import { Button } from '../components/Button';
import { Calendar } from '../components/Calendar';
import { getUserInfo, getMyReservations } from '../services/user';
import { UserDetail, MyReservation } from '../types/api';

interface MyPageProps {
    onBack: () => void;
    onAccountInfoClick?: () => void;
}

export default function MyPage({ onBack, onAccountInfoClick }: MyPageProps) {
    const [userInfo, setUserInfo] = useState<UserDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [reservations, setReservations] = useState<MyReservation[]>([]);
    const [usageCount, setUsageCount] = useState(0);
    const [showFullCalendar, setShowFullCalendar] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getUserInfo();
                setUserInfo(data);

                // Fetch reservations
                try {
                    const reservationsData = await getMyReservations();
                    setReservations(reservationsData);

                    // Calculate usage count (confirmed reservations)
                    const confirmedCount = reservationsData.filter(r => r.status === 'confirmed').length;
                    setUsageCount(confirmedCount);
                } catch (error) {
                    console.error('Failed to fetch reservations:', error);
                }
            } catch (error) {
                console.error('Failed to fetch user info:', error);
                alert('사용자 정보를 불러오는데 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-zinc-950">
                <div className="text-zinc-500">로딩 중...</div>
            </div>
        );
    }

    if (!userInfo) {
        return (
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-zinc-950">
                <div className="text-zinc-500">사용자 정보를 불러올 수 없습니다.</div>
            </div>
        );
    }

    // Get current month calendar data for Calendar component
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const currentMonthName = monthNames[currentMonth];


    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">
            {/* Header */}
            <header className="px-4 pt-2 pb-2 flex items-center justify-between relative">
                <Button variant="ghost" onClick={onBack} className="-ml-2 text-zinc-900 dark:text-zinc-100">
                    <ChevronLeftIcon className="w-6 h-6" />
                </Button>
                <h1 className="text-xl font-bold absolute left-1/2 -translate-x-1/2" style={{ fontFamily: '"Joti One", serif' }}>My Page</h1>
                <div className="w-10" /> {/* Spacer for centering */}
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto flex flex-col">
                {/* Profile Section */}
                <div className="p-6 pb-4">
                    <div className="flex flex-col items-center mb-6">
                        {/* Avatar with edit icon */}
                        <div className="relative mb-4">
                            <div className="w-20 h-20 rounded-2xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                                {userInfo.profileImageUrl ? (
                                    <img
                                        src={userInfo.profileImageUrl}
                                        alt={userInfo.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <UserIcon className="w-10 h-10 text-zinc-400" />
                                )}
                            </div>
                            <button className="absolute bottom-0 right-0 w-6 h-6 bg-zinc-700 rounded-full flex items-center justify-center">
                                <Pencil className="w-3.5 h-3.5 text-white" />
                            </button>
                        </div>

                        {/* Name with role icon */}
                        <div className="flex items-center gap-2 mb-2">
                            {userInfo.role === 'PRESIDENT' && (
                                <Crown className="w-5 h-5" strokeWidth={2.5} color="#162660" fill="#162660" />
                            )}
                            {(userInfo.role === 'MANAGER' || userInfo.role === 'ADMIN') && (
                                <Crown className="w-5 h-5" strokeWidth={2.5} color="#60A5FA" fill="#D0E6FD" />
                            )}
                            <h2 className="text-2xl font-bold">{userInfo.name}</h2>
                        </div>

                        {/* School / Crew Info */}
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-600 dark:text-zinc-400 text-sm">
                                {userInfo.school}
                                {userInfo.crew && ` / ${userInfo.crew.crewName}`}
                            </span>
                            <button className="w-4 h-4 flex items-center justify-center">
                                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Usage Count Section */}
                <div className="px-6 mb-4">
                    <div className="bg-[#EDF2FF] dark:bg-[#1E3A8A]/20 rounded-2xl p-4">
                        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            시즌방 이용 횟수: <span className="text-[#1E3A8A] dark:text-[#60A5FA]">{usageCount}박</span>
                        </div>
                    </div>
                </div>

                {/* My Calendar Dropdown Button */}
                <div className="px-6 mb-4">
                    <button
                        onClick={() => setShowFullCalendar(!showFullCalendar)}
                        className="w-full bg-zinc-100 rounded-[20px] p-5 flex items-center justify-between hover:bg-zinc-200 transition-colors"
                    >
                        <span className="font-bold text-zinc-600">나의 달력</span>
                        <div className="flex items-center gap-1 text-zinc-500">
                            <span className="text-sm font-medium">확인하기</span>
                            <ChevronRightIcon className={`w-5 h-5 transition-transform ${showFullCalendar ? 'rotate-90' : ''}`} />
                        </div>
                    </button>

                    {/* Calendar Dropdown - This Week and Next Week Only */}
                    {showFullCalendar && (
                        <div className="w-full mt-0 bg-zinc-100 rounded-[20px] p-4 shadow-sm">
                            <Calendar
                                month={currentMonthName}
                                year={currentYear}
                                startDayOfWeek={firstDayOfWeek}
                                totalDays={daysInMonth}
                                expandable={false}
                                hideHeader={true}
                                maxWeeks={2}
                                compact={true}
                                className="rounded-[20px]"
                                startWeekIndex={(() => {
                                    // Calculate which week contains today
                                    const todayDay = today.getDate();
                                    return Math.floor((todayDay + firstDayOfWeek - 1) / 7);
                                })()}
                                renderDay={(day) => {
                                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const reservation = reservations.find(r => r.date === dateStr);
                                    const isConfirmed = reservation?.status === 'confirmed';
                                    const isPending = reservation && reservation.status !== 'confirmed';

                                    // Base Container Classes
                                    const containerClasses = "w-full h-full flex flex-col items-center justify-start pt-1.5 transition-all duration-200 text-sm font-bold rounded-[10px]";

                                    // Content (Number or Circle)
                                    let numberElement = <span className="text-sm font-medium text-zinc-500">{day}</span>;

                                    if (isConfirmed || isPending) {
                                        const bg = isConfirmed ? 'bg-[#1E3A8A]' : 'bg-[#93C5FD]'; // 확정: 남색, 대기: 연한 남색
                                        const textColor = 'text-white';
                                        numberElement = (
                                            <div className={`w-8 h-8 -mt-1 rounded-full ${bg} ${textColor} flex items-center justify-center text-sm font-medium shadow-sm`}>
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
                        </div>
                    )}
                </div>

                {/* Account Info Menu */}
                {onAccountInfoClick && (
                    <div className="px-6 mb-4">
                        <button
                            onClick={onAccountInfoClick}
                            className="w-full bg-zinc-100 rounded-[20px] p-5 flex items-center justify-between hover:bg-zinc-200 transition-colors"
                        >
                            <span className="font-bold text-zinc-600">계정 관리</span>
                            <div className="flex items-center gap-1 text-zinc-500">
                                <span className="text-sm font-medium">확인하기</span>
                                <ChevronRightIcon className="w-5 h-5" />
                            </div>
                        </button>
                    </div>
                )}

                {/* Logout Button - Bottom */}
                <div className="mt-auto px-6 mb-24 flex justify-center">
                    <Button
                        variant="outline"
                        onClick={() => {
                            if (confirm('로그아웃 하시겠습니까?')) {
                                localStorage.removeItem('accessToken');
                                localStorage.removeItem('refreshToken');
                                window.location.href = '/';
                            }
                        }}
                        className="w-32 h-10 text-sm"
                    >
                        로그아웃
                    </Button>
                </div>
            </div>
        </div>
    );
}
