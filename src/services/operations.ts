import apiClient from '../lib/axios';
import { ApiResponse } from '../types/api';
import { isDevMode } from './devMocks';

export type OperationPermission =
  | 'CREW_MEMBERS_MANAGE'
  | 'CREW_PARTY_MANAGERS_ASSIGN'
  | 'RESERVATIONS_MANAGE'
  | 'PARTIES_CREATE'
  | 'PARTIES_MANAGE'
  | 'PARTY_GROUPS_CREATE'
  | 'PARTY_GROUPS_MANAGE'
  | 'PARTY_GROUPS_VIEW';

export interface OperationsContext {
  permissions: OperationPermission[];
}

export const getOperationsContext = async (): Promise<OperationsContext> => {
  if (isDevMode()) {
    return {
      permissions: ['RESERVATIONS_MANAGE', 'PARTIES_CREATE', 'PARTY_GROUPS_CREATE', 'PARTY_GROUPS_MANAGE'],
    };
  }
  const response = await apiClient.get<ApiResponse<OperationsContext>>('/operations/context');
  return response.data.data;
};
