import { useEffect, useId, useRef, useState } from 'react';
import { Check, Copy, Link2, QrCode, Share2 } from 'lucide-react';
import { formatGuestCode, guestInvitationUrl, type GuestDestination } from '../../lib/guestInvitation';

interface GuestInviteShareCardProps {
    destination: GuestDestination;
    title: string;
    description: string;
    shareTitle?: string;
    shareText?: string;
    compact?: boolean;
    className?: string;
}

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
    const link = guestInvitationUrl(destination);
    const shortCode = formatGuestCode(destination);
    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [qrOpen, setQrOpen] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [qrError, setQrError] = useState('');
    const feedbackTimerRef = useRef<number | null>(null);
    const lastAnnouncementRef = useRef('');

    useEffect(() => () => {
        if (feedbackTimerRef.current !== null) {
            window.clearTimeout(feedbackTimerRef.current);
        }
    }, []);

    useEffect(() => {
        setQrDataUrl('');
        setQrError('');
        setQrOpen(false);
    }, [link]);

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

    const handleCopy = async () => {
        try {
            if (!navigator.clipboard?.writeText) {
                throw new Error('Clipboard API unavailable');
            }
            await navigator.clipboard.writeText(link);
            announce('초대 링크를 복사했어요.', 'copied');
        } catch {
            announce('복사에 실패했어요. 링크를 직접 선택해 복사해 주세요.', 'failed');
        }
    };

    const handleShare = async () => {
        if (typeof navigator.share !== 'function') return;
        try {
            await navigator.share({
                title: shareTitle || title,
                text: shareText || description,
                url: link,
            });
            announce('초대 링크를 공유했어요.', 'copied');
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            await handleCopy();
        }
    };

    const handleToggleQr = async () => {
        if (qrOpen) {
            setQrOpen(false);
            return;
        }
        setQrOpen(true);
        setQrError('');
        if (qrDataUrl) return;
        try {
            const QRCode = await import('qrcode');
            setQrDataUrl(await QRCode.toDataURL(link, { width: 220, margin: 4, errorCorrectionLevel: 'M' }));
        } catch {
            setQrError('QR 코드를 만들지 못했습니다. 위 초대 링크를 공유해 주세요.');
        }
    };

    const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

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
                    {shortCode}
                </span>
            </div>

            <div className="mt-3">
                <label htmlFor={fieldId} className="sr-only">{title}</label>
                <input
                    id={fieldId}
                    type="text"
                    readOnly
                    value={link}
                    onFocus={event => event.currentTarget.select()}
                    className="w-full rounded-xl border border-zinc-200 bg-[#FAF8F3] px-3 py-2.5 text-xs font-semibold text-zinc-700 outline-none focus:border-[#162660] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
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
                    className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
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
                <div className="mt-2 rounded-2xl bg-[#FAF8F3] p-4 text-center dark:bg-zinc-800">
                    {qrDataUrl && (
                        <img
                            src={qrDataUrl}
                            alt={`${title} QR 코드`}
                            width={220}
                            height={220}
                            className="mx-auto h-auto max-w-full rounded-xl bg-white p-2"
                        />
                    )}
                    {qrError && <p role="alert" className="text-xs font-semibold text-red-600">{qrError}</p>}
                    <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                        QR을 스캔하거나 위 링크를 열면 동일하게 게스트 신청 화면으로 연결돼요.
                    </p>
                </div>
            )}
        </section>
    );
}
