import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    CheckCircle2,
    CameraOff,
    Download,
    Eye,
    FileSpreadsheet,
    Filter,
    LockKeyhole,
    Search,
    ShieldAlert,
    X,
} from 'lucide-react';
import {
    exportManagerConsentResponses,
    getManagerConsentResponses,
    revealManagerConsentResponses,
} from '../../services/event';
import type {
    ManagerConsentResponseAnswer,
    ManagerConsentResponseItem,
    ManagerConsentResponseParticipant,
    ManagerConsentResponseSheet,
} from '../../types/api';
import { getApiErrorMessage } from '../../lib/apiError';

interface ManagerConsentResponseSheetProps {
    eventId: number;
}

type ResponseFilter = 'ALL' | 'COMPLETED' | 'PENDING';
type PrivacyAction = 'REVEAL' | 'EXPORT';

const privacyLabel = {
    GENERAL: '일반',
    PERSONAL: '개인정보',
    SENSITIVE: '민감정보',
} as const;

const participantStatusLabel: Record<string, string> = {
    JOINED: '참가 확정',
    PENDING: '승인 대기',
    CONSENT_PENDING: '응답 대기',
    CANCELLED: '취소',
    REMOVED: '제외',
    NONE: '미참가',
};

const formatDateTime = (value: string | null) => value
    ? new Intl.DateTimeFormat('ko-KR', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value))
    : '-';

const getAnswer = (
    participant: ManagerConsentResponseParticipant,
    itemId: number,
) => participant.answers.find(answer => answer.consentItemId === itemId);

const answerText = (
    item: ManagerConsentResponseItem,
    answer?: ManagerConsentResponseAnswer,
) => {
    if (!answer) return '-';
    if (item.responseType === 'CHECKBOX') return answer.agreed ? '동의' : '미동의';
    if (answer.masked && answer.responseText === null) return '보호됨';
    return answer.responseText || '-';
};

export function ManagerConsentResponseSheet({ eventId }: ManagerConsentResponseSheetProps) {
    const [sheet, setSheet] = useState<ManagerConsentResponseSheet | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<ResponseFilter>('ALL');
    const [selectedParticipant, setSelectedParticipant] = useState<ManagerConsentResponseParticipant | null>(null);
    const [privacyAction, setPrivacyAction] = useState<PrivacyAction | null>(null);
    const [reason, setReason] = useState('');
    const [includeSensitive, setIncludeSensitive] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
    const [actionBusy, setActionBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [captureWarningAcknowledged, setCaptureWarningAcknowledged] = useState(false);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setLoadError(null);
        getManagerConsentResponses(eventId)
            .then(data => {
                if (!active) return;
                setSheet(data);
                setSelectedItemIds(data.items
                    .filter(item => item.responseType !== 'INFORMATION' && item.privacyLevel !== 'SENSITIVE')
                    .map(item => item.id));
            })
            .catch(error => {
                console.error('Failed to load manager consent responses:', error);
                if (active) setLoadError('응답 시트를 불러오지 못했습니다.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [eventId]);

    const responseItems = useMemo(() => (
        sheet?.items.filter(item => item.responseType !== 'INFORMATION') || []
    ), [sheet]);
    const filteredParticipants = useMemo(() => {
        if (!sheet) return [];
        const normalizedQuery = query.trim().toLocaleLowerCase();
        return sheet.participants.filter(participant => {
            const queryMatches = !normalizedQuery
                || participant.displayName.toLocaleLowerCase().includes(normalizedQuery);
            const filterMatches = filter === 'ALL'
                || (filter === 'COMPLETED' && participant.consentCompletedAt !== null)
                || (filter === 'PENDING' && participant.consentCompletedAt === null);
            return queryMatches && filterMatches;
        });
    }, [filter, query, sheet]);
    const completedCount = sheet?.participants.filter(participant => participant.consentCompletedAt).length || 0;

    const openPrivacyAction = (action: PrivacyAction) => {
        setPrivacyAction(action);
        setReason('');
        setIncludeSensitive(false);
        setCaptureWarningAcknowledged(false);
        setActionError(null);
        if (action === 'EXPORT' && sheet) {
            setSelectedItemIds(sheet.items
                .filter(item => item.responseType !== 'INFORMATION' && item.privacyLevel !== 'SENSITIVE')
                .map(item => item.id));
        }
    };

    const handleReveal = async () => {
        if (!sheet || reason.trim().length < 5) return;
        try {
            setActionBusy(true);
            setActionError(null);
            const revealedSheet = await revealManagerConsentResponses(eventId, reason.trim());
            setSheet(revealedSheet);
            setPrivacyAction(null);
        } catch (error) {
            setActionError(getApiErrorMessage(error) || '개인정보를 표시하지 못했습니다.');
        } finally {
            setActionBusy(false);
        }
    };

    const handleExport = async () => {
        if (!sheet || reason.trim().length < 5 || selectedItemIds.length === 0) return;
        try {
            setActionBusy(true);
            setActionError(null);
            await exportManagerConsentResponses(eventId, {
                reason: reason.trim(),
                includeSensitive,
                itemIds: selectedItemIds,
            });
            setPrivacyAction(null);
        } catch (error) {
            setActionError(getApiErrorMessage(error) || '응답 파일을 내보내지 못했습니다.');
        } finally {
            setActionBusy(false);
        }
    };

    if (loading) {
        return (
            <section className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm">
                <div className="h-5 w-36 animate-pulse rounded bg-zinc-100" />
                <div className="mt-4 h-36 animate-pulse rounded-2xl bg-zinc-50" />
            </section>
        );
    }

    if (loadError || !sheet) {
        return (
            <section className="rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
                <p className="text-sm font-bold text-red-600">{loadError || '응답 시트를 불러올 수 없습니다.'}</p>
            </section>
        );
    }

    return (
        <section className="overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-sm">
            <div className="border-b border-zinc-100 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <span className="rounded-xl bg-[#162660] p-2.5 text-white">
                            <FileSpreadsheet className="h-5 w-5" />
                        </span>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-base font-black text-zinc-900">참가자 응답 시트</h2>
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                                    제출 {completedCount}/{sheet.participants.length}
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">참가자별 응답을 한 표에서 확인하고 필요한 항목만 내보낼 수 있습니다.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {sheet.canRevealSensitive && !sheet.privateValuesRevealed && (
                            <button
                                type="button"
                                onClick={() => openPrivacyAction('REVEAL')}
                                className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-black text-zinc-700 hover:bg-zinc-50"
                            >
                                <Eye className="h-4 w-4" />
                                개인정보 보기
                            </button>
                        )}
                        {sheet.canExport && (
                            <button
                                type="button"
                                onClick={() => openPrivacyAction('EXPORT')}
                                className="flex items-center gap-1.5 rounded-xl bg-[#162660] px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-[#223678]"
                            >
                                <Download className="h-4 w-4" />
                                XLSX 내보내기
                            </button>
                        )}
                    </div>
                </div>

                {sheet.privateValuesRevealed && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-800">
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        개인정보와 민감정보가 표시 중입니다. 화면 공유와 주변 노출에 주의해 주세요. 열람 기록이 저장되었습니다.
                    </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                    <label className="relative min-w-[220px] flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            placeholder="참가자 이름 검색"
                            className="h-10 w-full rounded-xl border border-zinc-200 pl-9 pr-3 text-sm outline-none focus:border-[#162660] focus:ring-2 focus:ring-blue-100"
                        />
                    </label>
                    <label className="relative">
                        <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <select
                            value={filter}
                            onChange={event => setFilter(event.target.value as ResponseFilter)}
                            className="h-10 rounded-xl border border-zinc-200 bg-white pl-9 pr-8 text-xs font-bold text-zinc-700 outline-none"
                        >
                            <option value="ALL">전체 참가자</option>
                            <option value="COMPLETED">제출 완료</option>
                            <option value="PENDING">미제출</option>
                        </select>
                    </label>
                </div>
            </div>

            {responseItems.length === 0 ? (
                <div className="p-10 text-center text-sm font-bold text-zinc-400">응답을 받는 항목이 없습니다.</div>
            ) : (
                <div className="max-h-[520px] overflow-auto">
                    <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
                        <thead className="sticky top-0 z-20 bg-zinc-50 text-zinc-500">
                            <tr>
                                <th className="sticky left-0 z-30 min-w-44 border-b border-r border-zinc-200 bg-zinc-50 px-4 py-3 font-black">참가자</th>
                                <th className="min-w-24 border-b border-zinc-200 px-3 py-3 font-black">제출</th>
                                {responseItems.map(item => (
                                    <th key={item.id} className="min-w-44 max-w-64 border-b border-zinc-200 px-3 py-3 font-black">
                                        <span className="block leading-snug text-zinc-700">{item.title}</span>
                                        <span className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[9px] ${
                                            item.privacyLevel === 'SENSITIVE'
                                                ? 'bg-red-50 text-red-600'
                                                : item.privacyLevel === 'PERSONAL'
                                                    ? 'bg-amber-50 text-amber-700'
                                                    : 'bg-zinc-100 text-zinc-500'
                                        }`}>
                                            {privacyLabel[item.privacyLevel]}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredParticipants.map(participant => (
                                <tr key={participant.participantId} className="group hover:bg-blue-50/30">
                                    <td className="sticky left-0 z-10 border-b border-r border-zinc-100 bg-white px-4 py-3 group-hover:bg-blue-50">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedParticipant(participant)}
                                            className="text-left"
                                        >
                                            <span className="block font-black text-zinc-900 hover:text-[#162660]">{participant.displayName}</span>
                                            <span className="mt-0.5 block text-[10px] font-bold text-zinc-400">
                                                {participantStatusLabel[participant.status] || participant.status}
                                            </span>
                                        </button>
                                    </td>
                                    <td className="border-b border-zinc-100 px-3 py-3">
                                        {participant.consentCompletedAt ? (
                                            <span className="inline-flex items-center gap-1 whitespace-nowrap font-black text-emerald-700">
                                                <CheckCircle2 className="h-3.5 w-3.5" /> 완료
                                            </span>
                                        ) : (
                                            <span className="whitespace-nowrap font-bold text-amber-700">미제출</span>
                                        )}
                                        <span className="mt-1 block whitespace-nowrap text-[10px] text-zinc-400">
                                            {formatDateTime(participant.consentCompletedAt)}
                                        </span>
                                    </td>
                                    {responseItems.map(item => {
                                        const answer = getAnswer(participant, item.id);
                                        const value = answerText(item, answer);
                                        return (
                                            <td key={item.id} className="max-w-64 border-b border-zinc-100 px-3 py-3 align-top text-zinc-700">
                                                <div className="flex items-start gap-1.5">
                                                    {answer?.masked && <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />}
                                                    <span className={`line-clamp-2 whitespace-pre-wrap break-words ${
                                                        answer?.masked ? 'font-bold text-amber-700' : ''
                                                    }`}>{value}</span>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredParticipants.length === 0 && (
                        <div className="p-10 text-center text-sm font-bold text-zinc-400">조건에 맞는 참가자가 없습니다.</div>
                    )}
                </div>
            )}

            {selectedParticipant && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm" onMouseDown={event => {
                    if (event.currentTarget === event.target) setSelectedParticipant(null);
                }}>
                    <section role="dialog" aria-modal="true" aria-labelledby="participant-response-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                        <header className="flex items-start justify-between border-b border-zinc-100 p-5">
                            <div>
                                <h3 id="participant-response-title" className="font-black text-zinc-900">{selectedParticipant.displayName}</h3>
                                <p className="mt-1 text-xs text-zinc-500">제출 {formatDateTime(selectedParticipant.consentCompletedAt)}</p>
                            </div>
                            <button type="button" onClick={() => setSelectedParticipant(null)} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100" aria-label="응답 상세 닫기">
                                <X className="h-5 w-5" />
                            </button>
                        </header>
                        <div className="max-h-[calc(100dvh-8rem)] space-y-3 overflow-y-auto bg-zinc-50 p-4 sm:p-5">
                            {responseItems.map(item => {
                                const answer = getAnswer(selectedParticipant, item.id);
                                return (
                                    <div key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="text-xs font-black text-zinc-900">{item.title}</h4>
                                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-bold text-zinc-500">{privacyLabel[item.privacyLevel]}</span>
                                        </div>
                                        <div className="mt-2 flex items-start gap-2 whitespace-pre-wrap break-words text-sm text-zinc-700">
                                            {answer?.masked && <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
                                            {answerText(item, answer)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>,
                document.body,
            )}

            {privacyAction && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-sm" onMouseDown={event => {
                    if (event.currentTarget === event.target && !actionBusy) setPrivacyAction(null);
                }}>
                    <section role="dialog" aria-modal="true" aria-labelledby="privacy-action-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <span className="rounded-xl bg-amber-100 p-2 text-amber-700"><ShieldAlert className="h-5 w-5" /></span>
                                <div>
                                    <h3 id="privacy-action-title" className="font-black text-zinc-900">
                                        {privacyAction === 'REVEAL' ? '개인정보 열람' : '응답 XLSX 내보내기'}
                                    </h3>
                                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                                        {privacyAction === 'REVEAL'
                                            ? '열람 사유와 시각이 보안 기록에 저장됩니다.'
                                            : '다운로드된 파일은 회수하거나 접근을 취소할 수 없습니다.'}
                                    </p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setPrivacyAction(null)} disabled={actionBusy} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100" aria-label="개인정보 작업 닫기"><X className="h-5 w-5" /></button>
                        </div>

                        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
                            행사 운영 목적으로만 사용하고, 공유 드라이브·메신저 업로드를 피하며, 이용 목적이 끝나면 안전하게 삭제해 주세요.
                        </div>

                        <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                            <input
                                type="checkbox"
                                checked={captureWarningAcknowledged}
                                onChange={event => setCaptureWarningAcknowledged(event.target.checked)}
                                className="mt-0.5 accent-red-600"
                            />
                            <span className="flex min-w-0 gap-2">
                                <CameraOff className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                                <span>
                                    <span className="block text-xs font-black text-red-700">화면 캡처·녹화·공유 금지 확인</span>
                                    <span className="mt-1 block text-[10px] leading-relaxed text-red-600">참가자의 별도 동의 없이 이 화면을 캡처하거나 화면 공유하지 않겠습니다. 필요한 정보는 승인된 운영 절차로만 사용합니다.</span>
                                </span>
                            </span>
                        </label>

                        {privacyAction === 'EXPORT' && (
                            <div className="mt-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-zinc-700">내보낼 응답 항목</span>
                                    <span className="text-[10px] font-bold text-zinc-400">{selectedItemIds.length}개 선택</span>
                                </div>
                                <div className="max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-zinc-200 p-3">
                                    {responseItems.map(item => {
                                        const disabled = item.privacyLevel === 'SENSITIVE' && !includeSensitive;
                                        return (
                                            <label key={item.id} className={`flex items-start gap-2 rounded-xl p-2 ${disabled ? 'bg-zinc-50 text-zinc-400' : 'hover:bg-zinc-50'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItemIds.includes(item.id)}
                                                    disabled={disabled}
                                                    onChange={event => setSelectedItemIds(current => {
                                                        if (!event.target.checked) return current.filter(id => id !== item.id);
                                                        const nextIds = new Set([...current, item.id]);
                                                        if (item.privacyLevel === 'SENSITIVE' && item.responseType !== 'CHECKBOX') {
                                                            responseItems
                                                                .filter(candidate => candidate.category === 'SENSITIVE_INFORMATION'
                                                                    && candidate.responseType === 'CHECKBOX')
                                                                .forEach(candidate => nextIds.add(candidate.id));
                                                        }
                                                        return [...nextIds];
                                                    })}
                                                    className="mt-0.5 accent-[#162660]"
                                                />
                                                <span className="min-w-0 flex-1 text-xs font-bold leading-relaxed">{item.title}</span>
                                                <span className="shrink-0 text-[9px] font-bold">{privacyLabel[item.privacyLevel]}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                <label className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-3">
                                    <input
                                        type="checkbox"
                                        checked={includeSensitive}
                                        onChange={event => {
                                            setIncludeSensitive(event.target.checked);
                                            if (!event.target.checked) {
                                                const sensitiveIds = new Set(responseItems.filter(item => item.privacyLevel === 'SENSITIVE').map(item => item.id));
                                                setSelectedItemIds(current => current.filter(id => !sensitiveIds.has(id)));
                                            }
                                        }}
                                        className="mt-0.5 accent-red-600"
                                    />
                                    <span>
                                        <span className="block text-xs font-black text-red-700">건강·복용 약물 등 민감정보 포함</span>
                                        <span className="mt-1 block text-[10px] leading-relaxed text-red-600">기본적으로 제외됩니다. 현장 안전 운영에 꼭 필요한 경우에만 포함하세요.</span>
                                    </span>
                                </label>
                            </div>
                        )}

                        <label className="mt-5 block">
                            <span className="text-xs font-black text-zinc-700">{privacyAction === 'REVEAL' ? '열람 사유' : '내보내기 사유'} *</span>
                            <textarea
                                value={reason}
                                onChange={event => setReason(event.target.value)}
                                maxLength={300}
                                rows={3}
                                placeholder="예: 행사 당일 안전 담당자에게 긴급 연락 및 건강 유의사항 전달"
                                className="mt-2 w-full resize-none rounded-2xl border border-zinc-200 px-3.5 py-3 text-sm outline-none focus:border-[#162660] focus:ring-2 focus:ring-blue-100"
                            />
                            <span className="mt-1 block text-right text-[10px] text-zinc-400">{reason.trim().length}/300 · 최소 5자</span>
                        </label>

                        {actionError && <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">{actionError}</p>}
                        <button
                            type="button"
                            onClick={privacyAction === 'REVEAL' ? handleReveal : handleExport}
                            disabled={actionBusy || !captureWarningAcknowledged || reason.trim().length < 5 || (privacyAction === 'EXPORT' && selectedItemIds.length === 0)}
                            className="mt-5 h-12 w-full rounded-xl bg-[#162660] text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {actionBusy
                                ? '처리 중...'
                                : privacyAction === 'REVEAL'
                                    ? '사유를 기록하고 개인정보 보기'
                                    : '주의사항을 확인하고 XLSX 내보내기'}
                        </button>
                    </section>
                </div>,
                document.body,
            )}
        </section>
    );
}
