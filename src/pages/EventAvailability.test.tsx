// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../lib/axios', () => ({ default: http }));
vi.mock('../services/devMocks', async original => ({
    ...await original<typeof import('../services/devMocks')>(), isDevMode: () => false,
}));
import Parties from './Parties';
import EventDetail from './EventDetail';

describe('real catalogue and detail admission controls with synthetic HTTP', () => {
    let root: Root;
    let container: HTMLDivElement;
    let event: Record<string, unknown>;
    beforeEach(() => {
        vi.resetAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        vi.useFakeTimers(); vi.setSystemTime(new Date('2035-08-18T00:59:59Z'));
        event = { id: 1, title: 'Synthetic admission boundary', status: 'OPEN', startsAt: '2035-08-18T10:00:00',
            capacity: 2, joinedCount: 0, currentUserStatus: null, joinPolicy: 'INSTANT', visibilityType: 'PUBLIC',
            planningMode: 'MANAGER_PLANNED', organizerGroupName: 'Synthetic hosts' };
        http.get.mockImplementation(async (path: string) => ({ data: { data: path === '/events' ? [event]
            : path === '/events/1' ? event : path.endsWith('/chat-access') ? { available: false }
                : { refundPolicy: 'TEST ONLY' } } }));
        container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    });
    afterEach(async () => {
        await act(async () => root.unmount()); container.remove();
        expect(http.post).not.toHaveBeenCalled(); vi.useRealTimers(); vi.unstubAllGlobals();
    });
    const buttons = () => Array.from(container.querySelectorAll('button'));
    const render = async (detail: boolean) => act(async () => {
        root.render(detail ? <EventDetail eventId={1} onBack={vi.fn()} /> : <Parties onBack={vi.fn()} onEventClick={vi.fn()} />);
    });

    it.each([false, true])('closes admission at the exact start without reload (detail=%s)', async detail => {
        await render(detail);
        expect(buttons().some(button => button.textContent?.trim() === (detail ? '참여 신청하기' : '신청') && !button.disabled)).toBe(true);
        await act(async () => vi.advanceTimersByTime(1000));
        expect(container.textContent).toContain('신청 마감');
        expect(buttons().some(button => /^(참여 신청하기|신청)$/.test(button.textContent?.trim() || '') && !button.disabled)).toBe(false);
        if (!detail) expect(container.textContent?.replace(/\s/g, '')).toContain('참가가능0개');
    });

    it.each(['2035-08-18T10:00:00', '2026-09-09T19:33:00', 'invalid'])('never offers new admission for started/invalid time %s', async startsAt => {
        event.startsAt = startsAt; vi.setSystemTime(new Date('2035-08-18T01:00:00Z'));
        await render(true);
        expect(buttons().find(button => button.textContent === '신청 마감')?.disabled).toBe(true);
        expect(container.textContent).not.toContain('참여 신청하기');
    });

    it('preserves an existing participant’s controls after start', async () => {
        event.currentUserStatus = 'JOINED'; vi.setSystemTime(new Date('2035-08-18T01:00:00Z'));
        await render(true);
        expect(container.textContent).toContain('이벤트에서 나가기');
        expect(container.textContent).not.toContain('참여 신청하기');
    });
});
