/** Invitation proof is tab-scoped and never placed in query strings or analytics. */
const KEY = 'bb.crew-invitation.v1';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
export const CREW_INVITATION_CHANGED = 'boardbuddy:crew-invitation-changed';
export interface CrewInvitationIntent {
    token: string;
    receivedAt: number;
    eventId?: number;
    receipt?: { crewId: number; accountId: string };
}
let fallback: CrewInvitationIntent | null = null;
let loginAttempt = '';
const validToken = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
const positiveId = (value: string | null) => value && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : undefined;
const save = (value: CrewInvitationIntent | null) => {
    fallback = value;
    try { if (value) sessionStorage.setItem(KEY, JSON.stringify(value)); else sessionStorage.removeItem(KEY); } catch { /* Per-tab in-memory continuation still works. */ }
};
export const getCrewInvitationIntent = (): CrewInvitationIntent | null => {
    let value: CrewInvitationIntent | null;
    let raw: string | null;
    try { raw = sessionStorage.getItem(KEY); }
    catch { raw = null; value = fallback; return validate(value); }
    try { value = raw ? JSON.parse(raw) as CrewInvitationIntent : null; }
    catch { return null; }
    return validate(value);
};
const validate = (value: CrewInvitationIntent | null): CrewInvitationIntent | null => {
    if (!value || !validToken(value.token) || !Number.isFinite(value.receivedAt) || Date.now() - value.receivedAt > MAX_AGE || value.receivedAt > Date.now()) return null;
    const eventId = typeof value.eventId === 'number' && Number.isSafeInteger(value.eventId) && value.eventId > 0 ? value.eventId : undefined;
    const receipt = value.receipt && typeof value.receipt.accountId === 'string' && /^\d+$/.test(value.receipt.accountId) && Number.isSafeInteger(value.receipt.crewId) && value.receipt.crewId > 0 ? value.receipt : undefined;
    return { token: value.token, receivedAt: value.receivedAt, eventId, receipt };
};
export const captureCrewInvitation = () => {
    const url = new URL(window.location.href);
    const fragment = new URLSearchParams(url.hash.slice(1));
    if (!fragment.has('crewInvite')) return;
    const token = fragment.get('crewInvite');
    if (validToken(token)) {
        save({ token, receivedAt: Date.now(), eventId: positiveId(url.searchParams.get('eventId')) });
    } else save(null);
    fragment.delete('crewInvite');
    url.hash = fragment.toString();
    url.searchParams.delete('crewInvite');
    url.searchParams.set('view', 'crew_invite');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    window.dispatchEvent(new Event(CREW_INVITATION_CHANGED));
};
export const clearCrewInvitationIntent = () => save(null);
export const rememberCrewApplication = (crewId: number, accountId: string) => {
    const intent = getCrewInvitationIntent();
    if (intent) save({ ...intent, receipt: { crewId, accountId } });
};
export const crewInvitationUrl = (token: string) => {
    if (!validToken(token)) throw new Error('Invalid invitation token');
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('view', 'crew_invite');
    url.hash = new URLSearchParams({ crewInvite: token }).toString();
    return url.toString();
};
/** Bind the continuation to this SDK login attempt; a replaced invitation requires a new login. */
export const beginOnboardingLogin = () => {
    loginAttempt = crypto.randomUUID();
    const intent = getCrewInvitationIntent();
    return { id: loginAttempt, token: intent?.token || null, eventId: intent?.eventId };
};
export const isCurrentOnboardingLogin = (attempt: ReturnType<typeof beginOnboardingLogin>) =>
    attempt.id === loginAttempt && attempt.token === (getCrewInvitationIntent()?.token || null) && attempt.eventId === getCrewInvitationIntent()?.eventId;
