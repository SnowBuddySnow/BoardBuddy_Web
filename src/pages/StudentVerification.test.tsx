// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ activateSchoolEmailLink: vi.fn(), confirmSchoolEmailCode: vi.fn(),
    getSchoolEmailVerificationStatus: vi.fn(), requestSchoolEmailVerification: vi.fn() }));
const userApi = vi.hoisted(() => ({ getUserInfo: vi.fn() }));
vi.mock('../services/schoolEmailVerification', () => api);
vi.mock('../services/user', () => userApi);
vi.mock('../config/features', () => ({ SCHOOL_EMAIL_AUTH_AVAILABLE: true }));
import StudentVerification from './StudentVerification';

describe('school email verification entry and availability', () => {
    let root: Root; let container: HTMLDivElement;
    beforeEach(() => {
        vi.resetAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        userApi.getUserInfo.mockResolvedValue({ userType: 'KUSBF' });
        window.history.replaceState(null, '', '/'); localStorage.clear();
        container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    });
    afterEach(async () => {
        await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.useRealTimers();
        window.history.replaceState(null, '', '/');
    });
    it('activates a signed-out link once under StrictMode and removes the proof from the URL', async () => {
        window.history.replaceState(null, '', '/?view=student_verification&token=private-proof');
        api.activateSchoolEmailLink.mockResolvedValue({ accountId: 7, status: 'VERIFIED', schoolName: '카이스트', maskedEmail: 'ja***@kaist.ac.kr' });
        await act(async () => root.render(<StrictMode><StudentVerification onDone={vi.fn()} /></StrictMode>));
        expect(api.activateSchoolEmailLink).toHaveBeenCalledExactlyOnceWith('private-proof');
        expect(api.getSchoolEmailVerificationStatus).not.toHaveBeenCalled();
        expect(window.location.search).not.toContain('token=');
        expect(userApi.getUserInfo).not.toHaveBeenCalled();
        expect(container.textContent).toContain('학교 이메일 인증이 완료되었습니다');
        expect(container.textContent).toContain('카이스트 · ja***@kaist.ac.kr');
        expect(container.textContent).toContain('회원 유형은 변경되지 않습니다');
        expect(container.textContent).not.toContain('인증된 학생으로 등록되었습니다');
    });
    it.each(['REGULAR', 'GENERAL'])('does not offer school verification to a %s profile, including a developer', async userType => {
        userApi.getUserInfo.mockResolvedValue({ userType, role: 'DEVELOPER' });
        await act(async () => root.render(<StudentVerification onDone={vi.fn()} />));
        expect(container.textContent).toContain('학생 프로필에서 이용할 수 있습니다');
        expect(api.getSchoolEmailVerificationStatus).not.toHaveBeenCalled();
        expect(api.requestSchoolEmailVerification).not.toHaveBeenCalled();
        expect(container.querySelector('input')).toBeNull();
    });
    it('describes the requesting account when a signed-in general member opens a student link', async () => {
        localStorage.setItem('accessToken', 'synthetic-general-member-token');
        userApi.getUserInfo.mockResolvedValue({ userId: 2, userType: 'REGULAR', role: 'DEVELOPER' });
        window.history.replaceState(null, '', '/?view=student_verification&token=student-proof');
        api.activateSchoolEmailLink.mockResolvedValue({ accountId: 7, status: 'VERIFIED', schoolName: '카이스트', maskedEmail: 'ja***@kaist.ac.kr' });
        await act(async () => root.render(<StudentVerification onDone={vi.fn()} />));
        expect(api.activateSchoolEmailLink).toHaveBeenCalledExactlyOnceWith('student-proof');
        expect(container.textContent).toContain('인증을 요청한 계정의 학교 이메일이 확인되었습니다');
        expect(container.textContent).toContain('회원 유형은 변경되지 않습니다');
        expect(api.getSchoolEmailVerificationStatus).not.toHaveBeenCalled();
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
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-30T00:00:00Z'));
        let finishStatus!: (status: unknown) => void;
        api.getSchoolEmailVerificationStatus.mockImplementation(() => new Promise(resolve => { finishStatus = resolve; }));
        api.confirmSchoolEmailCode.mockResolvedValue({ status: 'VERIFIED' });
        await act(async () => root.render(<StudentVerification onDone={vi.fn()} />));
        await act(async () => {
            vi.advanceTimersByTime(1500);
            finishStatus({ status: 'PENDING', configured: true, deliveryAvailable: true,
                challengeId: 'challenge', retryAfterSeconds: 60 });
        });
        expect(container.textContent).toContain('60초 후 다시 보내기');
        await act(async () => { vi.advanceTimersByTime(1000); });
        expect(container.textContent).toContain('59초 후 다시 보내기');
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
