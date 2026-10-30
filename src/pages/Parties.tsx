import { useState, useEffect, useCallback } from 'react';
import { formatEventDateTime, getEventRegistrationLabel, getEventRegistrationState, isEventRegistrationAvailable } from '../lib/eventDateTime';
import { Button } from '../components/Button';
import { listParties } from '../services/event';
import { Event } from '../types/api';
import { ChevronLeft, Calendar, MapPin, Users, Search, Sparkles, AlertCircle } from 'lucide-react';
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
    const [loadError, setLoadError] = useState('');
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const fetchAllParties = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError('');
            const data = await listParties();
            // Filter to show OPEN parties prominently, and closed/cancelled visually de-emphasized
            // DRAFT parties shouldn't appear for normal users (handled by API, but double check)
            const visible = data.filter(p => p.status !== 'DRAFT');
            setParties(visible);
        } catch (error) {
            console.error('Failed to fetch parties:', error);
            setLoadError('이벤트를 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchAllParties();
    }, [fetchAllParties]);

    const handleJoin = (e: React.MouseEvent, eventId: number) => {
        e.stopPropagation(); // Do not also fire the enclosing card's navigation.
        const event = parties.find(item => item.id === eventId);
        if (!event || !isEventRegistrationAvailable(event)) return;
        // One admission path owns phone confirmation, join results and required responses.
        onEventClick(eventId);
    };

    const formatDate = formatEventDateTime;

    const activityTags = ['ALL', ...EVENT_ACTIVITY_OPTIONS.map(option => option.value)];
    const availableEventCount = parties.filter(event => isEventRegistrationAvailable(event, currentTime)).length;

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
                <Button variant="ghost" aria-label="뒤로 가기" onClick={onBack} className="-ml-2 min-h-11 min-w-11 gap-1 text-zinc-800 hover:bg-transparent">
                    <ChevronLeft className="w-6 h-6" />
                </Button>
                <div className="text-center">
                    <h1 className="text-lg font-bold text-zinc-900">이벤트 둘러보기</h1>
                    <p className="text-[11px] font-bold text-zinc-500">{loading ? '이벤트 불러오는 중...' : loadError ? '이벤트 목록 확인 필요' : `현재 참가 가능 ${availableEventCount}개`}</p>
                </div>
                <div className="w-10">
                    {canCreate && onCreateClick && (
                        <button
                            onClick={onCreateClick}
                            aria-label="이벤트 만들기"
                            className="min-h-11 min-w-11 bg-[#162660] text-white p-2 rounded-full hover:bg-blue-900 transition-colors shadow-sm"
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
                        placeholder="이벤트, 활동, 장소 검색..."
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
                            className={`min-h-11 min-w-11 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 border ${
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
                        <p className="text-sm">이벤트 정보를 불러오는 중...</p>
                    </div>
                ) : loadError ? (
                    <div role="alert" className="flex flex-col items-center gap-4 py-20 text-center">
                        <p className="text-sm font-bold text-red-700">{loadError}</p>
                        <Button onClick={() => void fetchAllParties()} className="min-h-11 px-5">다시 시도</Button>
                    </div>
                ) : filteredParties.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400">
                        <AlertCircle className="w-12 h-12 stroke-[1.5] mb-2 text-zinc-300" />
                        <p className="text-base font-bold">{parties.length ? '검색 조건에 맞는 이벤트가 없습니다' : '등록된 이벤트가 없습니다'}</p>
                        <p className="text-xs mt-1">새로운 액티비티 모임을 제안하거나 필터를 변경해보세요.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 pt-1 lg:grid-cols-2">
                        {filteredParties.map(event => {
                            const isClosed = event.status === 'CLOSED' || event.status === 'CANCELLED';
                            const registrationState = getEventRegistrationState(event, currentTime);
                            const isInvitation = event.joinPolicy === 'INVITE_ONLY' && event.currentUserStatus === 'PENDING';
                            const hasJoined = event.currentUserStatus === 'JOINED';
                            const isPending = event.currentUserStatus === 'PENDING' && !isInvitation;
                            const isConsentPending = event.currentUserStatus === 'CONSENT_PENDING';

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
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                <span className="text-[10px] uppercase font-extrabold px-2.5 py-1 bg-zinc-100 text-zinc-700 rounded">
                                                    {getEventActivityLabel(event.activityType)}
                                                </span>
                                                <PlanningModeBadge mode={event.planningMode} />
                                            </div>
                                            {event.organizerGroupName && (
                                                <span className="max-w-24 truncate text-right text-xs text-zinc-400 font-medium">
                                                    호스트 {event.organizerGroupName}
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
                                        ) : isConsentPending ? (
                                            <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                                                동의 작성 필요
                                            </span>
                                        ) : isPending ? (
                                            <span className="text-xs font-bold text-amber-600 px-3 py-1.5 bg-amber-50 rounded-full border border-amber-100 animate-pulse">
                                                승인 대기
                                            </span>
                                        ) : registrationState !== 'AVAILABLE' ? (
                                            <span className="text-xs font-bold text-zinc-500 px-3 py-1.5 bg-zinc-100 rounded-full">
                                                {registrationState === 'NOT_OPEN'
                                                    ? `${formatDate(event.applicationStartsAt!)} 신청 시작`
                                                    : getEventRegistrationLabel(registrationState)}
                                            </span>
                                        ) : (
                                            <button
                                                onClick={(e) => handleJoin(e, event.id)}
                                                className="min-h-11 min-w-11 bg-[#162660] hover:bg-[#1e3a8a] text-white text-xs font-bold px-4.5 py-2 rounded-2xl shadow-sm transition-all hover:scale-[1.02] disabled:opacity-50"
                                            >
                                                {isInvitation ? '초대 수락' : '신청'}
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
