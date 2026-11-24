import apiClient from '../lib/axios';
import type { ApiResponse } from '../types/api';

export type DayOfWeek = 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';
export type GuestApprovalMode = 'INVITE_REQUIRED' | 'INVITE_WITH_MANAGER_APPROVAL' | 'OPEN_LINK';
export type StayChargeKind = 'PASS_FEE' | 'STAY_USAGE_FEE';
export type StayChargeStatus = 'UNPAID' | 'PAID' | 'WAIVED' | 'REFUNDED';
export type ManagerNoteCategory = 'PENALTY' | 'CLEANING' | 'FACILITY' | 'GENERAL';
export type MatrixReservationStatus = 'PENDING_APPROVAL' | 'CONFIRMED' | 'WAITING' | 'CANCELED' | 'REJECTED';

export interface SeasonHousePolicyView {
  active: boolean;
  dailyCapacity: number;
  capacityLimited: boolean;
  teachingEnabled: boolean;
  openDayOfWeek: DayOfWeek | null;
  openTimeKst: string | null;
  openOffsetDays: number;
  bookingWindowDays: number;
  cancelCutoffDayOffset: number;
  cancelCutoffTimeKst: string;
  guestEnabled: boolean;
  guestApprovalMode: GuestApprovalMode;
  guestDailyCapacity: number | null;
  guestPerNightFeeKrw: number;
}

export interface SeasonPassPlanView {
  id: number;
  name: string;
  startsOn: string;
  endsOn: string;
  totalNights: number | null;
  passFeeKrw: number;
  perNightFeeKrw: number;
  active: boolean;
}

export interface StayChargeView {
  id: number;
  chargeKind: StayChargeKind;
  memberSeasonPassId: number | null;
  reservationId: number | null;
  amountKrw: number;
  paymentStatus: StayChargeStatus;
  depositorName: string | null;
  paidAt: string | null;
  note: string | null;
}

export interface PassCellSummary {
  passId: number;
  planId: number | null;
  name: string;
  startsOn: string;
  endsOn: string;
  totalNights: number | null;
  usedNights: number;
  reservedNights: number;
  remainingNights: number | null;
  perNightFeeKrw: number;
  passCharge: StayChargeView | null;
}

export interface MatrixCellView {
  reservationId: number;
  status: MatrixReservationStatus;
  stayCompleted: boolean;
  waitlistPosition: number | null;
  teachingRequested: boolean;
  managerMemo: string | null;
  usageCharge: StayChargeView | null;
}

export interface MemberMatrixRow {
  membershipId: number;
  accountId: number;
  name: string;
  studentNumber: string | null;
  role: string;
  pass: PassCellSummary | null;
  penaltyPoints: number;
  noteCount: number;
  latestNotePreview: string | null;
  cells: Record<string, MatrixCellView>;
}

export interface GuestMatrixRow {
  guestId: number;
  guestCode: string;
  name: string;
  maskedPhone: string;
  phoneVerifiedAt: string;
  invitedByName: string;
  cells: Record<string, MatrixCellView>;
}

export interface CalendarEventBanner {
  eventId: number;
  publicCode: string;
  title: string;
  activityType: string | null;
  startsAt: string;
  endsAt: string;
}

export interface MatrixDayColumn {
  date: string;
  pastCutoff: boolean;
  cancelCutoffAtKst: string;
  confirmedCount: number;
  confirmedGuestCount: number;
  waitingCount: number;
  pendingApprovalCount: number;
}

export interface SeasonHouseMatrixView {
  crewId: number;
  crewName: string;
  from: string;
  to: string;
  serverNowKst: string;
  policy: SeasonHousePolicyView;
  passPlans: SeasonPassPlanView[];
  days: MatrixDayColumn[];
  internalEvents: CalendarEventBanner[];
  members: MemberMatrixRow[];
  guests: GuestMatrixRow[];
}

export interface ManagerNoteView {
  id: number;
  membershipId: number;
  category: ManagerNoteCategory;
  occurredOn: string | null;
  penaltyDelta: number;
  content: string;
  authorName: string;
  createdAt: string | null;
}

export interface UpdatePolicyPayload {
  active?: boolean;
  dailyCapacity?: number;
  capacityLimited?: boolean;
  teachingEnabled?: boolean;
  alwaysOpen?: boolean;
  openDayOfWeek?: DayOfWeek | null;
  openTimeKst?: string | null;
  openOffsetDays?: number;
  bookingWindowDays?: number;
  cancelCutoffDayOffset?: number;
  cancelCutoffTimeKst?: string;
  guestEnabled?: boolean;
  guestApprovalMode?: GuestApprovalMode;
  guestDailyCapacity?: number | null;
  clearGuestDailyCapacity?: boolean;
  guestPerNightFeeKrw?: number;
}

export interface UpsertChargePayload {
  chargeKind: StayChargeKind;
  memberSeasonPassId?: number | null;
  reservationId?: number | null;
  amountKrw?: number | null;
  paymentStatus: StayChargeStatus;
  depositorName?: string | null;
  note?: string | null;
}

export async function getSeasonHouseMatrix(
  crewId: number,
  from: string,
  to: string,
): Promise<SeasonHouseMatrixView> {
  const res = await apiClient.get<ApiResponse<SeasonHouseMatrixView>>(
    `/crews/${crewId}/season-house/matrix`,
    { params: { from, to } },
  );
  return res.data.data;
}

export async function updateSeasonHousePolicy(
  crewId: number,
  payload: UpdatePolicyPayload,
): Promise<SeasonHousePolicyView> {
  const res = await apiClient.put<ApiResponse<SeasonHousePolicyView>>(
    `/crews/${crewId}/season-house/policy`,
    payload,
  );
  return res.data.data;
}

export async function upsertStayCharge(
  crewId: number,
  payload: UpsertChargePayload,
): Promise<StayChargeView> {
  const res = await apiClient.put<ApiResponse<StayChargeView>>(
    `/crews/${crewId}/season-house/charges`,
    payload,
  );
  return res.data.data;
}

export async function listMemberManagerNotes(
  crewId: number,
  membershipId: number,
): Promise<ManagerNoteView[]> {
  const res = await apiClient.get<ApiResponse<ManagerNoteView[]>>(
    `/crews/${crewId}/season-house/members/${membershipId}/notes`,
  );
  return res.data.data;
}

export async function addMemberManagerNote(
  crewId: number,
  membershipId: number,
  payload: { category: ManagerNoteCategory; occurredOn?: string | null; penaltyDelta: number; content: string },
): Promise<ManagerNoteView> {
  const res = await apiClient.post<ApiResponse<ManagerNoteView>>(
    `/crews/${crewId}/season-house/members/${membershipId}/notes`,
    payload,
  );
  return res.data.data;
}

export async function deleteMemberManagerNote(
  crewId: number,
  membershipId: number,
  noteId: number,
): Promise<void> {
  await apiClient.delete(`/crews/${crewId}/season-house/members/${membershipId}/notes/${noteId}`);
}

export async function reviewGuestReservation(
  crewId: number,
  reservationId: number,
  approve: boolean,
): Promise<void> {
  await apiClient.post(`/crews/${crewId}/season-house/reservations/${reservationId}/approval`, { approve });
}

export async function managerCancelOverride(
  crewId: number,
  reservationId: number,
  reason?: string,
): Promise<void> {
  await apiClient.delete(`/crews/${crewId}/season-house/reservations/${reservationId}/override`, {
    params: reason ? { reason } : undefined,
  });
}
