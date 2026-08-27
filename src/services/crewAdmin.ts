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

import { hasDevOverride } from '../lib/session';

export const getCrewAdminData = async (mine = false): Promise<AdminCrewData> => {
    // Local UI simulation may stand in for a user's own crew-creation view, but it
    // must never stand in for the deployed developer-account authorization check.
    if (hasDevOverride() && mine) {
        return {
            crews: [
                {
                    id: 101,
                    name: '아웃런 (OUTRUN)',
                    schoolId: 1,
                    schoolName: '한국대학교',
                    status: 'ACTIVE',
                    approvalStatus: 'APPROVED',
                    requestedByAccountId: 999,
                    requestedByName: '김버디 (학생회장)',
                    requestedBySchoolId: 1,
                    requestedBySchoolName: '한국대학교',
                    reviewedByAccountId: 1,
                    reviewedAt: new Date().toISOString(),
                    approvalNote: '소속 대학 동아리 등록 확인 완료',
                    seasonHouseActive: true,
                    kusbfAssociated: true,
                    dailyCapacity: 12,
                    capacityLimited: true,
                    reservationPeriodLimitDays: 7,
                    reservationOpenDay: 'FRIDAY',
                    reservationOpenTime: '18:00',
                    reservationOpenOffsetDays: 3,
                    profileImageUrl: null,
                    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
                }
            ],
            schools: [
                { id: 1, name: '한국대학교' },
                { id: 2, name: '대한대학교' },
                { id: 3, name: '민국대학교' },
            ],
            developerAccess: false,
        };
    }
    const response = await apiClient.get<ApiResponse<AdminCrewData>>('/admin/crews', {
        params: mine ? { mine: true } : undefined,
    });
    return response.data.data;
};

export const createCrew = async (request: CreateCrewRequest): Promise<AdminCrew> => {
    if (hasDevOverride()) {
        return {
            id: 105,
            name: request.name,
            schoolId: 1,
            schoolName: '한국대학교',
            status: 'ACTIVE',
            approvalStatus: 'PENDING',
            requestedByAccountId: 999,
            requestedByName: '김버디 (학생회장)',
            requestedBySchoolId: 1,
            requestedBySchoolName: '한국대학교',
            reviewedByAccountId: null,
            reviewedAt: null,
            approvalNote: null,
            seasonHouseActive: false,
            kusbfAssociated: true,
            dailyCapacity: 0,
            capacityLimited: false,
            reservationPeriodLimitDays: 7,
            reservationOpenDay: 'FRIDAY',
            reservationOpenTime: '18:00',
            reservationOpenOffsetDays: 3,
            profileImageUrl: request.profileImageUrl,
            createdAt: new Date().toISOString(),
        };
    }
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
