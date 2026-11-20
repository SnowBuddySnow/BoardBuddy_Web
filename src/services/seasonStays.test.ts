import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../lib/axios';
import {
    assignSeasonPasses,
    completeStay,
    getMemberStayHistory,
    getSeasonPass,
    getStayAnnouncements,
    listSeasonPassMembers,
    saveSeasonPass,
    sendStayAnnouncement,
} from './seasonStays';

vi.mock('../lib/axios', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
    },
}));

describe('seasonStays service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('lists season pass members, fetches stay history, and bulk-assigns passes', async () => {
        vi.mocked(apiClient.get)
            .mockResolvedValueOnce({ data: { data: { items: [], total: 0, page: 0, size: 30 } } })
            .mockResolvedValueOnce({ data: { data: { items: [], total: 0, page: 1, size: 10 } } });
        vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: { updated: 2 } } });

        await listSeasonPassMembers(5, '김', 0);
        expect(apiClient.get).toHaveBeenNthCalledWith(1, '/crews/5/season-stays/passes', {
            params: { query: '김', page: 0, size: 30 },
        });

        await getMemberStayHistory(5, 99, 1);
        expect(apiClient.get).toHaveBeenNthCalledWith(2, '/crews/5/season-stays/passes/99/history', {
            params: { page: 1, size: 10 },
        });

        const assigned = await assignSeasonPasses(5, [10, 11], { name: '5박권', totalNights: 5 });
        expect(assigned.updated).toBe(2);
        expect(apiClient.put).toHaveBeenCalledWith('/crews/5/season-stays/passes', {
            name: '5박권',
            totalNights: 5,
            memberIds: [10, 11],
        });
    });

    it('routes self vs member pass fetches, updates pass/completion, and manages stay announcements', async () => {
        vi.mocked(apiClient.get)
            .mockResolvedValueOnce({ data: { data: { registered: true, name: '무제한' } } })
            .mockResolvedValueOnce({ data: { data: { registered: true, name: '3박권' } } })
            .mockResolvedValueOnce({ data: { data: [] } });
        vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: { registered: true, name: '7박권' } } });
        vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { code: 200 } });
        vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { data: { id: 1, title: '체크인' } } });

        expect((await getSeasonPass(5)).name).toBe('무제한');
        expect(apiClient.get).toHaveBeenNthCalledWith(1, '/crews/5/season-stays/pass');

        expect((await getSeasonPass(5, 77)).name).toBe('3박권');
        expect(apiClient.get).toHaveBeenNthCalledWith(2, '/crews/5/season-stays/passes/77');

        await saveSeasonPass(5, 77, { name: '7박권', totalNights: 7 });
        expect(apiClient.put).toHaveBeenCalledWith('/crews/5/season-stays/passes/77', {
            name: '7박권',
            totalNights: 7,
        });

        await completeStay(5, 88, true);
        expect(apiClient.patch).toHaveBeenCalledWith('/crews/5/season-stays/reservations/88/completion', {
            completed: true,
        });

        await getStayAnnouncements(5, '2026-11-21');
        expect(apiClient.get).toHaveBeenNthCalledWith(3, '/crews/5/season-stays/announcements', {
            params: { date: '2026-11-21' },
        });

        await sendStayAnnouncement(5, {
            date: '2026-11-21',
            requestKey: 'stay-key-1234567890',
            title: '체크인',
            body: '문 비밀번호 안내',
        });
        expect(apiClient.post).toHaveBeenCalledWith('/crews/5/season-stays/announcements', {
            date: '2026-11-21',
            requestKey: 'stay-key-1234567890',
            title: '체크인',
            body: '문 비밀번호 안내',
        });
    });
});
