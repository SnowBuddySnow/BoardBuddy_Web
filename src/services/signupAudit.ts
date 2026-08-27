import axios from 'axios';
import apiClient from '../lib/axios';
import type { ApiResponse } from '../types/api';
import type { SchoolOption } from './schools';

export interface SignupAuditAccount {
    accountId: number;
    accountCode: string;
    phoneNumber: string;
    accessToken: string;
    refreshToken: string;
}

export interface SignupAuditProfileResult {
    accountId: number;
    accountCode: string;
    userType: string;
    universityVerificationStatus: string;
    displayName: string;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

export const createSignupAudit = async () => {
    const response = await apiClient.post<ApiResponse<SignupAuditAccount>>('/admin/signup-audits');
    return response.data.data;
};

export const deleteSignupAudit = async (accountId: number) => {
    await apiClient.delete(`/admin/signup-audits/${accountId}`);
};

export const getAuditSchools = async (accessToken: string) => {
    const response = await axios.get<ApiResponse<SchoolOption[]>>(`${apiBaseUrl}/schools`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data.data;
};

export const completeAuditSignup = async (
    audit: SignupAuditAccount,
    input: {
        displayName: string;
        schoolId: number;
        studentNumber: string;
        gender: 'MALE' | 'FEMALE';
    },
) => {
    const response = await axios.put<ApiResponse<SignupAuditProfileResult>>(
        `${apiBaseUrl}/accounts/${audit.accountId}/profile`,
        {
            userType: 'KUSBF',
            displayName: input.displayName,
            email: null,
            schoolId: input.schoolId,
            studentNumber: input.studentNumber,
            gender: input.gender,
            phoneNumber: audit.phoneNumber,
        },
        { headers: { Authorization: `Bearer ${audit.accessToken}` } },
    );
    return response.data.data;
};
