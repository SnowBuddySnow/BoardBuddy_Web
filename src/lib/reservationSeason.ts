/**
 * Reservation season: October 1 – March 31 (same rule as the server's automatic pass period).
 * January–March belong to the season that began the previous October; from April the calendar
 * shows the coming season.
 */
export function getReservationSeason(now = new Date()) {
    const startYear = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
    const start = new Date(startYear, 9, 1);
    const end = new Date(startYear + 1, 2, 31);
    const initialDate = now < start ? start : now > end ? end : new Date(now);
    return { start, end, initialDate };
}
