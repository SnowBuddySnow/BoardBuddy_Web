export type GuestDestination =
    | { type: 'SEASON'; id: number }
    | { type: 'EVENT'; id: number };

const parsePositiveId = (value: string | null): number | null => {
    if (!value || !/^\d+$/.test(value)) return null;
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
};

export function parseGuestCode(rawCode: string): GuestDestination | null {
    const code = rawCode.trim();
    const match = code.match(/^(?:BB:)?(SEASON|EVENT)[:\-/](\d+)$/i);
    if (match) {
        const id = Number(match[2]);
        return Number.isSafeInteger(id) && id > 0
            ? { type: match[1].toUpperCase() as 'SEASON' | 'EVENT', id }
            : null;
    }

    try {
        const url = new URL(code);
        const type = url.searchParams.get('type')?.toUpperCase();
        const id = parsePositiveId(url.searchParams.get('id'));
        if ((type === 'SEASON' || type === 'EVENT') && id !== null) {
            return { type, id };
        }
    } catch {
        // The code may be a short code rather than a URL.
    }
    return null;
}

export function formatGuestCode(destination: GuestDestination): string {
    return `BB:${destination.type}:${destination.id}`;
}

export function guestInvitationUrl(
    destination: GuestDestination,
    baseUrl = `${window.location.origin}${window.location.pathname}`,
): string {
    if (!Number.isSafeInteger(destination.id) || destination.id <= 0) {
        throw new Error('Invalid guest invitation destination');
    }
    const url = new URL(baseUrl);
    url.search = '';
    url.hash = '';
    url.searchParams.set('view', 'guest_access');
    url.searchParams.set('type', destination.type);
    url.searchParams.set('id', String(destination.id));
    return url.toString();
}

export function readGuestInvitationFromSearch(search = window.location.search): GuestDestination | null {
    const params = new URLSearchParams(search);
    const type = params.get('type')?.toUpperCase();
    const id = parsePositiveId(params.get('id'));
    if ((type !== 'SEASON' && type !== 'EVENT') || id === null) {
        return null;
    }
    return { type, id };
}

export function clearGuestInvitationFromUrl(): void {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('type') && !url.searchParams.has('id')) return;
    url.searchParams.delete('type');
    url.searchParams.delete('id');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
}
