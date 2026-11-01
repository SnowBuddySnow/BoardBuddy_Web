import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OperationPermission } from '../services/operations';
import {
  claimEventManagerOnboarding, completeEventManagerOnboarding,
  dismissEventManagerOnboarding, hasEventManagementAccess,
} from './eventManagerOnboarding';

describe('event manager guide eligibility', () => {
  it.each<OperationPermission[]>([
    [], ['EVENT_GROUPS_VIEW'], ['RESERVATIONS_MANAGE'],
    ['CREW_MEMBERS_MANAGE', 'CREW_EVENT_MANAGERS_ASSIGN'],
  ])('does not treat non-event or view-only permissions as event management: %j', (...permissions) => {
    expect(hasEventManagementAccess(permissions)).toBe(false);
  });

  it.each<OperationPermission>(['PARTIES_CREATE', 'PARTIES_MANAGE', 'EVENT_GROUPS_CREATE', 'EVENT_GROUPS_MANAGE'])(
    'recognizes %s without depending on the crew role name', permission => {
      expect(hasEventManagementAccess(['EVENT_GROUPS_VIEW', permission])).toBe(true);
    },
  );
});

describe('event manager first-run history', () => {
  let values: Map<string, string>;
  beforeEach(() => {
    values = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('records display immediately so refreshes do not reopen an interrupted guide', () => {
    expect(claimEventManagerOnboarding(7)).toBe(true);
    expect(claimEventManagerOnboarding(7)).toBe(false);
  });

  it('keeps different accounts and captain history independent', () => {
    values.set('boardbuddy_captain_onboarding_v1:7', 'completed');
    expect(claimEventManagerOnboarding(7)).toBe(true);
    expect(claimEventManagerOnboarding(8)).toBe(true);
    expect(values.get('boardbuddy_captain_onboarding_v1:7')).toBe('completed');
  });

  it('does not reopen a dismissed guide automatically', () => {
    dismissEventManagerOnboarding(7);
    expect(claimEventManagerOnboarding(7)).toBe(false);
  });

  it('keeps completion when a later manual replay is dismissed', () => {
    completeEventManagerOnboarding(7);
    dismissEventManagerOnboarding(7);
    expect(Array.from(values.values())).toEqual(['completed']);
    expect(claimEventManagerOnboarding(7)).toBe(false);
  });

  it('leaves the rest of the app usable when browser storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('Storage blocked'); },
      setItem: () => { throw new Error('Storage blocked'); },
    });
    expect(claimEventManagerOnboarding(7)).toBe(false);
    expect(() => completeEventManagerOnboarding(7)).not.toThrow();
    expect(() => dismissEventManagerOnboarding(7)).not.toThrow();
  });
});
