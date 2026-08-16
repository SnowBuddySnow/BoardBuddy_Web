import { useState, useEffect, useRef } from 'react';
import { Button } from '../components/Button';
import {
    cancelEvent,
    getEvent,
    getEventChatAccess,
    getEventConsents,
    getEventPaymentInfo,
    joinEvent,
    saveEventConsentDraft,
    saveEventConsentDraftKeepalive,
    submitEventConsents,
} from '../services/event';
import { ConsentResponseInput, Event, EventChatAccess, EventPaymentPolicy, ParticipantConsentState } from '../types/api';
import {
    Banknote,
    Calendar,
    CheckCircle,
    ChevronLeft,
    Clock3,
    Cloud,
    Copy,
    ExternalLink,
    Info,
    KeyRound,
    MapPin,
    MessageCircle,
    LoaderCircle,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { getApiErrorMessage, getApiErrorStatus } from '../lib/apiError';
import { PlanningModeBadge } from '../components/event/PlanningModeBadge';
import { getEventActivityLabel } from '../constants/eventActivity';
import { ConsentResponseField } from '../components/event/ConsentResponseField';
import {
    getConsentResponseError,
    isConsentItemComplete,
    usesTextResponse,
    type ConsentDraft,
} from '../lib/consentResponse';

interface EventDetailProps {
    eventId: number;
    onBack: () => void;
    isGuestApplication?: boolean;
}

export default function EventDetail({ eventId, onBack, isGuestApplication = false }: EventDetailProps) {
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [showPhoneConsentModal, setShowPhoneConsentModal] = useState(false);
    const [chatAccess, setChatAccess] = useState<EventChatAccess | null>(null);
    const [consentState, setConsentState] = useState<ParticipantConsentState | null>(null);
    const [consentAnswers, setConsentAnswers] = useState<Record<number, ConsentDraft>>({});
    const [paymentInfo, setPaymentInfo] = useState<EventPaymentPolicy | null>(null);
    const [consentSubmitting, setConsentSubmitting] = useState(false);
    const [draftHydrated, setDraftHydrated] = useState(false);
    const [draftRestored, setDraftRestored] = useState(false);
    const [draftSaveState, setDraftSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [currentTime, setCurrentTime] = useState(Date.now());
    const latestDraftPayloadRef = useRef<ConsentResponseInput[]>([]);
    const draftSaveQueueRef = useRef<Promise<unknown>>(Promise.resolve());

    const fetchEventDetail = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);
            const data = await getEvent(eventId);
            setEvent(data);
            setConsentState(null);
            setDraftHydrated(false);
            setDraftRestored(false);
            setDraftSaveState('idle');
            setPaymentInfo(null);
            if (data.currentUserStatus === 'JOINED') {
                try {
                    setChatAccess(await getEventChatAccess(eventId));
                } catch (chatError) {
                    console.error('Failed to fetch event chat access:', chatError);
                    setChatAccess(null);
                }
                if (data.paymentRequired) {
                    try {
                        setPaymentInfo(await getEventPaymentInfo(eventId));
                    } catch (paymentError) {
                        console.error('Failed to fetch event payment info:', paymentError);
                        setPaymentInfo(null);
                    }
                }
            } else if (data.currentUserStatus === 'CONSENT_PENDING') {
                setChatAccess(null);
                try {
                    const consentData = await getEventConsents(eventId);
                    setConsentState(consentData);
                    const restoredEntries = consentData.drafts.length > 0
                        ? consentData.drafts
                        : consentData.responses;
                    setConsentAnswers(Object.fromEntries(restoredEntries.map(response => [
                        response.consentItemId,
                        {
                            agreed: response.agreed ?? undefined,
                            responseText: response.responseText ?? undefined,
                        },
                    ])));
                    setDraftRestored(consentData.drafts.length > 0);
                    setDraftHydrated(true);
                    setDraftSaveState(consentData.drafts.length > 0 ? 'saved' : 'idle');
                } catch (consentError) {
                    console.error('Failed to fetch event consents:', consentError);
                    setConsentState(null);
                }
            } else {
                setChatAccess(null);
            }
        } catch (error: unknown) {
            console.error('Failed to fetch event detail:', error);
            if (getApiErrorStatus(error) === 403) {
                setErrorMsg('이 이벤트를 볼 권한이 없습니다.');
            } else if (getApiErrorStatus(error) === 404) {
                setErrorMsg('이벤트를 찾을 수 없거나 현재 이용할 수 없습니다.');
            } else {
                setErrorMsg('이벤트를 불러오는 도중 오류가 발생했습니다.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEventDetail();
    }, [eventId]);

    useEffect(() => {
        if (!draftHydrated || !consentState || consentState.participantStatus !== 'CONSENT_PENDING') return;
        const payload = consentState.items.map(item => ({
            consentItemId: item.id,
            documentVersion: item.documentVersion,
            contentHash: item.contentHash,
            agreed: item.responseType === 'CHECKBOX'
                ? consentAnswers[item.id]?.agreed ?? null
                : null,
            responseText: usesTextResponse(item.responseType)
                ? consentAnswers[item.id]?.responseText ?? null
                : null,
        }));
        latestDraftPayloadRef.current = payload;
        setDraftSaveState('saving');
        const timeoutId = window.setTimeout(() => {
            draftSaveQueueRef.current = draftSaveQueueRef.current
                .catch(() => undefined)
                .then(() => saveEventConsentDraft(eventId, payload))
                .then(() => setDraftSaveState('saved'))
                .catch((error) => {
                    console.error('Failed to save event consent draft:', error);
                    setDraftSaveState('error');
                });
        }, 400);
        return () => window.clearTimeout(timeoutId);
    }, [consentAnswers, consentState, draftHydrated, eventId]);

    useEffect(() => {
        if (!draftHydrated) return;
        const persistLatestDraft = () => {
            if (latestDraftPayloadRef.current.length > 0) {
                saveEventConsentDraftKeepalive(eventId, latestDraftPayloadRef.current);
            }
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') persistLatestDraft();
        };
        window.addEventListener('pagehide', persistLatestDraft);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.removeEventListener('pagehide', persistLatestDraft);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [draftHydrated, eventId]);

    useEffect(() => {
        if (!event?.applicationStartsAt) return;
        const delay = new Date(event.applicationStartsAt).getTime() - Date.now();
        if (delay <= 0) return;
        const timeoutId = window.setTimeout(() => setCurrentTime(Date.now()), delay + 100);
        return () => window.clearTimeout(timeoutId);
    }, [event?.applicationStartsAt]);

    const handleJoinAction = async () => {
        if (!event) return;

        // Check phone sharing consent preference
        const consentPref = localStorage.getItem('phone_sharing_consent_preference') || 'each_time';
        if (consentPref !== 'always') {
            setShowPhoneConsentModal(true);
            return;
        }

        await executeJoinAction();
    };

    const executeJoinAction = async () => {
        if (!event) return;
        try {
            setActionLoading(true);
            const participant = await joinEvent(event.id);
            if (participant.status === 'CONSENT_PENDING') {
                alert('자리가 임시 확보되었습니다. 제한시간 내 동의서를 작성해 주세요.');
            } else {
                alert(event.joinPolicy === 'APPROVAL_REQUIRED' ? '게스트 참여 신청이 대기 상태로 접수되었습니다.' : '게스트 참여가 접수되었습니다.');
            }
            await fetchEventDetail(); // Refresh
        } catch (error: unknown) {
            console.error('Failed to join:', error);
            const apiMessage = getApiErrorMessage(error);
            if (getApiErrorStatus(error) === 403) {
                alert('이 이벤트에 참여할 권한이 없습니다.');
            } else if (apiMessage) {
                alert(apiMessage);
            } else {
                alert('참가 신청에 실패했습니다.');
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirmConsent = async (always: boolean) => {
        if (always) {
            localStorage.setItem('phone_sharing_consent_preference', 'always');
        }
        setShowPhoneConsentModal(false);
        await executeJoinAction();
    };

    const handleCancelAction = async () => {
        if (!event) return;
        const confirmCancel = window.confirm('정말 참여를 취소하시겠습니까?');
        if (!confirmCancel) return;

        try {
            setActionLoading(true);
            await cancelEvent(event.id);
            alert('참여 신청이 취소되었습니다.');
            await fetchEventDetail(); // Refresh
        } catch (error: unknown) {
            console.error('Failed to cancel:', error);
            const apiMessage = getApiErrorMessage(error);
            if (apiMessage) {
                alert(apiMessage);
            } else {
                alert('참여 취소에 실패했습니다.');
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleConsentSubmit = async () => {
        if (!event || !consentState) return;
        const responseError = consentState.items
            .map(item => getConsentResponseError(item, consentAnswers[item.id]))
            .find((message): message is string => Boolean(message));
        if (responseError) {
            alert(responseError);
            return;
        }
        const hasSensitiveInformation = consentState.items.some(item => (
            (item.category === 'MEDICATION_INFORMATION' || item.category === 'DIETARY_ACCESSIBILITY')
            && Boolean(consentAnswers[item.id]?.responseText?.trim())
        ));
        const sensitiveConsentItem = consentState.items.find(item => (
            item.category === 'SENSITIVE_INFORMATION' && item.responseType === 'CHECKBOX'
        ));
        if (hasSensitiveInformation && (!sensitiveConsentItem || consentAnswers[sensitiveConsentItem.id]?.agreed !== true)) {
            alert('건강·식이·접근성 정보를 작성하려면 별도의 민감정보 수집·이용 동의가 필요합니다.');
            return;
        }

        try {
            setConsentSubmitting(true);
            await submitEventConsents(event.id, consentState.items.map(item => ({
                consentItemId: item.id,
                documentVersion: item.documentVersion,
                contentHash: item.contentHash,
                agreed: item.responseType === 'CHECKBOX'
                    ? consentAnswers[item.id]?.agreed === true
                    : null,
                responseText: usesTextResponse(item.responseType)
                    ? consentAnswers[item.id]?.responseText?.trim() || null
                    : null,
            })));
            setDraftHydrated(false);
            setDraftSaveState('idle');
            alert('응답 시트가 한 번에 제출되어 참가가 확정되었습니다.');
            await fetchEventDetail();
        } catch (error: unknown) {
            console.error('Failed to submit event consents:', error);
            alert(getApiErrorMessage(error) || (error instanceof Error ? error.message : '동의서 제출에 실패했습니다.'));
        } finally {
            setConsentSubmitting(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const options: Intl.DateTimeFormatOptions = {
            month: 'long',
            day: 'numeric',
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };
        return d.toLocaleDateString('ko-KR', options);
    };

    const formatMoney = (amount?: number | null, currency?: string | null) => {
        if (amount == null) return '금액 미정';
        if (currency === 'KRW') return `${amount.toLocaleString('ko-KR')}원`;
        return `${amount.toLocaleString('ko-KR')} ${currency || ''}`.trim();
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col h-full bg-[#FAF8F3] items-center justify-center text-zinc-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#162660] mb-3"></div>
                <p className="text-sm font-medium">로딩 중...</p>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="flex-1 flex flex-col h-full bg-[#FAF8F3] items-center justify-center p-6 text-center text-zinc-500">
                <Info className="w-12 h-12 stroke-[1.5] mb-3 text-red-400" />
                <p className="text-base font-bold text-zinc-900 mb-2">{errorMsg}</p>
                <Button variant="primary" onClick={onBack} className="rounded-full px-6">
                    돌아가기
                </Button>
            </div>
        );
    }

    if (!event) return null;

    const isClosed = event.status === 'CLOSED' || event.status === 'CANCELLED';
    const isFull = event.capacity <= (event.joinedCount || 0);
    const hasJoined = event.currentUserStatus === 'JOINED';
    const isPending = event.currentUserStatus === 'PENDING';
    const isConsentPending = event.currentUserStatus === 'CONSENT_PENDING';
    const requiredConsentItems = consentState?.items.filter(item => item.required) || [];
    const completedRequiredItems = requiredConsentItems.filter(item => (
        isConsentItemComplete(item, consentAnswers[item.id])
    )).length;
    const applicationNotOpen = Boolean(
        event.applicationStartsAt
        && new Date(event.applicationStartsAt).getTime() > currentTime,
    );

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FAF8F3] relative">
            {/* Header */}
            <header className="absolute top-0 left-0 right-0 h-14 z-20 px-4 flex items-center justify-between bg-transparent">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="p-2 bg-white/95 dark:bg-zinc-900/95 shadow-sm rounded-full text-zinc-800 shrink-0"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <div></div>
                <div></div>
            </header>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto pb-[130px]">
                {/* Hero / Cover Visual Panel */}
                <div className="w-full h-44 bg-gradient-to-br from-[#162660] via-[#1e3a8a] to-[#2563eb] relative flex items-end p-5">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="z-10 flex flex-col gap-1.5">
                        {isGuestApplication && <span className="w-max rounded-full bg-amber-300 px-2.5 py-1 text-[10px] font-black text-[#162660]">게스트 초대</span>}
                        <PlanningModeBadge mode={event.planningMode} />
                        <span className="text-[10px] uppercase font-black text-blue-200 tracking-widest px-3 py-1 bg-white/10 backdrop-blur-md rounded-full w-max">
                            {getEventActivityLabel(event.activityType)}
                        </span>
                        <h1 className="text-xl font-bold text-white leading-tight">
                            {event.title}
                        </h1>
                    </div>
                </div>

                {/* Details Section */}
                <div className="p-5 space-y-6">
                    {/* Description */}
                    {event.description && (
                        <div className="bg-white rounded-3xl p-5 border border-zinc-100 shadow-sm space-y-3">
                            <h3 className="text-sm font-bold text-zinc-900">상세 설명</h3>
                            <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
                                {event.description}
                            </p>
                        </div>
                    )}

                    {/* Location & Time Info */}
                    <div className="bg-white rounded-3xl p-5 border border-zinc-100 shadow-sm space-y-4">
                        <div className="flex items-start gap-3.5">
                            <Calendar className="w-5 h-5 text-[#162660] shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-xs text-zinc-400 font-bold uppercase tracking-wider">언제 하나요</h3>
                                <p className="text-sm font-bold text-zinc-800 mt-1">{formatDate(event.startsAt)}</p>
                                {event.endsAt && (
                                    <p className="text-xs text-zinc-500 mt-0.5">~ {formatDate(event.endsAt)}</p>
                                )}
                            </div>
                        </div>

                        {event.applicationStartsAt && (
                            <div className="flex items-start gap-3.5 border-t border-zinc-50 pt-4">
                                <Clock3 className="w-5 h-5 text-[#162660] shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-xs text-zinc-400 font-bold uppercase tracking-wider">신청 시작</h3>
                                    <p className="text-sm font-bold text-zinc-800 mt-1">{formatDate(event.applicationStartsAt)}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-start gap-3.5 border-t border-zinc-50 pt-4">
                            <MapPin className="w-5 h-5 text-[#162660] shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-xs text-zinc-400 font-bold uppercase tracking-wider">어디서 만나나요</h3>
                                <p className="text-sm font-bold text-zinc-800 mt-1">{event.locationName || '참가 멤버와 추후 협의'}</p>
                                <p className="text-xs text-zinc-500 mt-0.5">{event.locationAddress}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3.5 border-t border-zinc-50 pt-4">
                            <Users className="w-5 h-5 text-[#162660] shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-xs text-zinc-400 font-bold uppercase tracking-wider">모집 인원</h3>
                                <p className="text-sm font-bold text-zinc-800 mt-1">
                                    {event.joinedCount || 0} / {event.capacity} 명 참여 중
                                </p>
                                <div className="w-full bg-zinc-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div
                                        className="bg-[#162660] h-full rounded-full transition-all duration-300"
                                        style={{ width: `${Math.min(100, ((event.joinedCount || 0) / event.capacity) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Organizer & Policies */}
                    <div className="bg-white rounded-3xl p-5 border border-zinc-100 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-50 pb-2">모임 정보</h3>

                        {event.organizerGroupName && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500 font-medium">주최 그룹</span>
                                <span className="font-bold text-zinc-800">{event.organizerGroupName}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500 font-medium">참가 승인 정책</span>
                            <span className="font-bold text-zinc-800">
                                {event.joinPolicy === 'INSTANT' ? '즉시 승인' : '운영진 승인 필요'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500 font-medium">공개 설정</span>
                            <span className="font-bold text-zinc-800">
                                {event.visibilityType === 'PUBLIC' ? '전체 공개' : '제한 공개'}
                            </span>
                        </div>

                        {event.crewMemberLimit != null && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500 font-medium">크루별 참가 제한</span>
                                <span className="font-bold text-zinc-800">크루당 최대 {event.crewMemberLimit}명</span>
                            </div>
                        )}
                    </div>

                    {event.paymentRequired && (
                        <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5 shadow-sm">
                            <div className="flex items-start gap-3">
                                <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-[#162660]" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-sm font-bold text-zinc-900">참가비 입금 필수</h3>
                                        <strong className="text-base text-[#162660]">
                                            {formatMoney(event.participationFee, event.paymentCurrency)}
                                        </strong>
                                    </div>
                                    <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                                        계좌번호와 상세 입금 안내는 동의 및 참가 확정 후 공개됩니다.
                                    </p>
                                    {event.paymentDeadlineAt && (
                                        <p className="mt-2 text-xs font-bold text-blue-900">
                                            입금 기한 · {formatDate(event.paymentDeadlineAt)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {isConsentPending && consentState && (
                        <div className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-xl bg-amber-500 p-2 text-white shadow-sm">
                                        <ShieldCheck className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <h3 className="text-base font-black text-zinc-900">참가자 응답 시트</h3>
                                            <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black text-amber-700">
                                                필수 {completedRequiredItems}/{requiredConsentItems.length}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                                            아래 항목은 서로 독립적입니다. 필요한 항목만 작성하고 마지막에 한 번에 제출하세요.
                                        </p>
                                        {consentState.consentDueAt && (
                                            <p className="mt-2 flex items-center gap-1.5 text-xs font-black text-amber-700">
                                                <Clock3 className="h-3.5 w-3.5" />
                                                {formatDate(consentState.consentDueAt)}까지
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 p-4 sm:p-5">
                                {consentState.items.map((item, index) => {
                                    const isInformation = item.responseType === 'INFORMATION';
                                    const draft = consentAnswers[item.id] || {};
                                    return (
                                        <section
                                            key={item.id}
                                            className={`rounded-2xl border p-4 ${
                                                isInformation
                                                    ? 'border-blue-100 bg-blue-50/60'
                                                    : 'border-zinc-200 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                                                    isInformation
                                                        ? 'bg-blue-100 text-[#162660]'
                                                        : 'bg-zinc-100 text-zinc-500'
                                                }`}>
                                                    {isInformation ? <Info className="h-3.5 w-3.5" /> : index + 1}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h4 className="text-sm font-black text-zinc-900">{item.title}</h4>
                                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                                            isInformation
                                                                ? 'bg-blue-100 text-[#162660]'
                                                                : item.required
                                                                    ? 'bg-red-50 text-red-600'
                                                                    : 'bg-zinc-100 text-zinc-500'
                                                        }`}>
                                                            {isInformation ? '안내' : item.required ? '필수' : '선택'}
                                                        </span>
                                                    </div>
                                                    <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-zinc-600">
                                                        {item.content}
                                                    </p>
                                                </div>
                                            </div>

                                            <ConsentResponseField
                                                item={item}
                                                draft={draft}
                                                onChange={(nextDraft) => setConsentAnswers(current => ({
                                                    ...current,
                                                    [item.id]: nextDraft,
                                                }))}
                                            />
                                        </section>
                                    );
                                })}
                            </div>

                            <div className="border-t border-zinc-100 bg-zinc-50 p-4 sm:p-5">
                                <div className={`mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold ${
                                    draftSaveState === 'error'
                                        ? 'border-red-100 bg-red-50 text-red-600'
                                        : 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                }`}>
                                    {draftSaveState === 'saving' ? (
                                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Cloud className="h-3.5 w-3.5" />
                                    )}
                                    {draftSaveState === 'error'
                                        ? '자동 저장에 실패했습니다. 연결을 확인해 주세요.'
                                        : draftSaveState === 'saving'
                                            ? '작성 내용을 안전하게 저장하는 중입니다.'
                                            : draftRestored
                                                ? '이전에 작성하던 내용을 복원했습니다. 이후 변경도 자동 저장됩니다.'
                                                : '작성 내용은 자동 저장되어 새로고침하거나 창을 닫아도 이어서 작성할 수 있습니다.'}
                                </div>
                                <div className="mb-3 flex items-center justify-between gap-3 text-xs">
                                    <span className="text-zinc-500">{consentState.items.length}개 항목을 한 번에 안전하게 제출합니다.</span>
                                    <strong className={completedRequiredItems === requiredConsentItems.length ? 'text-emerald-600' : 'text-amber-700'}>
                                        {completedRequiredItems === requiredConsentItems.length ? '필수 작성 완료' : '필수 항목 확인 필요'}
                                    </strong>
                                </div>
                                <Button
                                    variant="primary"
                                    onClick={handleConsentSubmit}
                                    disabled={consentSubmitting}
                                    className="h-12 w-full rounded-xl bg-[#162660] font-black text-white shadow-sm"
                                >
                                    {consentSubmitting ? '한 번에 제출 중...' : '전체 응답 제출하고 참가 확정'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {hasJoined && paymentInfo?.paymentRequired && (
                        <div className="space-y-4 rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Banknote className="h-5 w-5 text-emerald-600" />
                                    <h3 className="text-sm font-bold text-zinc-900">입금 안내</h3>
                                </div>
                                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700">
                                    입금 확인 대기
                                </span>
                            </div>
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                                <p className="text-xs font-semibold text-zinc-500">{paymentInfo.bankName}</p>
                                <div className="mt-1 flex items-center justify-between gap-3">
                                    <code className="text-base font-black text-zinc-900">{paymentInfo.bankAccountNumber}</code>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(paymentInfo.bankAccountNumber || '')}
                                        className="rounded-lg border border-zinc-200 bg-white p-2 text-zinc-500 hover:bg-zinc-100"
                                        aria-label="계좌번호 복사"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </button>
                                </div>
                                <p className="mt-1 text-xs text-zinc-500">예금주 {paymentInfo.bankAccountHolder}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="font-semibold text-zinc-400">입금 금액</span>
                                    <p className="mt-1 font-black text-zinc-900">
                                        {formatMoney(paymentInfo.participationFee, paymentInfo.paymentCurrency)}
                                    </p>
                                </div>
                                <div>
                                    <span className="font-semibold text-zinc-400">입금 기한</span>
                                    <p className="mt-1 font-black text-zinc-900">
                                        {paymentInfo.paymentDeadlineAt ? formatDate(paymentInfo.paymentDeadlineAt) : '운영진 문의'}
                                    </p>
                                </div>
                            </div>
                            {paymentInfo.paymentInstructions && (
                                <div>
                                    <h4 className="text-xs font-bold text-zinc-800">입금 주의사항</h4>
                                    <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-zinc-600">
                                        {paymentInfo.paymentInstructions}
                                    </p>
                                </div>
                            )}
                            {paymentInfo.refundPolicy && (
                                <div className="border-t border-zinc-100 pt-3">
                                    <h4 className="text-xs font-bold text-zinc-800">환불 정책</h4>
                                    <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-zinc-500">
                                        {paymentInfo.refundPolicy}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {hasJoined && chatAccess?.chatUrl && (
                        <div className="bg-white p-5 border border-emerald-200 shadow-sm space-y-4 rounded-lg">
                            <div className="flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-emerald-600" />
                                <h3 className="text-sm font-bold text-zinc-900">참가자 채팅방</h3>
                            </div>
                            {chatAccess.chatInstructions && (
                                <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
                                    {chatAccess.chatInstructions}
                                </p>
                            )}
                            {chatAccess.chatPasscode && (
                                <div className="flex items-center justify-between gap-3 bg-zinc-50 border border-zinc-200 rounded p-3">
                                    <span className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                                        <KeyRound className="w-4 h-4" /> 입장 코드
                                    </span>
                                    <code className="text-sm font-bold text-zinc-900">{chatAccess.chatPasscode}</code>
                                </div>
                            )}
                            <a
                                href={chatAccess.chatUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full h-11 bg-[#162660] text-white text-sm font-bold rounded hover:bg-[#1e3a8a] transition-colors"
                            >
                                외부 채팅방 열기 <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    )}

                </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-5 py-4 z-10 flex flex-col justify-center">
                {isClosed ? (
                    <Button disabled className="w-full h-12 bg-zinc-300 border-zinc-300 text-zinc-500 rounded-full font-bold">
                        {event.status === 'CANCELLED' ? '취소된 모임' : '마감된 모임'}
                    </Button>
                ) : hasJoined ? (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 py-2 border border-emerald-100 rounded-2xl">
                            <CheckCircle className="w-4 h-4 shrink-0" />
                            <span>이 이벤트에 참여하고 있습니다.</span>
                        </div>
                        <Button
                            variant="danger"
                            onClick={handleCancelAction}
                            disabled={actionLoading}
                            className="w-full h-12 rounded-full font-bold"
                        >
                            참여 취소하기
                        </Button>
                    </div>
                ) : isConsentPending ? (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-center gap-1.5 rounded-2xl border border-amber-100 bg-amber-50 py-2 text-xs font-bold text-amber-700">
                            <ShieldCheck className="h-4 w-4 shrink-0" />
                            <span>동의서 작성 대기 · 자리가 임시 확보되었습니다.</span>
                        </div>
                        <Button
                            variant="danger"
                            onClick={handleCancelAction}
                            disabled={actionLoading}
                            className="h-12 w-full rounded-full font-bold"
                        >
                            신청 취소하기
                        </Button>
                    </div>
                ) : isPending ? (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600 font-bold bg-amber-50 py-2 border border-amber-100 rounded-2xl">
                            <Info className="w-4 h-4 shrink-0" />
                            <span>승인 대기 중입니다.</span>
                        </div>
                        <Button
                            variant="danger"
                            onClick={handleCancelAction}
                            disabled={actionLoading}
                            className="w-full h-12 rounded-full font-bold"
                        >
                            신청 취소하기
                        </Button>
                    </div>
                ) : applicationNotOpen ? (
                    <Button disabled className="w-full h-12 bg-amber-100 border-amber-200 text-amber-800 rounded-full font-bold">
                        {formatDate(event.applicationStartsAt!)} 신청 시작
                    </Button>
                ) : isFull ? (
                    <Button disabled className="w-full h-12 bg-zinc-300 border-zinc-300 text-zinc-500 rounded-full font-bold">
                        정원이 모두 찼습니다
                    </Button>
                ) : (
                    <Button
                        variant="primary"
                        onClick={handleJoinAction}
                        disabled={actionLoading}
                        className="w-full h-12 bg-[#162660] hover:bg-[#1e3a8a] text-white border-none rounded-full font-bold shadow-md hover:scale-[1.01] transition-all"
                    >
                        {actionLoading ? '신청 중...' : isGuestApplication ? '게스트로 신청하기' : '참여 신청하기'}
                    </Button>
                )}
            </div>

            {/* Phone Sharing Consent Modal */}
            {showPhoneConsentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPhoneConsentModal(false)} />
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm p-6 shadow-xl relative z-10 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-3 text-center">
                            전화번호 제공 동의
                        </h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 text-center leading-relaxed">
                            예약 확인, 안내 및 안전 연락 등 원활한 이벤트 운영을 위해 이벤트 관리자(호스트)에게 본인의 전화번호를 제공하시겠습니까?
                            <br />
                            <span className="text-xs text-zinc-400 dark:text-zinc-500 block mt-2.5 leading-normal">
                                * '항상 동의' 선택 시 마이페이지 계정 관리에서 설정을 변경하기 전까지 더 이상 동의 여부를 묻지 않습니다.
                            </span>
                        </p>
                        <div className="flex flex-col gap-2">
                            <Button
                                onClick={() => handleConfirmConsent(true)}
                                className="w-full h-11 text-sm font-bold bg-[#162660] text-white rounded-xl"
                            >
                                항상 동의하고 진행
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleConfirmConsent(false)}
                                className="w-full h-11 text-sm font-bold rounded-xl"
                            >
                                이번만 동의하고 진행
                            </Button>
                            <button
                                onClick={() => setShowPhoneConsentModal(false)}
                                className="w-full h-10 text-xs text-zinc-400 hover:text-zinc-600 font-semibold"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
