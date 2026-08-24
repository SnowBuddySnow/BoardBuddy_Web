import apiClient from '../lib/axios';
import { getSignupToken } from '../lib/session';
import {
    ApiResponse,
    ConsentConfiguration,
    ConsentConfigurationInput,
    ConsentResponseInput,
    Event,
    EventChatAccess,
    EventParticipant,
    EventPaymentPolicy,
    EventRefundPolicy,
    EventPlanningMode,
    EventStatus,
    JoinPolicy,
    ManagerConsentResponseSheet,
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
    getDevManagerConsentResponseSheet,
    isDevMode,
    setDevEventParticipation,
    submitDevEventConsents,
    saveDevEventConsentDraft,
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

export const saveEventConsentDraft = async (
    eventId: number,
    responses: ConsentResponseInput[],
): Promise<ParticipantConsentState> => {
    if (isDevMode()) return saveDevEventConsentDraft(eventId, responses);
    const response = await apiClient.put<ApiResponse<ParticipantConsentState>>(
        `/events/${eventId}/consents/draft`,
        { responses },
    );
    return response.data.data;
};

export const saveEventConsentDraftKeepalive = (
    eventId: number,
    responses: ConsentResponseInput[],
) => {
    if (isDevMode()) {
        saveDevEventConsentDraft(eventId, responses);
        return;
    }
    const token = getSignupToken();
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    void fetch(`${baseUrl}/events/${eventId}/consents/draft`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        keepalive: true,
        body: JSON.stringify({ responses }),
    }).catch(() => undefined);
};

export const getEventPaymentInfo = async (eventId: number): Promise<EventPaymentPolicy> => {
    if (isDevMode()) return getDevEventPaymentInfo(eventId);
    const response = await apiClient.get<ApiResponse<EventPaymentPolicy>>(`/events/${eventId}/payment-info`);
    return response.data.data;
};

export const getEventRefundPolicy = async (eventId: number): Promise<EventRefundPolicy> => {
    if (isDevMode()) {
        return { refundPolicy: localStorage.getItem(`dev_event_refund_policy_${eventId}`) };
    }
    const response = await apiClient.get<ApiResponse<EventRefundPolicy>>(`/events/${eventId}/refund-policy`);
    return response.data.data;
};

export const getDashboardEventRefundPolicy = async (eventId: number): Promise<EventRefundPolicy> => {
    if (isDevMode()) {
        return { refundPolicy: localStorage.getItem(`dev_event_refund_policy_${eventId}`) };
    }
    const response = await apiClient.get<ApiResponse<EventRefundPolicy>>(`/dashboard/events/${eventId}/refund-policy`);
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

export const getEventConsentConfiguration = async (eventId: number): Promise<ConsentConfiguration> => {
    if (isDevMode()) {
        const stored = localStorage.getItem(`dev_event_consent_configuration_${eventId}`);
        return stored ? JSON.parse(stored) : { consentWindowMinutes: null, items: [] };
    }
    const response = await apiClient.get<ApiResponse<ConsentConfiguration>>(
        `/dashboard/events/${eventId}/consents`,
    );
    return response.data.data;
};

export const configureEventConsents = async (
    eventId: number,
    payload: ConsentConfigurationInput,
): Promise<ConsentConfiguration> => {
    if (isDevMode()) {
        const configuration: ConsentConfiguration = {
            consentWindowMinutes: payload.consentWindowMinutes,
            items: payload.items.map((item, index) => ({
                ...item,
                id: index + 1,
                contentHash: `dev-${eventId}-${index}`,
                documentVersion: 1,
            })),
        };
        localStorage.setItem(`dev_event_consent_configuration_${eventId}`, JSON.stringify(configuration));
        return configuration;
    }
    const response = await apiClient.put<ApiResponse<ConsentConfiguration>>(
        `/dashboard/events/${eventId}/consents`,
        payload,
    );
    return response.data.data;
};

export const configureEventRefundPolicy = async (
    eventId: number,
    refundPolicy: string | null,
): Promise<EventRefundPolicy> => {
    if (isDevMode()) {
        const normalizedPolicy = refundPolicy?.trim() || null;
        if (normalizedPolicy) {
            localStorage.setItem(`dev_event_refund_policy_${eventId}`, normalizedPolicy);
        } else {
            localStorage.removeItem(`dev_event_refund_policy_${eventId}`);
        }
        return { refundPolicy: normalizedPolicy };
    }
    const response = await apiClient.put<ApiResponse<EventRefundPolicy>>(
        `/dashboard/events/${eventId}/refund-policy`,
        { refundPolicy },
    );
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

export const getManagerConsentResponses = async (eventId: number): Promise<ManagerConsentResponseSheet> => {
    if (isDevMode()) return getDevManagerConsentResponseSheet(eventId);
    const response = await apiClient.get<ApiResponse<ManagerConsentResponseSheet>>(
        `/dashboard/events/${eventId}/consent-responses`,
    );
    return response.data.data;
};

export const revealManagerConsentResponses = async (
    eventId: number,
    reason: string,
): Promise<ManagerConsentResponseSheet> => {
    if (isDevMode()) return getDevManagerConsentResponseSheet(eventId, true);
    const response = await apiClient.post<ApiResponse<ManagerConsentResponseSheet>>(
        `/dashboard/events/${eventId}/consent-responses/reveal`,
        { reason },
    );
    return response.data.data;
};

export const exportManagerConsentResponses = async (
    eventId: number,
    request: { reason: string; includeSensitive: boolean; itemIds: number[] },
): Promise<string> => {
    if (isDevMode()) {
        const sheet = getDevManagerConsentResponseSheet(eventId, true);
        const selectedItems = sheet.items.filter(item => (
            request.itemIds.includes(item.id)
            && item.responseType !== 'INFORMATION'
            && (request.includeSensitive || item.privacyLevel !== 'SENSITIVE')
        ));
        const escapeCell = (value: string) => {
            const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
            return safeValue.split('\t').join(' ').split('\n').join(' ');
        };
        const rows = [
            ['참가자', '상태', '제출 상태', '제출 일시', ...selectedItems.map(item => item.title)],
            ...sheet.participants.map(participant => {
                const answers = new Map(participant.answers.map(answer => [answer.consentItemId, answer]));
                return [
                    participant.displayName,
                    participant.status,
                    participant.consentCompletedAt ? '제출 완료' : '미제출',
                    participant.consentCompletedAt || '-',
                    ...selectedItems.map(item => {
                        const answer = answers.get(item.id);
                        if (!answer) return '-';
                        if (item.responseType === 'CHECKBOX') return answer.agreed ? '동의' : '미동의';
                        return answer.responseText || '-';
                    }),
                ];
            }),
        ];
        const blob = new Blob([
            '\uFEFF',
            rows.map(row => row.map(value => escapeCell(String(value))).join('\t')).join('\n'),
        ], { type: 'text/tab-separated-values;charset=utf-8' });
        const filename = `event-${eventId}-responses-dev.tsv`;
        downloadBlob(blob, filename);
        return filename;
    }
    const response = await apiClient.post<Blob>(
        `/dashboard/events/${eventId}/consent-responses/export`,
        request,
        { responseType: 'blob' },
    );
    const disposition = response.headers['content-disposition'] as string | undefined;
    const filename = disposition?.match(/filename="?([^";]+)"?/)?.[1]
        || `event-${eventId}-responses.xlsx`;
    downloadBlob(response.data, filename);
    return filename;
};

const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
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
