/** Keep the existing October–May calendar window aligned with the current winter. */
export function getReservationSeason(now = new Date()) {
    const startYear = now.getMonth() < 5 ? now.getFullYear() - 1 : now.getFullYear();
    const start = new Date(startYear, 9, 1);
    const end = new Date(startYear + 1, 4, 31);
    const initialDate = now < start ? start : now > end ? end : new Date(now);
    return { start, end, initialDate };
}
