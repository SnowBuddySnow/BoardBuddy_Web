import apiClient from '../lib/axios';
import type {
    ApiResponse,
    ConsentCategory,
    ConsentResponseType,
    EventChatAccess,
    EventPlanningMode,
    EventStatus,
    JoinPolicy,
    ParticipantStatus,
    PaymentStatus,
    VisibilityType,
} from '../types/api';

export interface PublicConsentItem {
    id: number;
    category: ConsentCategory;
    title: string;
    content: string;
    contentHash: string;
    responseType: ConsentResponseType;
    required: boolean;
    displayOrder: number;
    documentVersion: number;
}

export interface PublicEventPreview {
    id: number;
    eventCode: string;
    title: string;
    description: string | null;
    activityType: string | null;
    planningMode: EventPlanningMode;
    applicationStartsAt: string | null;
    startsAt: string;
    endsAt: string | null;
    locationName: string | null;
    locationAddress: string | null;
    capacity: number;
    capacityLimited: boolean;
    joinedCount: number;
    hostCrewName: string | null;
    coHostCrewName: string | null;
    visibilityType: VisibilityType;
    joinPolicy: JoinPolicy;
    status: EventStatus;
    paymentRequired: boolean;
    participationFee: number | null;
    paymentCurrency: string | null;
    paymentDeadlineAt: string | null;
    allowNonMemberApplications: boolean;
    registrationState: 'OPEN' | 'UPCOMING' | 'CLOSED';
    consentItems: PublicConsentItem[];
}

export interface NonMemberChallengeStarted {
    challengeId: string;
    expiresInSeconds: number;
    retryAfterSeconds: number;
}

export interface NonMemberPhoneVerified {
    proofToken: string;
    expiresInSeconds: number;
    existingAccountDetected: boolean;
}

export interface NonMemberConsentSummary {
    consentItemId: number;
    title: string;
    agreed: boolean | null;
    responseText: string | null;
}

export interface NonMemberPaymentInfo {
    participationFee: number | null;
    paymentCurrency: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountHolder: string | null;
    paymentDeadlineAt: string | null;
    paymentInstructions: string | null;
}

export interface NonMemberReceipt {
    receiptCode: string;
    eventCode: string;
    eventTitle: string;
    startsAt: string;
    endsAt: string | null;
    locationName: string | null;
    hostCrewName: string | null;
    coHostCrewName: string | null;
    name: string | null;
    schoolName: string;
    crewName: string;
    maskedPhone: string | null;
    status: ParticipantStatus;
    paymentRequired: boolean;
    paymentStatus: PaymentStatus | null;
    paymentInfo: NonMemberPaymentInfo | null;
    chatAccess: EventChatAccess | null;
    consentAnswers: NonMemberConsentSummary[];
    appliedAt: string;
    canCancel: boolean;
    eventCancelled: boolean;
    alreadyConverted: boolean;
    conversionToken: string | null;
}

export interface NonMemberLookupVerified {
    proofToken: string;
    expiresInSeconds: number;
    receipt: NonMemberReceipt;
}

export interface UnifiedRosterParticipant {
    participantType: 'MEMBER' | 'NON_MEMBER';
    participantKey: string;
    participantId: number;
    userId: number | null;
    receiptCode: string | null;
    name: string;
    schoolName: string | null;
    crewName: string | null;
    studentNumber: string | null;
    maskedPhone: string | null;
    convertedFromNonMember: boolean;
    status: ParticipantStatus;
    paymentStatus: PaymentStatus | null;
    managerMemo: string | null;
    joinedAt: string;
    consentAnswers: NonMemberConsentSummary[];
    canApprove: boolean;
    canRemove: boolean;
}

export interface NonMemberConversionPrefill {
    valid: boolean;
    name: string | null;
    phoneNumber: string;
    maskedPhone: string | null;
    schoolId: number | null;
    schoolName: string | null;
    crewName: string | null;
    linkedEventCount: number;
    existingPhoneConflict: boolean;
}

export async function previewPublicEvent(eventCode: string): Promise<PublicEventPreview> {
    const response = await apiClient.get<ApiResponse<PublicEventPreview>>(`/public/events/${encodeURIComponent(eventCode)}`);
    return response.data.data;
}

export async function startNonMemberApplyPhone(eventCode: string, phoneNumber: string): Promise<NonMemberChallengeStarted> {
    const response = await apiClient.post<ApiResponse<NonMemberChallengeStarted>>(
        `/public/events/${encodeURIComponent(eventCode)}/non-member/phone`,
        { phoneNumber },
    );
    return response.data.data;
}

export async function confirmNonMemberApplyPhone(
    eventCode: string,
    challengeId: string,
    code: string,
): Promise<NonMemberPhoneVerified> {
    const response = await apiClient.post<ApiResponse<NonMemberPhoneVerified>>(
        `/public/events/${encodeURIComponent(eventCode)}/non-member/phone/confirm`,
        { challengeId, code },
    );
    return response.data.data;
}

export async function submitNonMemberApplication(
    eventCode: string,
    payload: {
        proofToken: string;
        phoneNumber: string;
        name: string;
        schoolId?: number | null;
        schoolName: string;
        crewName: string;
        privacyAccepted: boolean;
        privacyVersion?: number;
        consentResponses: Array<{ consentItemId: number; agreed?: boolean | null; responseText?: string | null }>;
    },
): Promise<NonMemberReceipt> {
    const response = await apiClient.post<ApiResponse<NonMemberReceipt>>(
        `/public/events/${encodeURIComponent(eventCode)}/non-member/apply`,
        { privacyVersion: 1, ...payload },
    );
    return response.data.data;
}

export async function startNonMemberLookupPhone(receiptCode: string, phoneNumber: string): Promise<NonMemberChallengeStarted> {
    const response = await apiClient.post<ApiResponse<NonMemberChallengeStarted>>(
        '/public/non-member-applications/lookup/phone',
        { receiptCode, phoneNumber },
    );
    return response.data.data;
}

export async function confirmNonMemberLookupPhone(
    receiptCode: string,
    challengeId: string,
    code: string,
): Promise<NonMemberLookupVerified> {
    const response = await apiClient.post<ApiResponse<NonMemberLookupVerified>>(
        '/public/non-member-applications/lookup/confirm',
        { receiptCode, challengeId, code },
    );
    return response.data.data;
}

export async function cancelNonMemberApplication(receiptCode: string, proofToken: string): Promise<NonMemberReceipt> {
    const response = await apiClient.post<ApiResponse<NonMemberReceipt>>(
        '/public/non-member-applications/cancel',
        { receiptCode, proofToken },
    );
    return response.data.data;
}

export async function listUnifiedEventRoster(eventId: number): Promise<UnifiedRosterParticipant[]> {
    const response = await apiClient.get<ApiResponse<UnifiedRosterParticipant[]>>(`/dashboard/events/${eventId}/roster`);
    return response.data.data;
}

export async function updateNonMemberParticipantStatus(
    eventId: number,
    receiptCode: string,
    status: 'JOINED' | 'REMOVED' | 'PENDING',
): Promise<UnifiedRosterParticipant> {
    const response = await apiClient.patch<ApiResponse<UnifiedRosterParticipant>>(
        `/dashboard/events/${eventId}/non-members/${encodeURIComponent(receiptCode)}/status`,
        { status },
    );
    return response.data.data;
}

export async function updateNonMemberParticipantManagement(
    eventId: number,
    receiptCode: string,
    paymentStatus: PaymentStatus | null,
    managerMemo: string | null,
): Promise<UnifiedRosterParticipant> {
    const response = await apiClient.patch<ApiResponse<UnifiedRosterParticipant>>(
        `/dashboard/events/${eventId}/non-members/${encodeURIComponent(receiptCode)}/management`,
        { paymentStatus, managerMemo },
    );
    return response.data.data;
}

export async function prefillNonMemberConversion(conversionToken: string): Promise<NonMemberConversionPrefill> {
    const response = await apiClient.post<ApiResponse<NonMemberConversionPrefill>>(
        '/accounts/non-member-conversion/prefill',
        { conversionToken },
    );
    return response.data.data;
}

export async function linkNonMemberConversion(conversionToken: string): Promise<{ migratedEventCount: number }> {
    const response = await apiClient.post<ApiResponse<{ migratedEventCount: number }>>(
        '/accounts/non-member-conversion/link',
        { conversionToken },
    );
    return response.data.data;
}
