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

export const downloadPersonalData = async (): Promise<string> => {
    const data = isDevMode()
        ? { exportedAt: new Date().toISOString(), account: getDevUser(), developmentSimulation: true }
        : (await apiClient.get<ApiResponse<unknown>>('/users/me/personal-data')).data.data;
    const filename = `boardbuddy-personal-data-${new Date().toISOString().slice(0, 10)}.json`;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return filename;
};
