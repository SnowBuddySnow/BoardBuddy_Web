// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GuestAccess from './GuestAccess';
describe('guest-code entry with crew season availability disabled', () => {
    let root: Root; let container: HTMLDivElement;
    const season = vi.fn(); const event = vi.fn();
    beforeEach(async () => {
        vi.clearAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
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
});
