// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
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
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const renderLoginLanding = async () => {
  await act(async () => {
    root.render(
      <LoginLanding
        onLogin={vi.fn()}
        onSignupNeeded={vi.fn()}
        onProfileTypeNeeded={vi.fn()}
      />,
    );
  });
};

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
