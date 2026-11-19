import { GroupizePanel } from '../components/event/GroupizePanel';
import { EventFamilyLinks } from '../components/event/EventFamilyLinks';
import { useState, useEffect, useCallback } from 'react';
import { formatEventDateTime } from '../lib/eventDateTime';
import { Button } from '../components/Button';
import { getEventChatAccess, getEventDashboard, updateEvent, listParticipants, updateParticipantManagement, updateParticipantStatus, updateEventChatAccess } from '../services/event';
import { Event, EventChatAccess, EventParticipant, PaymentStatus } from '../types/api';
import { ChevronLeft, Play, Power, Clock, Check, Save, X, MessageCircle } from 'lucide-react';
import { PlanningModeBadge } from '../components/event/PlanningModeBadge';
import { eventStatusLabel, joinPolicyLabel, participantStatusLabel } from '../constants/displayLabels';
import { ManagerConsentResponseSheet } from '../components/event/ManagerConsentResponseSheet';

interface DashboardEventDetailProps {
    eventId: number;
    onBack: () => void;
    onEditClick: (eventId: number) => void;
    onOpenEvent?: (eventId: number) => void;
}

export default function DashboardEventDetail({ eventId, onBack, onEditClick, onOpenEvent }: DashboardEventDetailProps) {
    const [showGroupize, setShowGroupize] = useState(false);
    const [event, setEvent] = useState<Event | null>(null);
    const [participants, setParticipants] = useState<EventParticipant[]>([]);
    const [showParticipantHistory, setShowParticipantHistory] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [participantActionId, setParticipantActionId] = useState<number | null>(null);
    const [participantManagementId, setParticipantManagementId] = useState<number | null>(null);
    const [chatAccess, setChatAccess] = useState<EventChatAccess>({
        chatUrl: null,
        chatPasscode: null,
        chatInstructions: null,
    });
    const [chatAccessSaving, setChatAccessSaving] = useState(false);

    const fetchDetailData = useCallback(async () => {
        try {
            setLoading(true);
            setLoadFailed(false);
            const [eventData, partsData, eventChatAccess] = await Promise.all([
                getEventDashboard(eventId), listParticipants(eventId), getEventChatAccess(eventId),
            ]);
            setEvent(eventData);
            setParticipants(partsData);
            setChatAccess(eventChatAccess);
        } catch (error) {
            setLoadFailed(true);
            console.error('Failed to fetch dashboard event detail data:', error);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchDetailData();
    }, [fetchDetailData]);

    const handleOpenRegistration = async () => {
        try {
            setActionLoading(true);
            await updateEvent(eventId, { status: 'OPEN' });
            alert('이벤트가 오픈되었습니다.');
            fetchDetailData();
        } catch (error) {
            console.error('Failed to open registration:', error);
            alert('이벤트 오픈에 실패했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCloseRegistration = async () => {
        try {
            setActionLoading(true);
            await updateEvent(eventId, { status: 'CLOSED' });
            alert('이벤트가 마감되었습니다.');
            fetchDetailData();
        } catch (error) {
            console.error('Failed to close registration:', error);
            alert('이벤트 마감에 실패했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleParticipantStatusChange = async (userId: number, targetStatus: 'JOINED' | 'REMOVED' | 'PENDING' | 'CANCELLED') => {
        try {
            setParticipantActionId(userId);
            await updateParticipantStatus(eventId, userId, targetStatus);
            alert('참가자 상태가 정상적으로 변경되었습니다.');
            const partsData = await listParticipants(eventId);
            setParticipants(partsData);
            // Refresh event count as well
            const eventData = await getEventDashboard(eventId);
            setEvent(eventData);
        } catch (error) {
            console.error('Failed to update participant status:', error);
            alert('참가자 상태 변경에 실패했습니다.');
        } finally {
            setParticipantActionId(null);
        }
    };

    const updateParticipantDraft = (participantId: number, updates: Partial<EventParticipant>) => {
        setParticipants(current => current.map(participant => (
            participant.id === participantId ? { ...participant, ...updates } : participant
        )));
    };

    const handleParticipantManagementSave = async (participant: EventParticipant) => {
        try {
            setParticipantManagementId(participant.id);
            const updated = await updateParticipantManagement(
                eventId,
                participant.userId,
                participant.paymentStatus ?? null,
                participant.managerMemo?.trim() || null,
            );
            setParticipants(current => current.map(item => item.id === participant.id ? updated : item));
            alert('참가자 관리 정보가 저장되었습니다.');
        } catch (error) {
            console.error('Failed to update participant management details:', error);
            alert('참가자 관리 정보 저장에 실패했습니다.');
        } finally {
            setParticipantManagementId(null);
        }
    };

    const handleChatAccessSave = async () => {
        try {
            setChatAccessSaving(true);
            const updated = await updateEventChatAccess(eventId, chatAccess);
            setChatAccess(updated);
            alert(updated.chatUrl ? '채팅방 정보가 저장되었습니다.' : '채팅방 정보가 삭제되었습니다.');
        } catch (error) {
            console.error('Failed to update event chat access:', error);
            alert('HTTPS 형식의 올바른 채팅방 링크를 확인해 주세요.');
        } finally {
            setChatAccessSaving(false);
        }
    };

    const formatDate = formatEventDateTime;
    const formatCompactDate = formatEventDateTime;
    const activeParticipants = participants.filter(part => ['JOINED', 'PENDING', 'CONSENT_PENDING'].includes(part.status));
    const historicalParticipants = participants.filter(part => !['JOINED', 'PENDING', 'CONSENT_PENDING'].includes(part.status));
    const visibleParticipants = showParticipantHistory ? historicalParticipants : activeParticipants;

    if (loading) {
        return (
            <div className="flex-1 flex flex-col h-full bg-[#FAF8F3] items-center justify-center text-zinc-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#162660] mb-3"></div>
                <p className="text-sm font-medium">관리 상세 정보를 불러오는 중...</p>
            </div>
        );
    }

    if (loadFailed || !event) {
        return (
            <div className="flex-1 flex flex-col h-full bg-[#FAF8F3] items-center justify-center gap-4 px-6 text-center">
                <p role="alert" className="text-sm font-medium text-zinc-700">이벤트 관리 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
                <div className="flex gap-3">
                    <Button onClick={() => void fetchDetailData()}>다시 시도</Button>
                    <Button variant="outline" onClick={onBack}>이벤트 목록으로</Button>
                </div>
            </div>
        );
    }

    const isDraft = event.status === 'DRAFT';
    const isOpen = event.status === 'OPEN';

    return (
        <div className="flex-1 flex flex-col h-full bg-[#FAF8F3] overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-zinc-100 px-4 py-4 flex flex-wrap items-center justify-between gap-3 sm:px-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={onBack} className="-ml-2 gap-1 text-zinc-600 hover:bg-transparent">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="min-w-0 break-words text-lg font-bold text-zinc-900">{event.title} (관리)</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onEditClick(event.id)}
                        className="rounded-full px-5 font-semibold text-sm"
                    >
                        수정하기
                    </Button>
                    {isDraft && (
                        <Button
                            variant="primary"
                            onClick={handleOpenRegistration}
                            disabled={actionLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-5 font-bold text-sm border-none flex items-center gap-1"
                        >
                            <Play className="w-4 h-4" /> 모집 오픈
                        </Button>
                    )}
                    {isOpen && (
                        <Button
                            variant="secondary"
                            onClick={handleCloseRegistration}
                            disabled={actionLoading}
                            className="bg-zinc-800 text-white hover:bg-black rounded-full px-5 font-bold text-sm border-none flex items-center gap-1"
                        >
                            <Power className="w-4 h-4" /> 모집 마감
                        </Button>
                    )}
                </div>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                {/* Column 1 & 2: Small gathering details & participants */}
                <div className="min-w-0 lg:col-span-2 space-y-6">
                    {/* Basic Info panel */}
                    <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm space-y-4">
                        <h2 className="text-base font-bold text-zinc-900">모임 요약</h2>
                        <PlanningModeBadge mode={event.planningMode} />
                        <EventFamilyLinks event={event} onOpen={onOpenEvent} />
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-zinc-400 font-bold block text-xs uppercase">신청 시작</span>
                                <span className="font-bold text-zinc-800 mt-1 block">
                                    {event.applicationStartsAt ? formatDate(event.applicationStartsAt) : '즉시 신청 가능'}
                                </span>
                            </div>
                            <div>
                                <span className="text-zinc-400 font-bold block text-xs uppercase">일시</span>
                                <span className="font-bold text-zinc-800 mt-1 block">{formatDate(event.startsAt)}</span>
                            </div>
                            <div>
                                <span className="text-zinc-400 font-bold block text-xs uppercase">모임 장소</span>
                                <span className="font-bold text-zinc-800 mt-1 block">{event.locationName || '참가 멤버와 추후 협의'}</span>
                            </div>
                            <div>
                                <span className="text-zinc-400 font-bold block text-xs uppercase">상태</span>
                                <span className="font-bold mt-1 block">
                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                        event.status === 'DRAFT' ? 'bg-amber-100 text-amber-800' :
                                        event.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' :
                                        'bg-zinc-100 text-zinc-600'
                                    }`}>
                                        {eventStatusLabel[event.status]}
                                    </span>
                                </span>
                            </div>
                            <div>
                                <span className="text-zinc-400 font-bold block text-xs uppercase">가입 정책</span>
                                <span className="font-bold text-zinc-800 mt-1 block">{joinPolicyLabel[event.joinPolicy]}</span>
                            </div>
                        </div>
                    </div>

                    {/* Participant Management panel */}
                    <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm space-y-4">
                        {!event.parentEventId && <div className="space-y-3">
                        <button className="rounded-xl bg-[#162660] px-5 py-3 text-sm font-bold text-white"
                            onClick={() => setShowGroupize(current => !current)}>{showGroupize ? '소모임 편성 접기' : '소모임 편성'}</button>
                        {showGroupize && <GroupizePanel key={event.id} eventId={event.id} onOpenEvent={onOpenEvent ?? onEditClick}
                            onChanged={() => { void getEventDashboard(eventId).then(setEvent); }} />}
                    </div>}
                    <div className="flex items-center justify-between">
                            <h2 className="text-base font-bold text-zinc-900">참가자 목록 ({activeParticipants.length})</h2>
                        </div>
                        <p className="text-xs text-zinc-500">
                            참가 확정 {participants.filter(part => part.status === 'JOINED').length}명 · 승인 대기 {participants.filter(part => part.status === 'PENDING').length}명 · 동의 대기 {participants.filter(part => part.status === 'CONSENT_PENDING').length}명
                        </p>
                        <div className="flex flex-wrap gap-2" aria-label="참가자 목록 필터">
                            <Button variant={showParticipantHistory ? 'outline' : 'primary'} aria-pressed={!showParticipantHistory} onClick={() => setShowParticipantHistory(false)}>
                                진행 중 ({activeParticipants.length})
                            </Button>
                            <Button variant={showParticipantHistory ? 'primary' : 'outline'} aria-pressed={showParticipantHistory} onClick={() => setShowParticipantHistory(true)}>
                                취소·내보냄 ({historicalParticipants.length})
                            </Button>
                        </div>

                        {visibleParticipants.length === 0 ? (
                            <div className="text-center py-10 text-zinc-400 text-sm">
                                {showParticipantHistory ? '취소·내보냄 내역이 없습니다.' : '현재 참가 확정 또는 대기 중인 멤버가 없습니다.'}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="participant-table w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-zinc-50 text-zinc-400 font-bold text-xs uppercase border-b border-zinc-100">
                                            <th className="px-2 py-3">참가자</th>
                                            <th className="px-2 py-3">상태</th>
                                            <th className="px-2 py-3">신청 일시</th>
                                            <th className="px-2 py-3">입금 상태</th>
                                            <th className="px-2 py-3">호스트 메모</th>
                                            <th className="px-2 py-3 text-right">관리</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-50">
                                        {visibleParticipants.map(part => {
                                            const isPending = part.status === 'PENDING';
                                            const isJoined = part.status === 'JOINED';
                                            const isDisabled = participantActionId === part.userId;

                                            return (
                                                <tr key={part.id} className="hover:bg-zinc-50/50 transition-colors">
                                                    <td data-label="참가자" className="px-2 py-3.5 font-bold text-zinc-800 whitespace-nowrap">
                                                        {part.userName || '이름 없음'}
                                                    </td>
                                                    <td data-label="상태" className="px-2 py-3.5">
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                                                            part.status === 'JOINED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                            part.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse' :
                                                            part.status === 'REMOVED' ? 'bg-red-50 text-red-700 border border-red-100' :
                                                            'bg-zinc-50 text-zinc-500'
                                                        }`}>
                                                            {participantStatusLabel[part.status]}
                                                        </span>
                                                    </td>
                                                    <td data-label="신청 일시" className="px-2 py-3.5 text-zinc-400 text-xs font-semibold whitespace-nowrap">
                                                        {formatCompactDate(part.joinedAt || part.createdAt || '')}
                                                    </td>
                                                    <td data-label="입금 상태" className="px-2 py-3.5">
                                                        <select
                                                            value={part.paymentStatus ?? ''}
                                                            onChange={event => updateParticipantDraft(part.id, {
                                                                paymentStatus: (event.target.value || null) as PaymentStatus | null,
                                                            })}
                                                            className="w-full sm:w-24 min-h-11 px-2 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#162660]/20"
                                                            aria-label={`${part.userName || '이름 없는 참가자'} 입금 상태`}
                                                        >
                                                            <option value="">미설정</option>
                                                            <option value="UNPAID">미입금</option>
                                                            <option value="PAID">입금 완료</option>
                                                        </select>
                                                    </td>
                                                    <td data-label="호스트 메모" className="px-2 py-3.5">
                                                        <input
                                                            type="text"
                                                            value={part.managerMemo ?? ''}
                                                            onChange={event => updateParticipantDraft(part.id, { managerMemo: event.target.value })}
                                                            placeholder="호스트만 보는 메모"
                                                            maxLength={1000}
                                                            className="w-full sm:w-36 min-h-11 px-2.5 py-2 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#162660]/20"
                                                            aria-label={`${part.userName || '이름 없는 참가자'} 호스트 메모`}
                                                        />
                                                    </td>
                                                    <td data-label="관리" className="px-2 py-3.5 text-right">
                                                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => handleParticipantManagementSave(part)}
                                                                disabled={participantManagementId === part.id}
                                                                className="inline-flex min-h-11 min-w-11 items-center justify-center p-1 text-[#162660] hover:bg-blue-50 rounded-full border border-zinc-200 transition-colors disabled:opacity-50"
                                                                title="입금 상태와 메모 저장"
                                                                aria-label={`${part.userName || '이름 없는 참가자'} 관리 정보 저장`}
                                                            >
                                                                <Save className="w-4 h-4" />
                                                            </button>
                                                            {isPending && (
                                                                <button
                                                                    onClick={() => handleParticipantStatusChange(part.userId, 'JOINED')}
                                                                    disabled={isDisabled}
                                                                    className="inline-flex min-h-11 min-w-11 items-center justify-center p-1 text-emerald-600 hover:bg-emerald-50 rounded-full border border-zinc-200 transition-colors"
                                                                    title="멤버 승인"
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {isJoined && (
                                                                <button
                                                                    onClick={() => handleParticipantStatusChange(part.userId, 'REMOVED')}
                                                                    disabled={isDisabled}
                                                                    className="inline-flex min-h-11 min-w-11 items-center justify-center p-1 text-red-500 hover:bg-red-50 rounded-full border border-zinc-200 transition-colors"
                                                                    title="멤버 제외"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {part.status === 'REMOVED' && (
                                                                <button
                                                                    onClick={() => handleParticipantStatusChange(part.userId, 'PENDING')}
                                                                    disabled={isDisabled}
                                                                    className="inline-flex min-h-11 min-w-11 items-center justify-center p-1 text-zinc-400 hover:bg-zinc-100 rounded-full border border-zinc-200 transition-colors"
                                                                    title="승인 대기로 되돌리기"
                                                                >
                                                                    <Clock className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 3: Stats & Setup Panel */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm space-y-4">
                        <h2 className="text-base font-bold text-zinc-900">모집 통계</h2>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500 font-medium">참여율</span>
                                <span className="font-bold text-zinc-800">
                                    {event.capacityLimited === false ? '제한 없음' : `${Math.round(((event.joinedCount || 0) / event.capacity) * 100)}%`}
                                </span>
                            </div>
                            <div hidden={event.capacityLimited === false} className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-[#162660] h-full rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, ((event.joinedCount || 0) / event.capacity) * 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs text-zinc-400 pt-1">
                                <span>정원: {event.capacityLimited === false ? '제한 없음' : `${event.capacity}명`}</span>
                                <span>확정: {event.joinedCount || 0}명</span>
                            </div>
                            {event.crewMemberLimit != null && (
                                <p className="text-xs font-semibold text-zinc-600 pt-1">크루당 최대 {event.crewMemberLimit}명</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-6 border border-zinc-100 shadow-sm space-y-4 rounded-lg">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-[#162660]" />
                            <h2 className="text-base font-bold text-zinc-900">참가자 채팅방</h2>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            확정 참가자에게만 공개됩니다. 링크를 비우고 저장하면 입장 코드와 안내도 함께 삭제됩니다.
                        </p>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-500" htmlFor="event-chat-url">채팅방 링크</label>
                            <input
                                id="event-chat-url"
                                type="url"
                                value={chatAccess.chatUrl ?? ''}
                                onChange={event => setChatAccess(current => ({ ...current, chatUrl: event.target.value || null }))}
                                placeholder="https://open.kakao.com/..."
                                maxLength={1000}
                                className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#162660]/20"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-500" htmlFor="event-chat-passcode">입장 코드 (선택)</label>
                            <input
                                id="event-chat-passcode"
                                type="text"
                                value={chatAccess.chatPasscode ?? ''}
                                onChange={event => setChatAccess(current => ({ ...current, chatPasscode: event.target.value || null }))}
                                maxLength={100}
                                className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#162660]/20"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-500" htmlFor="event-chat-instructions">입장 안내 (선택)</label>
                            <textarea
                                id="event-chat-instructions"
                                rows={3}
                                value={chatAccess.chatInstructions ?? ''}
                                onChange={event => setChatAccess(current => ({ ...current, chatInstructions: event.target.value || null }))}
                                maxLength={1000}
                                className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#162660]/20 resize-y"
                            />
                        </div>
                        <Button
                            variant="primary"
                            onClick={handleChatAccessSave}
                            disabled={chatAccessSaving}
                            className="w-full rounded flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {chatAccessSaving ? '저장 중...' : '채팅방 정보 저장'}
                        </Button>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm space-y-4">
                        <h2 className="text-base font-bold text-zinc-900">도움말 / 팁</h2>
                        <ul className="text-xs text-zinc-500 space-y-2 list-disc pl-4 leading-relaxed">
                            <li>새 이벤트는 <strong>준비 중</strong>으로 저장됩니다. 모집을 열기 전에는 참가자에게 공개되지 않습니다.</li>
                            <li><strong>모집 오픈</strong>을 누르면 설정한 신청 시작 시간부터 참가 신청을 받을 수 있습니다.</li>
                            <li>승인이 필요한 신청은 <strong>승인 대기</strong>로 표시됩니다. 명단에서 승인 버튼을 눌러 참가를 확정하세요.</li>
                        </ul>
                    </div>
                </div>

                <div className="min-w-0 lg:col-span-3">
                    <ManagerConsentResponseSheet eventId={eventId} />
                </div>
            </main>
        </div>
    );
}
