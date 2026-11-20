import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../lib/axios';
import { getNotifications, markNotificationRead } from './notifications';

vi.mock('../lib/axios', () => ({
    default: {
        get: vi.fn(),
        patch: vi.fn(),
    },
}));

describe('notifications service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('fetches notifications with custom limit and unwraps response data', async () => {
        const feed = {
            unreadCount: 2,
            items: [
                {
                    id: 1,
                    type: 'SYSTEM',
                    audienceType: 'GLOBAL' as const,
                    senderType: 'DEVELOPER' as const,
                    title: '공지',
                    body: '내용',
                    actionUrl: null,
                    channels: ['IN_APP' as const],
                    publishedAt: '2026-11-20T09:00:00',
                    read: false,
                },
            ],
        };
        vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: feed } });

        const result = await getNotifications(50);

        expect(apiClient.get).toHaveBeenCalledWith('/notifications', { params: { limit: 50 } });
        expect(result).toEqual(feed);
    });

    it('marks a notification as read via PATCH endpoint', async () => {
        vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { code: 200 } });

        await markNotificationRead(42);

        expect(apiClient.patch).toHaveBeenCalledWith('/notifications/42/read');
    });
});
