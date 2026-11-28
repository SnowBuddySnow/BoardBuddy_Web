const CONVERSION_TOKEN_KEY = 'boardbuddy_non_member_conversion_token';
const CONVERSION_CREW_HINT_KEY = 'boardbuddy_non_member_crew_hint';
const CONVERSION_LINKED_COUNT_KEY = 'boardbuddy_non_member_linked_count';

export function saveNonMemberConversionIntent(token: string, crewHint?: string | null) {
    try {
        sessionStorage.setItem(CONVERSION_TOKEN_KEY, token);
        if (crewHint?.trim()) {
            sessionStorage.setItem(CONVERSION_CREW_HINT_KEY, crewHint.trim());
        } else {
            sessionStorage.removeItem(CONVERSION_CREW_HINT_KEY);
        }
    } catch {
        // Ignore storage errors in private browsing contexts.
    }
}

export function getNonMemberConversionToken(): string | null {
    try {
        return sessionStorage.getItem(CONVERSION_TOKEN_KEY);
    } catch {
        return null;
    }
}

export function getNonMemberCrewHint(): string | null {
    try {
        return sessionStorage.getItem(CONVERSION_CREW_HINT_KEY);
    } catch {
        return null;
    }
}

export function markNonMemberConversionCompleted(linkedEventCount: number, crewHint?: string | null) {
    try {
        sessionStorage.removeItem(CONVERSION_TOKEN_KEY);
        sessionStorage.setItem(CONVERSION_LINKED_COUNT_KEY, String(linkedEventCount));
        if (crewHint?.trim()) {
            sessionStorage.setItem(CONVERSION_CREW_HINT_KEY, crewHint.trim());
        }
    } catch {
        // Ignore storage errors.
    }
}

export function hasPendingNonMemberPostSignup(): boolean {
    try {
        return sessionStorage.getItem(CONVERSION_LINKED_COUNT_KEY) !== null;
    } catch {
        return false;
    }
}

export function consumeNonMemberPostSignupBanner(): { linkedEventCount: number; crewHint: string | null } | null {
    try {
        const countRaw = sessionStorage.getItem(CONVERSION_LINKED_COUNT_KEY);
        const crewHint = sessionStorage.getItem(CONVERSION_CREW_HINT_KEY);
        if (countRaw == null && !crewHint) return null;
        sessionStorage.removeItem(CONVERSION_LINKED_COUNT_KEY);
        sessionStorage.removeItem(CONVERSION_CREW_HINT_KEY);
        return {
            linkedEventCount: Number(countRaw || '0') || 0,
            crewHint,
        };
    } catch {
        return null;
    }
}

export function clearNonMemberConversionIntent() {
    try {
        sessionStorage.removeItem(CONVERSION_TOKEN_KEY);
        sessionStorage.removeItem(CONVERSION_CREW_HINT_KEY);
        sessionStorage.removeItem(CONVERSION_LINKED_COUNT_KEY);
    } catch {
        // Ignore storage errors.
    }
}

export function buildPublicEventUrl(origin: string, eventCode: string): string {
    return `${origin}/?view=public_event&code=${encodeURIComponent(eventCode)}`;
}

export function buildNonMemberLookupUrl(origin: string, receiptCode?: string): string {
    return receiptCode
        ? `${origin}/?view=non_member_lookup&receipt=${encodeURIComponent(receiptCode)}`
        : `${origin}/?view=non_member_lookup`;
}
