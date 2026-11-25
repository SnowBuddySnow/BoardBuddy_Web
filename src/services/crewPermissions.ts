import apiClient from '../lib/axios';
import type { ApiResponse } from '../types/api';
import { hasDevOverride } from '../lib/session';
import type { CrewRole } from '../constants/crewRole';

export interface CrewMemberAccess {
  accountId: number;
  displayName: string | null;
  crewRole: CrewRole;
}

const DEV_CREW_ACCESS_KEY = 'dev_crew_member_roles';

const initialDevCrewAccess = (): CrewMemberAccess[] => [
  {
    accountId: 999,
    displayName: '크루장 샘플',
    crewRole: 'CREW_CAPTAIN',
  },
  {
    accountId: 1001,
    displayName: '크루 매니저 샘플',
    crewRole: 'CREW_MANAGER',
  },
  {
    accountId: 1002,
    displayName: '일반 멤버 샘플',
    crewRole: 'CREW_MEMBER',
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

export const grantCrewManager = async (crewId: number, accountId: number): Promise<void> => {
  if (hasDevOverride()) {
    updateDevCrewAccess(accountId, (member) => ({ ...member, crewRole: 'CREW_MANAGER' }));
    return;
  }
  await apiClient.post<ApiResponse<void>>(`/crews/${crewId}/managers/${accountId}`);
};

export const revokeCrewManager = async (crewId: number, accountId: number): Promise<void> => {
  if (hasDevOverride()) {
    updateDevCrewAccess(accountId, (member) => ({ ...member, crewRole: 'CREW_MEMBER' }));
    return;
  }
  await apiClient.delete<ApiResponse<void>>(`/crews/${crewId}/managers/${accountId}`);
};
