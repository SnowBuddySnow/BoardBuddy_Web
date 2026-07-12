import { useState, useEffect } from 'react';
import { getUserInfo } from '../services/user';
import { getCrewInfo, getMyApplications, withdrawCrewApplication } from '../services/crew';
import { listParties } from '../services/event';
import { listOrganizerGroups } from '../services/organizerGroup';
import { UserDetail, CrewDetail, MyApplication, Event } from '../types/api';
import { Bus, Mountain, UserPlus, Sparkles, MapPin, Users, Calendar as CalendarIcon, ChevronRight, LayoutTemplate, Clock3, ShieldCheck, X, TentTree, CalendarHeart } from 'lucide-react';
import { getWeather, WeatherData } from '../services/weather';
import { PlanningModeBadge } from '../components/event/PlanningModeBadge';
import { getEventActivityLabel } from '../constants/eventActivity';
import { getOperatingSeason } from '../constants/operatingSeason';
import boardBuddyLogo from '../assets/boardbuddy-logo.png';

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
    onCreateCrewClick: () => void;
    hasCrew?: boolean;
    onJoinCrew?: () => void;
    onEventClick: (eventId: number) => void;
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
    onCreateCrewClick,
    hasCrew: initialHasCrew = true,
    onEventClick,
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
    const [applicationToWithdraw, setApplicationToWithdraw] = useState<MyApplication | null>(null);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawError, setWithdrawError] = useState('');

    // Small gathering related states
    const [parties, setParties] = useState<Event[]>([]);
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

        const fetchEventData = async () => {
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
        fetchEventData();

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
    const formatEventDate = (dateStr: string) => {
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
    const featuredEvent = upcomingParties[0];
    const isWinter = getOperatingSeason() === 'WINTER';
    const seasonHouseUnavailable = crewDetail?.seasonHouseActive === false;

    // Plans user has joined or has pending
    const myPlansCount = parties.filter(p => p.currentUserStatus === 'JOINED' || p.currentUserStatus === 'PENDING').length;
    const pendingApplication = myApplications.find(app => app.status === 'PENDING');

    const formatApplicationDate = (date: string) => new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date(date));

    const handleWithdrawApplication = async () => {
        if (!applicationToWithdraw) return;
        setIsWithdrawing(true);
        setWithdrawError('');
        try {
            await withdrawCrewApplication(applicationToWithdraw.application_id);
            setMyApplications(current => current.filter(app => app.application_id !== applicationToWithdraw.application_id));
            setApplicationToWithdraw(null);
        } catch (error) {
            console.error('Failed to withdraw crew application', error);
            setWithdrawError('신청을 철회하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setIsWithdrawing(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FAF8F3] relative">
            {/* Header */}
            <header className="px-4 pt-4 pb-3 flex items-center justify-between z-10 bg-[#FAF8F3] lg:hidden">
                <div className="flex h-8 w-32 items-center">
                    <img src={boardBuddyLogo} alt="BoardBuddy" className="h-full w-full object-cover object-center" />
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
                {(hasCrew && userInfo?.crew || pendingApplication) && (
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
                    ) : pendingApplication ? (
                        <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
                            <div className="bg-gradient-to-br from-[#162660] to-[#273c83] px-5 py-5 text-white">
                                <div className="mb-4 flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-black text-blue-100">
                                        <Clock3 className="h-3.5 w-3.5" /> 승인 대기 중
                                    </span>
                                    <span className="text-[11px] font-semibold text-blue-200">{formatApplicationDate(pendingApplication.created_at)} 신청</span>
                                </div>
                                <p className="text-xs font-bold text-blue-200">가입을 기다리는 크루</p>
                                <h2 className="mt-1 text-xl font-black tracking-tight">{pendingApplication.crew_name}</h2>
                                <p className="mt-2 text-xs leading-5 text-blue-100">크루 운영진이 신청을 확인하고 있어요. 승인되면 크루 예약과 파티 기능을 이용할 수 있습니다.</p>
                            </div>
                            <div className="flex items-center justify-between gap-4 px-5 py-4">
                                <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-zinc-500">
                                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                                    <span>결과는 승인 후 바로 반영됩니다.</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setApplicationToWithdraw(pendingApplication)}
                                    className="shrink-0 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                >
                                    신청 철회
                                </button>
                            </div>
                        </div>
                    ) : null}
                    </div>
                )}

                {!hasCrew && !pendingApplication && (
                    <section className="px-4">
                        <div className="mb-3">
                            <h2 className="text-base font-black text-zinc-900">시작하기</h2>
                            <p className="mt-0.5 text-xs font-medium text-zinc-500">내게 맞는 방식으로 지금 바로 이용해 보세요.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={onSearchClick} className="col-span-2 flex min-h-[152px] items-center justify-between overflow-hidden rounded-3xl bg-[#162660] p-6 text-left text-white shadow-sm transition-transform hover:bg-[#0f1b48] active:scale-[0.99]">
                                <span>
                                    <span className="mb-3 flex h-11 w-11 -rotate-6 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-sm"><Sparkles className="h-5 w-5 text-amber-200" /></span>
                                    <span className="block text-base font-black">크루 가입하기</span>
                                    <span className="mt-1.5 block text-xs font-medium text-blue-100">크루를 찾아 PIN으로 가입 신청하세요.</span>
                                </span>
                                <span className="flex h-11 w-11 rotate-6 items-center justify-center rounded-full bg-white/10"><ChevronRight className="h-5 w-5 text-blue-100" /></span>
                            </button>
                            <button type="button" onClick={onCreateCrewClick} className="min-h-[164px] rounded-3xl border border-sky-100 bg-sky-50 p-5 text-left transition-colors hover:bg-sky-100 active:scale-[0.99]">
                                <span className="mb-4 flex h-11 w-11 rotate-3 items-center justify-center rounded-2xl border border-sky-100 bg-white text-sky-700 shadow-sm"><TentTree className="h-5 w-5" /></span>
                                <span className="block text-base font-black text-zinc-900">크루 만들기</span>
                                <span className="mt-1.5 block text-xs leading-4 font-medium text-zinc-500">새 크루를 등록하고 운영을 시작하세요.</span>
                            </button>
                            <button type="button" onClick={onGuestReservationClick} className="min-h-[164px] rounded-3xl border border-rose-100 bg-rose-50 p-5 text-left transition-colors hover:bg-rose-100 active:scale-[0.99]">
                                <span className="mb-4 flex h-11 w-11 -rotate-3 items-center justify-center rounded-2xl border border-rose-100 bg-white text-rose-500 shadow-sm"><CalendarHeart className="h-5 w-5" /></span>
                                <span className="block text-base font-black text-zinc-900">게스트 예약하기</span>
                                <span className="mt-1.5 block text-xs leading-4 font-medium text-zinc-500">크루 가입 전에도 게스트로 예약할 수 있어요.</span>
                            </button>
                        </div>
                    </section>
                )}

                {applicationToWithdraw && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/45 p-4 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="withdraw-title">
                        <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black text-red-600">가입 신청 철회</p>
                                    <h2 id="withdraw-title" className="mt-1 text-lg font-black text-zinc-900">{applicationToWithdraw.crew_name} 신청을 철회할까요?</h2>
                                </div>
                                <button type="button" onClick={() => setApplicationToWithdraw(null)} disabled={isWithdrawing} className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100" aria-label="닫기">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-zinc-500">철회하면 승인 대기 목록에서 사라집니다. 다시 가입하려면 크루를 검색하고 PIN을 입력해 새로 신청해야 해요.</p>
                            {withdrawError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{withdrawError}</p>}
                            <div className="mt-5 flex gap-2">
                                <button type="button" onClick={() => setApplicationToWithdraw(null)} disabled={isWithdrawing} className="flex-1 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-black text-zinc-700 hover:bg-zinc-200 disabled:opacity-50">계속 기다리기</button>
                                <button type="button" onClick={handleWithdrawApplication} disabled={isWithdrawing} className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50">
                                    {isWithdrawing ? '철회 중...' : '신청 철회하기'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {isWinter && hasCrew && !seasonHouseUnavailable && (
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

                {hasCrew && seasonHouseUnavailable && (
                    <section className="px-4">
                        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-center text-sm font-bold text-zinc-500 shadow-sm">
                            현재 시즌방이 오픈되지 않았습니다.
                        </div>
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
                {featuredEvent ? (
                    <section className="px-4 space-y-2.5">
                        <h2 className="text-base font-black text-zinc-900 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" /> 지금 참가할 크루 이벤트
                        </h2>
                        <div
                            onClick={() => onEventClick(featuredEvent.id)}
                            className="bg-white border border-zinc-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer flex flex-col justify-between min-h-[180px]"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-black px-2.5 py-0.5 bg-amber-50 border border-amber-100 text-amber-800 rounded">
                                            {getEventActivityLabel(featuredEvent.activityType)}
                                        </span>
                                        <PlanningModeBadge mode={featuredEvent.planningMode} />
                                    </div>
                                    {featuredEvent.organizerGroupName && (
                                        <span className="text-xs text-zinc-400 font-semibold">
                                            주최 {featuredEvent.organizerGroupName}
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-lg font-bold text-zinc-900 mb-3 leading-snug">
                                    {featuredEvent.title}
                                </h3>

                                <div className="space-y-1.5 text-xs text-zinc-500 mb-3 font-semibold">
                                    <div className="flex items-center gap-1.5">
                                        <CalendarIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                                        <span>{formatEventDate(featuredEvent.startsAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                                        <span className="truncate">{featuredEvent.locationName || '참가 멤버와 추후 협의'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-zinc-50 pt-3.5 mt-1">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-600">
                                    <Users className="w-4 h-4 text-zinc-400" />
                                    <span>
                                        {featuredEvent.joinedCount || 0}/{featuredEvent.capacity}명 참여
                                    </span>
                                </div>
                                <span className="bg-[#162660] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm hover:bg-blue-900 transition-colors">
                                    자세히 보기
                                </span>
                            </div>
                        </div>
                    </section>
                ) : hasCrew && !pendingApplication ? (
                    <section className="px-4">
                        <div className="bg-white border border-zinc-100 rounded-3xl p-8 text-center text-zinc-400 text-sm">
                            현재 열려 있는 크루 이벤트가 없습니다.
                        </div>
                    </section>
                ) : null}

                {/* 3. This Week Timeline */}
                {thisWeekParties.length > 0 && (
                    <section className="px-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-black text-zinc-900">이번 주 이벤트</h2>
                        </div>
                        <div className="space-y-3">
                            {thisWeekParties.slice(0, 3).map(event => (
                                <div
                                    key={event.id}
                                    onClick={() => onEventClick(event.id)}
                                    className="bg-white border border-zinc-50 rounded-2xl p-4 flex items-center justify-between hover:shadow-sm transition-all active:scale-[0.99] cursor-pointer"
                                >
                                    <div className="space-y-1 pr-4">
                                        <PlanningModeBadge mode={event.planningMode} />
                                        <h3 className="text-sm font-bold text-zinc-900 truncate max-w-[200px]">{event.title}</h3>
                                        <div className="flex items-center gap-2 text-xs text-zinc-400 font-semibold">
                                            <span>{formatEventDate(event.startsAt)}</span>
                                            <span>•</span>
                                            <span className="truncate max-w-[100px]">{event.locationName || '추후 협의'}</span>
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
                            {upcomingParties.slice(0, 5).map(event => (
                                <div
                                    key={event.id}
                                    onClick={() => onEventClick(event.id)}
                                    className="bg-white border border-zinc-100 rounded-2xl p-4.5 hover:shadow-sm transition-all active:scale-[0.99] cursor-pointer flex flex-col justify-between"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-bold text-zinc-900 leading-tight">
                                                {event.title}
                                            </h3>
                                            <div className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                                                {getEventActivityLabel(event.activityType)} · 주최 {event.organizerGroupName}
                                            </div>
                                        </div>
                                        <span className="text-xs text-zinc-500 font-bold shrink-0">
                                            {event.joinedCount || 0}/{event.capacity}명
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Legacy Actions / Reservations (Kept at the bottom as optional helper entry points) */}
                {hasCrew && !seasonHouseUnavailable && (
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
