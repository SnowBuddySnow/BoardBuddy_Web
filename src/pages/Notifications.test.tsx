// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Notifications from './Notifications';
import { getNotifications, markNotificationRead } from '../services/notifications';

vi.mock('../services/notifications', () => ({
    getNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
}));

describe('Notifications page integration', () => {
    let root: Root;
    let container: HTMLDivElement;

    beforeEach(() => {
        vi.resetAllMocks();
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        container = document.createElement('div');
        document.body.append(container);
        root = createRoot(container);
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('renders feed items, marks unread item as read once on click, and triggers callbacks', async () => {
        vi.mocked(getNotifications).mockResolvedValueOnce({
            unreadCount: 1,
            items: [
                {
                    id: 11,
                    type: 'CREW_NOTICE',
                    audienceType: 'CREW',
                    senderType: 'MANAGER',
                    title: '이번 주 정모 공지',
                    body: '토요일 오전 9시 집합입니다.',
                    actionUrl: null,
                    channels: ['IN_APP'],
                    publishedAt: '2026-11-20T09:00:00',
                    read: false,
                },
                {
                    id: 12,
                    type: 'SYSTEM',
                    audienceType: 'GLOBAL',
                    senderType: 'DEVELOPER',
                    title: '시스템 점검 완료',
                    body: '정상화되었습니다.',
                    actionUrl: null,
                    channels: ['IN_APP'],
                    publishedAt: '2026-11-19T12:00:00',
                    read: true,
                },
            ],
        });
        vi.mocked(markNotificationRead).mockResolvedValueOnce(undefined);

        const onBack = vi.fn();
        const onChanged = vi.fn();

        await act(async () => {
            root.render(<Notifications onBack={onBack} onChanged={onChanged} />);
        });

        expect(container.textContent).toContain('읽지 않은 알림 1개');
        expect(container.textContent).toContain('크루 매니저');
        expect(container.textContent).toContain('BoardBuddy');

        const buttons = [...container.querySelectorAll<HTMLButtonElement>('button')];
        const unreadButton = buttons.find(btn => btn.textContent?.includes('이번 주 정모 공지'));
        const readButton = buttons.find(btn => btn.textContent?.includes('시스템 점검 완료'));
        expect(unreadButton).toBeDefined();

        await act(async () => {
            unreadButton?.click();
        });

        expect(markNotificationRead).toHaveBeenCalledWith(11);
        expect(onChanged).toHaveBeenCalledTimes(1);
        expect(container.textContent).toContain('읽지 않은 알림 0개');

        // Clicking an already-read item does not re-issue PATCH
        await act(async () => {
            readButton?.click();
        });
        expect(markNotificationRead).toHaveBeenCalledTimes(1);

        const backButton = container.querySelector<HTMLButtonElement>('button[aria-label="뒤로 가기"]');
        await act(async () => {
            backButton?.click();
        });
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('renders empty state and error fallback cleanly', async () => {
        vi.mocked(getNotifications).mockResolvedValueOnce({ unreadCount: 0, items: [] });

        await act(async () => {
            root.render(<Notifications onBack={vi.fn()} onChanged={vi.fn()} />);
        });
        expect(container.textContent).toContain('아직 알림이 없습니다.');

        await act(async () => root.unmount());
        root = createRoot(container);

        vi.mocked(getNotifications).mockRejectedValueOnce(new Error('500'));
        await act(async () => {
            root.render(<Notifications onBack={vi.fn()} onChanged={vi.fn()} />);
        });
        expect(container.textContent).toContain('알림을 불러오지 못했습니다.');
    });
});
