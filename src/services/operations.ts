import apiClient from '../lib/axios';
import { ApiResponse } from '../types/api';
import { isDevMode } from './devMocks';
import { getDevRoleOverride } from '../lib/session';

export type OperationPermission =
  | 'CREW_MEMBERS_MANAGE'
  | 'CREW_EVENT_MANAGERS_ASSIGN'
  | 'RESERVATIONS_MANAGE'
  | 'PARTIES_CREATE'
  | 'PARTIES_MANAGE'
  | 'EVENT_GROUPS_CREATE'
  | 'EVENT_GROUPS_MANAGE'
  | 'EVENT_GROUPS_VIEW';

export interface OperationsContext {
  permissions: OperationPermission[];
}

export const getOperationsContext = async (): Promise<OperationsContext> => {
  if (isDevMode()) {
    const roleOverride = getDevRoleOverride();
    const permissionsByRole: Record<string, OperationPermission[]> = {
      admin: [
        'CREW_MEMBERS_MANAGE',
        'CREW_EVENT_MANAGERS_ASSIGN',
        'RESERVATIONS_MANAGE',
        'PARTIES_CREATE',
        'PARTIES_MANAGE',
        'EVENT_GROUPS_CREATE',
        'EVENT_GROUPS_MANAGE',
        'EVENT_GROUPS_VIEW',
      ],
      organizer: ['PARTIES_CREATE', 'PARTIES_MANAGE', 'EVENT_GROUPS_CREATE', 'EVENT_GROUPS_MANAGE', 'EVENT_GROUPS_VIEW'],
      viewer: ['EVENT_GROUPS_VIEW'],
      member: [],
      server: [],
    };
    return {
      permissions: permissionsByRole[roleOverride || 'server'] || [],
    };
  }
  const response = await apiClient.get<ApiResponse<OperationsContext>>('/operations/context');
  return response.data.data;
};
