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
    let expectedPosts: number;
    const openEvent = vi.fn();
    beforeEach(() => {
        vi.resetAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        vi.useFakeTimers(); vi.setSystemTime(new Date('2035-08-18T00:59:59Z'));
        vi.spyOn(window, 'alert').mockImplementation(() => undefined);
        localStorage.clear(); expectedPosts = 0;
        event = { id: 1, title: 'Synthetic admission boundary', status: 'OPEN', startsAt: '2035-08-18T10:00:00',
            capacity: 2, joinedCount: 0, currentUserStatus: null, joinPolicy: 'INSTANT', visibilityType: 'PUBLIC',
            planningMode: 'MANAGER_PLANNED', organizerGroupName: 'Synthetic hosts' };
        http.get.mockImplementation(async (path: string) => ({ data: { data: path === '/events' ? [event]
            : path === '/events/1' ? event : path.endsWith('/chat-access') ? { available: false }
                : { refundPolicy: 'TEST ONLY' } } }));
        http.post.mockResolvedValue({ data: { data: { id: 101, status: 'JOINED' } } });
        container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    });
    afterEach(async () => {
        await act(async () => root.unmount()); container.remove();
        expect(http.post).toHaveBeenCalledTimes(expectedPosts); localStorage.clear(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks();
    });
    const buttons = () => Array.from(container.querySelectorAll('button'));
    const render = async (detail: boolean) => act(async () => {
        root.render(detail ? <EventDetail eventId={1} onBack={vi.fn()} /> : <Parties onBack={vi.fn()} onEventClick={openEvent} />);
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

    it.each([
        ['DRAFT', '준비 중인 이벤트'], ['CLOSED', '마감된 모임'],
        ['CANCELLED', '취소된 모임'], ['UNKNOWN', '현재 신청할 수 없습니다'],
    ])('blocks direct detail admission for event status %s', async (status, label) => {
        event.status = status; await render(true);
        expect(buttons().find(button => button.textContent === label)?.disabled).toBe(true);
        expect(buttons().some(button => button.textContent === '참여 신청하기')).toBe(false);
    });

    it.each([false, true])('fails closed for an invalid application opening (detail=%s)', async detail => {
        event.applicationStartsAt = 'invalid'; await render(detail);
        expect(buttons().some(button => /^(참여 신청하기|신청)$/.test(button.textContent || '') && !button.disabled)).toBe(false);
        expect(container.textContent).toContain('현재 신청할 수 없습니다');
        if (!detail) expect(container.textContent?.replace(/\s/g, '')).toContain('참가가능0개');
    });

    it.each([false, true])('closes paid admission exactly at the payment deadline (detail=%s)', async detail => {
        event.paymentRequired = true; event.paymentDeadlineAt = '2035-08-18T09:59:59';
        await render(detail);
        expect(container.textContent).toContain('입금 기한 마감');
        expect(buttons().some(button => /^(참여 신청하기|신청)$/.test(button.textContent || '') && !button.disabled)).toBe(false);
        if (!detail) expect(container.textContent?.replace(/\s/g, '')).toContain('참가가능0개');
    });

    it.each([false, true])('does not advertise new admission to a removed participant (detail=%s)', async detail => {
        event.currentUserStatus = 'REMOVED'; await render(detail);
        expect(container.textContent).toContain('참가할 수 없는 이벤트');
        expect(buttons().some(button => /^(참여 신청하기|신청)$/.test(button.textContent || '') && !button.disabled)).toBe(false);
        if (!detail) expect(container.textContent?.replace(/\s/g, '')).toContain('참가가능0개');
    });

    it.each([false, true])('requires an invitation instead of offering an impossible join (detail=%s)', async detail => {
        event.joinPolicy = 'INVITE_ONLY'; await render(detail);
        expect(container.textContent).toContain('초대가 필요합니다');
        expect(buttons().some(button => /^(참여 신청하기|신청|초대 수락하기|초대 수락)$/.test(button.textContent || '') && !button.disabled)).toBe(false);
        if (!detail) expect(container.textContent?.replace(/\s/g, '')).toContain('참가가능0개');
    });

    it.each([false, true])('shows invitation acceptance, not approval waiting (detail=%s)', async detail => {
        event.joinPolicy = 'INVITE_ONLY'; event.currentUserStatus = 'PENDING'; await render(detail);
        expect(buttons().find(button => button.textContent === (detail ? '초대 수락하기' : '초대 수락'))?.disabled).toBe(false);
        expect(container.textContent).not.toContain('승인 대기');
        if (detail) {
            expect(container.textContent).toContain('초대 전용');
            expect(container.textContent).not.toContain('호스트 승인 필요');
        }
        if (!detail) expect(container.textContent?.replace(/\s/g, '')).toContain('참가가능1개');
    });

    it('rechecks admission when phone confirmation is delayed beyond the event start', async () => {
        await render(true);
        await act(async () => buttons().find(button => button.textContent === '참여 신청하기')!.click());
        const confirm = buttons().find(button => button.textContent === '항상 동의하고 진행')!;
        expect(confirm).toBeDefined();
        // No timer tick/rerender: exercise the request-time guard on the still-enabled old control.
        vi.setSystemTime(new Date('2035-08-18T01:00:00Z'));
        await act(async () => confirm.click());
        expect(http.post).not.toHaveBeenCalled();
        expect(localStorage.getItem('phone_sharing_consent_preference')).toBeNull();
        expect(container.textContent).toContain('신청 마감');
    });

    it('submits an eligible confirmed join once, proving the guard is not a blanket block', async () => {
        await render(true);
        await act(async () => buttons().find(button => button.textContent === '참여 신청하기')!.click());
        expectedPosts = 1;
        await act(async () => buttons().find(button => button.textContent === '이번만 동의하고 진행')!.click());
        expect(http.post).toHaveBeenCalledWith('/events/1/join');
    });

    it.each([false, true])('rapid actions route catalogue clicks without writes or send one detail join (detail=%s)', async detail => {
        localStorage.setItem('phone_sharing_consent_preference', 'always');
        let resolveJoin!: (value: unknown) => void;
        http.post.mockImplementation(() => new Promise(resolve => { resolveJoin = resolve; }));
        await render(detail);
        const join = buttons().find(button => button.textContent === (detail ? '참여 신청하기' : '신청'))!;
        expectedPosts = detail ? 1 : 0;
        await act(async () => { join.click(); join.click(); });
        if (!detail) {
            expect(openEvent).toHaveBeenCalledWith(1); expect(http.post).not.toHaveBeenCalled(); return;
        }
        expect(http.post).toHaveBeenCalledTimes(1);
        await act(async () => resolveJoin({ data: { data: { id: 101, status: 'JOINED' } } }));
    });

    it.each([false, true])('routes a pending invitation to detail before normal acceptance (detail=%s)', async detail => {
        event.joinPolicy = 'INVITE_ONLY'; event.currentUserStatus = 'PENDING';
        localStorage.setItem('phone_sharing_consent_preference', 'always');
        await render(detail); expectedPosts = detail ? 1 : 0;
        await act(async () => buttons().find(button => button.textContent === (detail ? '초대 수락하기' : '초대 수락'))!.click());
        if (detail) expect(http.post).toHaveBeenCalledWith('/events/1/join');
        else { expect(openEvent).toHaveBeenCalledWith(1); expect(http.post).not.toHaveBeenCalled(); }
    });

    it('preserves an approval-pending applicant’s cancellation controls after start', async () => {
        event.joinPolicy = 'APPROVAL_REQUIRED'; event.currentUserStatus = 'PENDING';
        vi.setSystemTime(new Date('2035-08-18T01:00:00Z'));
        await render(true);
        expect(container.textContent).toContain('승인 대기 중');
        expect(buttons().find(button => button.textContent === '신청 취소하기')?.disabled).toBe(false);
        expect(container.textContent).not.toContain('참여 신청하기');
    });
});
