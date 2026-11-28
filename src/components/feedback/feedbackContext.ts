import { createContext, useContext, type ReactNode } from 'react';

export type ResultTone = 'success' | 'waiting' | 'info' | 'error';
export interface ResultAction { label: string; onClick?: () => void; primary?: boolean }
export interface ResultInput { tone: ResultTone; title: string; body?: ReactNode; actions?: ResultAction[] }
export interface ToastInput { message: string; actionLabel?: string; onAction?: () => void; tone?: 'default' | 'error' }

export interface FeedbackApi {
    /** Important outcomes (booking confirmed, waitlisted, failed): an in-app bottom sheet. */
    showResult: (result: ResultInput) => void;
    /** Light outcomes (saved, cancelled): a toast that disappears on its own. */
    toast: (toast: ToastInput) => void;
}

const plain = (node: ReactNode) => (typeof node === 'string' || typeof node === 'number' ? String(node) : '');

/** Without a provider (unit tests, isolated renders) fall back to the old blocking alert. */
const fallback: FeedbackApi = {
    showResult: ({ title, body }) => window.alert([title, plain(body)].filter(Boolean).join('\n')),
    toast: ({ message }) => window.alert(message),
};

export const FeedbackContext = createContext<FeedbackApi>(fallback);
export const useFeedback = () => useContext(FeedbackContext);

