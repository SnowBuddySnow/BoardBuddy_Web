import apiClient from '../lib/axios';
import {
    ApiResponse,
    ConsentResponseInput,
    Event,
    EventChatAccess,
    EventParticipant,
    EventPaymentPolicy,
    EventPlanningMode,
    EventStatus,
    JoinPolicy,
    ParticipantConsentState,
    ParticipantStatus,
    PaymentStatus,
    VisibilityType,
} from '../types/api';
import {
    createDevEvent,
    deleteDevEvent,
    getDevParticipants,
    getDevParties,
    getDevEvent,
    getDevEventChatAccess,
    getDevEventConsents,
    getDevEventPaymentInfo,
    isDevMode,
    setDevEventParticipation,
    submitDevEventConsents,
    updateDevParticipantStatus,
    updateDevParticipantManagement,
    updateDevEvent,
    updateDevEventChatAccess,
} from './devMocks';

// --- User-facing APIs ---
export const listParties = async (): Promise<Event[]> => {
    if (isDevMode()) {
        return getDevParties();
    }
    const response = await apiClient.get<ApiResponse<Event[]>>('/events');
    return response.data.data;
};

export const getEvent = async (eventId: number): Promise<Event> => {
    if (isDevMode()) {
        return getDevEvent(eventId);
    }
    const response = await apiClient.get<ApiResponse<Event>>(`/events/${eventId}`);
    return response.data.data;
};

export const joinEvent = async (eventId: number): Promise<EventParticipant> => {
    if (isDevMode()) {
        return setDevEventParticipation(eventId, 'JOINED');
    }
    const response = await apiClient.post<ApiResponse<EventParticipant>>(`/events/${eventId}/join`);
    return response.data.data;
};

export const cancelEvent = async (eventId: number): Promise<EventParticipant> => {
    if (isDevMode()) {
        return setDevEventParticipation(eventId, 'NONE');
    }
    const response = await apiClient.post<ApiResponse<EventParticipant>>(`/events/${eventId}/cancel`);
    return response.data.data;
};

export const getEventChatAccess = async (eventId: number): Promise<EventChatAccess> => {
    if (isDevMode()) return getDevEventChatAccess(eventId);
    const response = await apiClient.get<ApiResponse<EventChatAccess>>(`/events/${eventId}/chat-access`);
    return response.data.data;
};

export const getEventConsents = async (eventId: number): Promise<ParticipantConsentState> => {
    if (isDevMode()) return getDevEventConsents(eventId);
    const response = await apiClient.get<ApiResponse<ParticipantConsentState>>(`/events/${eventId}/consents`);
    return response.data.data;
};

export const submitEventConsents = async (
    eventId: number,
    responses: ConsentResponseInput[],
): Promise<ParticipantConsentState> => {
    if (isDevMode()) return submitDevEventConsents(eventId, responses);
    const response = await apiClient.post<ApiResponse<ParticipantConsentState>>(
        `/events/${eventId}/consents/responses`,
        { responses },
    );
    return response.data.data;
};

export const getEventPaymentInfo = async (eventId: number): Promise<EventPaymentPolicy> => {
    if (isDevMode()) return getDevEventPaymentInfo(eventId);
    const response = await apiClient.get<ApiResponse<EventPaymentPolicy>>(`/events/${eventId}/payment-info`);
    return response.data.data;
};

// --- Dashboard / Organizer APIs ---
export const listDashboardParties = async (): Promise<Event[]> => {
    if (isDevMode()) {
        return getDevParties();
    }
    const response = await apiClient.get<ApiResponse<Event[]>>('/dashboard/events');
    return response.data.data;
};

export interface CreateEventPayload {
    title: string;
    description?: string;
    activityType?: string;
    planningMode: EventPlanningMode;
    applicationStartsAt?: string | null;
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

export const createEvent = async (payload: CreateEventPayload): Promise<Event> => {
    if (isDevMode()) {
        return createDevEvent(payload);
    }
    const response = await apiClient.post<ApiResponse<Event>>('/dashboard/events', payload);
    return response.data.data;
};

export const getEventDashboard = async (eventId: number): Promise<Event> => {
    if (isDevMode()) {
        return getDevEvent(eventId);
    }
    const response = await apiClient.get<ApiResponse<Event>>(`/dashboard/events/${eventId}`);
    return response.data.data;
};

export interface UpdateEventPayload extends Partial<CreateEventPayload> {
    status?: EventStatus;
}

export const updateEvent = async (eventId: number, payload: UpdateEventPayload): Promise<Event> => {
    if (isDevMode()) {
        return updateDevEvent(eventId, payload);
    }
    const response = await apiClient.patch<ApiResponse<Event>>(`/dashboard/events/${eventId}`, payload);
    return response.data.data;
};

export const deleteEvent = async (eventId: number): Promise<void> => {
    if (isDevMode()) {
        deleteDevEvent(eventId);
        return;
    }
    await apiClient.delete<ApiResponse<void>>(`/dashboard/events/${eventId}`);
};

export const listParticipants = async (eventId: number): Promise<EventParticipant[]> => {
    if (isDevMode()) {
        return getDevParticipants(eventId);
    }
    const response = await apiClient.get<ApiResponse<EventParticipant[]>>(`/dashboard/events/${eventId}/participants`);
    return response.data.data;
};

export const updateParticipantStatus = async (eventId: number, userId: number, status: ParticipantStatus): Promise<EventParticipant> => {
    if (isDevMode()) {
        return updateDevParticipantStatus(eventId, userId, status);
    }
    const response = await apiClient.patch<ApiResponse<EventParticipant>>(`/dashboard/events/${eventId}/participants/${userId}`, { status });
    return response.data.data;
};

export const updateParticipantManagement = async (
    eventId: number,
    userId: number,
    paymentStatus: PaymentStatus | null,
    managerMemo: string | null,
): Promise<EventParticipant> => {
    if (isDevMode()) {
        return updateDevParticipantManagement(eventId, userId, paymentStatus, managerMemo);
    }
    const response = await apiClient.patch<ApiResponse<EventParticipant>>(
        `/dashboard/events/${eventId}/participants/${userId}/management`,
        { paymentStatus, managerMemo },
    );
    return response.data.data;
};

export const updateEventChatAccess = async (
    eventId: number,
    access: EventChatAccess,
): Promise<EventChatAccess> => {
    if (isDevMode()) return updateDevEventChatAccess(eventId, access);
    const response = await apiClient.patch<ApiResponse<EventChatAccess>>(
        `/dashboard/events/${eventId}/chat-access`,
        access,
    );
    return response.data.data;
};
