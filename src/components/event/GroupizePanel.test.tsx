// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ getGroupize: vi.fn(), configureGroupize: vi.fn(), createSubevents: vi.fn(),
    previewAllocation: vi.fn(), applyAllocation: vi.fn() }));
vi.mock('../../services/groupize', () => api);
import { GroupizePanel } from './GroupizePanel';

const state = { parentEventId: 1, parentTitle: 'Date', enabled: true, maximumApplicants: null, revisionToken: 'before',
    children: [{ id: 10, title: 'First', capacity: 2 }, { id: 11, title: 'Second', capacity: 2 }],
    applicants: [{ userId: 2, name: 'Alex', status: 'JOINED', eligible: true, childStatus: null },
        { userId: 3, name: 'Sam', status: 'PENDING', eligible: true, childStatus: null }], placements: [] };
const plan = { revisionToken: 'before', placements: [{ userId: 2, childEventId: 10, locked: true }], unassignedUserIds: [3] };

describe('host Groupize workflow', () => {
    let root: Root; let container: HTMLDivElement;
    const open = vi.fn();
    beforeEach(async () => {
        vi.resetAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.stubGlobal('confirm', () => true);
        api.getGroupize.mockResolvedValue(state); api.previewAllocation.mockResolvedValue(plan);
        api.applyAllocation.mockResolvedValue({ ...state, revisionToken: 'after', placements: plan.placements });
        container = document.createElement('div'); document.body.append(container); root = createRoot(container);
        await act(async () => root.render(<GroupizePanel eventId={1} onOpenEvent={open} />));
    });
    afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
    const button = (label: string) => Array.from(container.querySelectorAll('button')).find(node => node.textContent === label)!;
    const click = async (label: string) => { await act(async () => button(label).click()); };

    it('requires a server preview before committing and sends the reviewed revision', async () => {
        expect(button('검토한 편성 확정').disabled).toBe(true);
        const select = container.querySelector<HTMLSelectElement>('select[aria-label="Alex 배정"]')!;
        await act(async () => { select.value = '10'; select.dispatchEvent(new Event('change', { bubbles: true })); });
        await click('편성 미리보기');
        expect(api.previewAllocation).toHaveBeenCalledWith(1, 'before', plan.placements, false);
        expect(api.applyAllocation).not.toHaveBeenCalled();
        await click('검토한 편성 확정');
        expect(api.applyAllocation).toHaveBeenCalledWith(1, plan);
        expect(container.textContent).toContain('소모임 편성이 저장되었습니다.');
    });

    it('randomizes only as a preview and requires another preview after manual changes', async () => {
        await click('무작위 편성');
        expect(api.previewAllocation).toHaveBeenCalledWith(1, 'before', [], true);
        expect(api.applyAllocation).not.toHaveBeenCalled();
        expect(button('검토한 편성 확정').disabled).toBe(false);
        const select = container.querySelector<HTMLSelectElement>('select[aria-label="Alex 배정"]')!;
        await act(async () => { select.value = '11'; select.dispatchEvent(new Event('change', { bubbles: true })); });
        expect(button('검토한 편성 확정').disabled).toBe(true);
    });

    it('refreshes an outdated pool without applying a stale plan again', async () => {
        await click('편성 미리보기');
        api.applyAllocation.mockRejectedValue({ isAxiosError: true, response: { status: 409 } });
        api.getGroupize.mockResolvedValue({ ...state, revisionToken: 'newer' });
        await click('검토한 편성 확정');
        expect(api.getGroupize).toHaveBeenCalledTimes(2);
        expect(container.querySelector('[role="alert"]')?.textContent).toContain('최신 명단');
        expect(button('검토한 편성 확정').disabled).toBe(true);
    });

    it('uses an explicit unlimited maximum and keeps normal child event navigation', async () => {
        api.configureGroupize.mockResolvedValue(state);
        await click('신청 인원 설정 저장');
        expect(api.configureGroupize).toHaveBeenCalledWith(1, null, 'before');
        await click('First'); expect(open).toHaveBeenCalledWith(10);
    });
});
