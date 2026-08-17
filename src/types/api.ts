export interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
}

export type UserType = 'GENERAL' | 'REGULAR' | 'KUSBF';
export type UniversityVerificationStatus = 'NOT_VERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface CrewDetail {
    crewId?: number;
    crewName?: string;
    crew_id: number;
    name: string;
    univ: string;
    role?: string;
    crewPin?: string;
    reservation_day?: string;
    reservation_time?: string;
    reservation_offset?: number;
    reservationOpenDay: string | null;
    reservationOpenTime: string | null;
    reservationOpenOffsetDays: number | null;
    reservationPeriodLimitDays: number; // e.g., 7
    dailyCapacity: number;
    status: string; // "ACTIVE"
    created_at: string;
    updated_at: string;
    president_name: string;
    member_count: number;
    profile_image_url: string | null;
    isCapacityLimited: boolean;
    kusbfAssociated?: boolean;
    seasonHouseActive?: boolean;
}

export interface CrewSimple {
    crewId: number;
    crewName: string;
}

export interface UserDetail {
    userId: number;
    userCode: string;
    name: string;
    email: string;
    role: string;
    userType?: UserType;
    universityVerificationStatus?: UniversityVerificationStatus;
    birthDate: string;
    school: string | null;
    studentId: string | null;
    gender: string;
    phoneNumber: string;
    profileImageUrl: string;
    socialId: string;
    socialProvider: string;
    isRegistered: boolean;
    createdAt: string;
    updatedAt: string;
    crew: CrewSimple | null;
}

export interface CrewMember {
    user_id: number;
    name: string;
    student_id: string;
    role: string; // "MEMBER", etc.
}
export interface CrewApplicant {
    applicationId: number;
    userId: number;
    userName: string;
    userType: UserType;
    schoolName: string;
    studentId: string;
    profileImageUrl?: string | null;
    status: string; // "PENDING", etc.
    created_at?: string;
}

// --- New Reservation DTOs ---

export interface ReservationCreateRequest {
    dates: string[];
    guestId?: number;
}

export interface ReservationResultResponse {
    date: string;
    reservationId?: number;
    status?: string;
    waitlistPosition?: number;
    attempts: number;
    success: boolean;
    message?: string;
}

export interface ReservationCreateResponse {
    crewId: number;
    accountId: number;
    results: ReservationResultResponse[];
}

export interface ReservationBookingResponse {
    reservationId: number;
    participantAccountId?: number;
    guestId?: number;
    requestedByAccountId?: number;
    status: string;
    waitlistPosition?: number;
    paymentStatus?: PaymentStatus | null;
    managerMemo?: string | null;
}

export interface ReservationDayResponse {
    reservationDayId: number;
    crewId: number;
    reservationDate: string;
    capacityLimited: boolean;
    capacity: number;
    confirmedCount: number;
    waitingCount: number;
    canManageReservations: boolean;
    reservations: ReservationBookingResponse[];
}

export interface ReservationDaysPrepareRequest {
    from: string;
    to: string;
}

// --- End New Reservation DTOs ---

export interface CrewInfoUpdateRequest {
    crewName: string;
    reservationOpenDay: string;
    reservationOpenTime: string;
    reservationOpenOffsetDays: number;
    reservationPeriodLimitDays: number;
    dailyCapacity: number;
    isCapacityLimited: boolean;
}

export interface CrewUsageStatistic {
    user_id: number;
    name: string;
    usage_count: number;
    profile_image_url?: string | null;
}

export interface MyApplication {
    application_id: number;
    crew_id: number;
    crew_name: string;
    status: string; // "PENDING" | "APPROVED" | "REJECTED"
    created_at: string;
    processed_at: string | null;
}

/** @deprecated Replaced by ReservationDayResponse */
export interface ReservationDetail {
    date: string;
    status: string;
    booked: number;
    waitingCount: number;
    capacity: number;
    member_list: {
        reservation_id: number;
        user_id: number;
        name: string;
        profile_image_url: string | null;
        teaching: boolean;
        role: string;
        phoneNumber?: string;
        registered_by_name?: string;
        reservation_time?: string;
    }[];
    waiting_member_list: unknown[];
    my_reservation: unknown | null;
}

/** @deprecated */
export interface MyReservation {
    date: string;
    status: string;
    reservation_id: number;
    crew_id?: number;
    created_at?: string;
    teaching: boolean;
    waiting_order?: number | null;
}

/** @deprecated */
export interface MyCalendarResponse {
    my_reservations: MyReservation[];
    usage_count: number;
}

/** @deprecated */
export interface CrewCalendarResponse {
    calendar: {
        date: string;
        occupancy_status: 'LOW' | 'MEDIUM' | 'HIGH';
    }[];
    my_reservations: {
        date: string;
        status: string;
        reservation_id: number;
        waiting_order: number | null;
    }[] | null;
}

/** @deprecated Replaced by ReservationCreateResponse */
export interface ReservationResponse {
    reservationId: number;
    status: string;
}

/** @deprecated */
export interface ReservationInfo {
    date: string;
    status: string;
    teaching: boolean;
    reservation_id: number;
    crew_id: number;
    crew_name: string;
    created_at: string;
    user_id: number;
    user_name: string;
    user_role: string;
    is_guest_reservation: boolean;
    guest_id: number | null;
    guest_name: string | null;
    can_apply_teaching: boolean;
    can_delete: boolean;
    waiting_position: number | null;
}

// --- Event DTOs ---

export type EventStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELLED';
export type EventPlanningMode = 'MANAGER_PLANNED' | 'MEMBER_PLANNED';
export type VisibilityType = 'PUBLIC' | 'CREW_LIMITED' | 'INVITE_ONLY' | 'LINK_ONLY';
export type JoinPolicy = 'INSTANT' | 'APPROVAL_REQUIRED' | 'INVITE_ONLY' | 'PUBLIC';
export type ParticipantStatus = 'JOINED' | 'PENDING' | 'CONSENT_PENDING' | 'CANCELLED' | 'REMOVED' | 'NONE';
export type PaymentStatus = 'UNPAID' | 'PAID';
export type ConsentCategory =
    | 'RISK_ACKNOWLEDGEMENT'
    | 'PERSONAL_INFORMATION_COLLECTION_USE'
    | 'PERSONAL_INFORMATION_THIRD_PARTY_PROVISION'
    | 'SENSITIVE_INFORMATION'
    | 'EMERGENCY_CONTACT'
    | 'MEDICATION_INFORMATION'
    | 'DIETARY_ACCESSIBILITY'
    | 'MARKETING'
    | 'PHOTO_VIDEO_USE'
    | 'OTHER';
export type ConsentResponseType =
    | 'CHECKBOX'
    | 'TEXT'
    | 'TEXTAREA'
    | 'EMAIL'
    | 'PHONE'
    | 'NUMBER'
    | 'DATE'
    | 'TIME'
    | 'URL'
    | 'INFORMATION';

export interface Event {
    id: number;
    title: string;
    description: string;
    activityType: string;
    planningMode: EventPlanningMode;
    applicationStartsAt?: string | null; // ISO LocalDateTime
    startsAt: string; // ISO LocalDateTime
    endsAt?: string; // ISO LocalDateTime
    locationName: string | null;
    locationAddress: string | null;
    capacity: number;
    crewMemberLimit?: number | null;
    consentWindowMinutes?: number | null;
    paymentRequired?: boolean;
    participationFee?: number | null;
    paymentCurrency?: string | null;
    paymentDeadlineAt?: string | null;
    status: EventStatus;
    visibilityType: VisibilityType;
    joinPolicy: JoinPolicy;
    createdByUserId?: number;
    organizerGroupId: number;
    organizerGroupName?: string;
    kusbfAssociated?: boolean;
    joinedCount?: number;
    currentUserStatus?: ParticipantStatus | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface EventParticipant {
    id: number;
    eventEventId?: number;
    eventId?: number;
    userId: number;
    userName?: string;
    status: ParticipantStatus;
    paymentStatus?: PaymentStatus | null;
    managerMemo?: string | null;
    joinedAt?: string;
    createdAt?: string;
    cancelledAt?: string | null;
    consentDueAt?: string | null;
    consentCompletedAt?: string | null;
    cancellationReason?: string | null;
}

export interface EventChatAccess {
    chatUrl: string | null;
    chatPasscode: string | null;
    chatInstructions: string | null;
}

export interface ConsentItem {
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

export interface ConsentItemInput {
    category: ConsentCategory;
    title: string;
    content: string;
    responseType: ConsentResponseType;
    required: boolean;
    displayOrder: number;
}

export interface ConsentConfiguration {
    consentWindowMinutes: number | null;
    items: ConsentItem[];
}

export interface ConsentConfigurationInput {
    consentWindowMinutes: number | null;
    items: ConsentItemInput[];
}

export interface ConsentAnswer {
    consentItemId: number;
    agreed: boolean | null;
    responseText: string | null;
    documentVersion: number;
    contentHash: string;
    respondedAt: string;
}

export interface ConsentDraftAnswer {
    consentItemId: number;
    agreed: boolean | null;
    responseText: string | null;
    documentVersion: number;
    contentHash: string;
    updatedAt: string | null;
}

export interface ParticipantConsentState {
    participantStatus: ParticipantStatus;
    consentDueAt: string | null;
    consentCompletedAt: string | null;
    items: ConsentItem[];
    responses: ConsentAnswer[];
    drafts: ConsentDraftAnswer[];
}

export interface ConsentResponseInput {
    consentItemId: number;
    documentVersion: number;
    contentHash: string;
    agreed: boolean | null;
    responseText: string | null;
}

export type ConsentPrivacyLevel = 'GENERAL' | 'PERSONAL' | 'SENSITIVE';

export interface ManagerConsentResponseItem {
    id: number;
    title: string;
    category: ConsentCategory;
    responseType: ConsentResponseType;
    required: boolean;
    displayOrder: number;
    privacyLevel: ConsentPrivacyLevel;
}

export interface ManagerConsentResponseAnswer {
    consentItemId: number;
    agreed: boolean | null;
    responseText: string | null;
    masked: boolean;
    respondedAt: string;
}

export interface ManagerConsentResponseParticipant {
    participantId: number;
    accountId: number;
    displayName: string;
    status: ParticipantStatus;
    consentCompletedAt: string | null;
    answers: ManagerConsentResponseAnswer[];
}

export interface ManagerConsentResponseSheet {
    eventId: number;
    eventTitle: string;
    items: ManagerConsentResponseItem[];
    participants: ManagerConsentResponseParticipant[];
    canRevealSensitive: boolean;
    canExport: boolean;
    privateValuesRevealed: boolean;
}

export interface EventPaymentPolicy {
    paymentRequired: boolean;
    participationFee: number | null;
    paymentCurrency: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountHolder: string | null;
    paymentDeadlineAt: string | null;
    paymentInstructions: string | null;
    refundPolicy: string | null;
}

export interface OrganizerGroup {
    id: number;
    groupCode?: string;
    name: string;
}

export interface OrganizerGroupMembership {
    id: number;
    groupId: number;
    userId: number;
    crewId?: number | null;
    crewName?: string | null;
    role: 'EVENT_GROUP_OWNER' | 'EVENT_GROUP_MANAGER' | 'EVENT_GROUP_VIEWER';
    userName: string;
}

export interface OrganizerGroupCrew {
    id: number;
    crewId: number;
    crewName: string;
}

export interface OrganizerDirectAddCandidate {
    accountId: number;
    displayName: string;
    crewId: number;
    crewName: string;
    crewRole: 'CREW_MEMBER' | 'CREW_MANAGER' | 'CREW_CAPTAIN';
}

export interface OrganizerGroupInvitation {
    id: number;
    invitationCode: string;
    groupId: number;
    groupName: string;
    invitedAccountId: number;
    invitedAccountCode: string;
    invitedCrewId: number;
    invitedCrewName: string;
    invitedByAccountId: number;
    proposedRole: 'EVENT_GROUP_MANAGER' | 'EVENT_GROUP_VIEWER';
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED';
    createdAt: string;
}

export type OrganizerInviteEligibilityPolicy =
    | 'ASSIGNED_EVENT_MANAGER_ONLY'
    | 'CREW_LEADERS_OR_EVENT_MANAGERS';

export type OrganizerGroupInviteLinkStatus =
    | 'ACTIVE'
    | 'EXPIRED'
    | 'EXHAUSTED'
    | 'REVOKED';

export interface OrganizerGroupInviteLink {
    id: number;
    inviteLinkCode: string;
    groupId: number;
    groupName: string;
    proposedRole: 'EVENT_GROUP_MANAGER' | 'EVENT_GROUP_VIEWER';
    eligibilityPolicy: OrganizerInviteEligibilityPolicy;
    expiresAt: string;
    maxUses: number | null;
    usedCount: number;
    status: OrganizerGroupInviteLinkStatus;
    createdAt: string;
}

export interface CreatedOrganizerGroupInviteLink {
    inviteLink: OrganizerGroupInviteLink;
    token: string;
}

export interface OrganizerGroupInviteLinkPreview {
    inviteLinkCode: string;
    groupId: number;
    groupName: string;
    proposedRole: 'EVENT_GROUP_MANAGER' | 'EVENT_GROUP_VIEWER';
    eligibilityPolicy: OrganizerInviteEligibilityPolicy;
    expiresAt: string;
    maxUses: number | null;
    usedCount: number;
    status: OrganizerGroupInviteLinkStatus;
    eligible: boolean;
    eligibilityReason: string;
}

export interface OrganizerGroupInviteLinkAcceptance {
    membershipId: number;
    groupId: number;
    groupName: string;
    crewId: number;
    crewName: string;
    role: 'EVENT_GROUP_MANAGER' | 'EVENT_GROUP_VIEWER';
}
