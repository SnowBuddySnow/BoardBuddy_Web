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

// --- Missing / TBD Crew Endpoints ---
export const getCrewInfo = async (crewId: number): Promise<CrewDetail> => {
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

export const updateCrew = async (crewId: number, data: CrewInfoUpdateRequest): Promise<void> => {
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
    const response = await apiClient.get<ApiResponse<MyApplication[]>>(`/crews/my-applications`);
    return response.data.data;
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
