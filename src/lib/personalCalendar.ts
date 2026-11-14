import type { MyReservation } from '../types/api';
export const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const reservationState = (status?: string) => status?.toLowerCase() === 'confirmed' ? 'confirmed' : ['waiting','pending'].includes(status?.toLowerCase() ?? '') ? 'waiting' : null;
export const reservationOn = (items: MyReservation[], date: string) => items.find(item => item.date.slice(0,10) === date && reservationState(item.status));
