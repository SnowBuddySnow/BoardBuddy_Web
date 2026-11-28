// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EventCrewCollaborationPanel } from './EventCrewCollaborationPanel';
import { IncomingEventCrewInvitations } from './IncomingEventCrewInvitations';
import type { EventCrewInvitation } from '../../services/eventCrewInvitations';

const api = vi.hoisted(() => ({
    discoverCrews: vi.fn(),
    inviteEventCrew: vi.fn(),
    cancelEventCrewInvitation: vi.fn(),
    listEventCrewInvitations: vi.fn(),
    listIncomingEventCrewInvitations: vi.fn(),
    respondToEventCrewInvitation: vi.fn(),
}));
vi.mock('../../services/crew', () => ({ discoverCrews: api.discoverCrews }));
vi.mock('../../services/eventCrewInvitations', () => api);

const invitation: EventCrewInvitation = {
    id: 12, eventId: 17, eventTitle: '연합전', hostCrewName: '주최 크루',
    crewId: 2, crewName: '연합 크루', status: 'PENDING',
};

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
});

function button(name: string): HTMLButtonElement {
    const match = Array.from(container.querySelectorAll('button')).find(node => node.textContent === name);
    expect(match).toBeDefined();
    return match!;
}

it('invites a discovered crew and shows the pending state until acceptance', async () => {
    api.listEventCrewInvitations.mockResolvedValue([]);
    api.discoverCrews.mockResolvedValue([{ crewId: 1, crewName: '주최 크루' }, { crewId: 2, crewName: '연합 크루' }]);
    api.inviteEventCrew.mockResolvedValue(invitation);
    await act(async () => root.render(<EventCrewCollaborationPanel eventId={17} hostCrewId={1} hostCrewName="주최 크루" cancelled={false} />));
    const input = container.querySelector('input')!;
    await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '연합');
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => button('검색').click());
    expect(api.discoverCrews).toHaveBeenCalledWith('연합');
    expect(container.querySelectorAll('li')).toHaveLength(1);
    await act(async () => button('초대 보내기').click());
    expect(api.inviteEventCrew).toHaveBeenCalledWith(17, 2);
    expect(container.textContent).toContain('수락 대기');
    expect(container.querySelector('form')).toBeNull();
});

it('opens the shared console after the incoming invitation is accepted', async () => {
    api.listIncomingEventCrewInvitations.mockResolvedValue([invitation]);
    api.respondToEventCrewInvitation.mockResolvedValue(undefined);
    const openEvent = vi.fn();
    await act(async () => root.render(<IncomingEventCrewInvitations onAccept={openEvent} />));
    expect(container.textContent).toContain('연합전');
    await act(async () => button('수락하고 관리하기').click());
    expect(api.respondToEventCrewInvitation).toHaveBeenCalledWith(invitation, true);
    expect(openEvent).toHaveBeenCalledWith(17);
    expect(container.textContent).toBe('');
});

it('cancels a pending invitation and allows re-inviting a declined crew', async () => {
    api.listEventCrewInvitations.mockResolvedValue([invitation]);
    api.cancelEventCrewInvitation.mockResolvedValue(undefined);
    await act(async () => root.render(<EventCrewCollaborationPanel eventId={17} hostCrewId={1} hostCrewName="주최 크루" cancelled={false} />));
    await act(async () => button('초대 취소').click());
    expect(api.cancelEventCrewInvitation).toHaveBeenCalledWith(17, 12);
    expect(container.querySelector('form')).not.toBeNull();

    // Declined invitation offers a direct re-invite button
    api.listEventCrewInvitations.mockResolvedValue([{ ...invitation, status: 'DECLINED' }]);
    api.inviteEventCrew.mockResolvedValue({ ...invitation, status: 'PENDING' });
    await act(async () => root.render(<EventCrewCollaborationPanel eventId={18} hostCrewId={1} hostCrewName="주최 크루" cancelled={false} />));
    await act(async () => button('다시 초대').click());
    expect(api.inviteEventCrew).toHaveBeenCalledWith(18, 2);
});
