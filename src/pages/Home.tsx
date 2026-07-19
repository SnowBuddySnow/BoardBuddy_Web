import { useState, useEffect } from 'react';
import { getUserInfo } from '../services/user';
import { getCrewInfo, getMyApplications, withdrawCrewApplication } from '../services/crew';
import { listParties } from '../services/event';
import { listOrganizerGroups } from '../services/organizerGroup';
import { UserDetail, CrewDetail, MyApplication, Event } from '../types/api';
import { UserPlus, Sparkles, Users, Calendar as CalendarIcon, ChevronRight, Clock3, ShieldCheck, X, TentTree, CalendarHeart, CloudSun, LockKeyhole } from 'lucide-react';
import { getWeather, WeatherData } from '../services/weather';
import { getEventActivityLabel } from '../constants/eventActivity';
import { getOperatingSeason } from '../constants/operatingSeason';
import boardBuddyLogo from '../assets/boardbuddy-logo.png';

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
    onDashboardClick
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
    const upcomingParties = parties.filter(p => {
        const start = new Date(p.startsAt);
        const applicationStarted = !p.applicationStartsAt || new Date(p.applicationStartsAt) <= nowTime;
        return start > nowTime && applicationStarted && (p.joinedCount || 0) < p.capacity;
    }).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

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
            <main className="flex-1 overflow-y-auto pb-[110px] space-y-5">

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

                {hasCrew && (
                    <>
                        {isWinter && !seasonHouseUnavailable && (
                            <section className="px-4">
                                <button
                                    type="button"
                                    onClick={onMakeReservationClick}
                                    className="flex w-full items-center justify-between rounded-2xl border-0 bg-[#162660] p-4 text-left text-white shadow-sm transition-colors hover:bg-[#0f1b48]"
                                >
                                    <span className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                                            <CalendarIcon className="h-5 w-5 text-blue-100" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-black">시즌방 예약</span>
                                            <span className="mt-0.5 block truncate text-xs text-blue-100">예약 가능한 날짜와 현황을 확인하세요.</span>
                                        </span>
                                    </span>
                                    <ChevronRight className="h-5 w-5 shrink-0 text-blue-200" />
                                </button>
                            </section>
                        )}

                        <section className="space-y-2.5 px-4">
                            <div className="flex items-end justify-between gap-3">
                                <div>
                                    <p className="text-[11px] font-black text-[#162660]">CREW EVENTS</p>
                                    <h2 className="mt-0.5 text-base font-black text-zinc-900">지금 참여할 이벤트</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={onSeeAllPartiesClick}
                                    className="flex shrink-0 items-center gap-0.5 border-0 bg-transparent text-xs font-black text-[#162660]"
                                >
                                    참가 가능 {upcomingParties.length}개 <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            {upcomingParties.length > 0 ? (
                                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                                    {upcomingParties.slice(0, 3).map((event, index) => (
                                        <button
                                            key={event.id}
                                            type="button"
                                            onClick={() => onEventClick(event.id)}
                                            className={`flex w-full items-center gap-3 bg-white px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 ${
                                                index > 0 ? 'border-t border-zinc-100' : 'border-x-0 border-b-0 border-t-0'
                                            }`}
                                        >
                                            <span className="flex w-14 shrink-0 flex-col">
                                                <span className="text-[10px] font-black text-[#162660]">{getEventActivityLabel(event.activityType)}</span>
                                                <span className="mt-0.5 text-[11px] font-bold text-zinc-500">{formatEventDate(event.startsAt)}</span>
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-black text-zinc-900">{event.title}</span>
                                                <span className="mt-0.5 block truncate text-[11px] font-medium text-zinc-400">
                                                    {event.locationName || '참가자와 장소 협의'}
                                                </span>
                                            </span>
                                            <span className="shrink-0 text-xs font-black text-zinc-500">{event.joinedCount || 0}/{event.capacity}</span>
                                            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={onSeeAllPartiesClick}
                                    className="flex w-full items-center justify-between rounded-2xl border border-dashed border-zinc-300 bg-white/60 px-4 py-4 text-left"
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400"><Sparkles className="h-4 w-4" /></span>
                                        <span>
                                            <span className="block text-sm font-black text-zinc-700">현재 참가 가능한 이벤트가 없어요</span>
                                            <span className="mt-0.5 block text-xs text-zinc-400">전체 이벤트와 예정된 모집을 확인할 수 있어요.</span>
                                        </span>
                                    </span>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300" />
                                </button>
                            )}
                        </section>

                        {myPlansCount > 0 && (
                            <section className="px-4">
                                <button
                                    type="button"
                                    onClick={onMyPlansClick}
                                    className="flex w-full items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-left transition-colors hover:bg-blue-100"
                                >
                                    <span className="flex items-center gap-3">
                                        <CalendarHeart className="h-5 w-5 text-[#162660]" />
                                        <span>
                                            <span className="block text-sm font-black text-zinc-900">내 참여 일정</span>
                                            <span className="block text-xs font-medium text-zinc-500">예정된 이벤트 {myPlansCount}개</span>
                                        </span>
                                    </span>
                                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                                </button>
                            </section>
                        )}

                        {seasonHouseUnavailable && (
                            <section className="px-4">
                                <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
                                        <LockKeyhole className="h-4 w-4" />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-black text-zinc-800">현재 시즌방이 오픈되지 않았습니다.</span>
                                        <span className="mt-0.5 block text-xs font-medium text-zinc-400">오픈되면 홈에서 바로 예약할 수 있어요.</span>
                                    </span>
                                </div>
                            </section>
                        )}

                        {!seasonHouseUnavailable && (
                            <section className="px-4">
                                <h2 className="mb-2.5 text-xs font-black text-zinc-500">바로가기</h2>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { label: '내 예약', icon: CalendarIcon, action: onCalendarClick },
                                        { label: '게스트 예약', icon: UserPlus, action: onGuestReservationClick },
                                        { label: '내 크루', icon: Users, action: onTeamClick },
                                    ].map(({ label, icon: Icon, action }) => (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={action}
                                            className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-2 py-3 text-xs font-black text-zinc-700 transition-colors hover:bg-zinc-50"
                                        >
                                            <Icon className="h-5 w-5 text-[#162660]" />
                                            <span>{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        {isWinter && !seasonHouseUnavailable && (
                            <section className="px-4">
                                <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                                    <span className="flex items-center gap-3">
                                        <CloudSun className="h-5 w-5 text-sky-600" />
                                        <span>
                                            <span className="block text-xs font-black text-zinc-800">휘닉스파크</span>
                                            <span className="block text-[11px] text-zinc-400">{currentDate} · {weather?.weatherLabel || '날씨 확인 중'}</span>
                                        </span>
                                    </span>
                                    <span className="text-xl font-black text-zinc-800">{weather ? Math.round(weather.temperature) : '--'}°</span>
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
