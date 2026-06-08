import apiClient from '../lib/axios';
import { ApiResponse } from '../types/api';

export interface GuestDetail {
    id: number;
    name: string;
    phoneNumber: string;
    createdAt: string;
}

export const registerGuest = async (name: string, phoneNumber: string): Promise<GuestDetail> => {
    const response = await apiClient.post<ApiResponse<GuestDetail>>('/guests', { name, phoneNumber });
    return response.data.data;
};
