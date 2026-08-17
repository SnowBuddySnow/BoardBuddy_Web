import apiClient from '../lib/axios';
import type { ApiResponse, UniversityVerificationStatus, UserType } from '../types/api';

export type AccountStatus = 'PENDING_PROFILE' | 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export interface AdminUser {
    accountId: number;
    userCode: string;
    name: string;
    accountStatus: AccountStatus;
    userType: UserType;
    universityVerificationStatus: UniversityVerificationStatus;
    platformAdmin: boolean;
    createdAt: string;
}

export const searchAdminUsers = async (query: string): Promise<AdminUser[]> => {
    const response = await apiClient.get<ApiResponse<AdminUser[]>>('/admin/users', {
        params: { query, limit: 25 },
    });
    return response.data.data;
};

export const updatePlatformAdmin = async (
    accountId: number,
    platformAdmin: boolean,
): Promise<AdminUser> => {
    const response = await apiClient.patch<ApiResponse<AdminUser>>(
        `/admin/users/${accountId}/platform-admin`,
        { platformAdmin },
    );
    return response.data.data;
};
