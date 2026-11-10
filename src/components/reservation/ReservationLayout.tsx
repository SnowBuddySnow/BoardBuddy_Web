import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import './reservation.css';

export function ReservationLayout({ title, onBack, action, children }: {
    title: string;
    onBack: () => void;
    action?: ReactNode;
    children: ReactNode;
}) {
    return <div className="reservation-shell">
        <header className="reservation-header">
            <button type="button" onClick={onBack} aria-label="뒤로 가기" className="reservation-back"><ChevronLeft className="h-5 w-5" /></button>
            <h1>{title}</h1>
            <div className="reservation-header-action">{action}</div>
        </header>
        {children}
    </div>;
}

export function ReservationSummary({ title, description, value }: { title: string; description?: string; value?: ReactNode }) {
    return <section className="reservation-summary">
        <div className="min-w-0"><h2>{title}</h2>{description && <p>{description}</p>}</div>
        {value && <div className="reservation-summary-value">{value}</div>}
    </section>;
}
