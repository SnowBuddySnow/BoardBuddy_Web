// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
    getUserInfo: vi.fn(),
    getCrewInfo: vi.fn(),
    updateCrew: vi.fn(),
    resetCrewPin: vi.fn(),
}));

vi.mock('../services/crew', () => api);
vi.mock('../services/user', () => ({ getUserInfo: api.getUserInfo }));
vi.mock('../services/schools', () => ({ getSchools: async () => [] }));
vi.mock('./Promote', () => ({ default: () => null }));
vi.mock('../components/onboarding/CrewInvitationPanel', () => ({ CrewInvitationPanel: () => null }));

import CrewSettings from './CrewSettings';

describe('CrewSettings season house guest toggle', () => {
    let root: Root;
    let container: HTMLDivElement;

    beforeEach(() => {
        vi.resetAllMocks();
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        vi.stubGlobal('confirm', () => true);
        vi.stubGlobal('alert', vi.fn());
        api.getUserInfo.mockResolvedValue({ userId: 1, role: 'CREW_CAPTAIN', crew: { crewId: 11 } });
        api.updateCrew.mockResolvedValue(undefined);
        container = document.createElement('div');
        document.body.append(container);
        root = createRoot(container);
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
        vi.unstubAllGlobals();
    });

    it.each([
        { savedValue: undefined, nextValue: true },
        { savedValue: true, nextValue: false },
    ])('persists invitation auto-join as $nextValue from Danger Zone', async ({ savedValue, nextValue }) => {
        api.getCrewInfo.mockResolvedValue({
            name: 'Snow Crew',
            dailyCapacity: 10,
            isCapacityLimited: true,
            schoolVerificationRequired: false,
            inviteLinkAutoJoinEnabled: savedValue,
        });
        await act(async () => root.render(<CrewSettings onBack={vi.fn()} />));
        const dangerZone = container.querySelector('section[aria-labelledby="crew-danger-zone"]')!;
        const checkbox = dangerZone.querySelector('input')!;
        expect(checkbox.checked).toBe(savedValue === true);
        await act(async () => checkbox.click());

        const save = Array.from(container.querySelectorAll('button')).find(node => node.textContent?.trim() === '저장하기')!;
        await act(async () => save.click());

        expect(api.updateCrew).toHaveBeenCalledWith(11, expect.objectContaining({ inviteLinkAutoJoinEnabled: nextValue }));
    });

    it('defaults seasonHouseGuestEnabled to checked when omitted and saves false when toggled off', async () => {
        api.getCrewInfo.mockResolvedValue({
            name: 'Snow Crew',
            dailyCapacity: 10,
            isCapacityLimited: true,
            schoolVerificationRequired: false,
            schoolVerificationEnforcementEnabled: false,
        });
        const onSaved = vi.fn();

        await act(async () => root.render(<CrewSettings onBack={vi.fn()} onSaved={onSaved} />));

        const label = Array.from(container.querySelectorAll('label')).find(node =>
            node.textContent?.includes('시즌방 게스트 예약 사용')
        )!;
        const checkbox = label.querySelector('input')!;
        expect(checkbox.checked).toBe(true);

        await act(async () => checkbox.click());
        expect(checkbox.checked).toBe(false);

        const save = Array.from(container.querySelectorAll('button')).find(node => node.textContent?.trim() === '저장하기')!;
        await act(async () => save.click());

        expect(api.updateCrew).toHaveBeenCalledOnce();
        expect(api.updateCrew.mock.calls[0][1].seasonHouseGuestEnabled).toBe(false);
        expect(api.updateCrew.mock.calls[0][1]).not.toHaveProperty('inviteLinkAutoJoinEnabled');
        expect(onSaved).toHaveBeenCalledOnce();
    });

    it('loads false from server and lets a crew manager re-enable seasonHouseGuestEnabled', async () => {
        api.getUserInfo.mockResolvedValue({ userId: 2, role: 'CREW_MANAGER', crew: { crewId: 11 } });
        api.getCrewInfo.mockResolvedValue({
            name: 'Snow Crew',
            dailyCapacity: 10,
            isCapacityLimited: true,
            seasonHouseGuestEnabled: false,
            schoolVerificationRequired: false,
            schoolVerificationEnforcementEnabled: false,
        });

        await act(async () => root.render(<CrewSettings onBack={vi.fn()} />));

        const label = Array.from(container.querySelectorAll('label')).find(node =>
            node.textContent?.includes('시즌방 게스트 예약 사용')
        )!;
        const checkbox = label.querySelector('input')!;
        expect(checkbox.checked).toBe(false);

        await act(async () => checkbox.click());
        expect(checkbox.checked).toBe(true);

        const save = Array.from(container.querySelectorAll('button')).find(node => node.textContent?.trim() === '저장하기')!;
        await act(async () => save.click());

        expect(api.updateCrew).toHaveBeenCalledOnce();
        expect(api.updateCrew.mock.calls[0][1].seasonHouseGuestEnabled).toBe(true);
    });
});
