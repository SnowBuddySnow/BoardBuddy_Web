import apiClient from '../lib/axios';
import type { ApiResponse } from '../types/api';
import { hasDevOverride } from '../lib/session';

export type CrewRole = 'CREW_MEMBER' | 'CREW_MANAGER' | 'CREW_CAPTAIN';

export interface CrewMemberAccess {
  accountId: number;
  displayName: string | null;
  crewRole: CrewRole;
  eventManager: boolean;
}

const DEV_CREW_ACCESS_KEY = 'dev_crew_member_access';

const initialDevCrewAccess = (): CrewMemberAccess[] => [
  {
    accountId: 999,
    displayName: 'Mock Captain',
    crewRole: 'CREW_CAPTAIN',
    eventManager: true,
  },
  {
    accountId: 1001,
    displayName: 'General Admin',
    crewRole: 'CREW_MANAGER',
    eventManager: false,
  },
  {
    accountId: 1002,
    displayName: 'Event Group Manager',
    crewRole: 'CREW_MEMBER',
    eventManager: true,
  },
  {
    accountId: 1003,
    displayName: 'Dual Role Manager',
    crewRole: 'CREW_MANAGER',
    eventManager: true,
  },
];

const readDevCrewAccess = () => {
  const stored = localStorage.getItem(DEV_CREW_ACCESS_KEY);
  if (stored) return JSON.parse(stored) as CrewMemberAccess[];
  const initial = initialDevCrewAccess();
  localStorage.setItem(DEV_CREW_ACCESS_KEY, JSON.stringify(initial));
  return initial;
};

const updateDevCrewAccess = (
  accountId: number,
  update: (member: CrewMemberAccess) => CrewMemberAccess,
) => {
  const members = readDevCrewAccess().map((member) =>
    member.accountId === accountId ? update(member) : member);
  localStorage.setItem(DEV_CREW_ACCESS_KEY, JSON.stringify(members));
};

export const listCrewMemberAccess = async (crewId: number): Promise<CrewMemberAccess[]> => {
  if (hasDevOverride()) return readDevCrewAccess();
  const response = await apiClient.get<ApiResponse<CrewMemberAccess[]>>(`/operations/crews/${crewId}/members`);
  return response.data.data;
};

export const grantEventManager = async (crewId: number, accountId: number): Promise<void> => {
  if (hasDevOverride()) {
    updateDevCrewAccess(accountId, (member) => ({ ...member, eventManager: true }));
    return;
  }
  await apiClient.post<ApiResponse<unknown>>(`/operations/crews/${crewId}/event-managers`, { accountId });
};

export const revokeEventManager = async (crewId: number, accountId: number): Promise<void> => {
  if (hasDevOverride()) {
    updateDevCrewAccess(accountId, (member) => ({ ...member, eventManager: false }));
    return;
  }
  await apiClient.delete<ApiResponse<void>>(`/operations/crews/${crewId}/event-managers/${accountId}`);
};

export const grantGeneralAdmin = async (crewId: number, accountId: number): Promise<void> => {
  if (hasDevOverride()) {
    updateDevCrewAccess(accountId, (member) => ({ ...member, crewRole: 'CREW_MANAGER' }));
    return;
  }
  await apiClient.post<ApiResponse<void>>(`/crews/${crewId}/managers/${accountId}`);
};

export const revokeGeneralAdmin = async (crewId: number, accountId: number): Promise<void> => {
  if (hasDevOverride()) {
    updateDevCrewAccess(accountId, (member) => ({ ...member, crewRole: 'CREW_MEMBER' }));
    return;
  }
  await apiClient.delete<ApiResponse<void>>(`/crews/${crewId}/managers/${accountId}`);
};
