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
    schoolId?: number;
    studentNumber?: string;
}): Promise<void> => {
    await apiClient.put('/accounts/profile-type', request);
};

export const getMyReservations = async (): Promise<MyReservation[]> => {
    const response = await apiClient.get<ApiResponse<MyReservation[]>>('/users/me/reservations');
    return response.data.data;
};

export const deleteAccount = async (): Promise<void> => {
    await apiClient.delete<ApiResponse<null>>('/users/me');
};
