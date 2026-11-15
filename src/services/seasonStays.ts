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
