import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, Copy, Link2, QrCode, RefreshCw, Share2, Trash2 } from 'lucide-react';
import { guestInvitationTokenUrl, type GuestDestination } from '../../lib/guestInvitation';
import {
    createGuestInvitation,
    listMyGuestInvitations,
    revokeGuestInvitation,
    type GuestInvitationRecord,
} from '../../services/guestInvitation';
import { getApiErrorMessage } from '../../lib/apiError';
import { parseEventDateTime } from '../../lib/eventDateTime';

interface GuestInviteShareCardProps {
    destination: GuestDestination;
    title: string;
    description: string;
    shareTitle?: string;
    shareText?: string;
    compact?: boolean;
    className?: string;
}

const formatKoreanDateTime = (value: string) =>
    parseEventDateTime(value)?.toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }) || value;

const statusLabel: Record<GuestInvitationRecord['status'], string> = {
    AVAILABLE: '사용 가능',
    USED: '사용 완료',
    REVOKED: '회수됨',
    EXPIRED: '만료됨',
};

export function GuestInviteShareCard({
    destination,
    title,
    description,
    shareTitle,
    shareText,
    compact = false,
    className = '',
}: GuestInviteShareCardProps) {
    const fieldId = useId();
    const loadRevision = useRef(0);
    const [created, setCreated] = useState<{ id: string; url: string; expiresAt: string } | null>(null);
    const [invitations, setInvitations] = useState<GuestInvitationRecord[]>([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [busy, setBusy] = useState(false);
    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [qrOpen, setQrOpen] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [qrError, setQrError] = useState('');
    const feedbackTimerRef = useRef<number | null>(null);
    const lastAnnouncementRef = useRef('');

    const destinationType = destination.type;
    const destinationId = destination.id;

    const loadHistory = useCallback(async () => {
        const revision = ++loadRevision.current;
        setLoadingHistory(true);
        try {
            const rows = await listMyGuestInvitations({ type: destinationType, id: destinationId });
            if (revision === loadRevision.current) {
                setInvitations(Array.isArray(rows) ? rows : []);
            }
        } catch {
            // History is supplemental; link generation still works if history fails to load.
        } finally {
            if (revision === loadRevision.current) {
                setLoadingHistory(false);
            }
        }
    }, [destinationId, destinationType]);

    useEffect(() => {
        setCreated(null);
        setInvitations([]);
        setHistoryOpen(false);
        setQrDataUrl('');
        setQrError('');
        setQrOpen(false);
        setErrorMessage('');
    }, [destinationId, destinationType]);

    useEffect(() => () => {
        if (feedbackTimerRef.current !== null) {
            window.clearTimeout(feedbackTimerRef.current);
        }
    }, []);

    const announce = (message: string, state: 'copied' | 'failed') => {
        if (feedbackTimerRef.current !== null) {
            window.clearTimeout(feedbackTimerRef.current);
        }
        const nextMessage = message === lastAnnouncementRef.current ? `${message}\u00A0` : message;
        lastAnnouncementRef.current = nextMessage;
        setCopyState(state);
        setStatusMessage(nextMessage);
        feedbackTimerRef.current = window.setTimeout(() => {
            setCopyState('idle');
            setStatusMessage('');
            feedbackTimerRef.current = null;
        }, 2500);
    };

    const handleGenerate = async () => {
        if (busy) return;
        setBusy(true);
        setErrorMessage('');
        setQrDataUrl('');
        setQrError('');
        setQrOpen(false);
        try {
            const result = await createGuestInvitation({ type: destinationType, id: destinationId });
            const url = guestInvitationTokenUrl(result.token);
            setCreated({ id: result.invitation.id, url, expiresAt: result.invitation.expiresAt });
            setHistoryOpen(true);
            setInvitations(current => [result.invitation, ...current.filter(item => item.id !== result.invitation.id)].slice(0, 20));
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error) || '게스트 초대 링크를 만들지 못했습니다.');
        } finally {
            setBusy(false);
        }
    };

    const handleRevoke = async (invitationId: string) => {
        if (busy) return;
        setBusy(true);
        setErrorMessage('');
        try {
            await revokeGuestInvitation(invitationId);
            if (created?.id === invitationId) {
                setCreated(null);
                setQrDataUrl('');
                setQrOpen(false);
            }
            setInvitations(current =>
                current.map(item => (item.id === invitationId ? { ...item, status: 'REVOKED' } : item))
            );
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error) || '초대 링크를 회수하지 못했습니다.');
        } finally {
            setBusy(false);
        }
    };

    const handleCopy = async () => {
        if (!created) return;
        try {
            if (!navigator.clipboard?.writeText) {
                throw new Error('Clipboard API unavailable');
            }
            await navigator.clipboard.writeText(created.url);
            announce('1회용 초대 링크를 복사했어요.', 'copied');
        } catch {
            announce('복사에 실패했어요. 링크를 직접 선택해 복사해 주세요.', 'failed');
        }
    };

    const handleShare = async () => {
        if (!created || typeof navigator.share !== 'function') return;
        try {
            await navigator.share({
                title: shareTitle || title,
                text: shareText || description,
                url: created.url,
            });
            announce('초대 링크를 공유했어요.', 'copied');
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            await handleCopy();
        }
    };

    const handleToggleQr = async () => {
        if (!created) return;
        if (qrOpen) {
            setQrOpen(false);
            return;
        }
        setQrOpen(true);
        setQrError('');
        if (qrDataUrl) return;
        try {
            const QRCode = await import('qrcode');
            setQrDataUrl(await QRCode.toDataURL(created.url, { width: 220, margin: 4, errorCorrectionLevel: 'M' }));
        } catch {
            setQrError('QR 코드를 만들지 못했습니다. 위 초대 링크를 공유해 주세요.');
        }
    };

    const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    const availableCount = invitations.filter(item => item.status === 'AVAILABLE').length;

    return (
        <section
            aria-label={title}
            className={`min-w-0 rounded-3xl border border-zinc-200 bg-white ${compact ? 'p-4' : 'p-5'} shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`.trim()}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-sm font-black text-[#162660] dark:text-blue-200">
                        <Link2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                        <span>{title}</span>
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{description}</p>
                </div>
                <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-[#162660] dark:bg-blue-950/60 dark:text-blue-200">
                    1회용
                </span>
            </div>

            <button
                type="button"
                disabled={busy}
                onClick={() => void handleGenerate()}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#162660] px-4 text-xs font-bold text-white transition-colors hover:bg-[#243878] disabled:opacity-60"
            >
                <RefreshCw aria-hidden="true" className={`h-4 w-4 shrink-0 ${busy ? 'animate-spin' : ''}`} />
                <span>{busy ? '링크 만드는 중...' : created ? '새 초대 링크 다시 만들기 (추가 게스트용)' : '1회용 초대 링크 만들기'}</span>
            </button>

            {errorMessage && (
                <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                    {errorMessage}
                </p>
            )}

            {created && (
                <div className="mt-3 rounded-2xl bg-[#FAF8F3] p-3.5 dark:bg-zinc-800/80">
                    <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                        게스트 1명당 1회만 사용할 수 있어요. 여러 명을 초대하려면 위 버튼으로 링크를 새로 만들어 주세요.
                    </p>
                    <div className="mt-2">
                        <label htmlFor={fieldId} className="sr-only">{title}</label>
                        <input
                            id={fieldId}
                            type="text"
                            readOnly
                            value={created.url}
                            onFocus={event => event.currentTarget.select()}
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-[#162660] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                        />
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-2">
                        <button
                            type="button"
                            data-copied={copyState === 'copied' ? '' : undefined}
                            data-failed={copyState === 'failed' ? '' : undefined}
                            onClick={() => void handleCopy()}
                            className="inline-flex min-h-11 min-w-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#162660] px-3 text-xs font-bold text-white transition-colors hover:bg-[#243878]"
                        >
                            {copyState === 'copied' ? (
                                <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
                            ) : (
                                <Copy aria-hidden="true" className="h-4 w-4 shrink-0" />
                            )}
                            <span>{copyState === 'copied' ? '복사됨' : '초대 링크 복사'}</span>
                        </button>

                        {canNativeShare && (
                            <button
                                type="button"
                                onClick={() => void handleShare()}
                                className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-[#162660] bg-white px-3 text-xs font-bold text-[#162660] transition-colors hover:bg-blue-50"
                            >
                                <Share2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                                <span>공유하기</span>
                            </button>
                        )}

                        <button
                            type="button"
                            aria-expanded={qrOpen}
                            onClick={() => void handleToggleQr()}
                            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                        >
                            <QrCode aria-hidden="true" className="h-4 w-4 shrink-0" />
                            <span>{qrOpen ? 'QR 숨기기' : 'QR 보기'}</span>
                        </button>
                    </div>

                    <p
                        role="status"
                        aria-live="polite"
                        className={`mt-2 min-h-4 text-xs font-semibold transition-opacity ${
                            statusMessage ? 'opacity-100' : 'opacity-0'
                        } ${copyState === 'failed' ? 'text-red-600' : 'text-[#162660] dark:text-blue-200'}`}
                    >
                        {statusMessage}
                    </p>

                    {qrOpen && (
                        <div className="mt-2 rounded-xl bg-white p-3 text-center dark:bg-zinc-900">
                            {qrDataUrl && (
                                <img
                                    src={qrDataUrl}
                                    alt={`${title} QR 코드`}
                                    width={220}
                                    height={220}
                                    className="mx-auto h-auto max-w-full rounded-lg bg-white p-1"
                                />
                            )}
                            {qrError && <p role="alert" className="text-xs font-semibold text-red-600">{qrError}</p>}
                            <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                                QR을 스캔하거나 위 링크를 열면 1회 사용되며 게스트 신청 화면으로 연결돼요.
                            </p>
                        </div>
                    )}
                </div>
            )}

            <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <button
                    type="button"
                    aria-expanded={historyOpen}
                    onClick={() => {
                        const nextOpen = !historyOpen;
                        setHistoryOpen(nextOpen);
                        if (nextOpen) void loadHistory();
                    }}
                    className="flex w-full items-center justify-between text-left text-[11px] font-bold text-zinc-500 hover:text-[#162660] dark:text-zinc-400"
                >
                    <span>
                        {invitations.length > 0
                            ? `내가 만든 초대 링크 (${availableCount}개 사용 가능 · 총 ${invitations.length}개)`
                            : '내가 만든 초대 링크 보기'}
                    </span>
                    <span>{historyOpen ? '접기' : '열기'}</span>
                </button>
                {historyOpen && (
                    loadingHistory && invitations.length === 0 ? (
                        <p role="status" className="mt-2 text-xs text-zinc-400">초대 링크 목록을 불러오는 중...</p>
                    ) : invitations.length === 0 ? (
                        <p className="mt-2 text-xs text-zinc-400">아직 만든 초대 링크가 없습니다.</p>
                    ) : (
                        <ul className="mt-2 space-y-1.5">
                            {invitations.slice(0, 5).map(item => (
                                <li
                                    key={item.id}
                                    className="flex items-center justify-between gap-2 rounded-xl border border-zinc-100 px-3 py-2 text-xs dark:border-zinc-800"
                                >
                                    <span className="min-w-0 truncate text-zinc-600 dark:text-zinc-300">
                                        <strong className={item.status === 'AVAILABLE' ? 'text-[#162660] dark:text-blue-200' : 'text-zinc-400'}>
                                            {statusLabel[item.status]}
                                        </strong>
                                        <span className="ml-2 text-[11px] text-zinc-400">
                                            만료 {formatKoreanDateTime(item.expiresAt)}
                                        </span>
                                    </span>
                                    {item.status === 'AVAILABLE' && (
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => void handleRevoke(item.id)}
                                            className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-zinc-200 px-2 text-[11px] font-bold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                                        >
                                            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                                            <span>회수</span>
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )
                )}
            </div>
        </section>
    );
}
