import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { getNotifications, markNotificationRead, type NotificationFeed, type NotificationItem } from '../services/notifications';
import BuddyMascot from '../components/BuddyMascot';
import { SkeletonCard } from '../components/Skeleton';

interface Props { onBack: () => void; onChanged: () => void; onOnboarding?: () => void; onMyReservations?: () => void; }

const senderLabel = (item: NotificationItem) => item.senderType === 'MANAGER' ? '크루 매니저' : item.senderType === 'DEVELOPER' ? 'BoardBuddy' : '시스템';

/** The one thing a notification asks the member to do next, if it links somewhere. */
const actionLabel = (item: NotificationItem) =>
    item.actionUrl === '?view=my_reservations' ? '나의 달력 보기'
    : item.actionUrl === '?view=onboarding' ? '이어서 진행'
    : item.actionUrl?.startsWith('http') ? '열기'
    : null;

const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
function groupLabel(publishedAt: string, now = new Date()) {
    const diff = Math.round((dayStart(now) - dayStart(new Date(publishedAt))) / 86_400_000);
    return diff <= 0 ? '오늘' : diff === 1 ? '어제' : diff < 7 ? '이번 주' : '이전';
}
const timeLabel = (publishedAt: string) => {
    const date = new Date(publishedAt);
    return groupLabel(publishedAt) === '오늘' || groupLabel(publishedAt) === '어제'
        ? date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
        : date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
};

export default function Notifications({ onBack, onChanged, onOnboarding, onMyReservations }: Props) {
    const [feed, setFeed] = useState<NotificationFeed | null>(null);
    const [error, setError] = useState('');
    const [unreadOnly, setUnreadOnly] = useState(false);

    useEffect(() => { getNotifications().then(setFeed).catch(() => setError('알림을 불러오지 못했습니다.')); }, []);

    const open = async (item: NotificationItem) => {
        try {
            if (!item.read) {
                await markNotificationRead(item.id);
                setFeed(current => current ? { unreadCount: Math.max(0, current.unreadCount - 1), items: current.items.map(n => n.id === item.id ? { ...n, read: true } : n) } : current);
                onChanged();
            }
        } catch { setError('읽음 상태를 저장하지 못했습니다. 다시 시도해 주세요.'); return; }
        if (item.actionUrl === '?view=my_reservations') onMyReservations?.();
        else if (item.actionUrl === '?view=onboarding') onOnboarding?.();
        else if (item.actionUrl?.startsWith('http')) window.location.assign(item.actionUrl);
    };

    const groups = useMemo(() => {
        const visible = (feed?.items ?? []).filter(item => !unreadOnly || !item.read);
        const order = ['오늘', '어제', '이번 주', '이전'];
        return order.map(label => ({ label, items: visible.filter(item => groupLabel(item.publishedAt) === label) })).filter(group => group.items.length);
    }, [feed, unreadOnly]);

    return (
        <main className="flex h-full min-h-0 flex-col bg-[#FAF8F3] dark:bg-zinc-950">
            <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800">
                <button onClick={onBack} aria-label="뒤로 가기" className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"><ArrowLeft className="h-5 w-5" /></button>
                <div className="min-w-0 flex-1"><h1 className="text-lg font-black">알림</h1><p className="text-xs text-zinc-500">읽지 않은 알림 {feed?.unreadCount ?? 0}개</p></div>
                {feed && feed.items.length > 0 && (
                    <button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(value => !value)}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${unreadOnly ? 'bg-brand-navy text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                        읽지 않음만
                    </button>
                )}
            </header>
            <section className="min-h-0 flex-1 overflow-y-auto p-4">
                {!feed && !error && <div className="space-y-3"><SkeletonCard label="알림을 불러오는 중" lines={2} /><SkeletonCard label="알림을 불러오는 중" lines={2} /></div>}
                {error && <p className="py-16 text-center text-sm text-red-600">{error}</p>}
                {feed?.items.length === 0 && (
                    <div className="flex flex-col items-center py-16 text-center text-zinc-500">
                        <BuddyMascot size={88} />
                        <p className="mt-3 font-bold text-zinc-700">아직 알림이 없습니다.</p>
                        <p className="mt-1 text-xs">예약이 확정되거나 크루 공지가 오면 여기에 모아 둘게요.</p>
                    </div>
                )}
                {feed && feed.items.length > 0 && groups.length === 0 && <p className="py-16 text-center text-sm text-zinc-500">읽지 않은 알림이 없어요.</p>}
                <div className="space-y-5">
                    {groups.map(group => (
                        <section key={group.label} aria-label={group.label}>
                            <h2 className="mb-2 px-1 text-xs font-black text-zinc-500">{group.label}</h2>
                            <div className="space-y-2">
                                {group.items.map(item => {
                                    const action = actionLabel(item);
                                    return (
                                        <article key={item.id} className={`overflow-hidden rounded-2xl border bg-white ${item.read ? 'border-zinc-200' : 'border-brand-navy/25 shadow-[0_6px_18px_-12px_rgba(22,38,96,0.45)]'} dark:border-zinc-800 dark:bg-zinc-900`}>
                                            <button onClick={() => void open(item)} className="w-full p-4 text-left">
                                                <div className="mb-1 flex items-center gap-2">
                                                    {!item.read && <span aria-label="읽지 않음" className="h-2 w-2 shrink-0 rounded-full bg-brand-navy" />}
                                                    <span className="text-xs font-bold text-brand-navy">{senderLabel(item)}</span>
                                                    <time className="ml-auto text-[11px] text-zinc-400">{timeLabel(item.publishedAt)}</time>
                                                </div>
                                                <h3 className={`font-bold ${item.read ? 'text-zinc-700' : 'text-zinc-900'} dark:text-white`}>{item.title}</h3>
                                                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">{item.body}</p>
                                            </button>
                                            {action && (
                                                <div className="border-t border-zinc-100 px-4 py-2 dark:border-zinc-800">
                                                    <button type="button" onClick={() => void open(item)} className="inline-flex min-h-9 items-center gap-1 text-xs font-bold text-brand-navy">
                                                        {action}<ChevronRight className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            </section>
        </main>
    );
}
