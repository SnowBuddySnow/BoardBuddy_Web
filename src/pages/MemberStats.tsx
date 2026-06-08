// Member Statistics Page
import { ChevronLeftIcon, UserIcon, DownloadIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../components/Button";
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

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getCrewUsageStatistics(crewId, sortBy, sortOrder, ""); // Fixed search to empty
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch usage stats", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Debounce search could be added here if needed, but for now simple effect
        fetchData();
    }, [crewId, sortBy, sortOrder]); // Add searchQuery if you want real-time, or handle separately

    // Handle search separately to avoid too many API calls if we want debounce, 
    // but for simplicity let's just fetch when enter is pressed or just include it in effect if not high traffic.
    // The user didn't specify interaction details, so let's stick to simple Effect for now or maybe just handle client side filtering if the API returns all?
    // The API signature suggests server side filtering: `search=""`.
    // Let's rely on effect with a small timeout or just on enter/submit if we had a button.
    // The screenshot has a search/dropdown.
    // Let's trigger fetch on dependency change.

    // Actually, let's just add search to dependency, maybe user types and waits?
    // Or maybe the standard approach in this app is client side?
    // The API request specifically asks for search param.




    // Toggle logic: Name ASC -> Name DESC -> Usage DESC -> Usage ASC? 
    // Or just a simple dropdown. Screenshot shows "가나다 순 v", indicating a dropdown or toggler.
    // Let's implement a simple dropdown or cycler.
    // User request: Sort option : name (default) / usageCount, asc / desc

    // For simplicity and matching screenshot "Order v", maybe a select or bottom sheet.
    // Let's use a standard HTML select for now styled invisibly or minimal.


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
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">
            {/* Header */}
            <header className="px-4 pt-2 pb-2 flex items-center justify-between relative bg-white dark:bg-zinc-950 z-10 border-b border-zinc-100 dark:border-zinc-900">
                <Button variant="ghost" onClick={onBack} className="-ml-2 text-zinc-900 dark:text-zinc-100">
                    <ChevronLeftIcon className="w-6 h-6" />
                </Button>
                <h1 className="flex-1 text-center text-lg font-bold text-zinc-900 dark:text-zinc-100">시즌방 사용 기록</h1>
                <div className="w-10" />
            </header>

            {/* Sort and Control Header */}
            <div className="px-6 py-4 flex justify-end">
                <div className="relative">
                    <select
                        className="appearance-none bg-transparent text-sm font-medium text-zinc-500 pr-6 focus:outline-none"
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

            <main className="flex-1 overflow-y-auto px-6 pb-28">
                {loading ? (
                    <div className="flex items-center justify-center py-20">로딩 중...</div>
                ) : (
                    <div className="space-y-6">
                        {stats.map(stat => (
                            <div key={stat.user_id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {stat.profile_image_url ? (
                                        <img src={stat.profile_image_url} alt={stat.name} className="w-10 h-10 rounded-full object-cover bg-zinc-100" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                                            <UserIcon className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
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
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                >
                                    <DownloadIcon className="w-5 h-5" />
                                    엑셀 다운로드
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
