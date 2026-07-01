import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { getNotifications } from '../services/notifications';

interface Props { onClick: () => void; refreshKey?: number; }

export default function NotificationBell({ onClick, refreshKey = 0 }: Props) {
    const [count, setCount] = useState(0);
    const refresh = useCallback(() => {
        getNotifications(100).then(feed => setCount(feed.unreadCount)).catch(() => undefined);
    }, []);

    useEffect(() => {
        refresh();
        const timer = window.setInterval(refresh, 60_000);
        return () => window.clearInterval(timer);
    }, [refresh, refreshKey]);

    return (
        <button type="button" onClick={onClick} aria-label={`Notifications${count ? `, ${count} unread` : ''}`}
            className="absolute right-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-zinc-800 shadow-md backdrop-blur dark:bg-zinc-900/95 dark:text-white">
            <Bell className="h-5 w-5" />
            {count > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1 text-center text-xs font-bold leading-5 text-white">{count > 99 ? '99+' : count}</span>}
        </button>
    );
}
