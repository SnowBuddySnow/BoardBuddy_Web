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
    optionalQuestion?: string | null;
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
    optionalQuestion?: string | null;
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

export async function issueEventGuestVerificationLink(eventId: number, optionalQuestion: string | null) {
    const response = await apiClient.post<ApiResponse<IssuedLink>>(`/dashboard/events/${eventId}/guest-verification/link`, { optionalQuestion });
    return response.data.data;
}

export async function revokeEventGuestVerificationLink(eventId: number) {
    await apiClient.delete(`/dashboard/events/${eventId}/guest-verification/link`);
}

export async function previewEventGuestLink(linkToken: string) {
    const response = await publicClient.post<ApiResponse<EventGuestPreview>>('/public/event-guest-verification/preview', { linkToken });
    return response.data.data;
}

export type EventGuestScope = { linkToken: string } | { receiptCode: string };

export interface EventGuestProof {
    proofToken: string;
    expiresAt: string;
}

export interface EventGuestApplication {
    receiptCode: string;
    eventTitle: string;
    startsAt: string;
    name: string | null;
    school: string | null;
    crew: string | null;
    maskedPhone: string | null;
    question: string | null;
    answer: string | null;
    status: 'JOINED' | 'PENDING' | 'CANCELLED' | 'REMOVED';
    appliedAt: string;
    canCancel: boolean;
    canApprove: boolean;
    eventCancelled: boolean;
}

export interface EventGuestApplicationInput {
    linkToken: string;
    proofToken: string;
    phoneNumber: string;
    name: string;
    school: string;
    crew: string;
    answer?: string;
    privacyVersion: number;
}

type ApplicationAccess = { receiptCode: string; proofToken: string; linkToken?: string };

export async function startEventGuestVerification(scope: EventGuestScope, phoneNumber: string) {
    const response = await publicClient.post<ApiResponse<EventGuestChallenge>>('/public/event-guest-verification/phone', { ...scope, phoneNumber });
    return response.data.data;
}

export async function confirmEventGuestVerification(scope: EventGuestScope, challengeId: string, code: string) {
    const response = await publicClient.post<ApiResponse<EventGuestProof>>('/public/event-guest-verification/phone/confirm', { ...scope, challengeId, code });
    return response.data.data;
}

export async function createEventGuestApplication(input: EventGuestApplicationInput) {
    const response = await publicClient.post<ApiResponse<EventGuestApplication>>('/public/event-guest-applications', input);
    return response.data.data;
}

export async function lookupEventGuestApplication(access: ApplicationAccess) {
    const response = await publicClient.post<ApiResponse<EventGuestApplication>>('/public/event-guest-applications/lookup', access);
    return response.data.data;
}

export async function cancelEventGuestApplication(access: ApplicationAccess) {
    const response = await publicClient.post<ApiResponse<EventGuestApplication>>('/public/event-guest-applications/cancel', access);
    return response.data.data;
}

export async function listEventGuestApplications(eventId: number) {
    const response = await apiClient.get<ApiResponse<EventGuestApplication[]>>(`/dashboard/events/${eventId}/guest-applications`);
    return response.data.data;
}

export async function updateEventGuestApplication(eventId: number, receiptCode: string, status: 'JOINED' | 'REMOVED') {
    const response = await apiClient.patch<ApiResponse<EventGuestApplication>>(`/dashboard/events/${eventId}/guest-applications/${receiptCode}`, { status });
    return response.data.data;
}
