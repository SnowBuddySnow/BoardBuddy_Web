import apiClient from '../lib/axios';
import type { ApiResponse } from '../types/api';

export interface SchoolOption {
    id: number;
    schoolCode: string;
    name: string;
    aliases: string[];
    emailDomains: string[];
}

export const getSchools = async (): Promise<SchoolOption[]> => {
    const response = await apiClient.get<ApiResponse<SchoolOption[]>>('/schools');
    return response.data.data;
};
