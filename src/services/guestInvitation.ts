import apiClient from '../lib/axios';
import type { GuestDestination } from '../lib/guestInvitation';
import type { ApiResponse } from '../types/api';

export type GuestInvitationStatus = 'AVAILABLE' | 'USED' | 'REVOKED' | 'EXPIRED';

export interface GuestInvitationRecord {
    id: string;
    targetType: 'SEASON' | 'EVENT';
    crewId: number | null;
    eventId: number | null;
    status: GuestInvitationStatus;
    expiresAt: string;
    usedAt: string | null;
    revokedAt: string | null;
    createdAt: string;
}

export interface CreatedGuestInvitation {
    invitation: GuestInvitationRecord;
    token: string;
}

export interface RedeemedGuestInvitation {
    invitationId: string;
    targetType: 'SEASON' | 'EVENT';
    crewId: number | null;
    eventId: number | null;
}

export async function createGuestInvitation(
    destination: GuestDestination,
    expiresInHours = 72,
): Promise<CreatedGuestInvitation> {
    const payload = destination.type === 'SEASON'
        ? { targetType: 'SEASON', crewId: destination.id, expiresInHours }
        : { targetType: 'EVENT', eventId: destination.id, expiresInHours };
    const response = await apiClient.post<ApiResponse<CreatedGuestInvitation>>('/guest-invitations', payload);
    return response.data.data;
}

export async function listMyGuestInvitations(destination: GuestDestination): Promise<GuestInvitationRecord[]> {
    const params = destination.type === 'SEASON'
        ? { targetType: 'SEASON', crewId: destination.id }
        : { targetType: 'EVENT', eventId: destination.id };
    const response = await apiClient.get<ApiResponse<GuestInvitationRecord[]>>('/guest-invitations', { params });
    return Array.isArray(response.data?.data) ? response.data.data : [];
}

export async function revokeGuestInvitation(invitationId: string): Promise<void> {
    await apiClient.delete(`/guest-invitations/${invitationId}`);
}

export async function redeemGuestInvitation(token: string): Promise<RedeemedGuestInvitation> {
    const response = await apiClient.post<ApiResponse<RedeemedGuestInvitation>>('/guest-invitations/redeem', { token });
    return response.data.data;
}
