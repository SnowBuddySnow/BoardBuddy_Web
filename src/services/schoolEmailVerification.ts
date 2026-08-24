import apiClient from '../lib/axios';
import type { ApiResponse, UniversityVerificationStatus } from '../types/api';

export interface SchoolEmailChallenge {
    challengeId: string;
    maskedEmail: string;
    expiresInSeconds: number;
    retryAfterSeconds: number;
    expiresAt: string;
}

export interface SchoolEmailVerificationStatus {
    status: UniversityVerificationStatus;
    configured: boolean;
    schoolName: string;
    maskedEmail: string;
    challengeId: string | null;
    expiresAt: string | null;
}

export interface SchoolEmailVerificationResult {
    accountId: number;
    schoolName: string;
    maskedEmail: string;
    status: UniversityVerificationStatus;
    verifiedAt: string;
}

export const requestSchoolEmailVerification = async (email?: string): Promise<SchoolEmailChallenge> => {
    const response = await apiClient.post<ApiResponse<SchoolEmailChallenge>>(
        '/accounts/school-email-verifications',
        email ? { email } : {},
    );
    return response.data.data;
};

export const getSchoolEmailVerificationStatus = async (): Promise<SchoolEmailVerificationStatus> => {
    const response = await apiClient.get<ApiResponse<SchoolEmailVerificationStatus>>(
        '/accounts/school-email-verifications/status',
    );
    return response.data.data;
};

export const confirmSchoolEmailCode = async (
    challengeId: string,
    code: string,
): Promise<SchoolEmailVerificationResult> => {
    const response = await apiClient.post<ApiResponse<SchoolEmailVerificationResult>>(
        `/accounts/school-email-verifications/${challengeId}/confirm`,
        { code },
    );
    return response.data.data;
};

export const activateSchoolEmailLink = async (token: string): Promise<SchoolEmailVerificationResult> => {
    const response = await apiClient.post<ApiResponse<SchoolEmailVerificationResult>>(
        '/accounts/school-email-verifications/activate',
        { token },
    );
    return response.data.data;
};
