import { getAccountId, getAuthSessionRevision } from './session';
export interface SignupPrefill { name?: string | null; phoneNumber?: string | null; }
let hint: { accountId: string; revision: number; value: SignupPrefill } | null = null;
// Memory only; no provider PII in persisted drafts or URLs.
export const setSignupPrefill = (accountId: string | number, value?: SignupPrefill) => {
    hint = value ? { accountId: String(accountId), revision: getAuthSessionRevision(), value } : null;
};
export const getSignupPrefill = (): SignupPrefill => hint?.accountId === getAccountId() && hint.revision === getAuthSessionRevision() ? hint.value : {};
