import apiClient from '../lib/axios';
import type { ApiResponse } from '../types/api';

export interface SchoolOption {
    id: number;
    name: string;
}

export const getSchools = async (): Promise<SchoolOption[]> => {
    const response = await apiClient.get<ApiResponse<SchoolOption[]>>('/schools');
    return response.data.data;
};
