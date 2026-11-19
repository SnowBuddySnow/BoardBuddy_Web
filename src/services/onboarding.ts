import apiClient from '../lib/axios';
import type { ApiResponse } from '../types/api';
export { previewCrewInvitation, type InvitationPreview } from './crewInvitationPreview';
export interface CrewInvitation { id: string; expiresAt: string; maxUses: number; useCount: number; revokedAt: string | null; createdAt: string; }
export interface CrewInvitationReceipt { crewId: number; status: 'PENDING' | 'JOINED'; }
export interface CreatedCrewInvitation { invitation: CrewInvitation; token: string; }
export const getOnboardingStatus = async (): Promise<{ verifiedPhoneNumber: string | null }> =>
    (await apiClient.get<ApiResponse<{ verifiedPhoneNumber: string | null }>>('/accounts/onboarding')).data.data;
export const acceptCrewInvitation = async (token: string): Promise<CrewInvitationReceipt> =>
    (await apiClient.post<ApiResponse<CrewInvitationReceipt>>('/crew-invitations/accept', { token })).data.data;
export const listCrewInvitations = async (crewId: number): Promise<CrewInvitation[]> =>
    (await apiClient.get<ApiResponse<CrewInvitation[]>>(`/crews/${crewId}/invitations`)).data.data;
export const createCrewInvitation = async (crewId: number, expiresInHours: number, maxUses: number): Promise<CreatedCrewInvitation> =>
    (await apiClient.post<ApiResponse<CreatedCrewInvitation>>(`/crews/${crewId}/invitations`, { expiresInHours, maxUses })).data.data;
export const revokeCrewInvitation = async (crewId: number, invitationId: string): Promise<void> => {
    await apiClient.delete(`/crews/${crewId}/invitations/${invitationId}`);
};
