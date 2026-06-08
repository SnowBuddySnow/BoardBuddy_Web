import { ChevronLeftIcon, SearchIcon, UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { getCrewManagers, getCrewMembers, promoteMember, demoteManager } from "../services/crew";
import { CrewMember } from "../types/api";

interface PromoteProps {
    crewId: number;
    onBack: () => void;
}

export default function Promote({ crewId, onBack }: PromoteProps) {
    const [managers, setManagers] = useState<CrewMember[]>([]);
    const [members, setMembers] = useState<CrewMember[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    const refreshData = async () => {
        setLoading(true);
        try {
            const [managersData, membersData] = await Promise.all([
                getCrewManagers(crewId),
                getCrewMembers(crewId)
            ]);
            setManagers(managersData || []);
            setMembers(membersData || []);
        } catch (error) {
            console.error("Failed to fetch promote data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshData();
    }, [crewId]);

    const handlePromote = async (userId: number) => {
        if (window.confirm("이 회원을 운영진으로 임명하시겠습니까?")) {
            try {
                await promoteMember(crewId, userId);
                await refreshData();
            } catch (error) {
                console.error("Failed to promote", error);
                alert("운영진 임명에 실패했습니다.");
            }
        }
    };

    const handleDemote = async (userId: number) => {
        if (window.confirm("이 회원을 운영진에서 해제하시겠습니까?")) {
            try {
                await demoteManager(crewId, userId);
                await refreshData();
            } catch (error) {
                console.error("Failed to demote", error);
                alert("운영진 해제에 실패했습니다.");
            }
        }
    };

    const filteredMembers = members.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.student_id.includes(searchQuery)
    );

    if (loading) return <div className="flex-1 flex items-center justify-center p-6">로딩 중...</div>;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">
            {/* Header */}
            <header className="px-6 pt-12 pb-4 flex items-center justify-between relative bg-white dark:bg-zinc-950 z-10 border-b border-zinc-100 dark:border-zinc-900">
                <Button variant="ghost" onClick={onBack} className="-ml-2 text-zinc-900 dark:text-zinc-100">
                    <ChevronLeftIcon className="w-6 h-6" />
                </Button>
                <h1 className="flex-1 text-center text-lg font-bold text-zinc-900 dark:text-zinc-100">운영진 관리</h1>
                <div className="w-10" />
            </header>

            <main className="flex-1 overflow-y-auto px-6 py-6 pb-28 space-y-8">
                {/* Managers Section */}
                <section>
                    <h2 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 mb-4">운영진</h2>
                    <div className="space-y-4">
                        {managers.map(manager => (
                            <div key={manager.user_id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                                        <UserIcon className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{manager.name}</span>
                                        <span className="text-sm text-zinc-500 dark:text-zinc-400">{manager.student_id}</span>
                                    </div>
                                </div>
                                {manager.role !== 'PRESIDENT' && (
                                    <button
                                        onClick={() => handleDemote(manager.user_id)}
                                        className="px-4 py-1.5 rounded-full border border-red-300 text-red-500 hover:bg-red-50 text-sm font-medium transition-colors"
                                    >
                                        삭제
                                    </button>
                                )}
                            </div>
                        ))}
                        {managers.length === 0 && <p className="text-sm text-zinc-400">운영진이 없습니다.</p>}
                    </div>
                </section>

                <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

                {/* Members Section */}
                <section>
                    <h2 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 mb-4">일반 부원</h2>

                    {/* Search Bar */}
                    <div className="relative mb-6">
                        <input
                            type="text"
                            placeholder="부원 이름/학번 검색"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-4 pr-10 py-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl border-none focus:ring-2 focus:ring-zinc-900 text-sm placeholder:text-zinc-400"
                        />
                        <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    </div>

                    <div className="space-y-4">
                        {filteredMembers.map(member => (
                            <div key={member.user_id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                                        <UserIcon className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{member.name}</span>
                                        <span className="text-sm text-zinc-500 dark:text-zinc-400">{member.student_id}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handlePromote(member.user_id)}
                                    className="px-4 py-1.5 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 text-sm font-bold transition-colors"
                                >
                                    추가
                                </button>
                            </div>
                        ))}
                        {filteredMembers.length === 0 && <p className="text-sm text-zinc-400 text-center py-4">검색 결과가 없습니다.</p>}
                    </div>
                </section>
            </main>
        </div>
    );
}
