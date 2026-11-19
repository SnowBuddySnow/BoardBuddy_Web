import { Home, CalendarDays, Sparkles, UsersRound } from 'lucide-react';
import { cn } from '../lib/utils';

type Tab = 'home' | 'events' | 'calendar' | 'edit' | 'heart' | 'user' | 'season';
interface Props {
    className?: string;
    activeTab?: Tab;
    availableEventCount?: number;
    hasCrew?: boolean;
    offSeasonAvailable?: boolean;
    onTabChange?: (tab: Tab) => void;
}

export function LowerMenuBar({ className, activeTab = 'home', availableEventCount = 0, hasCrew = false, offSeasonAvailable = false, onTabChange }: Props) {
    const items = [
        { id: 'home', label: '홈', icon: Home, visible: true },
        { id: 'season', label: '시즌방', icon: CalendarDays, visible: hasCrew },
        { id: 'events', label: '이벤트', icon: Sparkles, visible: offSeasonAvailable },
        { id: 'heart', label: '내 크루', icon: UsersRound, visible: hasCrew },
    ] as const;
    return <nav aria-label="하단 메뉴" className={cn('relative z-50 mx-3 mt-2 mb-[max(0.75rem,env(safe-area-inset-bottom))] flex h-16 shrink-0 items-stretch rounded-[22px] border border-zinc-200/80 bg-white px-1.5 py-1.5 shadow-lg', className)}>
        {items.filter(item => item.visible).map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => onTabChange?.(id)} aria-current={activeTab === id ? 'page' : undefined}
            className={cn('relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-bold', activeTab === id ? 'bg-[#162660] text-white' : 'text-zinc-500 hover:bg-zinc-100')}>
            <span className="relative"><Icon className="h-5 w-5" />{id === 'events' && availableEventCount > 0 && <span className="absolute -right-3 -top-2 rounded-full bg-rose-500 px-1 text-[9px] text-white">{availableEventCount > 99 ? '99+' : availableEventCount}</span>}</span>
            <span>{label}</span>
        </button>)}
    </nav>;
}
export default LowerMenuBar;
