import { Button } from '../components/Button';
import { ChevronLeftIcon, ChevronRightIcon, Crown, GraduationCap, UsersRound, SettingsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCrewInfo, getCrewManagers } from '../services/crew';
import { getUserInfo } from '../services/user';
import { CrewDetail as CrewDetailType } from '../types/api';
import { isCrewManagerRole } from '../constants/crewRole';
import MemberStats from './MemberStats';


interface CrewDetailProps {
    onBack: () => void;
    onCalendarClick: () => void;
    onMemberClick: () => void;
    onSettingsClick: () => void;
    seasonAvailable: boolean;
}

export default function CrewDetail({ onBack, onCalendarClick, onMemberClick, onSettingsClick, seasonAvailable }: CrewDetailProps) {
    const [crewInfo, setCrewInfo] = useState<CrewDetailType | null>(null);
    const [loading, setLoading] = useState(true);
    const [isManager, setIsManager] = useState(false);
    const [showStats, setShowStats] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Get User Info
                const userData = await getUserInfo();

                // 2. Extract Crew Info from User Data
                if (userData.crew) {
                    const crewId = userData.crew.crewId;

                    // 3. Fetch Full Crew Details and Managers in parallel
                    const [crewData, managers] = await Promise.all([
                        getCrewInfo(crewId),
                        getCrewManagers(crewId)
                    ]);
                    setCrewInfo(crewData);

                    // 4. Check permissions
                    const currentUser = managers.find(m => m.user_id === userData.userId);
                    if (currentUser && isCrewManagerRole(currentUser.role)) {
                        setIsManager(true);
                    }
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

                    {/* Manager Settings Button */}
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

                    {/* Season-only actions */}
                    {seasonAvailable && (
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

                            <button
                                onClick={() => setShowStats(true)}
                                className="w-full bg-white border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-2xl p-5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <span className="font-bold text-zinc-600 dark:text-zinc-300">시즌방 사용 기록</span>
                                <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                                    <span className="text-sm font-medium">확인하기</span>
                                    <ChevronRightIcon className="w-5 h-5" />
                                </div>
                            </button>
                        </>
                    )}

                </div>
            </main>
        </div >
    );
}
