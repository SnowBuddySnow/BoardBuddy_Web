// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ activateSchoolEmailLink: vi.fn(), confirmSchoolEmailCode: vi.fn(),
    getSchoolEmailVerificationStatus: vi.fn(), requestSchoolEmailVerification: vi.fn() }));
vi.mock('../services/schoolEmailVerification', () => api);
vi.mock('../config/features', () => ({ SCHOOL_EMAIL_AUTH_AVAILABLE: true }));
import StudentVerification from './StudentVerification';

describe('school email verification entry and availability', () => {
    let root: Root; let container: HTMLDivElement;
    beforeEach(() => {
        vi.resetAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        window.history.replaceState(null, '', '/'); localStorage.clear();
        container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    });
    afterEach(async () => {
        await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.useRealTimers();
        window.history.replaceState(null, '', '/');
    });
    it('activates a signed-out link once under StrictMode and removes the proof from the URL', async () => {
        window.history.replaceState(null, '', '/?view=student_verification&token=private-proof');
        api.activateSchoolEmailLink.mockResolvedValue({ status: 'VERIFIED' });
        await act(async () => root.render(<StrictMode><StudentVerification onDone={vi.fn()} /></StrictMode>));
        expect(api.activateSchoolEmailLink).toHaveBeenCalledExactlyOnceWith('private-proof');
        expect(api.getSchoolEmailVerificationStatus).not.toHaveBeenCalled();
        expect(window.location.search).not.toContain('token=');
        expect(container.textContent).toContain('학생 인증이 완료되었습니다');
    });
    it('keeps onboarding available when delivery is not configured', async () => {
        api.getSchoolEmailVerificationStatus.mockResolvedValue({ status: 'NOT_VERIFIED', configured: true,
            deliveryAvailable: false, challengeId: null, retryAfterSeconds: 0 });
        await act(async () => root.render(<StudentVerification onDone={vi.fn()} />));
        expect(container.textContent).toContain('이메일 서비스가 열리면');
        expect(container.textContent).toContain('나중에 인증하기');
        expect(api.requestSchoolEmailVerification).not.toHaveBeenCalled();
    });
    it('allows leaving an expired or invalid activation link', async () => {
        window.history.replaceState(null, '', '/?view=student_verification&token=expired-proof');
        api.activateSchoolEmailLink.mockRejectedValue({ isAxiosError: true, response: { data: { message: 'Expired proof' } } });
        const done = vi.fn();
        await act(async () => root.render(<StudentVerification onDone={done} />));
        expect(container.querySelector('[role="alert"]')?.textContent).toContain('Expired proof');
        const back = Array.from(container.querySelectorAll('button')).find(node => node.textContent === '서비스로 돌아가기')!;
        await act(async () => back.click());
        expect(done).toHaveBeenCalledOnce();
    });
    it('shows the server cooldown and preserves leading zeroes in a code', async () => {
        api.getSchoolEmailVerificationStatus.mockResolvedValue({ status: 'PENDING', configured: true,
            deliveryAvailable: true, challengeId: 'challenge', retryAfterSeconds: 60 });
        api.confirmSchoolEmailCode.mockResolvedValue({ status: 'VERIFIED' });
        await act(async () => root.render(<StudentVerification onDone={vi.fn()} />));
        expect(container.textContent).toContain('60초 후 다시 보내기');
        const input = container.querySelector<HTMLInputElement>('input[placeholder="000000"]')!;
        await act(async () => {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '012345');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        const submit = Array.from(container.querySelectorAll('button')).find(node => node.textContent === '인증')!;
        await act(async () => submit.click());
        expect(api.confirmSchoolEmailCode).toHaveBeenCalledWith('challenge', '012345');
    });
});
