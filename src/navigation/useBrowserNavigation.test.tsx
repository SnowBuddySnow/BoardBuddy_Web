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
            <button onClick={() => setRoute({ ...route, view: 'event_detail', eventId: 42 })}>Open event</button>
            <button onClick={() => { localStorage.setItem('accessToken', 'synthetic-active'); setRoute({ ...route, view: 'home' }); }}>Finish login</button>
            <button onClick={() => { localStorage.clear(); setRoute({ ...route, view: 'login' }); }}>Logout</button></>;
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

    it('replaces the login entry after authentication instead of leaving it behind', async () => {
        localStorage.clear(); window.history.replaceState(null, '', '/?view=login');
        await act(async () => root.render(<Screen />));
        const before = window.history.length;
        await act(async () => container.querySelectorAll('button')[1].click());
        expect(window.history.length).toBe(before);
        expect(window.location.search).toBe('?view=home');
    });

    it('normalizes old login/signup entries on back and cached-page restoration', async () => {
        await act(async () => root.render(<Screen />));
        for (const view of ['login', 'user_info']) {
            await act(async () => { window.history.replaceState(null, '', `/?view=${view}`); window.dispatchEvent(new PopStateEvent('popstate')); });
            expect(container.querySelector('output')!.textContent).toBe('home:');
            expect(window.location.search).toBe('?view=home');
        }
        await act(async () => {
            localStorage.clear(); window.history.replaceState(null, '', '/?view=event_detail&eventId=42');
            const event = new Event('pageshow'); Object.defineProperty(event, 'persisted', { value: true }); window.dispatchEvent(event);
        });
        expect(container.querySelector('output')!.textContent).toBe('login:42');
        expect(window.location.search).toBe('?view=login');
    });

    it('preserves explicit invitation and verification destinations after login', () => {
        window.history.replaceState(null, '', '/?view=crew_invite'); expect(readNavigation().view).toBe('crew_invite');
        window.history.replaceState(null, '', '/?view=student_verification'); expect(readNavigation().view).toBe('student_verification');
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
