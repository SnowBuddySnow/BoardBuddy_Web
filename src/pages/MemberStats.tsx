import { ReservationLayout, ReservationSummary } from '../components/reservation/ReservationLayout';
// Member Statistics Page
import { UserIcon, DownloadIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getCrewUsageStatistics } from "../services/crew";
import { CrewUsageStatistic } from "../types/api";

interface MemberStatsProps {
    crewId: number;
    onBack: () => void;
}

export default function MemberStats({ crewId, onBack }: MemberStatsProps) {
    const [stats, setStats] = useState<CrewUsageStatistic[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'name' | 'usageCount'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    // const [searchQuery, setSearchQuery] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getCrewUsageStatistics(crewId, sortBy, sortOrder, ""); // Fixed search to empty
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch usage stats", error);
        } finally {
            setLoading(false);
        }
    }, [crewId, sortBy, sortOrder]);

    useEffect(() => {
        // Debounce search could be added here if needed, but for now simple effect
        fetchData();
    }, [fetchData]);

    const handleDownloadExcel = () => {
        const header = "#,name,usagecount";
        const rows = stats.map((stat, index) => `${index + 1},${stat.name},${stat.usage_count}`);
        const csvContent = [header, ...rows].join("\n");

        // Use Blob with BOM for correct Excel encoding of Korean characters
        const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "season_usage_stats.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <ReservationLayout title="시즌방 이용 기록" onBack={onBack}>

            <main className="reservation-content">
                <ReservationSummary title="시즌방 이용 기록" description={`${stats.length}명의 이용 내역`} value={`${stats.reduce((total, item) => total + item.usage_count, 0)}박`} />
                {/* Sort and Control Header */}
                <div className="mb-4 flex justify-end">
                    <div className="relative">
                        <select
                            className="reservation-input appearance-none text-sm font-medium pr-6"
                            aria-label="이용 기록 정렬"
                            value={`${sortBy}-${sortOrder}`}
                            onChange={(e) => {
                                const [newSort, newOrder] = e.target.value.split('-');
                                setSortBy(newSort as 'name' | 'usageCount');
                                setSortOrder(newOrder as 'asc' | 'desc');
                            }}
                        >
                            <option value="name-asc">가나다 순</option>
                            <option value="name-desc">가나다 역순</option>
                            <option value="usageCount-desc">사용 많은 순</option>
                            <option value="usageCount-asc">사용 적은 순</option>
                        </select>
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                            ⌄
                        </span>
                    </div>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center py-20">로딩 중...</div>
                ) : (
                    <div className="reservation-panel space-y-3">
                        {stats.map(stat => (
                            <div key={stat.user_id} className="flex items-center justify-between gap-4 rounded-2xl bg-blue-50/50 px-4 py-3">
                                <div className="flex items-center gap-3">
                                    {stat.profile_image_url ? (
                                        <img src={stat.profile_image_url} alt={stat.name} className="w-10 h-10 rounded-full object-cover bg-zinc-100" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                            <UserIcon className="w-6 h-6 text-blue-600" />
                                        </div>
                                    )}
                                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{stat.name}</span>
                                </div>
                                <span className="font-medium text-zinc-600 dark:text-zinc-400">{stat.usage_count}박</span>
                            </div>
                        ))}
                        {stats.length === 0 && (
                            <p className="text-center text-zinc-400 py-10">기록이 없습니다.</p>
                        )}

                        {/* Download Button */}
                        {stats.length > 0 && (
                            <div className="pt-8 pb-4">
                                <button
                                    onClick={handleDownloadExcel}
                                    className="reservation-secondary w-full flex items-center justify-center gap-2 py-3"
                                >
                                    <DownloadIcon className="w-5 h-5" />
                                    엑셀 다운로드
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </ReservationLayout>
    );
}
