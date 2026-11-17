import apiClient from "../lib/axios";
import type { ApiResponse } from "../types/api";

export interface SeasonPassSummary {
  registered: boolean;
  name: string | null;
  startsOn: string | null;
  endsOn: string | null;
  totalNights: number | null;
  usedNights: number;
  reservedNights: number;
  remainingNights: number | null;
}
export interface SeasonPassInput {
  name: string;
  startsOn: string;
  endsOn: string;
  totalNights: number | null;
}
export interface SeasonPassMember {
  accountId: number;
  name: string;
  studentNumber: string | null;
  role: string;
  pass: SeasonPassSummary;
  completedNights: number;
}
export interface StayHistoryItem {
  reservationId: number;
  date: string;
  status: string;
  completed: boolean;
}
export interface PagedItems<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
export async function listSeasonPassMembers(
  crewId: number,
  query = "",
  page = 0,
): Promise<PagedItems<SeasonPassMember>> {
  return (
    await apiClient.get<ApiResponse<PagedItems<SeasonPassMember>>>(
      `/crews/${crewId}/season-stays/passes`,
      { params: { query, page, size: 30 } },
    )
  ).data.data;
}
export async function getMemberStayHistory(
  crewId: number,
  memberId: number,
  page = 0,
): Promise<PagedItems<StayHistoryItem>> {
  return (
    await apiClient.get<ApiResponse<PagedItems<StayHistoryItem>>>(
      `/crews/${crewId}/season-stays/passes/${memberId}/history`,
      { params: { page, size: 10 } },
    )
  ).data.data;
}
export async function assignSeasonPasses(
  crewId: number,
  memberIds: number[],
  input: SeasonPassInput,
): Promise<{ updated: number }> {
  return (
    await apiClient.put<ApiResponse<{ updated: number }>>(
      `/crews/${crewId}/season-stays/passes`,
      { ...input, memberIds },
    )
  ).data.data;
}
export interface StayAnnouncement {
  id: number;
  stayDate: string;
  title: string;
  body: string;
  sentAt: string;
  recipients: { accountId: number; name: string; read: boolean }[];
}
export async function getSeasonPass(
  crewId: number,
  memberId?: number,
): Promise<SeasonPassSummary> {
  if (memberId == null)
    return (
      await apiClient.get<ApiResponse<SeasonPassSummary>>(
        `/crews/${crewId}/season-stays/pass`,
      )
    ).data.data;
  return (
    await apiClient.get<ApiResponse<SeasonPassSummary>>(
      `/crews/${crewId}/season-stays/passes/${memberId}`,
    )
  ).data.data;
}
export async function saveSeasonPass(
  crewId: number,
  memberId: number,
  input: SeasonPassInput,
): Promise<SeasonPassSummary> {
  return (
    await apiClient.put<ApiResponse<SeasonPassSummary>>(
      `/crews/${crewId}/season-stays/passes/${memberId}`,
      input,
    )
  ).data.data;
}
export async function completeStay(
  crewId: number,
  reservationId: number,
  completed: boolean,
): Promise<void> {
  await apiClient.patch(
    `/crews/${crewId}/season-stays/reservations/${reservationId}/completion`,
    { completed },
  );
}
export async function getStayAnnouncements(
  crewId: number,
  date: string,
): Promise<StayAnnouncement[]> {
  return (
    await apiClient.get<ApiResponse<StayAnnouncement[]>>(
      `/crews/${crewId}/season-stays/announcements`,
      { params: { date } },
    )
  ).data.data;
}
export async function sendStayAnnouncement(
  crewId: number,
  input: { date: string; requestKey: string; title: string; body: string },
): Promise<StayAnnouncement> {
  return (
    await apiClient.post<ApiResponse<StayAnnouncement>>(
      `/crews/${crewId}/season-stays/announcements`,
      input,
    )
  ).data.data;
}
