import { Button } from '../components/Button';
import { ChevronLeftIcon, ChevronRightIcon, Crown, UserPlusIcon, SettingsIcon } from 'lucide-react';
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

    console.log('CrewDetail rendered, isManager:', isManager);

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
        return <div className="flex-1 flex items-center justify-center h-full bg-white dark:bg-zinc-950">Loading...</div>;
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
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">
            {/* Header */}
            <header className="px-4 pt-2 pb-2 flex items-center justify-between relative">
                <Button variant="ghost" onClick={onBack} className="-ml-2 text-zinc-900 dark:text-zinc-100">
                    <ChevronLeftIcon className="w-6 h-6" />
                </Button>
                <h1 className="text-xl font-bold absolute left-1/2 -translate-x-1/2" style={{ fontFamily: '"Joti One", serif' }}>My Crew</h1>
                <div className="w-10" /> {/* Spacer for centering */}
            </header>

            <main className="flex-1 overflow-y-auto px-6 pt-4 pb-[120px] flex flex-col items-center">

                {/* Main Card */}
                <div className="w-full bg-[#FCD34D] dark:bg-[#FCD34D]/60 rounded-[30px] p-6 shadow-sm mb-6">
                    {/* Inner White Card */}
                    <div className="bg-white dark:bg-zinc-800 rounded-[20px] p-5 flex items-center gap-4 mb-6">
                        {/* Placeholder Icon */}
                        {crewInfo.profile_image_url ? (
                            <img src={crewInfo.profile_image_url} alt={crewInfo.name} className="w-16 h-16 rounded-full object-cover shrink-0" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-200 to-blue-200 dark:from-pink-600 dark:to-blue-600 flex items-center justify-center shrink-0">
                                {/* Fallback/Placeholder */}
                            </div>
                        )}

                        <div>
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{crewInfo.name}</h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">{crewInfo.univ}</p>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center justify-around px-2">
                        <div className="flex items-center gap-2">
                            <Crown className="w-5 h-5 text-zinc-800 dark:text-white" />
                            <span className="text-sm font-medium text-zinc-800 dark:text-white">{crewInfo.president_name}</span>
                        </div>
                        <button
                            onClick={onMemberClick}
                            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                        >
                            <UserPlusIcon className="w-5 h-5 text-zinc-800 dark:text-white" />
                            <span className="text-sm font-medium text-zinc-800 dark:text-white">부원수 : {crewInfo.member_count}명</span>
                        </button>
                    </div>

                    {/* Manager Settings Button */}
                    {isManager && (
                        <div className="mt-6 pt-6 border-t border-black/10 dark:border-white/20 flex justify-center">
                            <button
                                onClick={onSettingsClick}
                                className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-white/20 hover:bg-white/80 dark:hover:bg-white/30 rounded-full transition-colors"
                            >
                                <SettingsIcon className="w-4 h-4 text-zinc-800 dark:text-white" />
                                <span className="text-sm font-bold text-zinc-800 dark:text-white">크루 설정</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Season-only actions */}
                {seasonAvailable && (
                    <>
                        <button
                            onClick={onCalendarClick}
                            className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-[20px] p-5 flex items-center justify-between hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors mb-4"
                        >
                            <span className="font-bold text-zinc-600 dark:text-zinc-300">크루 달력</span>
                            <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                                <span className="text-sm font-medium">확인하기</span>
                                <ChevronRightIcon className="w-5 h-5" />
                            </div>
                        </button>

                        <button
                            onClick={() => setShowStats(true)}
                            className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-[20px] p-5 flex items-center justify-between hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors mb-auto"
                        >
                            <span className="font-bold text-zinc-600 dark:text-zinc-300">시즌방 사용 기록</span>
                            <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                                <span className="text-sm font-medium">확인하기</span>
                                <ChevronRightIcon className="w-5 h-5" />
                            </div>
                        </button>
                    </>
                )}

                {/* Footer Text */}
                {/* <div className="mb-8 text-center">
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                        나의 크루에 가입하고 다양한 정보를 확인하세요!
                    </p>
                </div> */}

            </main >
        </div >
    );
}
