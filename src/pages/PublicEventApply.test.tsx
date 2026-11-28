// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PublicEventApply from './PublicEventApply';
import type { NonMemberReceipt, PublicEventPreview } from '../services/nonMemberEvent';

const api = vi.hoisted(() => ({
    previewPublicEvent: vi.fn(),
    startNonMemberApplyPhone: vi.fn(),
    confirmNonMemberApplyPhone: vi.fn(),
    submitNonMemberApplication: vi.fn(),
    cancelNonMemberApplication: vi.fn(),
    getSchools: vi.fn(),
}));

vi.mock('../services/nonMemberEvent', async importOriginal => ({
    ...await importOriginal<typeof import('../services/nonMemberEvent')>(),
    previewPublicEvent: api.previewPublicEvent,
    startNonMemberApplyPhone: api.startNonMemberApplyPhone,
    confirmNonMemberApplyPhone: api.confirmNonMemberApplyPhone,
    submitNonMemberApplication: api.submitNonMemberApplication,
    cancelNonMemberApplication: api.cancelNonMemberApplication,
}));

vi.mock('../services/schools', () => ({
    getSchools: api.getSchools,
}));

const samplePreview: PublicEventPreview = {
    id: 42,
    eventCode: 'EV-20270001',
    title: '2027 KUSBF 대학 연합 스노보드 대회',
    description: '전국 대학 크루 연합 친선 대회입니다.',
    activityType: 'SNOWBOARD',
    planningMode: 'MANAGER_PLANNED',
    applicationStartsAt: null,
    startsAt: '2027-01-18T09:00:00',
    endsAt: '2027-01-18T18:00:00',
    locationName: '휘닉스 파크 슬로프',
    locationAddress: '강원 평창군',
    capacity: 120,
    capacityLimited: true,
    joinedCount: 64,
    hostCrewName: '연세대 스노보드부',
    coHostCrewName: '한양대 설원',
    visibilityType: 'PUBLIC',
    joinPolicy: 'INSTANT',
    status: 'OPEN',
    paymentRequired: true,
    participationFee: 35000,
    paymentCurrency: 'KRW',
    paymentDeadlineAt: '2027-01-15T23:59:00',
    allowNonMemberApplications: true,
    registrationState: 'OPEN',
    consentItems: [
        {
            id: 501,
            category: 'RISK_ACKNOWLEDGEMENT',
            title: '안전 수칙 동의',
            content: '헬멧 착용 등 안전 수칙을 준수합니다.',
            contentHash: 'hash-501',
            responseType: 'CHECKBOX',
            required: true,
            displayOrder: 0,
            documentVersion: 1,
        },
        {
            id: 502,
            category: 'OTHER',
            title: '출전 종목 (선택)',
            content: '예: 알파인 / 프리스타일',
            contentHash: 'hash-502',
            responseType: 'TEXT',
            required: false,
            displayOrder: 1,
            documentVersion: 1,
        },
    ],
};

const sampleReceipt: NonMemberReceipt = {
    receiptCode: 'EG-00000123',
    eventCode: 'EV-20270001',
    eventTitle: samplePreview.title,
    startsAt: samplePreview.startsAt,
    endsAt: samplePreview.endsAt,
    locationName: samplePreview.locationName,
    hostCrewName: samplePreview.hostCrewName,
    coHostCrewName: samplePreview.coHostCrewName,
    name: '김외부',
    schoolName: '고려대학교',
    crewName: '고려대 스노우폭스',
    maskedPhone: '010-****-5678',
    status: 'JOINED',
    paymentRequired: true,
    paymentStatus: 'UNPAID',
    paymentInfo: null,
    chatAccess: {
        chatUrl: 'https://open.kakao.com/o/kusbf2027',
        chatPasscode: '2027',
        chatInstructions: '입장 후 학교/이름으로 닉네임 변경해 주세요.',
    },
    consentAnswers: [
        { consentItemId: 501, title: '안전 수칙 동의', agreed: true, responseText: null },
        { consentItemId: 502, title: '출전 종목 (선택)', agreed: null, responseText: '프리스타일' },
    ],
    appliedAt: '2026-12-01T10:00:00',
    canCancel: true,
    eventCancelled: false,
    alreadyConverted: false,
    conversionToken: 'nmconv-token-abc',
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.clear();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    api.getSchools.mockResolvedValue([]);
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

it('completes non-member SMS OTP application and triggers Student Account conversion', async () => {
    api.previewPublicEvent.mockResolvedValue(samplePreview);
    api.startNonMemberApplyPhone.mockResolvedValue({
        challengeId: 'ch-1',
        expiresInSeconds: 300,
        retryAfterSeconds: 60,
    });
    api.confirmNonMemberApplyPhone.mockResolvedValue({
        proofToken: 'proof-1',
        expiresInSeconds: 1800,
        existingAccountDetected: false,
    });
    api.submitNonMemberApplication.mockResolvedValue(sampleReceipt);

    const onConvert = vi.fn();
    await act(async () => root.render(
        <PublicEventApply
            eventCode="EV-20270001"
            onLoginClick={vi.fn()}
            onLookupClick={vi.fn()}
            onConvertToStudent={onConvert}
        />,
    ));

    // Landing preview shows host × co-host crew
    expect(container.textContent).toContain('2027 KUSBF 대학 연합 스노보드 대회');
    expect(container.textContent).toContain('연세대 스노보드부 × 한양대 설원');

    // Click non-member start CTA
    const startBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('비회원으로 신청하기'))!;
    await act(async () => startBtn.click());

    // Step 1: Enter phone and request OTP
    const phoneInput = container.querySelector<HTMLInputElement>('input[type="tel"]')!;
    await act(async () => setInputValue(phoneInput, '01012345678'));
    const sendBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('인증번호'))!;
    await act(async () => sendBtn.click());
    expect(api.startNonMemberApplyPhone).toHaveBeenCalledWith('EV-20270001', '010-1234-5678');

    // Confirm OTP
    const otpInput = container.querySelector<HTMLInputElement>('input[inputmode="numeric"]')!;
    await act(async () => setInputValue(otpInput, '123456'));
    const confirmBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('인증번호 확인'))!;
    await act(async () => confirmBtn.click());
    expect(api.confirmNonMemberApplyPhone).toHaveBeenCalledWith('EV-20270001', 'ch-1', '123456');

    // Step 2: Fill school, external crew, real name, consent items & privacy checkbox
    const schoolInput = container.querySelector<HTMLInputElement>('input[placeholder="예: 고려대학교"]')!;
    const crewInput = container.querySelector<HTMLInputElement>('input[placeholder="예: 고려대 스노우폭스"]')!;
    const nameInput = container.querySelector<HTMLInputElement>('input[placeholder="참가자 실명을 입력해 주세요"]')!;
    await act(async () => {
        setInputValue(schoolInput, '고려대학교');
        setInputValue(crewInput, '고려대 스노우폭스');
        setInputValue(nameInput, '김외부');
    });

    // Check all required checkboxes (safety pledge + privacy consent)
    const checkboxes = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
    for (const cb of checkboxes) {
        await act(async () => cb.click());
    }

    const submitBtn = Array.from(container.querySelectorAll<HTMLButtonElement>('button[type="submit"]')).find(b => b.textContent?.includes('참가 신청 완료하기'))!;
    await act(async () => submitBtn.click());

    expect(api.submitNonMemberApplication).toHaveBeenCalledWith('EV-20270001', expect.objectContaining({
        proofToken: 'proof-1',
        phoneNumber: '010-1234-5678',
        name: '김외부',
        schoolName: '고려대학교',
        crewName: '고려대 스노우폭스',
        privacyAccepted: true,
    }));

    // Step 3: Receipt & conversion CTA
    expect(container.textContent).toContain('EG-00000123');
    expect(container.querySelector('a[href="https://open.kakao.com/o/kusbf2027"]')).not.toBeNull();

    const convertBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('SNS로 학생 계정 만들기'))!;
    await act(async () => convertBtn.click());
    expect(onConvert).toHaveBeenCalledWith('nmconv-token-abc', '고려대 스노우폭스');
});
