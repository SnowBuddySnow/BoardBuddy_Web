const LINK_KEY = 'eventGuest';

export function readEventGuestToken(hash: string): string {
    const token = new URLSearchParams(hash.slice(1)).get(LINK_KEY) ?? '';
    return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : '';
}

export function buildEventGuestLink(origin: string, token: string): string {
    const url = new URL('/', origin);
    url.searchParams.set('view', 'event_guest_verification');
    url.hash = new URLSearchParams({ [LINK_KEY]: token }).toString();
    return url.toString();
}
