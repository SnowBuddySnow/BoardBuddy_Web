import { Button } from '../components/Button';
import { ChevronLeftIcon, ChevronRightIcon, Crown, GraduationCap, UsersRound, SettingsIcon, Sparkles, Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCrewInfo } from '../services/crew';
import { getUserInfo } from '../services/user';
import { CrewDetail as CrewDetailType } from '../types/api';
import { isCrewManagerRole } from '../constants/crewRole';
import MemberStats from './MemberStats';
import { GuestInviteShareCard } from '../components/guest/GuestInviteShareCard';
import ManagerFeatureOnboarding from '../components/ManagerFeatureOnboarding';


interface CrewDetailProps {
    onBack: () => void;
    onCalendarClick: () => void;
    onMemberClick: () => void;
    onSettingsClick: () => void;
    onPassesClick?: () => void;
    onSeasonMatrixClick?: () => void;
    seasonAvailable: boolean;
}

export default function CrewDetail({ onBack, onCalendarClick, onMemberClick, onSettingsClick, onPassesClick, onSeasonMatrixClick, seasonAvailable }: CrewDetailProps) {
    const [crewInfo, setCrewInfo] = useState<CrewDetailType | null>(null);
    const [loading, setLoading] = useState(true);
    const [isManager, setIsManager] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [showFeatureOnboarding, setShowFeatureOnboarding] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Get User Info
                const userData = await getUserInfo();

                // 2. Extract Crew Info from User Data
                if (userData.crew) {
                    const crewId = userData.crew.crewId;

                    const crewData = await getCrewInfo(crewId);
                    setCrewInfo(crewData);
                    setIsManager(isCrewManagerRole(userData.role));
                } else {
                    console.warn('User does not belong to a crew.');
                }
            } catch (err: unknown) {
                console.error('Failed to fetch data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return <div className="flex-1 flex items-center justify-center h-full bg-[#FAF8F3] text-sm text-zinc-500 dark:bg-zinc-950">크루 정보를 불러오는 중...</div>;
    }

    if (!crewInfo) {
        // Fallback if no crew info found (e.g. user not in crew)
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full bg-white dark:bg-zinc-950">
                <p className="text-zinc-500">크루 정보를 찾을 수 없습니다.</p>
                <Button variant="ghost" onClick={onBack} className="mt-4">
                    돌아가기
                </Button>
            </div>
        );
    }

    if (showStats) {
        return <MemberStats crewId={crewInfo.crew_id} onBack={() => setShowStats(false)} />;
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FAF8F3] dark:bg-zinc-950">
            {/* Header */}
            <header className="px-4 py-3 flex items-center justify-between relative border-b border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                <Button variant="ghost" onClick={onBack} aria-label="뒤로 가기" className="-ml-2 text-zinc-900 dark:text-zinc-100">
                    <ChevronLeftIcon className="w-6 h-6" />
                </Button>
                <h1 className="text-lg font-black text-zinc-900 dark:text-zinc-100 absolute left-1/2 -translate-x-1/2">내 크루</h1>
                <div className="w-10" /> {/* Spacer for centering */}
            </header>

            <main className="flex-1 overflow-y-auto px-5 pt-6 pb-[120px] sm:px-8 sm:pt-8">
                <div className="mx-auto w-full max-w-3xl">

                    {/* Main Card */}
                    <section aria-labelledby="crew-name" className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="flex items-start gap-4 bg-[#162660] px-6 py-7 sm:gap-5 sm:px-8 sm:py-8">
                            {crewInfo.profile_image_url ? (
                                <img src={crewInfo.profile_image_url} alt="" className="h-16 w-16 shrink-0 rounded-2xl border border-white/20 object-cover sm:h-20 sm:w-20" />
                            ) : (
                                <div aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-3xl font-black text-white sm:h-20 sm:w-20 sm:text-4xl">
                                    {Array.from(crewInfo.name.trim())[0] || <UsersRound className="h-8 w-8" />}
                                </div>
                            )}

                            <div className="min-w-0 flex-1">
                                {crewInfo.univ && <p className="mb-2 flex items-start gap-1.5 text-xs font-semibold leading-5 text-blue-100">
                                    <GraduationCap className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span className="break-keep [overflow-wrap:anywhere]">{crewInfo.univ}</span>
                                </p>}
                                <h2 id="crew-name" className="break-keep text-2xl font-black leading-tight tracking-tight text-white [overflow-wrap:anywhere] sm:text-3xl">{crewInfo.name}</h2>
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 divide-x divide-zinc-100 dark:divide-zinc-800">
                            <div className="min-w-0 px-5 py-5 sm:px-8">
                                <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400"><Crown className="h-4 w-4" />크루장</p>
                                <p className="mt-2 break-keep text-base font-bold leading-6 text-zinc-900 [overflow-wrap:anywhere] dark:text-zinc-100">{crewInfo.president_name || '미지정'}</p>
                            </div>
                            <button
                                type="button"
                                onClick={onMemberClick}
                                aria-label={`멤버 ${crewInfo.member_count}명 보기`}
                                className="min-w-0 px-5 py-5 text-left transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#162660] dark:hover:bg-zinc-800 sm:px-8"
                            >
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400"><UsersRound className="h-4 w-4" />멤버</span>
                                <span className="mt-2 flex items-center justify-between gap-2 text-zinc-900 dark:text-zinc-100">
                                    <span className="text-xl font-black leading-6 tabular-nums">{crewInfo.member_count}<span className="ml-1 text-sm font-semibold">명</span></span>
                                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-zinc-400" />
                                </span>
                            </button>
                        </div>
                    </section>

                    {/* Manager Feature Onboarding Demo Button */}
                    {isManager && (
                        <button
                            type="button"
                            onClick={() => setShowFeatureOnboarding(true)}
                            className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-[#162660]/20 bg-[#162660] px-5 py-4 text-left text-white shadow-sm transition-colors hover:bg-[#0f1b48] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#162660]"
                        >
                            <span className="flex min-w-0 items-start gap-3">
                                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                                    <Sparkles className="h-5 w-5 text-amber-200" />
                                </span>
                                <span className="min-w-0">
                                    <span className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-black">운영진 기능 온보딩 체험하기</span>
                                        <span className="rounded-full bg-amber-300/20 px-2 py-0.5 text-[10px] font-black text-amber-200">
                                            체험
                                        </span>
                                    </span>
                                    <span className="mt-1 block text-xs leading-5 text-blue-100">
                                        시즌방 이용 매트릭스 · 자동 오픈 · 취소 잠금 · 이중 정산 · 게스트 · 비공개 메모
                                    </span>
                                </span>
                            </span>
                            <ChevronRightIcon className="h-5 w-5 shrink-0 text-blue-200" />
                        </button>
                    )}

                    {/* Manager Settings Button */}
                    {isManager && onPassesClick && <button type="button" onClick={onPassesClick} className="mt-4 flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-left text-sm font-bold text-[#162660]"><span className="flex items-center gap-3"><Ticket className="h-5 w-5" />이용권 관리</span><ChevronRightIcon className="h-4 w-4 text-zinc-400" /></button>}
                    {isManager && (
                        <button
                            type="button"
                            onClick={onSettingsClick}
                            className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                        >
                            <span className="flex items-center gap-3"><SettingsIcon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" /><span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">크루 설정</span></span>
                            <ChevronRightIcon className="h-4 w-4 text-zinc-400" />
                        </button>
                    )}

                    {/* Calendar remains readable while new reservations are held. */}
                    {(
                        <>
                            <button
                                onClick={onCalendarClick}
                                className="mt-4 w-full bg-white border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl p-5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors mb-4"
                            >
                                <span className="font-bold text-zinc-600 dark:text-zinc-300">크루 달력</span>
                                <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                                    <span className="text-sm font-medium">확인하기</span>
                                    <ChevronRightIcon className="w-5 h-5" />
                                </div>
                            </button>

                            {seasonAvailable && <button
                                onClick={() => setShowStats(true)}
                                className="w-full bg-white border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl p-5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <span className="font-bold text-zinc-600 dark:text-zinc-300">시즌방 사용 기록</span>
                                <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                                    <span className="text-sm font-medium">확인하기</span>
                                    <ChevronRightIcon className="w-5 h-5" />
                                </div>
                            </button>}

                            {seasonAvailable && crewInfo.seasonHouseGuestEnabled !== false && (
                                <GuestInviteShareCard
                                    className="mt-4"
                                    destination={{ type: 'SEASON', id: crewInfo.crew_id }}
                                    title="시즌방 게스트 초대 링크"
                                    description="링크를 보내거나 QR을 보여주면 게스트 예약 화면으로 바로 연결돼요."
                                    shareTitle={`${crewInfo.name} 시즌방 게스트 초대`}
                                    shareText={`${crewInfo.name} 시즌방 게스트 초대 링크입니다.`}
                                />
                            )}
                        </>
                    )}

                </div>
            </main>

            {isManager && (
                <ManagerFeatureOnboarding
                    open={showFeatureOnboarding}
                    crewName={crewInfo.name}
                    onClose={() => setShowFeatureOnboarding(false)}
                    onOpenMatrix={onSeasonMatrixClick}
                />
            )}
        </div >
    );
}
