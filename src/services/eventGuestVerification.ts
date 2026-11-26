import axios from 'axios';
import apiClient from '../lib/axios';
import type { ApiResponse } from '../types/api';

// Public verification uses its own client without account credentials or auth refresh.
const publicClient = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

export interface EventGuestVerificationSettings {
    available: boolean;
    canIssue: boolean;
    linkActive: boolean;
    expiresAt: string | null;
}

interface IssuedLink {
    linkToken: string;
    expiresAt: string;
}

export interface EventGuestPreview {
    title: string;
    startsAt: string;
    applicationStartsAt: string | null;
    locationName: string | null;
    registration: 'UPCOMING' | 'OPEN' | 'CLOSED';
}

export interface EventGuestChallenge {
    challengeId: string;
    expiresInSeconds: number;
    retryAfterSeconds: number;
}

export async function getEventGuestVerificationSettings(eventId: number) {
    const response = await apiClient.get<ApiResponse<EventGuestVerificationSettings>>(`/dashboard/events/${eventId}/guest-verification`);
    return response.data.data;
}

export async function issueEventGuestVerificationLink(eventId: number) {
    const response = await apiClient.post<ApiResponse<IssuedLink>>(`/dashboard/events/${eventId}/guest-verification/link`);
    return response.data.data;
}

export async function revokeEventGuestVerificationLink(eventId: number) {
    await apiClient.delete(`/dashboard/events/${eventId}/guest-verification/link`);
}

export async function previewEventGuestLink(linkToken: string) {
    const response = await publicClient.post<ApiResponse<EventGuestPreview>>('/public/event-guest-verification/preview', { linkToken });
    return response.data.data;
}

export async function startEventGuestVerification(linkToken: string, phoneNumber: string) {
    const response = await publicClient.post<ApiResponse<EventGuestChallenge>>('/public/event-guest-verification/phone', { linkToken, phoneNumber });
    return response.data.data;
}

export async function confirmEventGuestVerification(linkToken: string, challengeId: string, code: string) {
    await publicClient.post('/public/event-guest-verification/phone/confirm', { linkToken, challengeId, code });
}
