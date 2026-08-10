import { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Check, LoaderCircle } from 'lucide-react';
import { getNotifications, markNotificationRead, type NotificationFeed, type NotificationItem } from '../services/notifications';

interface Props { onBack: () => void; onChanged: () => void; }

const senderLabel = (item: NotificationItem) => item.senderType === 'MANAGER' ? '크루 매니저' : item.senderType === 'DEVELOPER' ? 'BoardBuddy' : '시스템';

export default function Notifications({ onBack, onChanged }: Props) {
    const [feed, setFeed] = useState<NotificationFeed | null>(null);
    const [error, setError] = useState('');

    useEffect(() => { getNotifications().then(setFeed).catch(() => setError('알림을 불러오지 못했습니다.')); }, []);

    const open = async (item: NotificationItem) => {
        if (!item.read) {
            await markNotificationRead(item.id);
            setFeed(current => current ? { unreadCount: Math.max(0, current.unreadCount - 1), items: current.items.map(n => n.id === item.id ? { ...n, read: true } : n) } : current);
            onChanged();
        }
        if (item.actionUrl?.startsWith('http')) window.location.assign(item.actionUrl);
    };

    return (
        <main className="flex h-full min-h-0 flex-col bg-[#FAF8F3] dark:bg-zinc-950">
            <header className="flex items-center gap-3 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
                <button onClick={onBack} aria-label="뒤로 가기" className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"><ArrowLeft /></button>
                <div><h1 className="text-xl font-bold">알림</h1><p className="text-xs text-zinc-500">읽지 않은 알림 {feed?.unreadCount ?? 0}개</p></div>
            </header>
            <section className="min-h-0 flex-1 overflow-y-auto p-4">
                {!feed && !error && <div className="flex justify-center py-16"><LoaderCircle className="animate-spin text-zinc-400" /></div>}
                {error && <p className="py-16 text-center text-sm text-red-600">{error}</p>}
                {feed?.items.length === 0 && <div className="py-20 text-center text-zinc-500"><Bell className="mx-auto mb-3"/><p>아직 알림이 없습니다.</p></div>}
                <div className="space-y-3">
                    {feed?.items.map(item => <button key={item.id} onClick={() => void open(item)} className={`w-full rounded-2xl border p-4 text-left shadow-sm ${item.read ? 'border-zinc-200 bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/60' : 'border-amber-300 bg-white dark:border-amber-700 dark:bg-zinc-900'}`}>
                        <div className="mb-1 flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">{senderLabel(item)}</span>{item.read && <Check className="h-4 w-4 text-zinc-400" />}</div>
                        <h2 className="font-bold text-zinc-900 dark:text-white">{item.title}</h2>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">{item.body}</p>
                        <time className="mt-3 block text-xs text-zinc-400">{new Date(item.publishedAt).toLocaleString()}</time>
                    </button>)}
                </div>
            </section>
        </main>
    );
}
