import apiClient from '../lib/axios';
import type { ApiResponse } from '../types/api';

export interface SchoolOption {
    id: number;
    schoolCode: string;
    name: string;
    aliases: string[];
    emailDomains: string[];
}

const DEV_SCHOOLS: SchoolOption[] = [
    { id: 1, schoolCode: 'HKU', name: '한국대학교', aliases: ['한국대', 'HKU'], emailDomains: ['hankook.ac.kr'] },
    { id: 2, schoolCode: 'DHU', name: '대한대학교', aliases: ['대한대', 'DHU'], emailDomains: ['daehan.ac.kr'] },
    { id: 3, schoolCode: 'MGU', name: '민국대학교', aliases: ['민국대', 'MGU'], emailDomains: ['minguk.ac.kr'] },
    { id: 4, schoolCode: 'CSU', name: '청송대학교', aliases: ['청송대', 'CSU'], emailDomains: ['cheongsong.ac.kr'] },
    { id: 5, schoolCode: 'HGU', name: '한강대학교', aliases: ['한강대', 'HGU'], emailDomains: ['hangang.ac.kr'] },
];

export const getSchools = async (): Promise<SchoolOption[]> => {
    try {
        const response = await apiClient.get<ApiResponse<SchoolOption[]>>('/schools');
        return response.data.data;
    } catch (error) {
        if (import.meta.env.DEV) {
            return DEV_SCHOOLS;
        }
        throw error;
    }
};
