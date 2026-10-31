// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('./lib/axios', () => ({ default: http }));
vi.mock('./components/DevPanel', () => ({ default: () => null }));
import App from './App';

it('opens a school-email activation URL without requiring a login or identity lookup', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    localStorage.clear();
    window.history.replaceState(null, '', '/?view=student_verification&token=synthetic-link-proof');
    http.post.mockResolvedValue({ data: { data: { status: 'VERIFIED' } } });
    const container = document.createElement('div'); document.body.append(container);
    const root = createRoot(container);
    try {
        await act(async () => { root.render(<App />); });
        await act(async () => { await vi.dynamicImportSettled(); });
        expect(http.post).toHaveBeenCalledExactlyOnceWith('/accounts/school-email-verifications/activate', { token: 'synthetic-link-proof' });
        expect(http.get.mock.calls.some(([path]) => path === '/users/me')).toBe(false);
        expect(container.textContent).toContain('학생 인증이 완료되었습니다');
    } finally {
        await act(async () => root.unmount()); container.remove(); localStorage.clear();
        window.history.replaceState(null, '', '/'); vi.unstubAllGlobals();
    }
});
