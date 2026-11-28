import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m } from 'motion/react';
import BuddyMascot from '../BuddyMascot';
import { dialogMotion, overlayMotion, springSoft } from '../../lib/motion';
import { FeedbackContext, type FeedbackApi, type ResultInput, type ResultTone, type ToastInput } from './feedbackContext';

const toneCopy: Record<ResultTone, { ring: string; label: string }> = {
    success: { ring: 'bg-emerald-50', label: '완료' },
    waiting: { ring: 'bg-amber-50', label: '대기' },
    info: { ring: 'bg-brand-navy/5', label: '안내' },
    error: { ring: 'bg-rose-50', label: '확인 필요' },
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
    const [result, setResult] = useState<ResultInput | null>(null);
    const [toasts, setToasts] = useState<Array<ToastInput & { id: number }>>([]);
    const nextId = useRef(1);
    const closeRef = useRef<HTMLButtonElement>(null);

    const dismissToast = useCallback((id: number) => setToasts(list => list.filter(item => item.id !== id)), []);
    const api = useMemo<FeedbackApi>(() => ({
        showResult: input => setResult(input),
        toast: input => {
            const id = nextId.current++;
            setToasts(list => [...list.slice(-2), { ...input, id }]);
            window.setTimeout(() => setToasts(list => list.filter(item => item.id !== id)), input.actionLabel ? 6000 : 3500);
        },
    }), []);

    useEffect(() => {
        if (!result) return;
        closeRef.current?.focus();
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setResult(null); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [result]);

    const tone = result ? toneCopy[result.tone] : null;
    const actions = result?.actions?.length ? result.actions : [{ label: '확인', primary: true }];

    return (
        <FeedbackContext.Provider value={api}>
            {children}
            {createPortal(
                <>
                    <AnimatePresence>
                        {result && tone && (
                            <m.div key="result" {...overlayMotion} className="fixed inset-0 z-[2100] flex items-end justify-center bg-zinc-950/40 p-3 sm:items-center sm:p-6"
                                onClick={event => { if (event.target === event.currentTarget) setResult(null); }}>
                                <m.div {...dialogMotion} role="dialog" aria-modal="true" aria-labelledby="feedback-result-title"
                                    className="w-full max-w-sm rounded-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center shadow-2xl sm:p-6">
                                    {result.tone !== 'error'
                                        ? <span className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${tone.ring}`}><BuddyMascot size={88} /></span>
                                        : <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-black text-rose-600 ${tone.ring}`} aria-hidden="true">!</span>}
                                    <p className="mt-3 text-[11px] font-bold text-zinc-400">{tone.label}</p>
                                    <h2 id="feedback-result-title" className="mt-0.5 text-lg font-black text-zinc-900">{result.title}</h2>
                                    {result.body && <div className="mt-1.5 text-sm leading-6 text-zinc-600">{result.body}</div>}
                                    <div className="mt-5 flex gap-2">
                                        {actions.map((action, index) => (
                                            <button key={action.label} ref={index === actions.length - 1 ? closeRef : undefined} type="button"
                                                onClick={() => { setResult(null); action.onClick?.(); }}
                                                className={`min-h-12 flex-1 rounded-xl px-4 text-sm font-bold ${action.primary || actions.length === 1 ? 'bg-brand-navy text-white hover:bg-brand-navy-deep' : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'}`}>
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>
                                </m.div>
                            </m.div>
                        )}
                    </AnimatePresence>
                    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] z-[2200] flex flex-col items-center gap-2 px-4 lg:bottom-8">
                        <AnimatePresence initial={false}>
                            {toasts.map(item => (
                                <m.div key={item.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={springSoft}
                                    role="status"
                                    className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg ${item.tone === 'error' ? 'bg-rose-600 text-white' : 'bg-zinc-900 text-white'}`}>
                                    <span className="min-w-0 flex-1">{item.message}</span>
                                    {item.actionLabel && <button type="button" onClick={() => { dismissToast(item.id); item.onAction?.(); }} className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-brand-sun hover:bg-white/10">{item.actionLabel}</button>}
                                </m.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </>,
                document.body,
            )}
        </FeedbackContext.Provider>
    );
}
