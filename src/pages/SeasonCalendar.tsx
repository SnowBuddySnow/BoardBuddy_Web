import { SEASON_HOUSE_RESERVATIONS_ENABLED, getOperatingFeatures, getOperatingMode } from '../constants/operatingSeason';
import { lazy } from 'react';
const ReservationStats = lazy(() => import('./ReservationStats'));

/** Share the established crew calendar and its member/manager permissions. */
export default function SeasonCalendar({ onBack }: { onBack: () => void }) {
    return <ReservationStats title="시즌방 캘린더" onBack={onBack} readOnly={!SEASON_HOUSE_RESERVATIONS_ENABLED || !getOperatingFeatures(getOperatingMode()).season} />;
}
