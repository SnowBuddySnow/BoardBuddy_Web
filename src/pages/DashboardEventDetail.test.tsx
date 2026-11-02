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

it('keeps four cancelled registrations out of the active count and shows their names in history', async () => {
    api.listParticipants.mockResolvedValue(Array.from({ length: 4 }, (_, index) => ({
        id: index + 1, userId: index + 10, userName: `취소 회원 ${index + 1}`,
        status: 'CANCELLED', joinedAt: '2026-11-03T12:00:00',
    })));
    const container = document.createElement('div'); document.body.append(container);
    const root = createRoot(container);
    try {
        await act(async () => root.render(<DashboardEventDetail eventId={10} onBack={vi.fn()} onEditClick={vi.fn()} />));
        expect(container.textContent).toContain('참가자 목록 (0)');
        expect(container.textContent).toContain('참가 확정 0명');
        expect(container.querySelector('tbody')).toBeNull();
        const history = Array.from(container.querySelectorAll('button')).find(button => button.textContent === '취소·내보냄 (4)')!;
        await act(async () => history.click());
        expect(history.getAttribute('aria-pressed')).toBe('true');
        expect(container.querySelectorAll('tbody tr')).toHaveLength(4);
        expect(container.textContent).not.toContain('이름 없음');
        for (let index = 1; index <= 4; index++) expect(container.textContent).toContain(`취소 회원 ${index}`);
    } finally {
        await act(async () => root.unmount()); container.remove();
    }
});

it('counts confirmed and pending registrations separately and preserves removed members in history', async () => {
    api.listParticipants.mockResolvedValue(['JOINED', 'PENDING', 'CONSENT_PENDING', 'CANCELLED', 'REMOVED'].map((status, index) => ({
        id: index + 1, userId: index + 10, userName: `회원 ${index + 1}`,
        status, joinedAt: '2026-11-03T12:00:00',
    })));
    const container = document.createElement('div'); document.body.append(container);
    const root = createRoot(container);
    try {
        await act(async () => root.render(<DashboardEventDetail eventId={10} onBack={vi.fn()} onEditClick={vi.fn()} />));
        expect(container.textContent).toContain('참가자 목록 (3)');
        expect(container.textContent).toContain('참가 확정 1명 · 승인 대기 1명 · 동의 대기 1명');
        expect(container.querySelectorAll('tbody tr')).toHaveLength(3);
        const history = Array.from(container.querySelectorAll('button')).find(button => button.textContent === '취소·내보냄 (2)')!;
        await act(async () => history.click());
        expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
        expect(container.textContent).toContain('회원 4');
        expect(container.textContent).toContain('회원 5');
    } finally {
        await act(async () => root.unmount()); container.remove();
    }
});
