import apiClient from '../lib/axios';
import type { ApiResponse } from '../types/api';

export interface EventCrewInvitation {
    id: number;
    eventId: number;
    eventTitle: string;
    hostCrewName: string;
    crewId: number;
    crewName: string;
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
}

export async function listEventCrewInvitations(eventId: number): Promise<EventCrewInvitation[]> {
    const response = await apiClient.get<ApiResponse<EventCrewInvitation[]>>(`/dashboard/events/${eventId}/crew-invitations`);
    return response.data.data;
}

export async function listIncomingEventCrewInvitations(): Promise<EventCrewInvitation[]> {
    const response = await apiClient.get<ApiResponse<EventCrewInvitation[]>>('/dashboard/event-crew-invitations/incoming');
    return response.data.data;
}

export async function inviteEventCrew(eventId: number, crewId: number): Promise<EventCrewInvitation> {
    const response = await apiClient.post<ApiResponse<EventCrewInvitation>>(`/dashboard/events/${eventId}/crew-invitations`, { crewId });
    return response.data.data;
}

export async function respondToEventCrewInvitation(invitation: EventCrewInvitation, accept: boolean): Promise<void> {
    await apiClient.post(`/dashboard/events/${invitation.eventId}/crew-invitations/${invitation.id}/response`, { accept });
}
