import apiClient from '../lib/axios';
import { ApiResponse, UserDetail, MyReservation } from '../types/api';

export const getUserInfo = async (): Promise<UserDetail> => {
    const crewOverride = localStorage.getItem('dev_crew_override');
    const roleOverride = localStorage.getItem('dev_role_override');
    const hasOverride = (crewOverride && crewOverride !== 'server') || (roleOverride && roleOverride !== 'server');

    if (hasOverride) {
        const mockData: UserDetail = {
            userId: 999,
            name: 'Mock User (Dev Mode)',
            email: 'dev@boardbuddy.com',
            role: roleOverride === 'admin' ? 'ADMIN' : 'MEMBER',
            birthDate: '2000-01-01',
            school: crewOverride === 'has_crew' ? 'Mock University' : 'No University',
            studentId: '202012345',
            gender: 'MALE',
            phoneNumber: '010-1234-5678',
            profileImageUrl: '',
            socialId: 'mock_social',
            socialProvider: 'KAKAO',
            isRegistered: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            crew: crewOverride === 'has_crew' ? { crewId: 1, crewName: 'Mock Crew 401' } : null as any
        };
        return mockData;
    }

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
