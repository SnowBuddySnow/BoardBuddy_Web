// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn() }));
vi.mock('../lib/axios', () => ({ default: http }));
vi.mock('../services/devMocks', async original => ({
    ...await original<typeof import('../services/devMocks')>(), isDevMode: () => false,
}));
import DashboardEventNew from './DashboardEventNew';
import DashboardEventEdit from './DashboardEventEdit';

const result = (data: unknown = {}) => ({ data: { data } });
const event = { id: 1, title: 'STG synthetic draft', startsAt: '2026-10-25T18:00:00',
    endsAt: '2026-10-25T20:00:00', capacity: 2, visibilityType: 'LINK_ONLY', joinPolicy: 'INSTANT',
    planningMode: 'MANAGER_PLANNED', organizerGroupId: 2, status: 'DRAFT', kusbfAssociated: false };
const consent = { consentWindowMinutes: 10, items: [{ id: 101, category: 'OTHER', title: 'TEST ONLY',
    content: 'No legal effect.', responseType: 'CHECKBOX', required: true, displayOrder: 0 }] };
function deferred() {
    let resolve!: (value: ReturnType<typeof result>) => void;
    const promise = new Promise<ReturnType<typeof result>>(done => { resolve = done; });
    return { promise, resolve };
}
const httpError = (status?: number) => ({ isAxiosError: true, response: status ? { status, data: { message: 'Synthetic failure' } } : undefined });

describe('rendered create/edit forms with real save orchestration and synthetic HTTP (not live acceptance)', () => {
    let root: Root;
    let container: HTMLDivElement;
    let success: Mock<(id?: number) => void>;
    let back: Mock<() => void>;
    beforeEach(() => {
        vi.resetAllMocks();
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        vi.stubGlobal('alert', vi.fn());
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        success = vi.fn(); back = vi.fn();
        http.get.mockImplementation(async (path: string) => {
            if (path === '/dashboard/organizer-groups') return result([{ id: 2, name: 'Synthetic hosts' }]);
            if (path.endsWith('/consents')) return result(consent);
            if (path.endsWith('/refund-policy')) return result({ refundPolicy: 'TEST ONLY no payment' });
            if (path === '/dashboard/events/1') return result(event);
            throw new Error(`Unexpected synthetic GET: ${path}`);
        });
        http.post.mockResolvedValue(result(event));
        http.patch.mockResolvedValue(result(event));
        http.put.mockResolvedValue(result());
        container = document.createElement('div'); document.body.append(container);
        root = createRoot(container);
    });
    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
        vi.restoreAllMocks(); vi.unstubAllGlobals();
    });

    const button = (text: string) => {
        const found = Array.from(container.querySelectorAll('button')).find(node => node.textContent?.includes(text));
        expect(found, `button: ${text}`).toBeTruthy(); return found!;
    };
    const fill = async (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
        expect(element, 'Expected rendered form field').not.toBeNull();
        await act(async () => {
            const prototype = Object.getPrototypeOf(element);
            Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
            element.dispatchEvent(new Event('input', { bubbles: true }));
        });
    };
    const submit = async () => { await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); };
    const renderNew = async () => {
        await act(async () => root.render(<DashboardEventNew onBack={back} onSuccess={success} />));
        await fill(container.querySelector<HTMLInputElement>('input[type="text"][required]')!, event.title);
        await fill(container.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]')[1], '2026-10-25T18:00');
        await act(async () => button('맞춤 항목 추가').click());
        await fill(container.querySelector<HTMLInputElement>('input[placeholder="항목 제목"]')!, 'TEST ONLY');
        await fill(container.querySelector<HTMLTextAreaElement>('textarea[placeholder="참가자에게 보여줄 설명 또는 안내문"]')!, 'No legal effect.');
        await fill(container.querySelector<HTMLTextAreaElement>('textarea[placeholder^="템플릿을 선택하거나"]')!, 'TEST ONLY no payment');
    };

    it('creates once, blocks double submits, and never overlaps consent/refund writes', async () => {
        const pending = deferred(); http.put.mockReturnValueOnce(pending.promise).mockResolvedValue(result());
        await renderNew(); await submit(); await submit();
        expect(http.post).toHaveBeenCalledTimes(1);
        expect(http.put).toHaveBeenCalledTimes(1);
        expect(http.put).toHaveBeenCalledWith('/dashboard/events/1/consents', expect.objectContaining({ consentWindowMinutes: 10, items: [expect.objectContaining({ title: 'TEST ONLY' })] }));
        expect(success).not.toHaveBeenCalled();
        await act(async () => pending.resolve(result()));
        expect(http.put).toHaveBeenLastCalledWith('/dashboard/events/1/refund-policy', { refundPolicy: 'TEST ONLY no payment' });
        expect(success).toHaveBeenCalledWith(1);
    });

    it.each(['consents', 'refund'] as const)('retains input and draft identity after %s failure; retry edits that draft', async stage => {
        if (stage === 'consents') http.put.mockRejectedValueOnce(httpError(500));
        else http.put.mockResolvedValueOnce(result()).mockRejectedValueOnce(httpError(500));
        await renderNew(); await submit();
        expect(container.querySelector('[role="alert"]')?.textContent).toContain('초안 #1');
        expect(container.querySelector<HTMLInputElement>('input[placeholder="항목 제목"]')!.value).toBe('TEST ONLY');
        expect(success).not.toHaveBeenCalled();
        await submit();
        expect(http.post).toHaveBeenCalledTimes(1);
        expect(http.patch).toHaveBeenCalledWith('/dashboard/events/1', expect.objectContaining({ title: event.title }));
        expect(success).toHaveBeenCalledWith(1);
    });

    it.each([undefined, 500])('blocks blind create retries after an ambiguous POST failure (%s)', async status => {
        http.post.mockRejectedValue(httpError(status));
        await renderNew(); await submit(); await submit();
        expect(http.post).toHaveBeenCalledTimes(1);
        expect(button('DRAFT 저장하기').disabled).toBe(true);
        expect(container.querySelector('[role="alert"]')?.textContent).toContain('목록에서');
        await act(async () => button('목록에서 확인').click());
        expect(back).toHaveBeenCalledOnce(); expect(success).not.toHaveBeenCalled();
    });

    it('allows correcting an explicit create validation error without inventing a draft ID', async () => {
        http.post.mockRejectedValueOnce(httpError(400)).mockResolvedValue(result(event));
        await renderNew(); await submit();
        expect(container.querySelector('[role="alert"]')?.textContent).toContain('Synthetic failure');
        expect(button('DRAFT 저장하기').disabled).toBe(false);
        await submit(); expect(success).toHaveBeenCalledWith(1);
    });

    it('edits through sequential writes and navigates only after all three commits', async () => {
        const pending = deferred(); http.put.mockReturnValueOnce(pending.promise).mockResolvedValue(result());
        await act(async () => root.render(<DashboardEventEdit eventId={1} onBack={back} onSuccess={success} />));
        await submit(); await submit();
        expect(http.patch).toHaveBeenCalledTimes(1); expect(http.post).not.toHaveBeenCalled();
        expect(http.put).toHaveBeenCalledTimes(1); expect(success).not.toHaveBeenCalled();
        await act(async () => pending.resolve(result()));
        expect(http.put).toHaveBeenLastCalledWith('/dashboard/events/1/refund-policy', { refundPolicy: 'TEST ONLY no payment' });
        expect(success).toHaveBeenCalledOnce();
    });

    it('shows a conflict as incomplete editing, preserving entered fields and suppressing success', async () => {
        http.put.mockRejectedValueOnce(httpError(409));
        await act(async () => root.render(<DashboardEventEdit eventId={1} onBack={back} onSuccess={success} />));
        await submit();
        expect(container.querySelector('[role="alert"]')?.textContent).toContain('충돌');
        expect(container.querySelector<HTMLInputElement>('input[placeholder="항목 제목"]')!.value).toBe('TEST ONLY');
        expect(success).not.toHaveBeenCalled(); expect(http.put).toHaveBeenCalledTimes(1);
    });
});
