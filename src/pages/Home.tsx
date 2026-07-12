import { useState, useEffect } from 'react';
import { getUserInfo } from '../services/user';
import { getCrewInfo, getMyApplications } from '../services/crew';
import { listParties } from '../services/party';
import { listOrganizerGroups } from '../services/organizerGroup';
import { UserDetail, CrewDetail, MyApplication, Party } from '../types/api';
import { Bus, Mountain, UserPlus, Sparkles, MapPin, Users, Calendar as CalendarIcon, ChevronRight, LayoutTemplate } from 'lucide-react';
import { getWeather, WeatherData } from '../services/weather';
import { PlanningModeBadge } from '../components/party/PlanningModeBadge';
import { getPartyActivityLabel } from '../constants/partyActivity';
import { getOperatingSeason } from '../constants/operatingSeason';

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
    onCalendarClick: () => void;
    onTeamClick: () => void;
    onSearchClick: () => void;
    hasCrew?: boolean;
    onJoinCrew?: () => void;
    onPartyClick: (partyId: number) => void;
    onSeeAllPartiesClick: () => void;
    onMyPlansClick: () => void;
    onDashboardClick: () => void;
    onConceptsClick: () => void;
}

export default function Home({
    onMakeReservationClick,
    onGuestReservationClick,
    onCalendarClick,
    onTeamClick,
    onSearchClick,
    hasCrew: initialHasCrew = true,
    onPartyClick,
    onSeeAllPartiesClick,
    onMyPlansClick,
    onDashboardClick,
    onConceptsClick
}: HomeProps) {
    const [userInfo, setUserInfo] = useState<UserDetail | null>(null);
    const [crewDetail, setCrewDetail] = useState<CrewDetail | null>(null);
    const [myApplications, setMyApplications] = useState<MyApplication[]>([]);
    const [hasCrew, setHasCrew] = useState(initialHasCrew);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [currentDate, setCurrentDate] = useState<string>('');

    // Small gathering related states
    const [parties, setParties] = useState<Party[]>([]);
    const [hasOrganizerPermission, setHasOrganizerPermission] = useState(false);

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
                    try {
                        const apps = await getMyApplications();
                        setMyApplications(apps);
                    } catch (e) {
                        console.error("Failed to fetch applications", e);
                    }
                }

                // Fetch Reservations
                // (Removed unused myReservations fetch)

            } catch (err) {
                console.error("Failed to fetch user info", err);
            }
        };

        const fetchPartyData = async () => {
            try {
                // Fetch public small gatherings
                const partiesList = await listParties();
                // Show only OPEN parties in recommended lists
                const openParties = partiesList.filter(p => p.status === 'OPEN');
                setParties(openParties);

                // Fetch organizer groups to verify create permissions
                const groups = await listOrganizerGroups();
                setHasOrganizerPermission(groups.length > 0);
            } catch (err) {
                console.error("Failed to fetch small gathering data for home screen", err);
            }
        };

        fetchData();
        fetchPartyData();

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

    // Helper to format small gathering date
    const formatPartyDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const month = d.getMonth() + 1;
        const date = d.getDate();
        const hour = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${month}/${date} ${hour}:${min}`;
    };

    // Filter logic for sections
    const nowTime = new Date();
    const oneWeekLater = new Date(nowTime.getTime() + 7 * 24 * 60 * 60 * 1000);

    const thisWeekParties = parties.filter(p => {
        const start = new Date(p.startsAt);
        return start >= nowTime && start <= oneWeekLater;
    });

    const upcomingParties = parties.filter(p => {
        const start = new Date(p.startsAt);
        return start > nowTime;
    }).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    // Nearest upcoming open small gathering serves as the featured item.
    const featuredParty = upcomingParties[0];
    const isWinter = getOperatingSeason() === 'WINTER';

    // Plans user has joined or has pending
    const myPlansCount = parties.filter(p => p.currentUserStatus === 'JOINED' || p.currentUserStatus === 'PENDING').length;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FAF8F3] relative">
            {/* Header */}
            <header className="px-4 pt-4 pb-3 flex items-center justify-between z-10 bg-[#FAF8F3] lg:hidden">
                <div className="flex items-center gap-2">
                    <h1 className="text-[20px] font-black italic text-zinc-900 font-['Joti_One']">BoardBuddy</h1>
                </div>
                {hasOrganizerPermission && (
                    <button
                        onClick={onDashboardClick}
                        className="text-xs font-black bg-[#162660] text-white px-3 py-1.5 rounded-full hover:bg-blue-900 transition-colors shadow-sm flex items-center gap-1"
                    >
                        <Sparkles className="w-3 h-3" /> 운영 센터
                    </button>
                )}
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto pb-[110px] space-y-6">

                {/* Team Info / Host Metadata (De-emphasized compact row) */}
                <div className="px-4">
                    {hasCrew && userInfo?.crew ? (
                        <div className="bg-white/80 border border-zinc-100 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-zinc-400">{crewDetail?.univ || userInfo.school}</span>
                                <span className="h-3 w-px bg-zinc-200"></span>
                                <span onClick={onTeamClick} className="font-black text-zinc-700 hover:text-[#162660] cursor-pointer flex items-center gap-0.5">
                                    {userInfo.crew.crewName} <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                                </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <a href="https://skibus.purplebus.co.kr/Pp/" target="_blank" rel="noopener noreferrer" className="p-1 text-zinc-500 hover:text-[#162660]" aria-label="Bus">
                                    <Bus className="w-4 h-4" />
                                </a>
                                <a href="https://phoenixhnr.co.kr/m/static/pyeongchang/snowpark/slope-lift" target="_blank" rel="noopener noreferrer" className="p-1 text-zinc-500 hover:text-[#162660]" aria-label="Slope">
                                    <Mountain className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    ) : myApplications.some(app => app.status === 'PENDING') ? (
                        <div className="bg-white/80 border border-zinc-100 rounded-2xl px-4 py-2.5 text-xs font-semibold text-zinc-500 shadow-sm text-center">
                            {myApplications.find(app => app.status === 'PENDING')?.crew_name} 가입 대기 중 (승인 대기)
                        </div>
                    ) : (
                        <div
                            onClick={onSearchClick}
                            className="bg-white/80 border border-zinc-100 rounded-2xl px-4 py-2.5 text-xs font-bold text-zinc-400 shadow-sm text-center cursor-pointer hover:bg-white"
                        >
                            크루 가입하러 가기
                        </div>
                    )}
                </div>

                {isWinter && hasCrew && (
                    <section className="px-4">
                        <button
                            onClick={onMakeReservationClick}
                            className="w-full border-0 bg-[#162660] p-4 text-left text-white shadow-sm transition-colors hover:bg-[#0f1b48] cursor-pointer rounded-2xl"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                                        <CalendarIcon className="h-5 w-5 text-blue-100" />
                                    </span>
                                    <span>
                                        <span className="block text-sm font-black">겨울 예약</span>
                                        <span className="mt-0.5 block text-xs text-blue-100">예약하기와 내 예약 현황을 확인합니다.</span>
                                    </span>
                                </div>
                                <ChevronRight className="h-5 w-5 text-blue-200" />
                            </div>
                        </button>
                    </section>
                )}

                {/* 1. My Plans Shortcut Card */}
                {myPlansCount > 0 && (
                    <div className="px-4">
                        <button
                            onClick={onMyPlansClick}
                            className="w-full bg-[#162660] text-white rounded-3xl p-4.5 flex items-center justify-between shadow-md hover:bg-blue-900 transition-all active:scale-[0.99] border-none"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-2xl">
                                    <CalendarIcon className="w-5 h-5 text-blue-200" />
                                </div>
                                <div className="text-left">
                                    <h4 className="text-sm font-bold">내가 참가한 모임</h4>
                                    <p className="text-xs text-blue-200 mt-0.5">{myPlansCount}개의 참여 예정인 소모임 일정이 있습니다.</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-blue-300" />
                        </button>
                    </div>
                )}

                <section className="px-4">
                    <button
                        onClick={onConceptsClick}
                        className="w-full bg-white border border-zinc-100 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all active:scale-[0.99] text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-700">
                                <LayoutTemplate className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-zinc-900">소모임 옵션 샘플 보기</h4>
                                <p className="text-xs text-zinc-500 mt-0.5">테스터 리뷰용 3가지 더미 화면</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-300" />
                    </button>
                </section>

                {/* 2. Featured Small Gathering (Hero Card) */}
                {featuredParty ? (
                    <section className="px-4 space-y-2.5">
                        <h2 className="text-base font-black text-zinc-900 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" /> 지금 참가할 소모임
                        </h2>
                        <div
                            onClick={() => onPartyClick(featuredParty.id)}
                            className="bg-white border border-zinc-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer flex flex-col justify-between min-h-[180px]"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-black px-2.5 py-0.5 bg-amber-50 border border-amber-100 text-amber-800 rounded">
                                            {getPartyActivityLabel(featuredParty.activityType)}
                                        </span>
                                        <PlanningModeBadge mode={featuredParty.planningMode} />
                                    </div>
                                    {featuredParty.organizerGroupName && (
                                        <span className="text-xs text-zinc-400 font-semibold">
                                            주최 {featuredParty.organizerGroupName}
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-lg font-bold text-zinc-900 mb-3 leading-snug">
                                    {featuredParty.title}
                                </h3>

                                <div className="space-y-1.5 text-xs text-zinc-500 mb-3 font-semibold">
                                    <div className="flex items-center gap-1.5">
                                        <CalendarIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                                        <span>{formatPartyDate(featuredParty.startsAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                                        <span className="truncate">{featuredParty.locationName || '참가 멤버와 추후 협의'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-zinc-50 pt-3.5 mt-1">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-600">
                                    <Users className="w-4 h-4 text-zinc-400" />
                                    <span>
                                        {featuredParty.joinedCount || 0}/{featuredParty.capacity}명 참여
                                    </span>
                                </div>
                                <span className="bg-[#162660] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm hover:bg-blue-900 transition-colors">
                                    자세히 보기
                                </span>
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="px-4">
                        <div className="bg-white border border-zinc-100 rounded-3xl p-8 text-center text-zinc-400 text-sm">
                            현재 열려 있는 소모임이 없습니다.
                        </div>
                    </section>
                )}

                {/* 3. This Week Timeline */}
                {thisWeekParties.length > 0 && (
                    <section className="px-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-black text-zinc-900">이번 주 모임</h2>
                        </div>
                        <div className="space-y-3">
                            {thisWeekParties.slice(0, 3).map(party => (
                                <div
                                    key={party.id}
                                    onClick={() => onPartyClick(party.id)}
                                    className="bg-white border border-zinc-50 rounded-2xl p-4 flex items-center justify-between hover:shadow-sm transition-all active:scale-[0.99] cursor-pointer"
                                >
                                    <div className="space-y-1 pr-4">
                                        <PlanningModeBadge mode={party.planningMode} />
                                        <h3 className="text-sm font-bold text-zinc-900 truncate max-w-[200px]">{party.title}</h3>
                                        <div className="flex items-center gap-2 text-xs text-zinc-400 font-semibold">
                                            <span>{formatPartyDate(party.startsAt)}</span>
                                            <span>•</span>
                                            <span className="truncate max-w-[100px]">{party.locationName || '추후 협의'}</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 4. Upcoming / All joinable parties */}
                {upcomingParties.length > 0 && (
                    <section className="px-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-black text-zinc-900">다가오는 액티비티</h2>
                            <button
                                onClick={onSeeAllPartiesClick}
                                className="text-xs font-bold text-[#162660] hover:underline flex items-center gap-0.5 bg-transparent border-none"
                            >
                                전체 보기 <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {upcomingParties.slice(0, 5).map(party => (
                                <div
                                    key={party.id}
                                    onClick={() => onPartyClick(party.id)}
                                    className="bg-white border border-zinc-100 rounded-2xl p-4.5 hover:shadow-sm transition-all active:scale-[0.99] cursor-pointer flex flex-col justify-between"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-bold text-zinc-900 leading-tight">
                                                {party.title}
                                            </h3>
                                            <div className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                                                {getPartyActivityLabel(party.activityType)} · 주최 {party.organizerGroupName}
                                            </div>
                                        </div>
                                        <span className="text-xs text-zinc-500 font-bold shrink-0">
                                            {party.joinedCount || 0}/{party.capacity}명
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Legacy Actions / Reservations (Kept at the bottom as optional helper entry points) */}
                {hasCrew && (
                    <section className="px-4 space-y-3 pt-4 border-t border-zinc-100">
                        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">시즌방/일반 예약 (겨울)</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={onMakeReservationClick}
                                className="bg-[#FAF0D7]/65 hover:bg-[#FAF0D7] aspect-square rounded-[20px] p-4.5 flex flex-col items-center justify-center text-zinc-900 transition-all shadow-sm border-none gap-2"
                            >
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                    <CalendarIcon className="w-5 h-5 text-amber-800" />
                                </div>
                                <span className="font-bold text-sm">크루 예약하기</span>
                            </button>

                            <button
                                onClick={onGuestReservationClick}
                                className="bg-[#D6E6F5]/50 hover:bg-[#D6E6F5]/70 aspect-square rounded-[20px] p-4.5 flex flex-col items-center justify-center text-zinc-900 transition-all shadow-sm border-none gap-2"
                            >
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                    <UserPlus className="w-5 h-5 text-blue-800" />
                                </div>
                                <span className="font-bold text-sm">게스트 예약</span>
                            </button>
                        </div>

                        {/* Calendar */}
                        <div
                            onClick={onCalendarClick}
                            className="bg-[#FAF8F3] border border-zinc-200/50 rounded-[20px] p-4 shadow-sm cursor-pointer hover:bg-white transition-all text-left"
                        >
                            <span className="font-bold text-zinc-500 ml-2 text-xs block mb-1">나의 예약 달력</span>
                            <div className="text-sm font-bold text-zinc-800 ml-2">확인하러 가기 &gt;</div>
                        </div>

                        {/* Weather Banner */}
                        <div className="w-full bg-gradient-to-r from-[#F8CACC] to-[#A0C4FF] min-h-[100px] rounded-[20px] flex items-center justify-between relative overflow-hidden mt-4 shadow-sm">
                            <div className="absolute left-2 bottom-[-1px] opacity-40">
                                <SnowflakeDecorIcon className="w-20 h-20 text-white" />
                            </div>
                            <div className="z-10 pl-24 py-4 text-left">
                                <div className="font-bold text-sm text-white">휘닉스파크 날씨</div>
                                <div className="text-[10px] text-white/90">{currentDate}</div>
                                <div className="text-[10px] text-white/80 mt-0.5">{weather?.weatherLabel}</div>
                            </div>
                            <div className="z-10 pr-6 flex flex-col items-end">
                                <div className="text-3xl font-light text-white flex items-start">
                                    {weather ? Math.round(weather.temperature) : '--'}<span className="text-lg">°</span>
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
