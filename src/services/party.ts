import apiClient from '../lib/axios';
import { ApiResponse, Party, PartyParticipant, OrganizerGroup, OrganizerGroupMembership, ParticipantStatus } from '../types/api';

// --- User-facing APIs ---
export const listParties = async (): Promise<Party[]> => {
    const response = await apiClient.get<ApiResponse<Party[]>>('/api/parties');
    return response.data.data;
};

export const getParty = async (partyId: number): Promise<Party> => {
    const response = await apiClient.get<ApiResponse<Party>>(`/api/parties/${partyId}`);
    return response.data.data;
};

export const joinParty = async (partyId: number): Promise<PartyParticipant> => {
    const response = await apiClient.post<ApiResponse<PartyParticipant>>(`/api/parties/${partyId}/join`);
    return response.data.data;
};

export const cancelParty = async (partyId: number): Promise<PartyParticipant> => {
    const response = await apiClient.post<ApiResponse<PartyParticipant>>(`/api/parties/${partyId}/cancel`);
    return response.data.data;
};

// --- Dashboard / Organizer APIs ---
export const listDashboardParties = async (): Promise<Party[]> => {
    const response = await apiClient.get<ApiResponse<Party[]>>('/api/dashboard/parties');
    return response.data.data;
};

export interface CreatePartyPayload {
    title: string;
    description?: string;
    activityType?: string;
    startsAt: string; // ISO string e.g. "2026-07-01T14:00:00"
    endsAt?: string;
    locationName?: string;
    locationAddress?: string;
    capacity: number;
    visibilityType: string;
    joinPolicy: string;
    organizerGroupId: number;
    allowedCrewIds?: number[];
}

export const createParty = async (payload: CreatePartyPayload): Promise<Party> => {
    const response = await apiClient.post<ApiResponse<Party>>('/api/dashboard/parties', payload);
    return response.data.data;
};

export const getPartyDashboard = async (partyId: number): Promise<Party> => {
    const response = await apiClient.get<ApiResponse<Party>>(`/api/dashboard/parties/${partyId}`);
    return response.data.data;
};

export interface UpdatePartyPayload extends Partial<CreatePartyPayload> {
    status?: string;
}

export const updateParty = async (partyId: number, payload: UpdatePartyPayload): Promise<Party> => {
    const response = await apiClient.patch<ApiResponse<Party>>(`/api/dashboard/parties/${partyId}`, payload);
    return response.data.data;
};

export const deleteParty = async (partyId: number): Promise<void> => {
    await apiClient.delete<ApiResponse<void>>(`/api/dashboard/parties/${partyId}`);
};

export const listParticipants = async (partyId: number): Promise<PartyParticipant[]> => {
    const response = await apiClient.get<ApiResponse<PartyParticipant[]>>(`/api/dashboard/parties/${partyId}/participants`);
    return response.data.data;
};

export const updateParticipantStatus = async (partyId: number, userId: number, status: ParticipantStatus): Promise<PartyParticipant> => {
    const response = await apiClient.patch<ApiResponse<PartyParticipant>>(`/api/dashboard/parties/${partyId}/participants/${userId}`, { status });
    return response.data.data;
};

// --- Organizer Group Management APIs ---
export const listOrganizerGroups = async (): Promise<OrganizerGroup[]> => {
    const response = await apiClient.get<ApiResponse<OrganizerGroup[]>>('/api/dashboard/organizer-groups');
    return response.data.data;
};

export const getOrganizerGroup = async (groupId: number): Promise<OrganizerGroup> => {
    const response = await apiClient.get<ApiResponse<OrganizerGroup>>(`/api/dashboard/organizer-groups/${groupId}`);
    return response.data.data;
};

export const listGroupMembers = async (groupId: number): Promise<OrganizerGroupMembership[]> => {
    const response = await apiClient.get<ApiResponse<OrganizerGroupMembership[]>>(`/api/dashboard/organizer-groups/${groupId}/members`);
    return response.data.data;
};

export const addGroupMember = async (groupId: number, userId: number, role: 'OWNER' | 'EDITOR' | 'VIEWER'): Promise<OrganizerGroupMembership> => {
    const response = await apiClient.post<ApiResponse<OrganizerGroupMembership>>(`/api/dashboard/organizer-groups/${groupId}/members`, { userId, role });
    return response.data.data;
};

export const deleteGroupMember = async (groupId: number, userId: number): Promise<void> => {
    await apiClient.delete<ApiResponse<void>>(`/api/dashboard/organizer-groups/${groupId}/members/${userId}`);
};
