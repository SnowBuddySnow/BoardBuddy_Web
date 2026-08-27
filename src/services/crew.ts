import apiClient from '../lib/axios';
import { 
    ApiResponse, 
    CrewDetail, 
    CrewMember, 
    CrewApplicant, 
    CrewCalendarResponse, 
    CrewInfoUpdateRequest, 
    CrewUsageStatistic, 
    MyCalendarResponse, 
    MyApplication, 
    ReservationInfo,
    ReservationCreateRequest,
    ReservationCreateResponse,
    ReservationDayResponse,
    ReservationResultResponse,
    ReservationDaysPrepareRequest
} from '../types/api';
import { getDevCrewOverride, hasDevOverride } from '../lib/session';

export interface DiscoverableCrew {
    crewId: number;
    crewCode: string;
    crewName: string;
    schoolId: number | null;
    schoolName: string | null;
    memberCount: number;
    profileImageUrl: string | null;
    schoolVerificationRequired: boolean;
}

// --- Missing / TBD Crew Endpoints ---
export const getCrewInfo = async (crewId: number): Promise<CrewDetail> => {
    if (hasDevOverride()) {
        return {
            crewId,
            crew_id: crewId,
            crewName: '아웃런 (OUTRUN)',
            name: '아웃런 (OUTRUN)',
            univ: '한국대학교',
            status: 'ACTIVE',
            role: 'CREW_CAPTAIN',
            crewPin: '2026',
            reservation_day: 'FRIDAY',
            reservation_time: '18:00',
            reservation_offset: 3,
            reservationOpenDay: 'FRIDAY',
            reservationOpenTime: '18:00',
            reservationOpenOffsetDays: 3,
            reservationPeriodLimitDays: 7,
            dailyCapacity: 12,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            president_name: '김버디 (학생회장)',
            member_count: 42,
            profile_image_url: null,
            isCapacityLimited: true,
            seasonHouseActive: true,
            schoolVerificationRequired: localStorage.getItem(`dev_crew_school_verification_required_${crewId}`) === 'true',
        };
    }

    const response = await apiClient.get<ApiResponse<CrewDetail>>(`/crews/${crewId}`);
    return response.data.data;
};

export const getCrewMembers = async (crewId: number): Promise<CrewMember[]> => {
    if (hasDevOverride()) {
        return [
            { user_id: 999, name: '김버디 (학생회장)', student_id: '202410291', role: 'CREW_CAPTAIN' },
            { user_id: 11, name: '이민수 (기획팀장)', student_id: '202311402', role: 'CREW_MANAGER' },
            { user_id: 12, name: '박서연 (운영위원)', student_id: '202410319', role: 'CREW_MANAGER' },
            { user_id: 13, name: '최준혁 (한국대 24학번)', student_id: '202410512', role: 'MEMBER' },
            { user_id: 14, name: '정다은 (한국대 23학번)', student_id: '202311094', role: 'MEMBER' },
            { user_id: 15, name: '강현우 (한국대 22학번)', student_id: '202210881', role: 'MEMBER' },
        ];
    }
    const response = await apiClient.get<ApiResponse<CrewMember[]>>(`/crews/${crewId}/members`);
    return response.data.data;
};

export const getCrewManagers = async (crewId: number): Promise<CrewMember[]> => {
    if (hasDevOverride()) {
        return [
            { user_id: 999, name: '김버디 (학생회장)', student_id: '202410291', role: 'CREW_CAPTAIN' },
            { user_id: 11, name: '이민수 (기획팀장)', student_id: '202311402', role: 'CREW_MANAGER' },
            { user_id: 12, name: '박서연 (운영위원)', student_id: '202410319', role: 'CREW_MANAGER' },
        ];
    }
    const response = await apiClient.get<ApiResponse<CrewMember[]>>(`/crews/${crewId}/managers`);
    return response.data.data;
};

export const getApplicants = async (crewId: number): Promise<CrewApplicant[]> => {
    if (hasDevOverride()) {
        return [
            { applicationId: 501, userId: 101, userName: '윤도현 (신입지원)', userType: 'KUSBF', schoolName: '한국대학교', studentId: '202611029', universityVerificationStatus: 'VERIFIED', status: 'PENDING', created_at: new Date().toISOString() },
            { applicationId: 502, userId: 102, userName: '송지아 (신입지원)', userType: 'KUSBF', schoolName: '한국대학교', studentId: '202611083', universityVerificationStatus: 'PENDING', status: 'PENDING', created_at: new Date().toISOString() },
        ];
    }
    const response = await apiClient.get<ApiResponse<CrewApplicant[]>>(`/crews/${crewId}/applications`);
    return response.data.data;
};

export const manageApplicant = async (crewId: number, applicationId: number, decision: number): Promise<void> => {
    if (hasDevOverride()) return;
    await apiClient.post(`/crews/${crewId}/applications/${applicationId}/approve`, { decision });
};

export const resetCrewPin = async (crewId: number): Promise<string> => {
    if (hasDevOverride()) return '2026';
    const response = await apiClient.post<ApiResponse<{ pin?: string; crewPin?: string }>>(`/crews/${crewId}/pin/reset`);
    return response.data.data.pin || response.data.data.crewPin || '2026';
};

export const applyToCrew = async (crewId: number, crewPIN: string): Promise<void> => {
    if (hasDevOverride()) {
        if (crewPIN.length !== 4) throw new Error('PIN must be 4 digits');
        return;
    }
    await apiClient.post(`/crews/${crewId}/applications`, { crewPIN });
};

export const discoverCrews = async (query = ''): Promise<DiscoverableCrew[]> => {
    if (hasDevOverride()) {
        const mockCrews: DiscoverableCrew[] = [
            {
                crewId: 101,
                crewName: '아웃런 (OUTRUN)',
                crewCode: 'CRW-OUTRUN',
                schoolId: 1,
                schoolName: '한국대학교',
                memberCount: 42,
                profileImageUrl: '',
                schoolVerificationRequired: true,
            },
            {
                crewId: 102,
                crewName: '블루모션 (BlueMotion)',
                crewCode: 'CRW-BLUEM',
                schoolId: 2,
                schoolName: '대한대학교',
                memberCount: 38,
                profileImageUrl: '',
                schoolVerificationRequired: false,
            },
            {
                crewId: 103,
                crewName: '체이서스 (Chasers)',
                crewCode: 'CRW-CHASER',
                schoolId: 3,
                schoolName: '민국대학교',
                memberCount: 29,
                profileImageUrl: '',
                schoolVerificationRequired: false,
            },
            {
                crewId: 104,
                crewName: '피크앤포인트 (Peak & Point)',
                crewCode: 'CRW-PEAKP',
                schoolId: 4,
                schoolName: '청송대학교',
                memberCount: 31,
                profileImageUrl: '',
                schoolVerificationRequired: false,
            },
        ];
        if (!query) return mockCrews;
        return mockCrews.filter(c => c.crewName.includes(query) || (c.schoolName && c.schoolName.includes(query)) || c.crewCode.includes(query));
    }
    const response = await apiClient.get<ApiResponse<DiscoverableCrew[]>>('/crews/discover', {
        params: { query },
    });
    return response.data.data;
};

export const updateCrew = async (crewId: number, data: Partial<CrewInfoUpdateRequest> & { id?: number; name?: string }): Promise<void> => {
    if (hasDevOverride()) {
        if (typeof data.schoolVerificationRequired === 'boolean') {
            localStorage.setItem(
                `dev_crew_school_verification_required_${crewId}`,
                String(data.schoolVerificationRequired),
            );
        }
        return;
    }
    await apiClient.patch(`/crews/${crewId}/info`, data);
};

export const promoteMember = async (crewId: number, userId: number): Promise<void> => {
    await apiClient.post(`/crews/${crewId}/managers/${userId}`);
};

export const demoteManager = async (crewId: number, userId: number): Promise<void> => {
    await apiClient.delete(`/crews/${crewId}/managers/${userId}`);
};

export const getCrewUsageStatistics = async (
    crewId: number,
    sortBy: 'name' | 'usageCount' = 'name',
    sortOrder: 'asc' | 'desc' = 'asc',
    search: string = ''
): Promise<CrewUsageStatistic[]> => {
    const response = await apiClient.get<ApiResponse<CrewUsageStatistic[]>>(`/crews/${crewId}/usage-statistics`, {
        params: { sortBy, sortOrder, search }
    });
    return response.data.data;
};

export const getMyApplications = async (): Promise<MyApplication[]> => {
    const crewOverride = getDevCrewOverride();

    if (crewOverride === 'pending') {
        return [{
            application_id: 999,
            crew_id: 1,
            crew_name: 'Mock Pending Crew (SnowFly)',
            status: 'PENDING',
            created_at: new Date().toISOString(),
            processed_at: null
        }];
    }

    if (hasDevOverride()) {
        return [];
    }

    const response = await apiClient.get<ApiResponse<MyApplication[]>>('/crews/my-applications');
    return response.data.data;
};

export const withdrawCrewApplication = async (applicationId: number): Promise<void> => {
    if (hasDevOverride()) {
        return;
    }

    await apiClient.delete(`/crews/my-applications/${applicationId}`);
};

export const leaveCrew = async (crewId: number): Promise<void> => {
    if (hasDevOverride()) {
        localStorage.setItem('dev_crew_override', 'none');
        return;
    }
    await apiClient.delete(`/crews/${crewId}/membership`);
};

// --- New / Updated Reservation Endpoints ---

export const getReservationDetail = async (crewId: number, date: string): Promise<ReservationDayResponse> => {
    const response = await apiClient.get<ApiResponse<ReservationDayResponse>>(`/crews/${crewId}/reservations/days/${date}`);
    return response.data.data;
};

export const listReservationDays = async (crewId: number, from: string, to: string): Promise<ReservationDayResponse[]> => {
    const response = await apiClient.get<ApiResponse<ReservationDayResponse[]>>(`/crews/${crewId}/reservations/days?from=${from}&to=${to}`);
    return response.data.data;
};

export const prepareReservationDays = async (crewId: number, from: string, to: string): Promise<ReservationDayResponse[]> => {
    const payload: ReservationDaysPrepareRequest = { from, to };
    const response = await apiClient.post<ApiResponse<ReservationDayResponse[]>>(`/crews/${crewId}/reservations/days/prepare`, payload);
    return response.data.data;
};

export const createReservation = async (crewId: number, dates: string[], guestId?: number): Promise<ReservationCreateResponse> => {
    const payload: ReservationCreateRequest = { dates, guestId };
    const response = await apiClient.post<ApiResponse<ReservationCreateResponse>>(`/crews/${crewId}/reservations`, payload);
    return response.data.data;
};

export const cancelReservation = async (crewId: number, reservationId: number): Promise<ReservationResultResponse> => {
    const response = await apiClient.delete<ApiResponse<ReservationResultResponse>>(`/crews/${crewId}/reservations/${reservationId}`);
    return response.data.data;
};

export const updateReservationManagement = async (
    crewId: number,
    reservationId: number,
    paymentStatus: 'UNPAID' | 'PAID' | null,
    managerMemo: string | null,
): Promise<{ reservationId: number; paymentStatus: 'UNPAID' | 'PAID' | null; managerMemo: string | null }> => {
    const response = await apiClient.patch<ApiResponse<{ reservationId: number; paymentStatus: 'UNPAID' | 'PAID' | null; managerMemo: string | null }>>(
        `/crews/${crewId}/reservations/${reservationId}/management`,
        { paymentStatus, managerMemo },
    );
    return response.data.data;
};

// @deprecated: Replaced by cancelReservation
export const deleteReservation = async (crewId: number, reservationId: number): Promise<void> => {
    await apiClient.delete(`/crews/${crewId}/reservations/${reservationId}`);
};

// @deprecated: Details fetched via getReservationDetail (which hits /days/{date})
export const getReservation = async (crewId: number, reservationId: number): Promise<ReservationInfo> => {
    const response = await apiClient.get<ApiResponse<ReservationInfo>>(`/crews/${crewId}/reservations/${reservationId}`);
    return response.data.data;
};

// --- Deprecated / Missing Calendar & Teaching Endpoints ---

export const getCrewCalendar = async (crewId: number, date: string, showMySchedule: boolean = false): Promise<CrewCalendarResponse> => {
    const response = await apiClient.get<ApiResponse<CrewCalendarResponse>>(`/crews/${crewId}/calendar?date=${date}&showMySchedule=${showMySchedule}`);
    return response.data.data;
};

export const getMyCrewCalendar = async (crewId: number, date: string): Promise<MyCalendarResponse> => {
    const response = await apiClient.get<ApiResponse<MyCalendarResponse>>(`/crews/${crewId}/calendar/my?date=${date}`);
    return response.data.data;
};

export const applyForTeaching = async (crewId: number, reservationId: number): Promise<void> => {
    await apiClient.post(`/crews/${crewId}/reservations/${reservationId}/teaching`);
};

export const withdrawFromTeaching = async (crewId: number, reservationId: number): Promise<void> => {
    await apiClient.delete(`/crews/${crewId}/reservations/${reservationId}/teaching`);
};
