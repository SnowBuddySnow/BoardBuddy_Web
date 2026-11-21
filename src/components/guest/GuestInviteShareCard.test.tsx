// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
    createGuestInvitation: vi.fn(),
    listMyGuestInvitations: vi.fn(),
    revokeGuestInvitation: vi.fn(),
}));
const qrcodeMock = vi.hoisted(() => ({
    toDataURL: vi.fn(async () => 'data:image/png;base64,synthetic-guest-qr'),
}));

vi.mock('../../services/guestInvitation', () => api);
vi.mock('qrcode', () => qrcodeMock);

import { GuestInviteShareCard } from './GuestInviteShareCard';

const TOKEN_ONE = 'a'.repeat(43);
const TOKEN_TWO = 'b'.repeat(43);

describe('GuestInviteShareCard', () => {
    let root: Root;
    let container: HTMLDivElement;

    beforeEach(() => {
        vi.resetAllMocks();
        api.listMyGuestInvitations.mockResolvedValue([]);
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

    it('generates a single-use link, supports regenerating for additional guests, copies, and revokes', async () => {
        api.createGuestInvitation
            .mockResolvedValueOnce({
                token: TOKEN_ONE,
                invitation: {
                    id: 'inv-1',
                    targetType: 'SEASON',
                    crewId: 12,
                    eventId: null,
                    status: 'AVAILABLE',
                    expiresAt: '2026-11-24T12:00:00',
                    usedAt: null,
                    revokedAt: null,
                    createdAt: '2026-11-21T12:00:00',
                },
            })
            .mockResolvedValueOnce({
                token: TOKEN_TWO,
                invitation: {
                    id: 'inv-2',
                    targetType: 'SEASON',
                    crewId: 12,
                    eventId: null,
                    status: 'AVAILABLE',
                    expiresAt: '2026-11-24T12:05:00',
                    usedAt: null,
                    revokedAt: null,
                    createdAt: '2026-11-21T12:05:00',
                },
            });
        api.revokeGuestInvitation.mockResolvedValue(undefined);

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

        const buttonByText = (text: string) =>
            Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes(text))!;

        // Generate link #1
        await act(async () => {
            buttonByText('1회용 초대 링크 만들기').click();
        });
        expect(api.createGuestInvitation).toHaveBeenCalledWith({ type: 'SEASON', id: 12 });
        const input = container.querySelector('input')!;
        expect(input.value).toBe(`${window.location.origin}/?view=guest_access#guestInvite=${TOKEN_ONE}`);

        // Copy link #1 and verify accessible live region outside the button
        const copyButton = buttonByText('초대 링크 복사');
        await act(async () => {
            copyButton.click();
        });
        expect(writeText).toHaveBeenCalledExactlyOnceWith(`${window.location.origin}/?view=guest_access#guestInvite=${TOKEN_ONE}`);
        expect(copyButton.disabled).toBe(false);
        const status = container.querySelector('[role="status"]')!;
        expect(copyButton.contains(status)).toBe(false);
        expect(status.textContent).toContain('1회용 초대 링크를 복사했어요.');

        // Regenerate link #2 for a second guest
        await act(async () => {
            buttonByText('새 초대 링크 다시 만들기').click();
        });
        expect(api.createGuestInvitation).toHaveBeenCalledTimes(2);
        expect(container.querySelector('input')!.value).toBe(`${window.location.origin}/?view=guest_access#guestInvite=${TOKEN_TWO}`);
        expect(container.textContent).toContain('2개 사용 가능');

        // Revoke active link #2
        await act(async () => {
            buttonByText('회수').click();
        });
        expect(api.revokeGuestInvitation).toHaveBeenCalledExactlyOnceWith('inv-2');
        expect(container.querySelector('input')).toBeNull();
        expect(container.textContent).toContain('1개 사용 가능');
    });

    it('announces clipboard failure cleanly and generates a QR code for the single-use URL', async () => {
        api.createGuestInvitation.mockResolvedValueOnce({
            token: TOKEN_ONE,
            invitation: {
                id: 'inv-ev-1',
                targetType: 'EVENT',
                crewId: null,
                eventId: 34,
                status: 'AVAILABLE',
                expiresAt: '2026-11-24T12:00:00',
                usedAt: null,
                revokedAt: null,
                createdAt: '2026-11-21T12:00:00',
            },
        });
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

        const buttonByText = (text: string) =>
            Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes(text))!;

        await act(async () => {
            buttonByText('1회용 초대 링크 만들기').click();
        });
        await act(async () => {
            buttonByText('초대 링크 복사').click();
        });
        expect(container.querySelector('[role="status"]')!.textContent).toContain('복사에 실패했어요.');

        await act(async () => {
            buttonByText('QR 보기').click();
        });
        expect(qrcodeMock.toDataURL).toHaveBeenCalledWith(
            `${window.location.origin}/?view=guest_access#guestInvite=${TOKEN_ONE}`,
            expect.objectContaining({ errorCorrectionLevel: 'M' }),
        );
        expect(container.querySelector('img')!.getAttribute('src')).toBe('data:image/png;base64,synthetic-guest-qr');
    });
});
