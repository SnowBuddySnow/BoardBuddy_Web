// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ getEventDashboard: vi.fn(), listParticipants: vi.fn(), getEventChatAccess: vi.fn() }));
vi.mock('../services/event', async importOriginal => ({
    ...await importOriginal<typeof import('../services/event')>(), ...api,
}));
import DashboardEventDetail from './DashboardEventDetail';

beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.getEventDashboard.mockResolvedValue({
        id: 10, title: 'Recovery test event', status: 'DRAFT', planningMode: 'MANAGER_PLANNED',
        startsAt: '2026-11-06T09:00:00Z', capacity: 4, joinedCount: 0, joinPolicy: 'INSTANT',
    });
    api.listParticipants.mockResolvedValue([]);
    api.getEventChatAccess.mockResolvedValue({ chatUrl: null, chatPasscode: null, chatInstructions: null });
});
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

it.each(['event', 'participants', 'chat'])('recovers after a failed %s request without showing partial management data', async failedRequest => {
    const failed = failedRequest === 'event' ? api.getEventDashboard
        : failedRequest === 'participants' ? api.listParticipants : api.getEventChatAccess;
    failed.mockRejectedValueOnce(new Error('Temporary service outage'));
    const container = document.createElement('div'); document.body.append(container);
    const root = createRoot(container);
    const onBack = vi.fn();
    try {
        await act(async () => root.render(<DashboardEventDetail eventId={10} onBack={onBack} onEditClick={vi.fn()} />));
        expect(container.querySelector('[role="alert"]')?.textContent).toContain('이벤트 관리 정보를 불러오지 못했어요');
        expect(container.textContent).not.toContain('Recovery test event');
        const buttons = Array.from(container.querySelectorAll('button'));
        await act(async () => buttons.find(button => button.textContent === '이벤트 목록으로')!.click());
        expect(onBack).toHaveBeenCalledOnce();
        await act(async () => buttons.find(button => button.textContent === '다시 시도')!.click());
        expect(container.querySelector('[role="alert"]')).toBeNull();
        expect(container.textContent).toContain('Recovery test event');
        expect(container.textContent).toContain('참가자 목록 (0)');
        expect(api.getEventDashboard).toHaveBeenCalledTimes(2);
    } finally {
        await act(async () => root.unmount()); container.remove();
    }
});
