// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import apiClient from '../lib/axios';
import { consumePendingNaverAuth, savePendingNaverAuth } from '../lib/naverOAuth';
import { getSignupPrefill } from '../lib/signupPrefill';
import { getAccessToken, getSignupToken, isAutoLoginEnabled } from '../lib/session';
import LoginLanding from './LoginLanding';

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const login = vi.fn();
const alertSpy = vi.fn();

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('alert', alertSpy);
  vi.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/?view=login');
  vi.stubGlobal('Kakao', {
    init: vi.fn(),
    isInitialized: () => true,
    Auth: { login },
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

const renderLoginLanding = async (overrides?: {
  onLogin?: (restoredOrganizerInviteToken?: string) => void;
  onSignupNeeded?: () => void;
  onProfileTypeNeeded?: () => void;
  organizerInviteToken?: string;
  onNaverRedirect?: (url: string) => void;
}) => {
  await act(async () => {
    root.render(
      <LoginLanding
        onLogin={overrides?.onLogin ?? vi.fn()}
        onSignupNeeded={overrides?.onSignupNeeded ?? vi.fn()}
        onProfileTypeNeeded={overrides?.onProfileTypeNeeded ?? vi.fn()}
        organizerInviteToken={overrides?.organizerInviteToken}
        onNaverRedirect={overrides?.onNaverRedirect}
      />,
    );
  });
};

const findNaverButton = () =>
  Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent?.includes('네이버 로그인'),
  )!;

it('omits the scope property when VITE_KAKAO_SIGNUP_SCOPES is unset', async () => {
  vi.stubEnv('VITE_KAKAO_SIGNUP_SCOPES', '');
  await renderLoginLanding();

  const button = container.querySelector('button')!;
  await act(async () => {
    button.click();
  });

  expect(login).toHaveBeenCalledTimes(1);
  const options = login.mock.calls[0][0] as Record<string, unknown>;
  expect('scope' in options).toBe(false);
});

it('includes scope when VITE_KAKAO_SIGNUP_SCOPES is configured', async () => {
  vi.stubEnv('VITE_KAKAO_SIGNUP_SCOPES', 'name, gender');
  await renderLoginLanding();

  const button = container.querySelector('button')!;
  await act(async () => {
    button.click();
  });

  expect(login).toHaveBeenCalledTimes(1);
  const options = login.mock.calls[0][0] as Record<string, unknown>;
  expect(options.scope).toBe('name,gender');
});

it('recovers loading state if Kakao.Auth.login throws synchronously', async () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  login.mockImplementation(() => {
    throw new Error('Illegal argument for "scope" in Auth.login');
  });

  await renderLoginLanding();
  const button = container.querySelector('button')!;
  await act(async () => {
    button.click();
  });

  expect(button.disabled).toBe(false);
  expect(alertSpy).toHaveBeenCalledTimes(1);
  consoleErrorSpy.mockRestore();
});

it('starts Naver OAuth redirect using VITE_NAVER_CLIENT_ID and persists CSRF state', async () => {
  vi.stubEnv('VITE_NAVER_CLIENT_ID', 'naver-client-from-env');
  vi.stubEnv('VITE_NAVER_REDIRECT_URI', 'https://boardbuddy.kr/');
  const onNaverRedirect = vi.fn();

  await renderLoginLanding({
    organizerInviteToken: 'org-invite-7',
    onNaverRedirect,
  });

  await act(async () => {
    findNaverButton().click();
  });

  expect(onNaverRedirect).toHaveBeenCalledTimes(1);
  const authorizeUrl = new URL(onNaverRedirect.mock.calls[0][0] as string);
  expect(authorizeUrl.origin + authorizeUrl.pathname).toBe(
    'https://nid.naver.com/oauth2.0/authorize',
  );
  expect(authorizeUrl.searchParams.get('response_type')).toBe('code');
  expect(authorizeUrl.searchParams.get('client_id')).toBe('naver-client-from-env');
  expect(authorizeUrl.searchParams.get('redirect_uri')).toBe('https://boardbuddy.kr/');

  const pending = consumePendingNaverAuth();
  expect(pending?.state).toBe(authorizeUrl.searchParams.get('state'));
  expect(pending?.organizerInviteToken).toBe('org-invite-7');
});

it('falls back to backend public config when VITE_NAVER_CLIENT_ID is unset', async () => {
  vi.stubEnv('VITE_NAVER_CLIENT_ID', '');
  const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
    status: 200,
    data: {
      data: {
        provider: 'NAVER',
        enabled: true,
        clientId: 'naver-client-from-backend',
      },
    },
  });
  const onNaverRedirect = vi.fn();

  await renderLoginLanding({ onNaverRedirect });

  await act(async () => {
    findNaverButton().click();
  });

  expect(getSpy).toHaveBeenCalledWith('/auth/social/naver/config');
  expect(onNaverRedirect).toHaveBeenCalledTimes(1);
  const authorizeUrl = new URL(onNaverRedirect.mock.calls[0][0] as string);
  expect(authorizeUrl.searchParams.get('client_id')).toBe('naver-client-from-backend');
});

it('exchanges a valid Naver callback code and populates signup prefill for new users', async () => {
  savePendingNaverAuth({
    state: 'csrf-state-123',
    autoLogin: true,
    createdAt: Date.now(),
    invitationToken: null,
  });
  window.history.replaceState(
    null,
    '',
    '/?view=login&code=naver-code-123&state=csrf-state-123',
  );

  const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
    status: 201,
    data: {
      data: {
        accountId: 707,
        status: 'PENDING_PROFILE',
        userType: 'REGULAR',
        accessToken: 'temp-naver-jwt',
        refreshToken: 'refresh-naver-jwt',
        signupPrefill: {
          name: '김네이버',
          phoneNumber: '+821012345678',
          gender: 'FEMALE',
          missingConsentScopes: [],
        },
      },
    },
  });
  const onSignupNeeded = vi.fn();

  await renderLoginLanding({ onSignupNeeded });

  expect(postSpy).toHaveBeenCalledWith('/auth/social/naver/code', {
    code: 'naver-code-123',
    state: 'csrf-state-123',
  });
  expect(new URLSearchParams(window.location.search).get('code')).toBeNull();
  expect(new URLSearchParams(window.location.search).get('state')).toBeNull();
  expect(getSignupToken()).toBe('temp-naver-jwt');
  expect(isAutoLoginEnabled()).toBe(true);
  expect(getSignupPrefill()).toEqual({
    name: '김네이버',
    phoneNumber: '+821012345678',
    gender: 'FEMALE',
    missingConsentScopes: [],
  });
  expect(onSignupNeeded).toHaveBeenCalledTimes(1);
});

it('completes active Naver login and restores organizer invite token', async () => {
  savePendingNaverAuth({
    state: 'csrf-state-active',
    autoLogin: false,
    createdAt: Date.now(),
    invitationToken: null,
    organizerInviteToken: 'org-invite-99',
  });
  window.history.replaceState(
    null,
    '',
    '/?code=naver-active-code&state=csrf-state-active',
  );

  vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
    status: 201,
    data: {
      data: {
        accountId: 808,
        status: 'ACTIVE',
        userType: 'KUSBF',
        accessToken: 'active-naver-jwt',
        refreshToken: 'active-naver-refresh',
      },
    },
  });
  const onLogin = vi.fn();

  await renderLoginLanding({ onLogin });

  expect(getAccessToken()).toBe('active-naver-jwt');
  expect(onLogin).toHaveBeenCalledWith('org-invite-99');
});

it('rejects Naver callbacks with mismatched CSRF state without calling backend', async () => {
  savePendingNaverAuth({
    state: 'expected-state',
    autoLogin: false,
    createdAt: Date.now(),
    invitationToken: null,
  });
  window.history.replaceState(
    null,
    '',
    '/?code=naver-code&state=tampered-state',
  );

  const postSpy = vi.spyOn(apiClient, 'post');
  await renderLoginLanding();

  expect(postSpy).not.toHaveBeenCalled();
  expect(alertSpy).toHaveBeenCalledTimes(1);
  expect(new URLSearchParams(window.location.search).get('code')).toBeNull();
});

it('handles Naver access_denied cancellation cleanly without calling backend', async () => {
  savePendingNaverAuth({
    state: 'cancel-state',
    autoLogin: false,
    createdAt: Date.now(),
    invitationToken: null,
  });
  window.history.replaceState(
    null,
    '',
    '/?error=access_denied&error_description=Canceled&state=cancel-state',
  );

  const postSpy = vi.spyOn(apiClient, 'post');
  await renderLoginLanding();

  expect(postSpy).not.toHaveBeenCalled();
  expect(alertSpy).toHaveBeenCalledTimes(1);
  expect(new URLSearchParams(window.location.search).get('error')).toBeNull();
});
