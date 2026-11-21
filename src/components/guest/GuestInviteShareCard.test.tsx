// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const qrcodeMock = vi.hoisted(() => ({
    toDataURL: vi.fn(async () => 'data:image/png;base64,synthetic-guest-qr'),
}));
vi.mock('qrcode', () => qrcodeMock);

import { GuestInviteShareCard } from './GuestInviteShareCard';

describe('GuestInviteShareCard', () => {
    let root: Root;
    let container: HTMLDivElement;

    beforeEach(() => {
        vi.resetAllMocks();
        qrcodeMock.toDataURL.mockResolvedValue('data:image/png;base64,synthetic-guest-qr');
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        window.history.replaceState(null, '', '/');
        container = document.createElement('div');
        document.body.append(container);
        root = createRoot(container);
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('copies the guest invitation link and announces status outside the button without disabling it', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText },
        });

        await act(async () => {
            root.render(
                <GuestInviteShareCard
                    destination={{ type: 'SEASON', id: 12 }}
                    title="시즌방 게스트 초대 링크"
                    description="링크를 보내면 게스트 예약 화면으로 바로 이동해요."
                />
            );
        });

        const input = container.querySelector('input')!;
        expect(input.value).toBe(`${window.location.origin}/?view=guest_access&type=SEASON&id=12`);
        expect(container.textContent).toContain('BB:SEASON:12');

        const copyButton = Array.from(container.querySelectorAll('button')).find(button =>
            button.textContent?.includes('초대 링크 복사')
        )!;
        await act(async () => {
            copyButton.click();
        });

        expect(writeText).toHaveBeenCalledExactlyOnceWith(`${window.location.origin}/?view=guest_access&type=SEASON&id=12`);
        expect(copyButton.disabled).toBe(false);
        const status = container.querySelector('[role="status"]')!;
        expect(copyButton.contains(status)).toBe(false);
        expect(status.textContent).toContain('초대 링크를 복사했어요.');
    });

    it('announces failure cleanly when clipboard access fails and generates a QR code on demand', async () => {
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
        });

        await act(async () => {
            root.render(
                <GuestInviteShareCard
                    destination={{ type: 'EVENT', id: 34 }}
                    title="이벤트 게스트 초대 링크"
                    description="이벤트 게스트 초대 링크입니다."
                />
            );
        });

        const copyButton = Array.from(container.querySelectorAll('button')).find(button =>
            button.textContent?.includes('초대 링크 복사')
        )!;
        await act(async () => {
            copyButton.click();
        });
        expect(container.querySelector('[role="status"]')!.textContent).toContain('복사에 실패했어요.');

        const qrButton = Array.from(container.querySelectorAll('button')).find(button =>
            button.textContent?.includes('QR 보기')
        )!;
        await act(async () => {
            qrButton.click();
        });

        expect(qrcodeMock.toDataURL).toHaveBeenCalledWith(
            `${window.location.origin}/?view=guest_access&type=EVENT&id=34`,
            expect.objectContaining({ errorCorrectionLevel: 'M' }),
        );
        expect(container.querySelector('img')!.getAttribute('src')).toBe('data:image/png;base64,synthetic-guest-qr');
    });
});
