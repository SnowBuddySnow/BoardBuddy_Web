// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const guestInvitationApi = vi.hoisted(() => ({
    createGuestInvitation: vi.fn(),
    listMyGuestInvitations: vi.fn(),
    revokeGuestInvitation: vi.fn(),
    redeemGuestInvitation: vi.fn(),
}));
vi.mock('../services/guestInvitation', () => guestInvitationApi);

import GuestAccess from './GuestAccess';
describe('guest-code entry with crew season availability disabled', () => {
    let root: Root; let container: HTMLDivElement;
    const season = vi.fn(); const event = vi.fn();
    beforeEach(async () => {
        vi.clearAllMocks();
        guestInvitationApi.listMyGuestInvitations.mockResolvedValue([]);
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        container = document.createElement('div'); document.body.append(container); root = createRoot(container);
        // Closed/off-season crews must not admit season guest codes.
        await act(async () => root.render(<GuestAccess onBack={vi.fn()} onSeasonHouseAccess={season} onEventAccess={event} seasonAvailable={false} offSeasonAvailable seasonBookingCrewId={null} />));
    });
    afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
    it.each(['BB:SEASON:1', 'https://example.test/?type=SEASON&id=1', 'BB:EVENT:0', 'BB:EVENT:99999999999999999999'])('blocks season/invalid code %s', async code => {
        const input = container.querySelector('input')!;
        await act(async () => {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, code);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
        expect(season).not.toHaveBeenCalled(); expect(event).not.toHaveBeenCalled();
    });

    it.each(['BB:EVENT:34', 'https://stg.boardbuddy.kr/?type=EVENT&id=34'])('only opens the event application for %s', async code => {
        const input = container.querySelector('input')!;
        await act(async () => {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, code);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
        expect(event).toHaveBeenCalledExactlyOnceWith(34);
        expect(season).not.toHaveBeenCalled();
    });

    it.each([null, 99, 12])('admits season guest entry only for the active crew member (%s)', async crewId => {
        await act(async () => root.render(<GuestAccess onBack={vi.fn()} onSeasonHouseAccess={season} onEventAccess={event} seasonAvailable offSeasonAvailable seasonBookingCrewId={crewId} />));
        const input = container.querySelector('input')!;
        await act(async () => {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'BB:SEASON:12');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
        if (crewId === 12) expect(season).toHaveBeenCalledExactlyOnceWith(12);
        else { expect(season).not.toHaveBeenCalled(); expect(container.textContent).toContain('크루 운영진이나 초대한 부원에게 요청'); }
        expect(event).not.toHaveBeenCalled();
    });

    it('auto-opens a guest invitation link once crew access resolves, with the same effect as scanning QR', async () => {
        window.history.replaceState(null, '', '/?view=guest_access&type=SEASON&id=12');
        const consumed = vi.fn();

        // While crew access is still loading, wait before evaluating the link.
        await act(async () => root.render(
            <GuestAccess
                onBack={vi.fn()}
                onSeasonHouseAccess={season}
                onEventAccess={event}
                seasonAvailable
                offSeasonAvailable
                seasonBookingCrewId={null}
                initialCode="BB:SEASON:12"
                accessResolved={false}
                onInitialCodeConsumed={consumed}
            />
        ));
        expect(season).not.toHaveBeenCalled();
        expect(consumed).not.toHaveBeenCalled();

        // Once crew access finishes loading for crew 12, opens season house guest booking and cleans URL params.
        await act(async () => root.render(
            <GuestAccess
                onBack={vi.fn()}
                onSeasonHouseAccess={season}
                onEventAccess={event}
                seasonAvailable
                offSeasonAvailable
                seasonBookingCrewId={12}
                initialCode="BB:SEASON:12"
                accessResolved
                onInitialCodeConsumed={consumed}
            />
        ));
        expect(season).toHaveBeenCalledExactlyOnceWith(12);
        expect(consumed).toHaveBeenCalledOnce();
        expect(window.location.search).toBe('?view=guest_access');
    });

    it('auto-opens an event guest invitation link and shows single-use season guest share card for active crew members', async () => {
        const consumed = vi.fn();
        await act(async () => root.render(
            <GuestAccess
                onBack={vi.fn()}
                onSeasonHouseAccess={season}
                onEventAccess={event}
                seasonAvailable
                offSeasonAvailable
                seasonBookingCrewId={12}
                initialCode="BB:EVENT:34"
                accessResolved
                onInitialCodeConsumed={consumed}
            />
        ));
        expect(event).toHaveBeenCalledExactlyOnceWith(34);
        expect(consumed).toHaveBeenCalledOnce();
        expect(container.textContent).toContain('내 크루 시즌방 게스트 초대 보내기');
        expect(container.textContent).toContain('1회용 초대 링크 만들기');
    });

    it('redeems a single-use guest invitation token link and shows an error if already used', async () => {
        const token = 'c'.repeat(43);
        guestInvitationApi.redeemGuestInvitation
            .mockResolvedValueOnce({ invitationId: 'inv-1', targetType: 'SEASON', crewId: 12, eventId: null })
            .mockRejectedValueOnce({ isAxiosError: true, response: { status: 400, data: { message: '이미 사용된 게스트 초대 링크입니다. 초대한 부원에게 새 링크를 요청해 주세요.' } } });
        window.history.replaceState(null, '', `/?view=guest_access#guestInvite=${token}`);
        const consumed = vi.fn();

        await act(async () => root.render(
            <GuestAccess
                onBack={vi.fn()}
                onSeasonHouseAccess={season}
                onEventAccess={event}
                seasonAvailable
                offSeasonAvailable
                seasonBookingCrewId={12}
                initialCode={`BB:GUEST:${token}`}
                accessResolved
                onInitialCodeConsumed={consumed}
            />
        ));
        expect(guestInvitationApi.redeemGuestInvitation).toHaveBeenCalledWith(token);
        expect(season).toHaveBeenCalledExactlyOnceWith(12);
        expect(window.location.hash).toBe('');

        // Re-submitting the same single-use token shows the server's already-used error.
        const confirmButton = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.trim() === '확인')!;
        await act(async () => {
            confirmButton.click();
        });
        expect(container.textContent).toContain('이미 사용된 게스트 초대 링크입니다.');
    });
});
