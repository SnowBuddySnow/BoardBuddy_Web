import apiClient from '../lib/axios';
import { ApiResponse, JoinPolicy, ParticipantStatus, Party, PartyParticipant, PartyPlanningMode, PartyStatus, PaymentStatus, VisibilityType } from '../types/api';
import {
    createDevParty,
    deleteDevParty,
    getDevParticipants,
    getDevParties,
    getDevParty,
    isDevMode,
    setDevPartyParticipation,
    updateDevParticipantStatus,
    updateDevParticipantManagement,
    updateDevParty,
} from './devMocks';

// --- User-facing APIs ---
export const listParties = async (): Promise<Party[]> => {
    if (isDevMode()) {
        return getDevParties();
    }
    const response = await apiClient.get<ApiResponse<Party[]>>('/parties');
    return response.data.data;
};

export const getParty = async (partyId: number): Promise<Party> => {
    if (isDevMode()) {
        return getDevParty(partyId);
    }
    const response = await apiClient.get<ApiResponse<Party>>(`/parties/${partyId}`);
    return response.data.data;
};

export const joinParty = async (partyId: number): Promise<PartyParticipant> => {
    if (isDevMode()) {
        return setDevPartyParticipation(partyId, 'JOINED');
    }
    const response = await apiClient.post<ApiResponse<PartyParticipant>>(`/parties/${partyId}/join`);
    return response.data.data;
};

export const cancelParty = async (partyId: number): Promise<PartyParticipant> => {
    if (isDevMode()) {
        return setDevPartyParticipation(partyId, 'NONE');
    }
    const response = await apiClient.post<ApiResponse<PartyParticipant>>(`/parties/${partyId}/cancel`);
    return response.data.data;
};

// --- Dashboard / Organizer APIs ---
export const listDashboardParties = async (): Promise<Party[]> => {
    if (isDevMode()) {
        return getDevParties();
    }
    const response = await apiClient.get<ApiResponse<Party[]>>('/dashboard/parties');
    return response.data.data;
};

export interface CreatePartyPayload {
    title: string;
    description?: string;
    activityType?: string;
    planningMode: PartyPlanningMode;
    startsAt: string; // ISO string e.g. "2026-07-01T14:00:00"
    endsAt?: string;
    locationName?: string;
    locationAddress?: string;
    capacity: number;
    crewMemberLimit?: number | null;
    kusbfAssociated?: boolean;
    visibilityType: VisibilityType;
    joinPolicy: JoinPolicy;
    organizerGroupId: number;
}

export const createParty = async (payload: CreatePartyPayload): Promise<Party> => {
    if (isDevMode()) {
        return createDevParty(payload);
    }
    const response = await apiClient.post<ApiResponse<Party>>('/dashboard/parties', payload);
    return response.data.data;
};

export const getPartyDashboard = async (partyId: number): Promise<Party> => {
    if (isDevMode()) {
        return getDevParty(partyId);
    }
    const response = await apiClient.get<ApiResponse<Party>>(`/dashboard/parties/${partyId}`);
    return response.data.data;
};

export interface UpdatePartyPayload extends Partial<CreatePartyPayload> {
    status?: PartyStatus;
}

export const updateParty = async (partyId: number, payload: UpdatePartyPayload): Promise<Party> => {
    if (isDevMode()) {
        return updateDevParty(partyId, payload);
    }
    const response = await apiClient.patch<ApiResponse<Party>>(`/dashboard/parties/${partyId}`, payload);
    return response.data.data;
};

export const deleteParty = async (partyId: number): Promise<void> => {
    if (isDevMode()) {
        deleteDevParty(partyId);
        return;
    }
    await apiClient.delete<ApiResponse<void>>(`/dashboard/parties/${partyId}`);
};

export const listParticipants = async (partyId: number): Promise<PartyParticipant[]> => {
    if (isDevMode()) {
        return getDevParticipants(partyId);
    }
    const response = await apiClient.get<ApiResponse<PartyParticipant[]>>(`/dashboard/parties/${partyId}/participants`);
    return response.data.data;
};

export const updateParticipantStatus = async (partyId: number, userId: number, status: ParticipantStatus): Promise<PartyParticipant> => {
    if (isDevMode()) {
        return updateDevParticipantStatus(partyId, userId, status);
    }
    const response = await apiClient.patch<ApiResponse<PartyParticipant>>(`/dashboard/parties/${partyId}/participants/${userId}`, { status });
    return response.data.data;
};

export const updateParticipantManagement = async (
    partyId: number,
    userId: number,
    paymentStatus: PaymentStatus | null,
    managerMemo: string | null,
): Promise<PartyParticipant> => {
    if (isDevMode()) {
        return updateDevParticipantManagement(partyId, userId, paymentStatus, managerMemo);
    }
    const response = await apiClient.patch<ApiResponse<PartyParticipant>>(
        `/dashboard/parties/${partyId}/participants/${userId}/management`,
        { paymentStatus, managerMemo },
    );
    return response.data.data;
};
