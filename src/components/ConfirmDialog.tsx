import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m } from 'motion/react';
import { dialogMotion, overlayMotion } from '../lib/motion';

/**
 * In-app confirmation for irreversible actions (e.g. cancelling a booking).
 * Escape or the backdrop closes it unless `busy`; focus starts on the safe choice.
 */
export default function ConfirmDialog({
    open,
    title,
    children,
    confirmLabel,
    cancelLabel = '돌아가기',
    tone = 'danger',
    busy = false,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    title: string;
    children?: ReactNode;
    confirmLabel: string;
    cancelLabel?: string;
    tone?: 'danger' | 'primary';
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const titleId = useId();
    const cancelRef = useRef<HTMLButtonElement>(null);
    const cancel = useRef(onCancel);
    const busyRef = useRef(busy);
    useEffect(() => { cancel.current = onCancel; busyRef.current = busy; });

    useEffect(() => {
        if (!open) return;
        const previous = document.activeElement as HTMLElement | null;
        cancelRef.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !busyRef.current) { event.preventDefault(); cancel.current(); }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            if (previous?.isConnected) previous.focus();
        };
    }, [open]);

    return createPortal(
        <AnimatePresence>
            {open && (
                <m.div
                    {...overlayMotion}
                    className="fixed inset-0 z-[2000] flex items-end justify-center bg-zinc-950/45 p-4 backdrop-blur-[2px] sm:items-center"
                    onClick={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}
                >
                    <m.div
                        {...dialogMotion}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl sm:p-6"
                    >
                        <h2 id={titleId} className="text-lg font-black text-zinc-900">{title}</h2>
                        {children && <div className="mt-2 text-sm leading-6 text-zinc-600">{children}</div>}
                        <div className="mt-5 flex gap-2">
                            <button
                                ref={cancelRef}
                                type="button"
                                disabled={busy}
                                onClick={onCancel}
                                className="min-h-12 flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={onConfirm}
                                className={`min-h-12 flex-1 rounded-xl px-4 text-sm font-bold text-white disabled:opacity-60 ${tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand-navy hover:bg-brand-navy-deep'}`}
                            >
                                {busy ? '처리 중…' : confirmLabel}
                            </button>
                        </div>
                    </m.div>
                </m.div>
            )}
        </AnimatePresence>,
        document.body,
    );
}
