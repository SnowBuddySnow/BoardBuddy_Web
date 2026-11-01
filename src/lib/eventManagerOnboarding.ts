import type { OperationPermission } from '../services/operations';

const getKey = (userId: number | string) => `boardbuddy_event_manager_onboarding_v1:${userId}`;

export const hasEventManagementAccess = (permissions: OperationPermission[]) => permissions.some(permission => (
  permission === 'PARTIES_CREATE'
  || permission === 'PARTIES_MANAGE'
  || permission === 'EVENT_GROUPS_CREATE'
  || permission === 'EVENT_GROUPS_MANAGE'
));

export const claimEventManagerOnboarding = (userId: number | string) => {
  try {
    const key = getKey(userId);
    if (localStorage.getItem(key) !== null) return false;
    localStorage.setItem(key, 'shown');
    return true;
  } catch {
    // If browser storage is unavailable, keep the manual guide usable without
    // repeatedly interrupting the user with an automatic dialog.
    return false;
  }
};

export const completeEventManagerOnboarding = (userId: number | string) => {
  try {
    localStorage.setItem(getKey(userId), 'completed');
  } catch { /* The guide remains available from its manual entry points. */ }
};

export const dismissEventManagerOnboarding = (userId: number | string) => {
  try {
    const key = getKey(userId);
    if (localStorage.getItem(key) !== 'completed') localStorage.setItem(key, 'dismissed');
  } catch { /* Closing the dialog must also work when browser storage is blocked. */ }
};
