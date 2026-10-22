// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../lib/axios', () => ({ default: http }));
vi.mock('../services/devMocks', async original => ({
    ...await original<typeof import('../services/devMocks')>(), isDevMode: () => false,
}));
import Parties from './Parties';
import MyParties from './MyParties';
import EventDetail from './EventDetail';

describe('event entry points, required next steps and recovery (synthetic HTTP)', () => {
    let root: Root;
    let container: HTMLDivElement;
    let event: Record<string, unknown>;
    const result = (data: unknown) => ({ data: { data } });
    beforeEach(() => {
        vi.resetAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        vi.spyOn(window, 'alert').mockImplementation(() => undefined);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.useFakeTimers(); vi.setSystemTime(new Date('2035-08-18T00:00:00Z'));
        localStorage.clear();
        event = { id: 1, title: 'Synthetic journey', status: 'OPEN', startsAt: '2035-08-19T10:00:00',
            capacity: 5, joinedCount: 0, currentUserStatus: null, joinPolicy: 'INSTANT',
            visibilityType: 'PUBLIC', activityType: 'OTHER', planningMode: 'MANAGER_PLANNED' };
        http.get.mockImplementation(async (path: string) => result(path === '/events' ? [event]
            : path === '/events/1' ? event : path.endsWith('/consents') ? {
                participantStatus: 'CONSENT_PENDING', consentDueAt: '2035-08-18T09:10:00',
                drafts: [], responses: [], items: [{ id: 10, title: 'TEST ONLY response', content: 'Synthetic only; no legal effect.',
                    responseType: 'CHECKBOX', category: 'OTHER', required: true, documentVersion: 1, contentHash: 'synthetic' }],
            } : path.endsWith('/chat-access') ? { available: false } : { refundPolicy: 'TEST ONLY' }));
        http.post.mockResolvedValue(result({ id: 9, status: 'JOINED' }));
        container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    });
    afterEach(async () => {
        await act(async () => root.unmount()); container.remove();
        localStorage.clear(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks();
    });
    const button = (text: string) => [...container.querySelectorAll<HTMLButtonElement>('button')].find(e => e.textContent?.trim() === text)!;
    const click = async (text: string) => { expect(button(text), text).toBeDefined(); await act(async () => button(text).click()); };
    const renderCatalogue = async (open = vi.fn()) => {
        await act(async () => root.render(<Parties onBack={vi.fn()} onEventClick={open} />)); return open;
    };
    const renderMine = async () => act(async () => root.render(<MyParties onBack={vi.fn()} onEventClick={vi.fn()} />));
    const fill = async (input: HTMLInputElement, value: string) => act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    it.each(['INSTANT', 'APPROVAL_REQUIRED', 'INVITE_ONLY'])('catalogue %s action opens detail and never joins or claims success', async policy => {
        event.joinPolicy = policy; if (policy === 'INVITE_ONLY') event.currentUserStatus = 'PENDING';
        localStorage.setItem('phone_sharing_consent_preference', 'always');
        const open = await renderCatalogue(); await click(policy === 'INVITE_ONLY' ? '초대 수락' : '신청');
        expect(open).toHaveBeenCalledWith(1); expect(http.post).not.toHaveBeenCalled(); expect(window.alert).not.toHaveBeenCalled();
    });

    it.each(['INSTANT', 'APPROVAL_REQUIRED', 'INVITE_ONLY'])('%s catalogue-to-detail journey confirms phone then exposes required responses', async policy => {
        event.joinPolicy = policy; if (policy === 'INVITE_ONLY') event.currentUserStatus = 'PENDING';
        function Journey() {
            const [id, setId] = useState<number | null>(null);
            return id ? <EventDetail eventId={id} onBack={() => setId(null)} /> : <Parties onBack={vi.fn()} onEventClick={setId} />;
        }
        http.post.mockImplementation(async () => { event.currentUserStatus = 'CONSENT_PENDING'; return result({ id: 9, status: 'CONSENT_PENDING' }); });
        await act(async () => root.render(<Journey />));
        await click(policy === 'INVITE_ONLY' ? '초대 수락' : '신청'); expect(http.post).not.toHaveBeenCalled();
        await click(policy === 'INVITE_ONLY' ? '초대 수락하기' : '참여 신청하기'); expect(http.post).not.toHaveBeenCalled();
        expect(container.querySelector('[role="dialog"]')?.contains(document.activeElement)).toBe(true);
        await click('이번만 동의하고 진행'); expect(http.post).toHaveBeenCalledExactlyOnceWith('/events/1/join');
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('동의서'));
        expect(container.textContent).toContain('참가자 응답 시트'); expect(container.textContent).toContain('TEST ONLY response');
        expect(container.textContent).toContain(policy === 'APPROVAL_REQUIRED' ? '전체 응답 제출하고 승인 요청' : '전체 응답 제출하고 참가 확정');
        expect(window.alert).not.toHaveBeenCalledWith('이벤트 신청이 완료되었습니다!');
    });

    it.each([
        ['INSTANT', 'JOINED', '이벤트 참가가 확정되었습니다.'],
        ['APPROVAL_REQUIRED', 'PENDING', '참여 신청이 접수되었습니다. 호스트 승인 후 참가가 확정됩니다.'],
    ])('detail %s reports returned %s outcome without calling a member a guest', async (policy, status, message) => {
        event.joinPolicy = policy; localStorage.setItem('phone_sharing_consent_preference', 'always');
        http.post.mockImplementation(async () => { event.currentUserStatus = status; return result({ id: 9, status }); });
        await act(async () => root.render(<EventDetail eventId={1} onBack={vi.fn()} />));
        await click('참여 신청하기'); expect(window.alert).toHaveBeenCalledWith(message);
    });

    it.each([
        ['INVITE_ONLY', 'PENDING', '초대 수락 필요'], ['APPROVAL_REQUIRED', 'PENDING', '승인 대기'],
        ['INSTANT', 'CONSENT_PENDING', '동의 작성 필요'], ['INSTANT', 'JOINED', '참여 중'],
    ])('My Events renders %s / %s as %s', async (policy, status, label) => {
        event.joinPolicy = policy; event.currentUserStatus = status; await renderMine();
        expect(container.textContent).toContain(label);
        if (policy === 'INVITE_ONLY') expect(container.textContent).not.toContain('승인 대기');
    });

    it('catalogue failed load is explicit and retry preserves search and activity filter', async () => {
        http.get.mockRejectedValueOnce(new Error('Synthetic offline'));
        await renderCatalogue(); expect(container.querySelector('[role="alert"]')?.textContent).toContain('불러오지 못했습니다');
        expect(container.textContent).not.toContain('등록된 이벤트가 없습니다');
        const input = container.querySelector<HTMLInputElement>('input')!; await fill(input, 'journey'); await click('Surf');
        await click('다시 시도'); expect(input.value).toBe('journey'); expect(container.querySelector('[role="alert"]')).toBeNull();
        expect(container.textContent).toContain('검색 조건에 맞는 이벤트가 없습니다');
        await click('전체'); expect(container.textContent).toContain('Synthetic journey'); expect(http.post).not.toHaveBeenCalled();
    });

    it('My Events separates failed loading from genuine empty results and can retry', async () => {
        http.get.mockRejectedValueOnce(new Error('Synthetic offline')); await renderMine();
        expect(container.querySelector('[role="alert"]')).not.toBeNull();
        expect(container.textContent).not.toContain('참여 예정인 모임이 없습니다');
        await click('다시 시도'); expect(container.querySelector('[role="alert"]')).toBeNull();
        expect(container.textContent).toContain('참여 예정인 모임이 없습니다'); expect(http.post).not.toHaveBeenCalled();
    });

    it('phone dialog contains keyboard focus, closes with Escape and restores its opener without joining', async () => {
        await act(async () => root.render(<EventDetail eventId={1} onBack={vi.fn()} />));
        const opener = button('참여 신청하기'); opener.focus(); await click('참여 신청하기');
        const dialog = container.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]')!;
        expect(dialog).not.toBeNull(); expect(dialog.contains(document.activeElement)).toBe(true);
        await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true })));
        expect(document.activeElement).toBe(button('취소'));
        await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })));
        expect(document.activeElement).toBe(button('항상 동의하고 진행'));
        await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })));
        expect(container.querySelector('[role="dialog"]')).toBeNull(); expect(document.activeElement).toBe(opener);
        expect(http.post).not.toHaveBeenCalled(); expect(localStorage.getItem('phone_sharing_consent_preference')).toBeNull();
    });
});
