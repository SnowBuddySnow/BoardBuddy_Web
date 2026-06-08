import { Button } from '../components/Button';
import { ChevronLeftIcon, XIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getUserInfo } from '../services/user';
import { applyToCrew } from '../services/crew';

interface SearchCrewProps {
    onBack: () => void;
}

export default function SearchCrew({ onBack }: SearchCrewProps) {
    const [recommendedCrews, setRecommendedCrews] = useState<{ id: number; university: string; crewName: string; }[]>([]);

    // Modal State
    const [selectedCrew, setSelectedCrew] = useState<{ id: number; university: string; crewName: string; } | null>(null);
    const [pin, setPin] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    //in Korean Alphabetical Order of University
    const allCrews = [
        { id: 1, university: '숙명여자대학교', crewName: 'Snowholic' },
        { id: 7, university: '세종대학교', crewName: 'Jump' },
        { id: 8, university: '충남대학교', crewName: 'RIDE' },
        { id: 10, university: '카이스트', crewName: 'KAKI' },
        { id: 9, university: '홍익대학교', crewName: 'Team 401' },
    ];

    useEffect(() => {
        const fetchUserSchool = async () => {
            try {
                const userInfo = await getUserInfo();
                if (userInfo && userInfo.school) {
                    const matched = allCrews.filter(c => c.university === userInfo.school);
                    // Show at most one crew as requested
                    setRecommendedCrews(matched.slice(0, 1));
                }
            } catch (err) {
                console.error("Failed to fetch user info for recommendation", err);
            }
        };
        fetchUserSchool();
    }, []);

    const handleApply = async () => {
        if (!selectedCrew || pin.length !== 4) return;

        setIsSubmitting(true);
        try {
            await applyToCrew(selectedCrew.id, pin);
            alert(`Successfully applied to ${selectedCrew.crewName}!`);
            setSelectedCrew(null);
            setPin('');
        } catch (error) {
            console.error("Failed to apply", error);
            alert("Failed to apply. Please check the PIN and try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openModal = (crew: typeof allCrews[0]) => {
        setSelectedCrew(crew);
        setPin('');
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white relative">
            {/* Header */}
            <header className="px-4 pt-2 pb-2 flex items-center justify-between relative z-10">
                <Button variant="ghost" onClick={onBack} className="-ml-2 gap-1 text-zinc-900 hover:bg-transparent">
                    <ChevronLeftIcon className="w-8 h-8" />
                </Button>
                <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-zinc-900">크루 검색</h1>
                <div className="w-8" /> {/* Spacer for centering */}
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto px-6 pb-8">
                {/* Search Input */}
                <div className="mb-8">
                    <input type="text" className="w-full h-12 rounded-[8px] border-none px-8 text-zinc-900 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm bg-white mt-4" />
                </div>

                {/* Recommended Section */}
                <div className="mb-6">
                    <h2 className="text-sm font-bold text-zinc-500 mb-4">추천</h2>

                    <div className="flex flex-col gap-6">
                        {recommendedCrews.map((crew) => (
                            <div
                                key={crew.id}
                                className="flex items-center justify-between cursor-pointer active:opacity-70 transition-opacity"
                                onClick={() => openModal(crew)}
                            >
                                <span className="font-bold text-zinc-900 text-base">{crew.university}</span>
                                <span className="text-zinc-500 text-sm">{crew.crewName}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Divider */}
                <div className="w-full h-[1px] bg-zinc-100 mb-6" />

                {/* All Crews Section */}
                <div className="mb-4">
                    <h2 className="text-sm font-bold text-zinc-500 mb-4">전체 크루</h2>

                    <div className="flex flex-col gap-6">
                        {allCrews.map((crew) => (
                            <div
                                key={crew.id}
                                className="flex items-center justify-between cursor-pointer active:opacity-70 transition-opacity"
                                onClick={() => openModal(crew)}
                            >
                                <span className="font-bold text-zinc-900 text-base">{crew.university}</span>
                                <span className="text-zinc-500 text-sm">{crew.crewName}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Application Modal */}
            {selectedCrew && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setSelectedCrew(null)}
                    />

                    {/* Dialog */}
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setSelectedCrew(null)}
                            className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <h3 className="text-lg font-bold text-zinc-900 mb-2">
                                '{selectedCrew.crewName}'에<br />가입 신청을 하시겠습니까?
                            </h3>
                            <p className="text-sm text-zinc-500">
                                운영진으로부터 전달받은<br />
                                4자리 PIN을 입력해주세요.
                            </p>
                        </div>

                        <div className="flex justify-center mb-8">
                            <input
                                type="text"
                                pattern="[0-9]*"
                                inputMode="numeric"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-32 h-12 text-center text-2xl font-bold tracking-widest border-b-2 border-zinc-200 focus:border-zinc-900 outline-none bg-transparent"
                                placeholder="0000"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setSelectedCrew(null)}
                                className="flex-1 h-12 rounded-xl bg-zinc-100 text-zinc-600 font-bold hover:bg-zinc-200 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleApply}
                                disabled={pin.length !== 4 || isSubmitting}
                                className="flex-1 h-12 rounded-xl bg-zinc-900 text-white font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? '신청 중...' : '확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
