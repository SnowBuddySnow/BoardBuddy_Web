import apiClient from '../lib/axios';
import type { ApiResponse } from '../types/api';

export interface AdminSchool {
    id: number;
    name: string;
}

export interface AdminCrew {
    id: number;
    name: string;
    schoolId: number | null;
    schoolName: string | null;
    status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    requestedByAccountId: number | null;
    requestedByName: string | null;
    requestedBySchoolId: number | null;
    requestedBySchoolName: string | null;
    reviewedByAccountId: number | null;
    reviewedAt: string | null;
    approvalNote: string | null;
    seasonHouseActive: boolean;
    kusbfAssociated: boolean;
    dailyCapacity: number;
    capacityLimited: boolean;
    reservationPeriodLimitDays: number;
    reservationOpenDay: string | null;
    reservationOpenTime: string | null;
    reservationOpenOffsetDays: number | null;
    profileImageUrl: string | null;
    createdAt: string;
}

export interface AdminCrewData {
    crews: AdminCrew[];
    schools: AdminSchool[];
    developerAccess: boolean;
}

export interface CreateCrewRequest {
    name: string;
    profileImageUrl: string | null;
}

export const getCrewAdminData = async (mine = false): Promise<AdminCrewData> => {
    const response = await apiClient.get<ApiResponse<AdminCrewData>>('/admin/crews', {
        params: mine ? { mine: true } : undefined,
    });
    return response.data.data;
};

export const createCrew = async (request: CreateCrewRequest): Promise<AdminCrew> => {
    const response = await apiClient.post<ApiResponse<AdminCrew>>('/admin/crews', request);
    return response.data.data;
};

export const reviewCrew = async (
    crewId: number,
    decision: 'APPROVE' | 'REJECT',
    note?: string,
): Promise<AdminCrew> => {
    const response = await apiClient.post<ApiResponse<AdminCrew>>(
        `/admin/crews/${crewId}/approval`,
        { decision, note: note?.trim() || null },
    );
    return response.data.data;
};

export const affiliateCrewSchool = async (crewId: number, schoolId: number): Promise<AdminCrew> => {
    const response = await apiClient.put<ApiResponse<AdminCrew>>(
        `/admin/crews/${crewId}/school-affiliation`,
        { schoolId },
    );
    return response.data.data;
};
