import apiClient from '../lib/axios';
import { ApiResponse, UserDetail, MyReservation } from '../types/api';

export const getUserInfo = async (): Promise<UserDetail> => {
    const response = await apiClient.get<ApiResponse<UserDetail>>('/users/me');
    const data = response.data.data;

    // Apply Dev Mode Overrides
    const crewOverride = localStorage.getItem('dev_crew_override');
    const roleOverride = localStorage.getItem('dev_role_override');

    if (crewOverride === 'none') {
        data.crew = null as any;
    } else if (crewOverride === 'has_crew') {
        data.crew = { crewId: 1, crewName: 'Mock Crew 401' };
        data.school = 'Mock University';
    }

    if (roleOverride === 'admin') {
        data.role = 'ADMIN';
    } else if (roleOverride === 'member') {
        data.role = 'MEMBER';
    }

    return data;
};

export const getMyReservations = async (): Promise<MyReservation[]> => {
    const response = await apiClient.get<ApiResponse<MyReservation[]>>('/users/me/reservations');
    return response.data.data;
};

export const deleteAccount = async (): Promise<void> => {
    await apiClient.delete<ApiResponse<null>>('/users/me');
};
