export type GuestDestination =
    | { type: 'SEASON'; id: number }
    | { type: 'EVENT'; id: number };

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const parsePositiveId = (value: string | null): number | null => {
    if (!value || !/^\d+$/.test(value)) return null;
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
};

export function isValidGuestInvitationToken(value: unknown): value is string {
    return typeof value === 'string' && TOKEN_PATTERN.test(value);
}

export function extractGuestInvitationToken(rawValue: string): string | null {
    const value = rawValue.trim();
    if (!value) return null;

    const shortMatch = value.match(/^BB:GUEST:([A-Za-z0-9_-]{43})$/i);
    if (shortMatch && isValidGuestInvitationToken(shortMatch[1])) {
        return shortMatch[1];
    }

    try {
        const url = new URL(value);
        const hashToken = new URLSearchParams(url.hash.slice(1)).get('guestInvite');
        if (isValidGuestInvitationToken(hashToken)) return hashToken;
        const queryToken = url.searchParams.get('guestInvite');
        if (isValidGuestInvitationToken(queryToken)) return queryToken;
    } catch {
        // The input may be a short code or bare token rather than a full URL.
    }

    return null;
}

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

export function formatGuestTokenCode(token: string): string {
    if (!isValidGuestInvitationToken(token)) {
        throw new Error('Invalid guest invitation token');
    }
    return `BB:GUEST:${token}`;
}

export function guestInvitationTokenUrl(
    token: string,
    baseUrl = `${window.location.origin}${window.location.pathname}`,
): string {
    if (!isValidGuestInvitationToken(token)) {
        throw new Error('Invalid guest invitation token');
    }
    const url = new URL(baseUrl);
    url.search = '';
    url.hash = '';
    url.searchParams.set('view', 'guest_access');
    url.hash = new URLSearchParams({ guestInvite: token }).toString();
    return url.toString();
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

export function readGuestInvitationEntryFromUrl(href = window.location.href): string | null {
    const token = extractGuestInvitationToken(href);
    if (token) return formatGuestTokenCode(token);
    try {
        const url = new URL(href);
        const destination = readGuestInvitationFromSearch(url.search);
        return destination ? formatGuestCode(destination) : null;
    } catch {
        return null;
    }
}

export function clearGuestInvitationFromUrl(): void {
    const url = new URL(window.location.href);
    const fragment = new URLSearchParams(url.hash.slice(1));
    const hadFragmentToken = fragment.has('guestInvite');
    const hadSearchParams = url.searchParams.has('type') || url.searchParams.has('id') || url.searchParams.has('guestInvite');
    if (!hadFragmentToken && !hadSearchParams) return;
    if (hadFragmentToken) {
        fragment.delete('guestInvite');
        url.hash = fragment.toString();
    }
    url.searchParams.delete('type');
    url.searchParams.delete('id');
    url.searchParams.delete('guestInvite');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
}
