// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import UserInfoInput from './UserInfoInput';
import { saveNonMemberConversionIntent } from '../lib/nonMemberConversion';

const mocks = vi.hoisted(() => ({
    prefillNonMemberConversion: vi.fn(),
    getSchools: vi.fn(),
    getSignupPolicy: vi.fn(),
    getOnboardingStatus: vi.fn(),
    putProfile: vi.fn(),
}));

vi.mock('../services/nonMemberEvent', async importOriginal => ({
    ...await importOriginal<typeof import('../services/nonMemberEvent')>(),
    prefillNonMemberConversion: mocks.prefillNonMemberConversion,
}));
vi.mock('../services/schools', () => ({ getSchools: mocks.getSchools }));
vi.mock('../services/signupPolicy', () => ({ getSignupPolicy: mocks.getSignupPolicy }));
vi.mock('../services/onboarding', () => ({ getOnboardingStatus: mocks.getOnboardingStatus }));
vi.mock('../lib/axios', () => ({
    default: {
        put: mocks.putProfile,
    },
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    sessionStorage.setItem('tempAccessToken', 'temp-token');
    sessionStorage.setItem('accountId', '77');
    mocks.getSignupPolicy.mockResolvedValue({ studentEnabled: true, regularEnabled: true });
    mocks.getOnboardingStatus.mockResolvedValue({ verifiedPhoneNumber: null });
    mocks.getSchools.mockResolvedValue([
        { id: 10, name: '고려대학교', emailDomains: ['korea.ac.kr'] },
    ]);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
});

function setInputValue(input: HTMLInputElement, value: string) {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

it('prefills verified phone & school from non-member conversion and forces SMS re-verification if phone changes', async () => {
    saveNonMemberConversionIntent('nmconv-xyz', '고려대 스노우폭스');
    mocks.prefillNonMemberConversion.mockResolvedValue({
        valid: true,
        name: '김외부',
        phoneNumber: '010-1234-5678',
        maskedPhone: '010-****-5678',
        schoolId: 10,
        schoolName: '고려대학교',
        crewName: '고려대 스노우폭스',
        linkedEventCount: 2,
        existingPhoneConflict: false,
    });

    await act(async () => root.render(<UserInfoInput onBack={vi.fn()} onSuccess={vi.fn()} />));

    expect(mocks.prefillNonMemberConversion).toHaveBeenCalledWith('nmconv-xyz');
    expect(container.textContent).toContain('비회원 이벤트 신청 정보가 자동으로 채워졌어요');
    expect(container.textContent).toContain('비회원 신청 SMS 인증 연동됨');

    const phoneInput = container.querySelector<HTMLInputElement>('#signup-phone')!;
    expect(phoneInput.value).toBe('010-1234-5678');

    // Changing the phone number invalidates carried-over SMS verification
    await act(async () => setInputValue(phoneInput, '01099998888'));
    expect(phoneInput.value).toBe('010-9999-8888');
    expect(container.textContent).toContain('전화번호가 변경되었습니다. 변경된 번호로 SMS 재인증이 필요해요.');
    expect(container.textContent).not.toContain('비회원 신청 SMS 인증 연동됨');

    // Reverting to the verified phone restores verification cleanly
    await act(async () => setInputValue(phoneInput, '01012345678'));
    expect(container.textContent).toContain('비회원 신청 SMS 인증 연동됨');
});
