export interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
}

export interface CrewDetail {
    crewId?: number;
    crewName?: string;
    crew_id: number;
    name: string;
    univ: string;
    role?: string;
    pinCode?: string;
    crewPin?: string;
    reservation_day?: string;
    reservation_time?: string;
    reservation_offset?: number;
    reservationOpenDay: string; // e.g., "FRIDAY"
    reservationOpenTime: string; // e.g., "18:00"
    reservationOpenOffsetDays: number; // e.g., 3
    reservationPeriodLimitDays: number; // e.g., 7
    dailyCapacity: number;
    status: string; // "ACTIVE"
    created_at: string;
    updated_at: string;
    president_name: string;
    member_count: number;
    profile_image_url: string | null;
    isCapacityLimited: boolean;
}

export interface CrewSimple {
    crewId: number;
    crewName: string;
}

export interface UserDetail {
    userId: number;
    name: string;
    email: string;
    role: string;
    birthDate: string;
    school: string;
    studentId: string;
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
}

export interface ReservationDayResponse {
    reservationDayId: number;
    crewId: number;
    reservationDate: string;
    capacityLimited: boolean;
    capacity: number;
    confirmedCount: number;
    waitingCount: number;
    reservations: ReservationBookingResponse[];
}

export interface ReservationDaysPrepareRequest {
    from: string;
    to: string;
}

// --- End New Reservation DTOs ---

export interface CrewInfoUpdateRequest {
    crewName: string;
    crewPIN: number;
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

// --- Party DTOs ---

export type PartyStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELLED';
export type VisibilityType = 'PUBLIC' | 'CREW_LIMITED' | 'INVITE_ONLY' | 'LINK_ONLY';
export type JoinPolicy = 'INSTANT' | 'APPROVAL_REQUIRED' | 'INVITE_ONLY' | 'PUBLIC';
export type ParticipantStatus = 'JOINED' | 'PENDING' | 'CANCELLED' | 'REMOVED' | 'NONE';

export interface Party {
    id: number;
    title: string;
    description: string;
    activityType: string;
    startsAt: string; // ISO LocalDateTime
    endsAt?: string; // ISO LocalDateTime
    locationName: string;
    locationAddress: string;
    capacity: number;
    status: PartyStatus;
    visibilityType: VisibilityType;
    joinPolicy: JoinPolicy;
    createdByUserId?: number;
    organizerGroupId: number;
    organizerGroupName?: string;
    allowedCrewIds?: number[];
    joinedCount?: number;
    currentUserStatus?: ParticipantStatus | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface PartyParticipant {
    id: number;
    partyEventId?: number;
    partyId?: number;
    userId: number;
    userName?: string;
    status: ParticipantStatus;
    joinedAt?: string;
    createdAt?: string;
    cancelledAt?: string | null;
}

export interface OrganizerGroup {
    id: number;
    name: string;
}

export interface OrganizerGroupMembership {
    id: number;
    groupId: number;
    userId: number;
    role: 'OWNER' | 'EDITOR' | 'VIEWER';
    userName?: string;
}
