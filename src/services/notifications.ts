import apiClient from '../lib/axios';
import type { ApiResponse } from '../types/api';

export type NotificationChannel = 'IN_APP' | 'WEB_PUSH' | 'MOBILE_PUSH' | 'EMAIL' | 'KAKAO';

export interface NotificationItem {
    id: number;
    type: string;
    audienceType: 'GLOBAL' | 'CREW' | 'ACCOUNT';
    senderType: 'DEVELOPER' | 'SYSTEM' | 'MANAGER';
    title: string;
    body: string;
    actionUrl: string | null;
    channels: NotificationChannel[];
    publishedAt: string;
    read: boolean;
}

export interface NotificationFeed {
    items: NotificationItem[];
    unreadCount: number;
}

export async function getNotifications(limit = 30): Promise<NotificationFeed> {
    const response = await apiClient.get<ApiResponse<NotificationFeed>>('/notifications', { params: { limit } });
    return response.data.data;
}

export async function markNotificationRead(id: number): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
}
