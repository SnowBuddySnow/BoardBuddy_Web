// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getSchools: vi.fn(), put: vi.fn(), getSignupPolicy: vi.fn(), requestPhoneVerification: vi.fn(), confirmPhoneVerification: vi.fn(), getOnboardingStatus: vi.fn() }));
vi.mock('../lib/axios', () => ({ default: { put: mocks.put } }));
vi.mock('../services/schools', () => ({ getSchools: mocks.getSchools }));
vi.mock('../services/signupPolicy', () => ({ getSignupPolicy: mocks.getSignupPolicy }));
vi.mock('../services/onboarding', () => ({ getOnboardingStatus: mocks.getOnboardingStatus }));
vi.mock('../services/phoneVerification', () => ({ requestPhoneVerification: mocks.requestPhoneVerification, confirmPhoneVerification: mocks.confirmPhoneVerification }));
import UserInfoInput from './UserInfoInput';
import { setSignupPrefill } from '../lib/signupPrefill';
import { saveAccountId, saveTempAccessToken } from '../lib/session';
const schools = [
    { id: 1, schoolCode: 'MAIN', name: '한국대학교', aliases: ['한국대'], emailDomains: [] },
    { id: 2, schoolCode: 'CAMPUS', name: '한국대학교', aliases: ['제2캠퍼스'], emailDomains: [] },
];
describe('signup school, phone and consent flow', () => {
    let root: Root; let container: HTMLDivElement;
    const success = vi.fn();
    beforeEach(() => {
        setSignupPrefill('99101'); vi.resetAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        localStorage.clear(); localStorage.setItem('tempAccessToken', 'synthetic-only'); localStorage.setItem('accountId', '99101');
        mocks.getSignupPolicy.mockResolvedValue({ regularEnabled: true, studentEnabled: true, version: 1 });
        mocks.getSchools.mockResolvedValue(schools);
        mocks.getOnboardingStatus.mockResolvedValue({ verifiedPhoneNumber: null });
        mocks.requestPhoneVerification.mockResolvedValue({ challengeId: 'synthetic-challenge', retryAfterSeconds: 0 });
        mocks.confirmPhoneVerification.mockResolvedValue({ accountId: 99101, accessToken: 'synthetic-verified', resolution: 'VERIFIED', status: 'PENDING_PROFILE' });
        mocks.put.mockResolvedValue({ data: { data: { accessToken: 'synthetic-active', refreshToken: 'synthetic-refresh' } } });
        container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    });
    afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
    const render = async () => { await act(async () => root.render(<UserInfoInput onBack={vi.fn()} onSuccess={success} />)); };
    const button = (text: string, base: ParentNode = container) => Array.from(base.querySelectorAll('button')).find(el => el.textContent === text)!;
    const click = async (el: HTMLElement) => { expect(el).toBeTruthy(); await act(async () => { el.focus(); el.click(); }); };
    const fill = async (selector: string, text: string) => {
        const el = container.querySelector<HTMLInputElement>(selector)!;
        expect(el).toBeTruthy();
        await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, text); el.dispatchEvent(new Event('input', { bubbles: true })); });
    };
    const personal = async () => {
        await fill('input[placeholder="김보드"]', '가상 회원');
        await fill('[role="combobox"]', '제2캠퍼스');
        const school = container.querySelector('[role="combobox"]')!;
        await act(async () => { school.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); });
        await act(async () => { school.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
        await fill('input[placeholder="학교에서 사용하는 학번"]', '20260001');
        await click(container.querySelector<HTMLInputElement>('input[name="gender"]')!);
    };
    const toTerms = async () => {
        await personal(); await click(button('다음'));
        await fill('input[type="tel"]', '01000000000');
        await click(button('인증번호 받기'));
        await fill('input[placeholder="6자리 인증번호"]', '123456');
        await click(button('인증번호 확인')); await click(button('다음'));
    };
    it('prefills provider name and phone without treating either as local verification', async () => {
        setSignupPrefill('99101', { name: '가상 실명', phoneNumber: '+82 10-0000-0000' });
        await render();
        const name = container.querySelector<HTMLInputElement>('input[autocomplete="name"]')!;
        expect(name.value).toBe('가상 실명'); expect(name.readOnly).toBe(true);
        await click(button('내 이름이 아니에요 · 수정하기')); expect(name.readOnly).toBe(false);
        await personal(); await click(button('다음'));
        expect(container.querySelector<HTMLInputElement>('input[type="tel"]')!.value).toBe('010-0000-0000');
        expect(container.textContent).not.toContain('본인 확인 완료');
        await click(button('다음')); expect(mocks.put).not.toHaveBeenCalled();
        expect(container.querySelector('[role="alert"]')!.textContent).toContain('전화번호 인증');
    });
    it('does not reuse another account or an earlier login hint', async () => {
        setSignupPrefill('99101', { name: '이전 이름', phoneNumber: '+82 10-0000-0000' });
        saveAccountId('99102');
        await render();
        expect(container.querySelector<HTMLInputElement>('input[autocomplete="name"]')!.value).toBe('');
        await act(async () => root.unmount()); root = createRoot(container);
        saveAccountId('99101'); saveTempAccessToken('new-login');
        await render();
        expect(container.querySelector<HTMLInputElement>('input[autocomplete="name"]')!.value).toBe('');
    });
    it('submits the selected school ID even when names are identical, with explicit required consent only', async () => {
        await render(); await toTerms();
        expect(button('필수 약관 전체 동의 후 가입 완료').disabled).toBe(true);
        await click(container.querySelector<HTMLInputElement>('input[type="checkbox"]')!);
        expect(container.querySelector<HTMLInputElement>('input[name="phoneConsentPref"]:checked')!.parentElement!.textContent).toContain('제공할 때마다 확인');
        await click(button('필수 약관 전체 동의 후 가입 완료'));
        expect(mocks.put.mock.calls[0][1]).toMatchObject({ schoolId: 2, displayName: '가상 회원', phoneNumber: '010-0000-0000' });
        expect(success).toHaveBeenCalledOnce();
    });
    it('invalidates the chosen school on edits instead of treating a typed name as a selection', async () => {
        await render(); await personal(); await fill('[role="combobox"]', '한국대'); await fill('[role="combobox"]', '한국대학교');
        await click(button('다음'));
        expect(container.querySelector('[role="alert"]')!.textContent).toContain('검색 결과에서 학교를 선택');
        expect(container.textContent).toContain('1 / 3');
    });
    it('does not consent on read or close, and agrees only to the document explicitly accepted', async () => {
        await render(); await toTerms();
        const open = container.querySelector<HTMLButtonElement>('button[aria-label$="자세히 보기"]')!;
        await click(open);
        const dialog = document.querySelector('[role="dialog"]')!;
        expect(dialog.getAttribute('aria-modal')).toBe('true');
        await click(button('닫기', dialog));
        expect(container.querySelectorAll('input[type="checkbox"]:checked')).toHaveLength(0);
        expect(document.activeElement).toBe(open);
        await click(open); await click(button('이 약관에 동의', document.querySelector('[role="dialog"]')!));
        expect(container.querySelectorAll('input[type="checkbox"]:checked')).toHaveLength(1);
        expect(container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.indeterminate).toBe(true);
        expect(button('필수 약관 전체 동의 후 가입 완료').disabled).toBe(true);
        await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
        expect(mocks.put).not.toHaveBeenCalled();
    });
    it('retries a failed school load without substituting fake choices', async () => {
        mocks.getSchools.mockRejectedValueOnce(new Error('offline'));
        await render(); expect(container.textContent).toContain('학교 목록을 불러오지 못했습니다');
        expect(mocks.getSchools).toHaveBeenCalledWith({ allowDevFallback: false });
        await click(button('다시 시도')); await fill('[role="combobox"]', '한국대');
        expect(container.querySelectorAll('[role="option"]')).toHaveLength(2);
    });
    it('keeps personal data and verification while stepping back, and invalidates verification on phone edits', async () => {
        await render(); await toTerms(); await click(button('이전 단계'));
        expect(container.textContent).toContain('본인 확인 완료');
        await fill('input[type="tel"]', '01000000001'); await click(button('다음'));
        expect(container.querySelector('[role="alert"]')!.textContent).toContain('전화번호 인증');
        await click(button('이전 단계'));
        expect(container.querySelector<HTMLInputElement>('input[placeholder="김보드"]')!.value).toBe('가상 회원');
        expect(container.textContent).toContain('한국대학교 선택됨');
    });
    it('preserves consent and input after a failed submission', async () => {
        mocks.put.mockRejectedValueOnce(new Error('offline'));
        await render(); await toTerms(); await click(container.querySelector<HTMLInputElement>('input[type="checkbox"]')!);
        await click(button('필수 약관 전체 동의 후 가입 완료'));
        expect(container.querySelectorAll('input[type="checkbox"]:checked')).toHaveLength(3);
        expect(container.querySelector('[role="alert"]')).not.toBeNull();
        await click(button('필수 약관 전체 동의 후 가입 완료')); expect(success).toHaveBeenCalledOnce();
    });
    it('returns to personal review when refreshed signup policy changes the profile type', async () => {
        await render(); await toTerms(); await click(container.querySelector<HTMLInputElement>('input[type="checkbox"]')!);
        mocks.put.mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } });
        mocks.getSignupPolicy.mockResolvedValue({ regularEnabled: true, studentEnabled: false, version: 2 });
        await click(button('필수 약관 전체 동의 후 가입 완료'));
        expect(container.textContent).toContain('1 / 3');
        expect(container.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')!.textContent).toContain('일반');
        expect(container.querySelector<HTMLInputElement>('input[placeholder="보드버디"]')!.value).toBe('가상 회원');
        expect(mocks.put).toHaveBeenCalledOnce();
        expect(success).not.toHaveBeenCalled();
    });
    it('reuses server-verified identity without sending another SMS', async () => {
        mocks.getOnboardingStatus.mockResolvedValue({ verifiedPhoneNumber: '+821000000000' });
        await render(); await personal(); await click(button('다음'));
        expect(container.querySelector<HTMLInputElement>('input[type="tel"]')!.value).toBe('010-0000-0000');
        expect(container.textContent).toContain('본인 확인 완료');
        await click(button('다음')); expect(container.textContent).toContain('3 / 3');
        expect(mocks.requestPhoneVerification).not.toHaveBeenCalled();
    });
    it('does not overwrite a phone edited while identity recovery was in flight', async () => {
        let finish!: (value: { verifiedPhoneNumber: string }) => void;
        mocks.getOnboardingStatus.mockReturnValue(new Promise(resolve => { finish = resolve; }));
        await render(); await personal(); await click(button('다음'));
        await fill('input[type="tel"]', '01011112222');
        await act(async () => finish({ verifiedPhoneNumber: '+821000000000' }));
        expect(container.querySelector<HTMLInputElement>('input[type="tel"]')!.value).toBe('010-1111-2222');
        expect(container.textContent).not.toContain('본인 확인 완료');
    });
});
