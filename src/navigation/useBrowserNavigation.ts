import { useEffect, useRef } from 'react';
import { getInitialView, type View } from './routes';

export interface NavigationState {
    view: View;
    eventId: number | null;
    groupId: number | null;
    organizerInviteToken: string;
}

const positiveId = (value: string | null): number | null => {
    if (!value || !/^\d+$/.test(value)) return null;
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
};

export const readNavigation = (): NavigationState => {
    const params = new URLSearchParams(window.location.search);
    return { view: getInitialView(), eventId: positiveId(params.get('eventId')),
        groupId: positiveId(params.get('groupId')), organizerInviteToken: params.get('organizerInvite') || '' };
};

export const navigationUrl = (route: NavigationState): string => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', route.view);
    if (['event_detail', 'dashboard_event_detail', 'dashboard_event_edit'].includes(route.view) && route.eventId != null) {
        url.searchParams.set('eventId', String(route.eventId));
    } else url.searchParams.delete('eventId');
    if (route.view === 'dashboard_group_detail' && route.groupId != null) url.searchParams.set('groupId', String(route.groupId));
    else url.searchParams.delete('groupId');
    if (route.view === 'organizer_invite' && route.organizerInviteToken) url.searchParams.set('organizerInvite', route.organizerInviteToken);
    else url.searchParams.delete('organizerInvite');
    if (route.view !== 'student_verification') url.searchParams.delete('token');
    return url.pathname + url.search + url.hash;
};

/** Keep existing query links while making navigation, reload and back/forward agree. */
export function useBrowserNavigation(route: NavigationState, onRestore: (route: NavigationState) => void) {
    const initial = useRef(true);
    const restoringUrl = useRef<string | null>(null);
    const restore = useRef(onRestore);
    useEffect(() => { restore.current = onRestore; }, [onRestore]);
    useEffect(() => {
        const handlePopState = () => {
            const next = readNavigation();
            restoringUrl.current = navigationUrl(next);
            restore.current(next);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);
    const { view, eventId, groupId, organizerInviteToken } = route;
    useEffect(() => {
        const next = navigationUrl({ view, eventId, groupId, organizerInviteToken });
        const current = window.location.pathname + window.location.search + window.location.hash;
        const replace = initial.current || restoringUrl.current === next;
        initial.current = false;
        restoringUrl.current = null;
        if (current === next) return;
        if (replace) window.history.replaceState(null, '', next);
        else window.history.pushState(null, '', next);
    }, [view, eventId, groupId, organizerInviteToken]);
}
