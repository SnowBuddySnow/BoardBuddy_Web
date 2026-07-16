import { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { listParties, joinEvent } from '../services/event';
import { Event } from '../types/api';
import { ChevronLeft, Calendar, MapPin, Users, Search, Sparkles, AlertCircle } from 'lucide-react';
import { getApiErrorMessage, getApiErrorStatus } from '../lib/apiError';
import { PlanningModeBadge } from '../components/event/PlanningModeBadge';
import { getEventActivityLabel, EVENT_ACTIVITY_OPTIONS } from '../constants/eventActivity';

interface PartiesProps {
    onBack: () => void;
    onEventClick: (eventId: number) => void;
    onCreateClick?: () => void;
    canCreate?: boolean;
}

export default function Parties({ onBack, onEventClick, onCreateClick, canCreate = false }: PartiesProps) {
    const [parties, setParties] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState('ALL');
    const [joiningIds, setJoiningIds] = useState<number[]>([]);

    const fetchAllParties = async () => {
        try {
            setLoading(true);
            const data = await listParties();
            // Filter to show OPEN parties prominently, and closed/cancelled visually de-emphasized
            // DRAFT parties shouldn't appear for normal users (handled by API, but double check)
            const visible = data.filter(p => p.status !== 'DRAFT');
            setParties(visible);
        } catch (error) {
            console.error('Failed to fetch parties:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllParties();
    }, []);

    const handleJoin = async (e: React.MouseEvent, eventId: number) => {
        e.stopPropagation(); // Avoid navigating to details
        if (joiningIds.includes(eventId)) return;

        try {
            setJoiningIds(prev => [...prev, eventId]);
            await joinEvent(eventId);
            alert('소모임 신청이 완료되었습니다!');
            fetchAllParties(); // Refresh details
        } catch (error: unknown) {
            console.error('Failed to join event:', error);
            const apiMessage = getApiErrorMessage(error);
            if (getApiErrorStatus(error) === 403) {
                alert('이 소모임에 참여할 권한이 없습니다.');
            } else if (apiMessage) {
                alert(apiMessage);
            } else {
                alert('소모임 참여 신청에 실패했습니다.');
            }
        } finally {
            setJoiningIds(prev => prev.filter(id => id !== eventId));
        }
    };

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

    const activityTags = ['ALL', ...EVENT_ACTIVITY_OPTIONS.map(option => option.value)];
    const availableEventCount = parties.filter(event => (
        event.status === 'OPEN'
        && new Date(event.startsAt).getTime() > Date.now()
        && (!event.applicationStartsAt || new Date(event.applicationStartsAt).getTime() <= Date.now())
        && (event.joinedCount || 0) < event.capacity
    )).length;

    const filteredParties = parties.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            getEventActivityLabel(event.activityType).toLowerCase().includes(searchQuery.toLowerCase()) ||
            (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (event.locationName && event.locationName.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesTag = selectedTag === 'ALL'
            || getEventActivityLabel(event.activityType) === getEventActivityLabel(selectedTag);

        return matchesSearch && matchesTag;
    });

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FAF8F3] relative">
            {/* Header */}
            <header className="px-4 pt-3 pb-3 flex items-center justify-between border-b border-zinc-100 bg-[#FAF8F3]">
                <Button variant="ghost" onClick={onBack} className="-ml-2 gap-1 text-zinc-800 hover:bg-transparent">
                    <ChevronLeft className="w-6 h-6" />
                </Button>
                <div className="text-center">
                    <h1 className="text-lg font-bold text-zinc-900">소모임 둘러보기</h1>
                    <p className="text-[11px] font-bold text-zinc-500">현재 참가 가능 {availableEventCount}개</p>
                </div>
                <div className="w-10">
                    {canCreate && onCreateClick && (
                        <button
                            onClick={onCreateClick}
                            className="bg-[#162660] text-white p-2 rounded-full hover:bg-blue-900 transition-colors shadow-sm"
                        >
                            <Sparkles className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </header>

            {/* Search and Filter */}
            <div className="px-4 py-3 bg-[#FAF8F3] space-y-3">
                <div className="relative flex items-center">
                    <Search className="absolute left-3 w-5 h-5 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="소모임, 활동, 장소 검색..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 transition-all text-zinc-800 placeholder-zinc-400"
                    />
                </div>

                {/* Filter Tags */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {activityTags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => setSelectedTag(tag)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 border ${
                                selectedTag === tag
                                    ? 'bg-[#162660] text-white border-[#162660] shadow-sm'
                                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                            }`}
                        >
                                                {tag === 'ALL' ? '전체' : getEventActivityLabel(tag)}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <main className="flex-1 overflow-y-auto px-4 pb-[110px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#162660] mb-3"></div>
                        <p className="text-sm">소모임 정보를 불러오는 중...</p>
                    </div>
                ) : filteredParties.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400">
                        <AlertCircle className="w-12 h-12 stroke-[1.5] mb-2 text-zinc-300" />
                        <p className="text-base font-bold">등록된 소모임이 없습니다</p>
                        <p className="text-xs mt-1">새로운 액티비티 모임을 제안하거나 필터를 변경해보세요.</p>
                    </div>
                ) : (
                    <div className="space-y-4 pt-1">
                        {filteredParties.map(event => {
                            const isClosed = event.status === 'CLOSED' || event.status === 'CANCELLED';
                            const isFull = event.capacity <= (event.joinedCount || 0);
                            const hasJoined = event.currentUserStatus === 'JOINED';
                            const isPending = event.currentUserStatus === 'PENDING';
                            const applicationNotOpen = Boolean(
                                event.applicationStartsAt
                                && new Date(event.applicationStartsAt).getTime() > Date.now(),
                            );

                            return (
                                <div
                                    key={event.id}
                                    onClick={() => onEventClick(event.id)}
                                    className={`bg-white rounded-3xl p-5 border border-zinc-100 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer flex flex-col justify-between min-h-[160px] ${
                                        isClosed ? 'opacity-65' : ''
                                    }`}
                                >
                                    <div>
                                        {/* Activity Tag & Host Info */}
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] uppercase font-extrabold px-2.5 py-1 bg-zinc-100 text-zinc-700 rounded">
                                                    {getEventActivityLabel(event.activityType)}
                                                </span>
                                                <PlanningModeBadge mode={event.planningMode} />
                                            </div>
                                            {event.organizerGroupName && (
                                                <span className="text-xs text-zinc-400 font-medium">
                                                    주최 {event.organizerGroupName}
                                                </span>
                                            )}
                                        </div>

                                        {/* Title */}
                                        <h2 className="text-lg font-bold text-zinc-900 leading-tight mb-3">
                                            {event.title}
                                        </h2>

                                        {/* Date and Location */}
                                        <div className="space-y-1.5 mb-4">
                                            <div className="flex items-center text-xs text-zinc-500 font-medium gap-1.5">
                                                <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                                                <span>{formatDate(event.startsAt)}</span>
                                            </div>
                                            <div className="flex items-center text-xs text-zinc-500 font-medium gap-1.5">
                                                <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                                                <span className="truncate">{event.locationName || '참가 멤버와 추후 협의'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Info & CTA */}
                                    <div className="flex items-center justify-between border-t border-zinc-50 pt-4 mt-1">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700">
                                            <Users className="w-4 h-4 text-zinc-400" />
                                            <span>
                                                {event.joinedCount || 0}/{event.capacity}명 참여
                                            </span>
                                        </div>

                                        {/* CTA logic */}
                                        {isClosed ? (
                                            <span className="text-xs font-bold text-zinc-400 px-3 py-1.5 bg-zinc-50 rounded-full border border-zinc-200/50">
                                                {event.status === 'CANCELLED' ? '취소됨' : '마감됨'}
                                            </span>
                                        ) : hasJoined ? (
                                            <span className="text-xs font-bold text-emerald-600 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
                                                참여 중
                                            </span>
                                        ) : isPending ? (
                                            <span className="text-xs font-bold text-amber-600 px-3 py-1.5 bg-amber-50 rounded-full border border-amber-100 animate-pulse">
                                                승인 대기
                                            </span>
                                        ) : applicationNotOpen ? (
                                            <span className="text-xs font-bold text-amber-700 px-3 py-1.5 bg-amber-50 rounded-full border border-amber-100">
                                                {formatDate(event.applicationStartsAt!)} 신청 시작
                                            </span>
                                        ) : isFull ? (
                                            <span className="text-xs font-bold text-zinc-400 px-3 py-1.5 bg-zinc-50 rounded-full border border-zinc-200/50">
                                                정원 마감
                                            </span>
                                        ) : (
                                            <button
                                                onClick={(e) => handleJoin(e, event.id)}
                                                disabled={joiningIds.includes(event.id)}
                                                className="bg-[#162660] hover:bg-[#1e3a8a] text-white text-xs font-bold px-4.5 py-2 rounded-2xl shadow-sm transition-all hover:scale-[1.02] disabled:opacity-50"
                                            >
                                                {joiningIds.includes(event.id) ? '신청 중...' : '신청'}
                                            </button>
                                        )}
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
