import apiClient from '../lib/axios';
import { ApiResponse, UserDetail, MyReservation } from '../types/api';
import { getDevUser, isDevMode } from './devMocks';

export const getUserInfo = async (): Promise<UserDetail> => {
    if (isDevMode()) {
        return getDevUser();
    }

    const response = await apiClient.get<ApiResponse<UserDetail>>('/users/me');
    return response.data.data;
};

export const confirmProfileType = async (request: {
    userType: 'REGULAR' | 'KUSBF';
    displayName?: string;
    email?: string;
    schoolId?: number;
    studentNumber?: string;
}): Promise<{ universityVerificationStatus: string }> => {
    const response = await apiClient.put<ApiResponse<{ universityVerificationStatus: string }>>(
        '/accounts/profile-type',
        request,
    );
    return response.data.data;
};

export const getMyReservations = async (): Promise<MyReservation[]> => {
    const response = await apiClient.get<ApiResponse<MyReservation[]>>('/users/me/reservations');
    return response.data.data;
};

export const deleteAccount = async (): Promise<void> => {
    await apiClient.delete<ApiResponse<null>>('/users/me');
};
