import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { getNotifications } from '../services/notifications';

interface Props {
    onClick: () => void;
    refreshKey?: number;
    variant?: 'sidebar' | 'bottom-navigation';
}

export default function NotificationBell({ onClick, refreshKey = 0, variant = 'sidebar' }: Props) {
    const [count, setCount] = useState(0);
    const refresh = useCallback(() => {
        getNotifications(100).then(feed => setCount(feed.unreadCount)).catch(() => undefined);
    }, []);

    useEffect(() => {
        refresh();
        const timer = window.setInterval(refresh, 60_000);
        return () => window.clearInterval(timer);
    }, [refresh, refreshKey]);

    if (variant === 'bottom-navigation') {
        return (
            <button
                type="button"
                onClick={onClick}
                aria-label={`알림${count ? `, 읽지 않음 ${count}개` : ''}`}
                className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl border-0 px-1 py-1 text-[10px] font-bold text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800"
            >
                <span className="relative flex h-6 w-6 items-center justify-center">
                    <Bell className="h-5 w-5" />
                    {count > 0 && (
                        <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black leading-none text-white ring-2 ring-white">
                            {count > 99 ? '99+' : count}
                        </span>
                    )}
                </span>
                <span className="w-full truncate">알림</span>
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`알림${count ? `, 읽지 않음 ${count}개` : ''}`}
            className="flex w-full items-center gap-3 rounded-xl border-0 bg-transparent px-3 py-2.5 text-left text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
        >
            <span className="relative">
                <Bell className="h-4.5 w-4.5" />
                {count > 0 && <span className="absolute -right-2 -top-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />}
            </span>
            <span className="min-w-0 flex-1">알림</span>
            {count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white">
                    {count > 99 ? '99+' : count}
                </span>
            )}
        </button>
    );
}
