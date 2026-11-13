import { lazy } from 'react';
const ReservationStats = lazy(() => import('./ReservationStats'));

/** Reuse the established crew-calendar UI without reopening held reservation writes. */
export default function SeasonCalendar({ onBack }: { onBack: () => void }) {
    return <ReservationStats onBack={onBack} readOnly />;
}
