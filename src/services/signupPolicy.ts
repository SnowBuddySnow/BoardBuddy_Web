import apiClient from '../lib/axios';
import type { ApiResponse } from '../types/api';

export interface SignupPolicy {
    regularEnabled: boolean;
    studentEnabled: boolean;
    version: number | null;
}

export type SignupType = 'REGULAR' | 'KUSBF';

export const getSignupPolicy = async (): Promise<SignupPolicy> => {
    const response = await apiClient.get<ApiResponse<SignupPolicy>>('/signup-policy');
    return response.data.data;
};

export const updateSignupPolicy = async (type: SignupType, enabled: boolean, version: number | null): Promise<SignupPolicy> => {
    const response = await apiClient.patch<ApiResponse<SignupPolicy>>(`/admin/signup-policy/${type}`, { enabled, version });
    return response.data.data;
};
