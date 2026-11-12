// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { navigationUrl, readNavigation, useBrowserNavigation, type NavigationState } from './useBrowserNavigation';

describe('URL navigation with existing authentication gates', () => {
    let container: HTMLDivElement;
    let root: ReturnType<typeof createRoot>;
    beforeEach(() => {
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        localStorage.clear(); localStorage.setItem('accessToken', 'synthetic-access');
        window.history.replaceState(null, '', '/?view=home');
        container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    });
    afterEach(async () => { await act(async () => root.unmount()); container.remove(); localStorage.clear(); vi.unstubAllGlobals(); });

    function Screen() {
        const [route, setRoute] = useState<NavigationState>(readNavigation);
        useBrowserNavigation(route, setRoute);
        return <><output>{route.view}:{route.eventId ?? route.groupId ?? ''}</output>
            <button onClick={() => setRoute({ ...route, view: 'event_detail', eventId: 42 })}>Open event</button></>;
    }

    it('pushes a shareable event URL and restores state on browser navigation', async () => {
        await act(async () => root.render(<Screen />));
        await act(async () => container.querySelector('button')!.click());
        expect(window.location.search).toBe('?view=event_detail&eventId=42');
        expect(readNavigation().eventId).toBe(42);
        await act(async () => {
            window.history.replaceState(null, '', '/?view=dashboard_group_detail&groupId=7');
            window.dispatchEvent(new PopStateEvent('popstate'));
        });
        expect(container.querySelector('output')!.textContent).toBe('dashboard_group_detail:7');
        expect(window.location.search).toBe('?view=dashboard_group_detail&groupId=7');
    });

    it('validates IDs and preserves activation proof only on its verification screen', () => {
        window.history.replaceState(null, '', '/?view=event_detail&eventId=NaN&groupId=-2&token=proof');
        const route = readNavigation();
        expect(route.eventId).toBeNull(); expect(route.groupId).toBeNull();
        expect(navigationUrl({ ...route, view: 'home' })).not.toContain('token');
        expect(navigationUrl({ ...route, view: 'student_verification' })).toContain('token=proof');
    });

    it('does not bypass authentication through a protected deep link', () => {
        localStorage.clear(); window.history.replaceState(null, '', '/?view=dashboard_event_edit&eventId=42');
        expect(readNavigation().view).toBe('login');
    });
});
