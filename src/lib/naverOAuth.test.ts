// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildNaverAuthorizeUrl,
  consumePendingNaverAuth,
  extractNaverCallbackFromUrl,
  getConfiguredNaverClientId,
  getNaverRedirectUri,
  isConfiguredNaverClientId,
  savePendingNaverAuth,
} from './naverOAuth';

describe('naverOAuth helpers', () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, '', '/?view=login');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    sessionStorage.clear();
  });

  it('rejects empty and placeholder client IDs', () => {
    expect(isConfiguredNaverClientId('')).toBe(false);
    expect(isConfiguredNaverClientId('   ')).toBe(false);
    expect(isConfiguredNaverClientId('YOUR_NAVER_CLIENT_ID')).toBe(false);
    expect(isConfiguredNaverClientId('local-naver-client-id')).toBe(false);
    expect(isConfiguredNaverClientId('naver-real-client-id')).toBe(true);
  });

  it('reads configured client ID and redirect URI from env with origin fallback', () => {
    vi.stubEnv('VITE_NAVER_CLIENT_ID', '  real-client-123  ');
    vi.stubEnv('VITE_NAVER_REDIRECT_URI', '');
    expect(getConfiguredNaverClientId()).toBe('real-client-123');
    expect(getNaverRedirectUri()).toBe(`${window.location.origin}/`);

    vi.stubEnv('VITE_NAVER_REDIRECT_URI', 'https://boardbuddy.kr/');
    expect(getNaverRedirectUri()).toBe('https://boardbuddy.kr/');
  });

  it('builds a valid Naver authorize URL', () => {
    const url = new URL(
      buildNaverAuthorizeUrl('client-abc', 'https://boardbuddy.kr/', 'state-xyz'),
    );
    expect(url.origin + url.pathname).toBe('https://nid.naver.com/oauth2.0/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('client-abc');
    expect(url.searchParams.get('redirect_uri')).toBe('https://boardbuddy.kr/');
    expect(url.searchParams.get('state')).toBe('state-xyz');
  });

  it('stores and consumes pending Naver auth once and expires stale entries', () => {
    savePendingNaverAuth({
      state: 'state-1',
      autoLogin: true,
      createdAt: 1000,
      invitationToken: null,
      organizerInviteToken: 'org-token',
    });

    expect(consumePendingNaverAuth(2000)).toEqual({
      state: 'state-1',
      autoLogin: true,
      createdAt: 1000,
      invitationToken: null,
      invitationEventId: undefined,
      organizerInviteToken: 'org-token',
    });
    expect(consumePendingNaverAuth(2000)).toBeNull();

    savePendingNaverAuth({
      state: 'stale-state',
      autoLogin: false,
      createdAt: 1000,
      invitationToken: null,
    });
    expect(consumePendingNaverAuth(1000 + 11 * 60 * 1000)).toBeNull();
  });

  it('extracts Naver callback parameters and immediately strips them from the URL', () => {
    window.history.replaceState(
      null,
      '',
      '/?view=login&code=auth-code-9&state=state-9&keep=1',
    );
    const extracted = extractNaverCallbackFromUrl();
    expect(extracted).toEqual({
      code: 'auth-code-9',
      state: 'state-9',
      error: null,
      errorDescription: null,
    });
    const remaining = new URLSearchParams(window.location.search);
    expect(remaining.get('code')).toBeNull();
    expect(remaining.get('state')).toBeNull();
    expect(remaining.get('view')).toBe('login');
    expect(remaining.get('keep')).toBe('1');
  });
});
