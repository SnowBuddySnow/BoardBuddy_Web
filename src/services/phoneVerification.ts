import apiClient from '../lib/axios';
import { getSignupToken } from '../lib/session';
import type { ApiResponse, UserType } from '../types/api';

export interface PhoneVerificationChallenge {
    challengeId: string;
    expiresInSeconds: number;
}

export interface PhoneVerificationResult {
    resolution: 'VERIFIED' | 'LINKED_EXISTING_ACCOUNT';
    accountId: number;
    status: 'PENDING_PROFILE' | 'ACTIVE' | 'SUSPENDED' | 'DELETED';
    userType: UserType;
    accessToken: string;
}

const authConfig = () => {
    const token = getSignupToken();
    if (!token) throw new Error('Signup authentication is missing');
    return { headers: { Authorization: `Bearer ${token}` } };
};

export const requestPhoneVerification = async (phoneNumber: string) => {
    const response = await apiClient.post<ApiResponse<PhoneVerificationChallenge>>(
        '/accounts/phone-verifications',
        { phoneNumber },
        authConfig(),
    );
    return response.data.data;
};

export const confirmPhoneVerification = async (challengeId: string, code: string) => {
    const response = await apiClient.post<ApiResponse<PhoneVerificationResult>>(
        `/accounts/phone-verifications/${challengeId}/confirm`,
        { code },
        authConfig(),
    );
    return response.data.data;
};
