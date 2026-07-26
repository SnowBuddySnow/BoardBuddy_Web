import { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { listParties } from '../services/event';
import { Event } from '../types/api';
import { getEventActivityLabel } from '../constants/eventActivity';
import { ChevronLeft, Calendar, MapPin, Users, Heart } from 'lucide-react';

interface MyPartiesProps {
    onBack: () => void;
    onEventClick: (eventId: number) => void;
}

export default function MyParties({ onBack, onEventClick }: MyPartiesProps) {
    const [joinedParties, setJoinedParties] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMyPlans = async () => {
        try {
            setLoading(true);
            const data = await listParties();
            const plans = data.filter(p => (
                p.currentUserStatus === 'JOINED'
                || p.currentUserStatus === 'PENDING'
                || p.currentUserStatus === 'CONSENT_PENDING'
            ));
            setJoinedParties(plans);
        } catch (error) {
            console.error('Failed to fetch my plans:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyPlans();
    }, []);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const month = d.getMonth() + 1;
        const date = d.getDate();
        const hour = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const day = dayNames[d.getDay()];
        return `${month}월 ${date}일 (${day}) ${hour}:${min}`;
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FAF8F3] relative">
            {/* Header */}
            <header className="px-4 pt-3 pb-3 flex items-center justify-between border-b border-zinc-100 bg-[#FAF8F3]">
                <Button variant="ghost" onClick={onBack} className="-ml-2 gap-1 text-zinc-800 hover:bg-transparent">
                    <ChevronLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-lg font-bold text-zinc-900">나의 소모임</h1>
                <div className="w-10"></div>
            </header>

            {/* List */}
            <main className="flex-1 overflow-y-auto px-4 pb-[110px] pt-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#162660] mb-3"></div>
                        <p className="text-sm">로딩 중...</p>
                    </div>
                ) : joinedParties.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400">
                        <Heart className="w-12 h-12 stroke-[1.5] mb-2 text-zinc-300" />
                        <p className="text-base font-bold">참여 예정인 모임이 없습니다</p>
                        <p className="text-xs mt-1">새로운 소모임에 참여하거나 직접 일정을 추가해보세요.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {joinedParties.map(event => {
                            const isPending = event.currentUserStatus === 'PENDING';
                            const isConsentPending = event.currentUserStatus === 'CONSENT_PENDING';

                            return (
                                <div
                                    key={event.id}
                                    onClick={() => onEventClick(event.id)}
                                    className="bg-white rounded-3xl p-5 border border-zinc-100 shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer flex flex-col justify-between min-h-[140px]"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] uppercase font-black text-blue-800 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-full">
                                                {getEventActivityLabel(event.activityType)}
                                            </span>
                                            {isConsentPending ? (
                                                <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                                                    동의 작성 필요
                                                </span>
                                            ) : isPending ? (
                                                <span className="text-xs font-bold text-amber-600 px-2.5 py-1 bg-amber-50 rounded-full border border-amber-100">
                                                    승인 대기
                                                </span>
                                            ) : (
                                                <span className="text-xs font-bold text-emerald-600 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                                                    참여 중
                                                </span>
                                            )}
                                        </div>

                                        <h2 className="text-base font-bold text-zinc-900 leading-tight mb-3">
                                            {event.title}
                                        </h2>

                                        <div className="space-y-1.5 mb-2">
                                            <div className="flex items-center text-xs text-zinc-500 gap-1.5 font-medium">
                                                <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                                                <span>{formatDate(event.startsAt)}</span>
                                            </div>
                                            <div className="flex items-center text-xs text-zinc-500 gap-1.5 font-medium">
                                                <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                                                <span className="truncate">{event.locationName}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-zinc-50 pt-3 mt-2 text-xs text-zinc-400 font-medium">
                                        <span>주최 {event.organizerGroupName}</span>
                                        <div className="flex items-center gap-1 font-bold text-zinc-700">
                                            <Users className="w-4 h-4 text-zinc-400" />
                                            <span>
                                                {event.joinedCount || 0}/{event.capacity}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
