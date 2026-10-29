// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ getSignupPolicy: vi.fn() }));
vi.mock('../services/signupPolicy', () => api);
vi.mock('../services/schools', () => ({ getSchools: async () => [] }));
import UserInfoInput from './UserInfoInput';

describe('signup type availability', () => {
    let root: Root;
    let container: HTMLDivElement;
    beforeEach(() => {
        vi.resetAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    });
    afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
    const render = async () => { await act(async () => root.render(<UserInfoInput onBack={vi.fn()} />)); };
    const choice = (label: string) => Array.from(container.querySelectorAll<HTMLButtonElement>('button[aria-pressed]'))
        .find(button => button.textContent!.startsWith(label))!;

    it('disables regular signup while students can continue', async () => {
        api.getSignupPolicy.mockResolvedValue({ regularEnabled: false, studentEnabled: true, version: null });
        await render();
        expect(choice('일반').disabled).toBe(true);
        expect(choice('일반').textContent).toContain('신규 가입 일시 중단');
        expect(choice('학생').disabled).toBe(false);
        expect(choice('학생').getAttribute('aria-pressed')).toBe('true');
    });

    it('switches to regular signup when only students are paused', async () => {
        api.getSignupPolicy.mockResolvedValue({ regularEnabled: true, studentEnabled: false, version: 2 });
        await render();
        expect(choice('학생').disabled).toBe(true);
        expect(choice('일반').getAttribute('aria-pressed')).toBe('true');
        expect(container.querySelector('input[placeholder="보드버디"]')).not.toBeNull();
    });

    it('blocks all new signup when both types are paused and preserves the login exit', async () => {
        api.getSignupPolicy.mockResolvedValue({ regularEnabled: false, studentEnabled: false, version: 3 });
        await render();
        expect(container.textContent).toContain('현재 신규 회원가입을 일시 중단했습니다');
        expect(container.textContent).toContain('로그인으로 돌아가기');
        expect(container.querySelector('input')).toBeNull();
    });

    it('does not allow signup before policy loading succeeds and can retry after an error', async () => {
        api.getSignupPolicy.mockRejectedValueOnce(new Error('offline'));
        await render();
        expect(container.querySelector('[role="alert"]')!.textContent).toContain('불러오지 못했습니다');
        expect(container.querySelector('input')).toBeNull();
        api.getSignupPolicy.mockResolvedValue({ regularEnabled: false, studentEnabled: true, version: null });
        const retry = Array.from(container.querySelectorAll('button')).find(button => button.textContent === '다시 시도')!;
        await act(async () => retry.click());
        expect(choice('일반').disabled).toBe(true);
    });
});
