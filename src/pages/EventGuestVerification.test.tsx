// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import EventGuestVerification from './EventGuestVerification';

const api = vi.hoisted(() => ({
    previewEventGuestLink: vi.fn(),
    startEventGuestVerification: vi.fn(),
    confirmEventGuestVerification: vi.fn(),
    createEventGuestApplication: vi.fn(),
    lookupEventGuestApplication: vi.fn(),
    cancelEventGuestApplication: vi.fn(),
}));
vi.mock('../services/eventGuestVerification', () => api);

const linkToken = 'x'.repeat(43);
const receiptCode = 'EG-01234567';
const phoneNumber = '010-0000-0016';
const startsAt = '2035-08-19T10:00:00';
const receipt = {
    receiptCode, eventTitle: 'Joint guest event', startsAt, name: 'Guest Test', school: 'Example School',
    crew: 'Example Crew', maskedPhone: '010-****-0016', question: '선호 게임', answer: 'Co-op',
    status: 'PENDING', canCancel: true, eventCancelled: false,
};
const httpError = (status: number) => ({ isAxiosError: true, response: { status } });

let root: Root;
let container: HTMLDivElement;
const originalUrl = window.location.href;

beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    api.startEventGuestVerification.mockResolvedValue({ challengeId: 'challenge', expiresInSeconds: 300, retryAfterSeconds: 60 });
    api.confirmEventGuestVerification.mockResolvedValue({ proofToken: 'proof' });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    window.history.replaceState(null, '', originalUrl);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

const render = async (fragment: string) => {
    window.history.replaceState(null, '', `/#${fragment}`);
    await act(async () => root.render(<EventGuestVerification />));
};
const button = (name: string) =>
    [...container.querySelectorAll('button')].find(element => element.textContent === name)!;
const click = async (name: string) => {
    expect(button(name), name).toBeDefined();
    await act(async () => button(name).click());
};
const fill = async (label: string, value: string) => {
    const field = [...container.querySelectorAll('label')]
        .find(element => element.textContent?.includes(label))?.querySelector('input, textarea');
    expect(field, label).toBeDefined();
    const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    await act(async () => {
        Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(field, value);
        field!.dispatchEvent(new Event('input', { bubbles: true }));
    });
};

it('opens the application only after SMS verification and submits the recorded consent with trimmed answers', async () => {
    api.previewEventGuestLink.mockResolvedValue({
        title: receipt.eventTitle, startsAt, registration: 'OPEN', locationName: '테스트 장소', optionalQuestion: receipt.question,
    });
    api.confirmEventGuestVerification.mockRejectedValueOnce(httpError(400));
    api.createEventGuestApplication.mockResolvedValue(receipt);
    await render(`eventGuest=${linkToken}`);
    expect(container.textContent).toContain('테스트 장소');
    expect(button('인증번호 받기').disabled).toBe(true);
    await fill('휴대전화 번호', phoneNumber);
    await click('인증번호 받기');
    expect(api.startEventGuestVerification).toHaveBeenCalledWith({ linkToken }, phoneNumber);
    expect(button('인증번호 다시 받기 (60초)').disabled).toBe(true);
    await fill('인증번호 6자리', '123450');
    await click('인증번호 확인');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('인증번호를 확인해 주세요');
    await fill('인증번호 6자리', '123456');
    await click('인증번호 확인');
    expect(api.confirmEventGuestVerification).toHaveBeenLastCalledWith({ linkToken }, 'challenge', '123456');
    expect(button('참가 신청하기').disabled).toBe(true);
    await fill('소속 학교', ' Example School ');
    await fill('소속 크루', ' Example Crew ');
    await fill('이름', ' Guest Test ');
    await fill('선호 게임', ' Co-op ');
    await act(async () => container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    await click('참가 신청하기');
    expect(api.createEventGuestApplication).toHaveBeenCalledWith({
        linkToken, proofToken: 'proof', phoneNumber, name: 'Guest Test', school: 'Example School',
        crew: 'Example Crew', answer: 'Co-op', privacyVersion: 1,
    });
    expect(container.querySelector('input[readonly]')?.getAttribute('value')).toContain(`#eventGuestReceipt=${receiptCode}`);
});

it('uses the receipt scope for re-verification and asks for a fresh proof when cancellation is rejected', async () => {
    api.startEventGuestVerification.mockRejectedValueOnce(httpError(429));
    api.lookupEventGuestApplication.mockResolvedValue(receipt);
    api.cancelEventGuestApplication.mockRejectedValueOnce(httpError(403));
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    await render(`eventGuestReceipt=${receiptCode.toLowerCase()}`);
    await fill('휴대전화 번호', phoneNumber);
    await click('인증번호 받기');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('인증번호 요청이 너무 많아요');
    await click('인증번호 받기');
    await fill('인증번호 6자리', '123456');
    await click('인증번호 확인');
    expect(api.previewEventGuestLink).not.toHaveBeenCalled();
    expect(api.confirmEventGuestVerification).toHaveBeenCalledWith({ receiptCode }, 'challenge', '123456');
    expect(api.lookupEventGuestApplication).toHaveBeenCalledWith({ receiptCode, proofToken: 'proof' });
    await click('신청 취소');
    expect(api.cancelEventGuestApplication).not.toHaveBeenCalled();
    await click('신청 취소');
    expect(api.cancelEventGuestApplication).toHaveBeenCalledWith({ receiptCode, proofToken: 'proof' });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('휴대전화 인증이 만료됐어요');
    expect(container.querySelector('input[placeholder="EG-00000000"]')?.getAttribute('value')).toBe(receiptCode);
});
