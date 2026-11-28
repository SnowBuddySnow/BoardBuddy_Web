// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationBell from './NotificationBell';
import { getNotifications } from '../services/notifications';

vi.mock('../services/notifications', () => ({
    getNotifications: vi.fn(),
}));

describe('NotificationBell', () => {
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

    it('shows unread badge count and invokes onClick when pressed', async () => {
        vi.mocked(getNotifications).mockResolvedValue({ unreadCount: 5, items: [] });
        const onClick = vi.fn();

        await act(async () => {
            root.render(<NotificationBell onClick={onClick} />);
        });

        const button = container.querySelector('button');
        expect(button?.getAttribute('aria-label')).toBe('알림, 읽지 않음 5개');
        expect(container.textContent).toContain('5');

        await act(async () => {
            button?.click();
        });
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('caps badge at 99+ in bottom-navigation variant and stays silent on API failure', async () => {
        vi.mocked(getNotifications).mockResolvedValueOnce({ unreadCount: 142, items: [] });

        await act(async () => {
            root.render(<NotificationBell onClick={vi.fn()} variant="bottom-navigation" />);
        });
        expect(container.textContent).toContain('99+');

        vi.mocked(getNotifications).mockRejectedValueOnce(new Error('offline'));
        await act(async () => {
            root.render(<NotificationBell onClick={vi.fn()} refreshKey={1} />);
        });
        expect(getNotifications).toHaveBeenCalledTimes(2);
    });
});
