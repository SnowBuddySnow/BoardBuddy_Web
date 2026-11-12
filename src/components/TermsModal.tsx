import { XIcon } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TermsModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: string;
    onAgree?: () => void;
}

export function TermsModal({ isOpen, onClose, title, content, onAgree }: TermsModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const close = useRef(onClose);
    const titleId = useId();
    useEffect(() => { close.current = onClose; }, [onClose]);
    useEffect(() => {
        if (!isOpen) return;
        const previousFocus = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        modalRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') { event.preventDefault(); close.current(); }
            if (event.key !== 'Tab') return;
            const items = Array.from(modalRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || []);
            const first = items[0]; const last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        };
        document.addEventListener('keydown', handleKey);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKey);
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, [isOpen]);
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-zinc-950/50 p-3 sm:p-6"
            onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
            <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={titleId}
                className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white text-zinc-900 shadow-xl sm:max-h-[85dvh]">
                <div className="flex shrink-0 items-start justify-between gap-2 border-b border-zinc-200 p-5">
                    <h2 id={titleId} className="min-w-0 break-words text-lg font-bold">{title}</h2>
                    <button type="button" onClick={onClose} aria-label="약관 닫기" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-zinc-100">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
                <div role="region" aria-label="약관 본문" tabIndex={0} className="min-h-0 flex-1 overflow-y-auto overscroll-contain whitespace-pre-wrap break-words p-5 text-sm leading-7 text-zinc-700">{content}</div>
                <div className="flex shrink-0 flex-wrap gap-3 border-t border-zinc-200 p-4">
                    <button type="button" onClick={onClose} className="min-h-12 flex-1 rounded-xl border border-zinc-300 px-4 font-bold">닫기</button>
                    {onAgree && <button type="button" onClick={onAgree} className="min-h-12 flex-[2] rounded-xl bg-[#162660] px-4 font-bold text-white">이 약관에 동의</button>}
                </div>
            </div>
        </div>, document.body,
    );
}
