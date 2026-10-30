// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ getSignupPolicy: vi.fn(), updateSignupPolicy: vi.fn() }));
vi.mock('../services/signupPolicy', () => api);
import SignupPolicySettings from './SignupPolicySettings';

describe('developer signup controls', () => {
    let root: Root;
    let container: HTMLDivElement;
    const defaults = { regularEnabled: false, studentEnabled: true, version: null };
    beforeEach(async () => {
        vi.resetAllMocks();
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        api.getSignupPolicy.mockResolvedValue(defaults);
        container = document.createElement('div'); document.body.append(container); root = createRoot(container);
        await act(async () => root.render(<SignupPolicySettings />));
    });
    afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
    const click = async (text: string) => {
        const button = Array.from(container.querySelectorAll('button')).find(button => button.textContent === text)!;
        expect(button).toBeDefined();
        await act(async () => button.click());
    };

    it('shows the server policy and waits for a concrete confirmation before saving', async () => {
        api.updateSignupPolicy.mockResolvedValue({ ...defaults, regularEnabled: true, version: 0 });
        expect(container.textContent).toContain('일반회원');
        expect(container.textContent).toContain('신규 가입 일시 중단');
        await click('일반회원 가입 재개');
        expect(api.updateSignupPolicy).not.toHaveBeenCalled();
        await click('설정 변경 확인');
        expect(api.updateSignupPolicy).toHaveBeenCalledWith('REGULAR', true, null);
        expect(container.textContent).toContain('일반회원 신규 가입을 재개했습니다.');
        expect(container.textContent).toContain('일반회원 가입 중단');
    });

    it('can pause students independently without enabling regular signup', async () => {
        api.updateSignupPolicy.mockResolvedValue({ ...defaults, studentEnabled: false, version: 0 });
        await click('학생 가입 중단'); await click('설정 변경 확인');
        expect(api.updateSignupPolicy).toHaveBeenCalledWith('KUSBF', false, null);
        expect(container.textContent).toContain('학생 신규 가입을 중단했습니다.');
        expect(container.textContent).toContain('일반회원 가입 재개');
    });

    it('does not claim success or change the visible policy after a failed write', async () => {
        api.updateSignupPolicy.mockRejectedValue(new Error('offline'));
        await click('일반회원 가입 재개'); await click('설정 변경 확인');
        expect(container.querySelector('[role="alert"]')!.textContent).toContain('저장하지 못했습니다');
        expect(container.textContent).toContain('일반회원 가입 재개');
        expect(container.textContent).not.toContain('재개했습니다');
    });

    it('requires reloading after a version conflict and never retries the write automatically', async () => {
        api.updateSignupPolicy.mockRejectedValue({ isAxiosError: true, response: { status: 409 } });
        await click('일반회원 가입 재개'); await click('설정 변경 확인');
        expect(container.textContent).toContain('다른 개발자가 설정을 변경했습니다');
        expect(api.updateSignupPolicy).toHaveBeenCalledOnce();
        api.getSignupPolicy.mockResolvedValue({ regularEnabled: true, studentEnabled: false, version: 8 });
        await click('가입 허용 설정 다시 불러오기');
        expect(container.textContent).toContain('일반회원 가입 중단');
        expect(container.textContent).toContain('학생 가입 재개');
    });

    it('cancels a pending policy change without sending a write', async () => {
        await click('학생 가입 중단'); await click('취소');
        expect(api.updateSignupPolicy).not.toHaveBeenCalled();
        expect(container.textContent).not.toContain('설정 변경 확인');
    });
});
