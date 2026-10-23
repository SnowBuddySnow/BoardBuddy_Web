// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GuestAccess from './GuestAccess';
describe('guest-code entry during the season-house hold', () => {
    let root: Root; let container: HTMLDivElement;
    const season = vi.fn(); const event = vi.fn();
    beforeEach(async () => {
        vi.clearAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        container = document.createElement('div'); document.body.append(container); root = createRoot(container);
        // Even a stale caller claiming season=true cannot reopen this release.
        await act(async () => root.render(<GuestAccess onBack={vi.fn()} onSeasonHouseAccess={season} onEventAccess={event} seasonAvailable offSeasonAvailable />));
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
});
