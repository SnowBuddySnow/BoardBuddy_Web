import apiClient from '../lib/axios';
import { ApiResponse, UserDetail, MyReservation } from '../types/api';

export const getUserInfo = async (): Promise<UserDetail> => {
    const response = await apiClient.get<ApiResponse<UserDetail>>('/users/me');
    return response.data.data;
};

export const getMyReservations = async (): Promise<MyReservation[]> => {
    const response = await apiClient.get<ApiResponse<MyReservation[]>>('/users/me/reservations');
    return response.data.data;
};

export const deleteAccount = async (): Promise<void> => {
    await apiClient.delete<ApiResponse<null>>('/users/me');
};
