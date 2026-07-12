import apiClient from '../lib/axios';
import type { ApiResponse } from '../types/api';

export type CrewRole = 'CREW_MEMBER' | 'CREW_MANAGER' | 'CREW_CAPTAIN';

export interface CrewMemberAccess {
  accountId: number;
  displayName: string | null;
  crewRole: CrewRole;
  eventManager: boolean;
}

export const listCrewMemberAccess = async (crewId: number): Promise<CrewMemberAccess[]> => {
  const response = await apiClient.get<ApiResponse<CrewMemberAccess[]>>(`/operations/crews/${crewId}/members`);
  return response.data.data;
};

export const grantEventManager = async (crewId: number, accountId: number): Promise<void> => {
  await apiClient.post<ApiResponse<unknown>>(`/operations/crews/${crewId}/event-managers`, { accountId });
};

export const revokeEventManager = async (crewId: number, accountId: number): Promise<void> => {
  await apiClient.delete<ApiResponse<void>>(`/operations/crews/${crewId}/event-managers/${accountId}`);
};
