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

// --- Missing / TBD Crew Endpoints ---
export const getCrewInfo = async (crewId: number): Promise<CrewDetail> => {
    if (hasDevOverride()) {
        return {
            crewId,
            crew_id: crewId,
            crewName: 'Mock Crew 401',
            name: 'Mock Crew 401',
            univ: 'Mock University',
            status: 'INACTIVE',
            role: 'CREW_MANAGER',
            pinCode: '1234',
            crewPin: '1234',
            reservation_day: 'FRIDAY',
            reservation_time: '18:00',
            reservation_offset: 3,
            reservationOpenDay: 'FRIDAY',
            reservationOpenTime: '18:00',
            reservationOpenOffsetDays: 3,
            reservationPeriodLimitDays: 7,
            dailyCapacity: 8,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            president_name: 'Mock User (Dev Mode)',
            member_count: 12,
            profile_image_url: null,
            isCapacityLimited: true,
            seasonHouseActive: false,
        };
    }

    const response = await apiClient.get<ApiResponse<CrewDetail>>(`/crews/${crewId}`);
    return response.data.data;
};

export const getCrewMembers = async (crewId: number): Promise<CrewMember[]> => {
    const response = await apiClient.get<ApiResponse<CrewMember[]>>(`/crews/${crewId}/members`);
    return response.data.data;
};

export const getCrewManagers = async (crewId: number): Promise<CrewMember[]> => {
    const response = await apiClient.get<ApiResponse<CrewMember[]>>(`/crews/${crewId}/managers`);
    return response.data.data;
};

export const getApplicants = async (crewId: number): Promise<CrewApplicant[]> => {
    const response = await apiClient.get<ApiResponse<CrewApplicant[]>>(`/crews/${crewId}/applications`);
    return response.data.data;
};

export const manageApplicant = async (crewId: number, applicationId: number, decision: number): Promise<void> => {
    await apiClient.post(`/crews/${crewId}/applications/${applicationId}/approve`, { decision });
};

export const applyToCrew = async (crewId: number, crewPIN: string): Promise<void> => {
    await apiClient.post(`/crews/${crewId}/applications`, { crewPIN });
};

export const updateCrew = async (crewId: number, data: Partial<CrewInfoUpdateRequest> & { id?: number; name?: string }): Promise<void> => {
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
