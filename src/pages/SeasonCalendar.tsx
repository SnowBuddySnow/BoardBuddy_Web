import { SEASON_HOUSE_RESERVATIONS_ENABLED, getOperatingFeatures, getOperatingMode } from '../constants/operatingSeason';
import { lazy } from 'react';
const ReservationStats = lazy(() => import('./ReservationStats'));

/** Share the established crew calendar and its member/manager permissions. */
export default function SeasonCalendar({ onBack, onMyCalendarClick, onReservationClick }: { onBack: () => void; onMyCalendarClick?: () => void; onReservationClick?: () => void }) {
    return <ReservationStats title="시즌방 캘린더" onBack={onBack} onMyCalendarClick={onMyCalendarClick} onReservationClick={onReservationClick} readOnly={!SEASON_HOUSE_RESERVATIONS_ENABLED || !getOperatingFeatures(getOperatingMode()).season} />;
}
