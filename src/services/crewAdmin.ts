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
}

export interface CreateCrewRequest {
    name: string;
    pin: string;
    reservationOpenDay: string | null;
    reservationOpenTime: string | null;
    reservationOpenOffsetDays: number | null;
    profileImageUrl: string | null;
}

export const createSchool = async (name: string): Promise<AdminSchool> => {
    const response = await apiClient.post<ApiResponse<AdminSchool>>('/admin/crews/schools', { name });
    return response.data.data;
};

export const getCrewAdminData = async (): Promise<AdminCrewData> => {
    const response = await apiClient.get<ApiResponse<AdminCrewData>>('/admin/crews');
    return response.data.data;
};

export const createCrew = async (request: CreateCrewRequest): Promise<AdminCrew> => {
    const response = await apiClient.post<ApiResponse<AdminCrew>>('/admin/crews', request);
    return response.data.data;
};
