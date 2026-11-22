// @vitest-environment jsdom
import QRCode from 'qrcode';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const guestInvitationApi = vi.hoisted(() => ({
    createGuestInvitation: vi.fn(),
    listMyGuestInvitations: vi.fn(),
    revokeGuestInvitation: vi.fn(),
    redeemGuestInvitation: vi.fn(),
}));
vi.mock('../services/guestInvitation', () => guestInvitationApi);

import GuestAccess from './GuestAccess';

function renderQrImageData(payload: string, scale = 4, quietZone = 4): ImageData {
    const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' });
    const modules = qr.modules;
    const size = (modules.size + quietZone * 2) * scale;
    const data = new Uint8ClampedArray(size * size * 4);
    data.fill(255);
    for (let row = 0; row < modules.size; row += 1) {
        for (let col = 0; col < modules.size; col += 1) {
            if (!modules.get(row, col)) continue;
            for (let dy = 0; dy < scale; dy += 1) {
                for (let dx = 0; dx < scale; dx += 1) {
                    const x = (col + quietZone) * scale + dx;
                    const y = (row + quietZone) * scale + dy;
                    const offset = (y * size + x) * 4;
                    data[offset] = 0;
                    data[offset + 1] = 0;
                    data[offset + 2] = 0;
                    data[offset + 3] = 255;
                }
            }
        }
    }
    return { data, width: size, height: size, colorSpace: 'srgb' } as ImageData;
}

async function flushMicrotasks(turns = 6): Promise<void> {
    for (let index = 0; index < turns; index += 1) {
        await Promise.resolve();
    }
}

describe('guest-code entry with crew season availability disabled', () => {
    let root: Root; let container: HTMLDivElement;
    const season = vi.fn(); const event = vi.fn();
    beforeEach(async () => {
        vi.clearAllMocks();
        guestInvitationApi.listMyGuestInvitations.mockResolvedValue([]);
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        container = document.createElement('div'); document.body.append(container); root = createRoot(container);
        // Closed/off-season crews must not admit season guest codes.
        await act(async () => root.render(<GuestAccess onBack={vi.fn()} onSeasonHouseAccess={season} onEventAccess={event} seasonAvailable={false} offSeasonAvailable seasonBookingCrewId={null} />));
    });
    afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
    it.each(['BB:SEASON:1', 'https://example.test/?type=SEASON&id=1', 'BB:EVENT:0', 'BB:EVENT:99999999999999999999'])('blocks season/invalid code %s', async code => {
        const input = container.querySelector('input')!;
        await act(async () => {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, code);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
        expect(season).not.toHaveBeenCalled(); expect(event).not.toHaveBeenCalled();
    });

    it.each(['BB:EVENT:34', 'https://stg.boardbuddy.kr/?type=EVENT&id=34'])('only opens the event application for %s', async code => {
        const input = container.querySelector('input')!;
        await act(async () => {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, code);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
        expect(event).toHaveBeenCalledExactlyOnceWith(34);
        expect(season).not.toHaveBeenCalled();
    });

    it.each([null, 99, 12])('admits season guest entry only for the active crew member (%s)', async crewId => {
        await act(async () => root.render(<GuestAccess onBack={vi.fn()} onSeasonHouseAccess={season} onEventAccess={event} seasonAvailable offSeasonAvailable seasonBookingCrewId={crewId} />));
        const input = container.querySelector('input')!;
        await act(async () => {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'BB:SEASON:12');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
        if (crewId === 12) expect(season).toHaveBeenCalledExactlyOnceWith(12);
        else { expect(season).not.toHaveBeenCalled(); expect(container.textContent).toContain('크루 운영진이나 초대한 부원에게 요청'); }
        expect(event).not.toHaveBeenCalled();
    });

    it('blocks season guest codes when the crew disabled season house guests while keeping event guest access open', async () => {
        await act(async () => root.render(<GuestAccess onBack={vi.fn()} onSeasonHouseAccess={season} onEventAccess={event} seasonAvailable offSeasonAvailable seasonBookingCrewId={12} seasonGuestEnabled={false} />));
        const input = container.querySelector('input')!;
        await act(async () => {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'BB:SEASON:12');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
        expect(season).not.toHaveBeenCalled();
        expect(container.textContent).toContain('이 크루는 현재 시즌방 게스트 예약을 사용하지 않습니다.');

        await act(async () => {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'BB:EVENT:34');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
        expect(event).toHaveBeenCalledExactlyOnceWith(34);
    });

    it('auto-opens a guest invitation link once crew access resolves, with the same effect as scanning QR', async () => {
        window.history.replaceState(null, '', '/?view=guest_access&type=SEASON&id=12');
        const consumed = vi.fn();

        // While crew access is still loading, wait before evaluating the link.
        await act(async () => root.render(
            <GuestAccess
                onBack={vi.fn()}
                onSeasonHouseAccess={season}
                onEventAccess={event}
                seasonAvailable
                offSeasonAvailable
                seasonBookingCrewId={null}
                initialCode="BB:SEASON:12"
                accessResolved={false}
                onInitialCodeConsumed={consumed}
            />
        ));
        expect(season).not.toHaveBeenCalled();
        expect(consumed).not.toHaveBeenCalled();

        // Once crew access finishes loading for crew 12, opens season house guest booking and cleans URL params.
        await act(async () => root.render(
            <GuestAccess
                onBack={vi.fn()}
                onSeasonHouseAccess={season}
                onEventAccess={event}
                seasonAvailable
                offSeasonAvailable
                seasonBookingCrewId={12}
                initialCode="BB:SEASON:12"
                accessResolved
                onInitialCodeConsumed={consumed}
            />
        ));
        expect(season).toHaveBeenCalledExactlyOnceWith(12);
        expect(consumed).toHaveBeenCalledOnce();
        expect(window.location.search).toBe('?view=guest_access');
    });

    it('auto-opens an event guest invitation link and shows single-use season guest share card for active crew members', async () => {
        const consumed = vi.fn();
        await act(async () => root.render(
            <GuestAccess
                onBack={vi.fn()}
                onSeasonHouseAccess={season}
                onEventAccess={event}
                seasonAvailable
                offSeasonAvailable
                seasonBookingCrewId={12}
                initialCode="BB:EVENT:34"
                accessResolved
                onInitialCodeConsumed={consumed}
            />
        ));
        expect(event).toHaveBeenCalledExactlyOnceWith(34);
        expect(consumed).toHaveBeenCalledOnce();
        expect(container.textContent).toContain('내 크루 시즌방 게스트 초대 보내기');
        expect(container.textContent).toContain('1회용 초대 링크 만들기');
    });

    it('redeems a single-use guest invitation token link and shows an error if already used', async () => {
        const token = 'c'.repeat(43);
        guestInvitationApi.redeemGuestInvitation
            .mockResolvedValueOnce({ invitationId: 'inv-1', targetType: 'SEASON', crewId: 12, eventId: null })
            .mockRejectedValueOnce({ isAxiosError: true, response: { status: 400, data: { message: '이미 사용된 게스트 초대 링크입니다. 초대한 부원에게 새 링크를 요청해 주세요.' } } });
        window.history.replaceState(null, '', `/?view=guest_access#guestInvite=${token}`);
        const consumed = vi.fn();

        await act(async () => root.render(
            <GuestAccess
                onBack={vi.fn()}
                onSeasonHouseAccess={season}
                onEventAccess={event}
                seasonAvailable
                offSeasonAvailable
                seasonBookingCrewId={12}
                initialCode={`BB:GUEST:${token}`}
                accessResolved
                onInitialCodeConsumed={consumed}
            />
        ));
        expect(guestInvitationApi.redeemGuestInvitation).toHaveBeenCalledWith(token);
        expect(season).toHaveBeenCalledExactlyOnceWith(12);
        expect(window.location.hash).toBe('');

        // Re-submitting the same single-use token shows the server's already-used error.
        const confirmButton = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.trim() === '확인')!;
        await act(async () => {
            confirmButton.click();
        });
        expect(container.textContent).toContain('이미 사용된 게스트 초대 링크입니다.');
    });
});

describe('guest QR scanner', () => {
    let root: Root;
    let container: HTMLDivElement;
    const season = vi.fn();
    const event = vi.fn();
    const originalMediaDevices = navigator.mediaDevices;

    const findButton = (label: string) =>
        Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes(label));

    const stubMediaDevices = (getUserMedia: ReturnType<typeof vi.fn> | undefined) => {
        Object.defineProperty(navigator, 'mediaDevices', {
            configurable: true,
            value: getUserMedia ? { getUserMedia } : undefined,
        });
    };

    const createMockStream = () => {
        const stop = vi.fn();
        const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
        return { stream, stop };
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        guestInvitationApi.listMyGuestInvitations.mockResolvedValue([]);
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        container = document.createElement('div');
        document.body.append(container);
        root = createRoot(container);
        await act(async () => {
            root.render(
                <GuestAccess
                    onBack={vi.fn()}
                    onSeasonHouseAccess={season}
                    onEventAccess={event}
                    seasonAvailable
                    offSeasonAvailable
                    seasonBookingCrewId={12}
                />
            );
        });
    });

    afterEach(async () => {
        vi.useRealTimers();
        await act(async () => root.unmount());
        container.remove();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        Object.defineProperty(navigator, 'mediaDevices', {
            configurable: true,
            value: originalMediaDevices,
        });
        delete (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector;
    });

    it('mounts video, attaches stream, decodes QR with BarcodeDetector, and opens event destination', async () => {
        const { stream, stop } = createMockStream();
        const getUserMedia = vi.fn().mockResolvedValue(stream);
        stubMediaDevices(getUserMedia);

        let attachedStream: MediaProvider | null = null;
        const playSpy = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
            attachedStream = this.srcObject;
            Object.defineProperty(this, 'readyState', { value: 2, configurable: true });
            Object.defineProperty(this, 'videoWidth', { value: 640, configurable: true });
            Object.defineProperty(this, 'videoHeight', { value: 480, configurable: true });
            return Promise.resolve();
        });

        const detect = vi.fn().mockResolvedValue([{ rawValue: 'BB:EVENT:34' }]);
        class MockBarcodeDetector {
            static getSupportedFormats = vi.fn().mockResolvedValue(['qr_code']);
            detect = detect;
        }
        (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector = MockBarcodeDetector;

        await act(async () => {
            findButton('QR 코드 스캔')!.click();
            await flushMicrotasks();
        });

        expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' } });
        expect(playSpy).toHaveBeenCalledOnce();
        expect(attachedStream).toBe(stream);
        expect(detect).toHaveBeenCalledOnce();
        expect(event).toHaveBeenCalledExactlyOnceWith(34);
        expect(stop).toHaveBeenCalledOnce();
        expect(container.querySelector('video')).toBeNull();
        expect(container.querySelector('input')!.value).toBe('BB:EVENT:34');
    });

    it('scans QR codes via canvas + jsQR fallback when BarcodeDetector is unavailable', async () => {
        delete (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector;
        const { stream, stop } = createMockStream();
        stubMediaDevices(vi.fn().mockResolvedValue(stream));

        vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
            Object.defineProperty(this, 'readyState', { value: 4, configurable: true });
            Object.defineProperty(this, 'videoWidth', { value: 320, configurable: true });
            Object.defineProperty(this, 'videoHeight', { value: 320, configurable: true });
            return Promise.resolve();
        });

        const qrImage = renderQrImageData('BB:SEASON:12');
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
            drawImage: vi.fn(),
            getImageData: vi.fn().mockReturnValue(qrImage),
        } as unknown as CanvasRenderingContext2D);

        await act(async () => {
            findButton('QR 코드 스캔')!.click();
            await flushMicrotasks();
        });
        await act(async () => {
            await vi.waitFor(() => {
                expect(season).toHaveBeenCalledExactlyOnceWith(12);
            });
            await flushMicrotasks();
        });

        expect(event).not.toHaveBeenCalled();
        expect(stop).toHaveBeenCalledOnce();
        expect(container.querySelector('video')).toBeNull();
    });

    it('keeps polling across unready frames and transient detect failures until a QR code appears', async () => {
        vi.useFakeTimers();
        const { stream, stop } = createMockStream();
        stubMediaDevices(vi.fn().mockResolvedValue(stream));

        let mountedVideo: HTMLVideoElement | null = null;
        vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
            mountedVideo = this as HTMLVideoElement;
            Object.defineProperty(this, 'readyState', { value: 0, configurable: true });
            Object.defineProperty(this, 'videoWidth', { value: 0, configurable: true });
            Object.defineProperty(this, 'videoHeight', { value: 0, configurable: true });
            return Promise.resolve();
        });

        const detect = vi.fn()
            .mockRejectedValueOnce(new Error('frame not ready'))
            .mockResolvedValueOnce([{ rawValue: 'https://stg.boardbuddy.kr/?type=EVENT&id=55' }]);
        class MockBarcodeDetector {
            static getSupportedFormats = vi.fn().mockResolvedValue(['qr_code']);
            detect = detect;
        }
        (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector = MockBarcodeDetector;

        await act(async () => {
            findButton('QR 코드 스캔')!.click();
            await flushMicrotasks();
        });

        expect(mountedVideo).not.toBeNull();
        expect(detect).not.toHaveBeenCalled();

        Object.defineProperty(mountedVideo!, 'readyState', { value: 2, configurable: true });
        Object.defineProperty(mountedVideo!, 'videoWidth', { value: 640, configurable: true });
        Object.defineProperty(mountedVideo!, 'videoHeight', { value: 480, configurable: true });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(350);
            await flushMicrotasks();
        });
        expect(detect).toHaveBeenCalledTimes(1);
        expect(event).not.toHaveBeenCalled();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(350);
            await flushMicrotasks();
        });
        expect(detect).toHaveBeenCalledTimes(2);
        expect(event).toHaveBeenCalledExactlyOnceWith(55);
        expect(stop).toHaveBeenCalledOnce();
    });

    it('stops the camera and shows an error when an invalid QR code is scanned', async () => {
        const { stream, stop } = createMockStream();
        stubMediaDevices(vi.fn().mockResolvedValue(stream));
        vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
            Object.defineProperty(this, 'readyState', { value: 2, configurable: true });
            Object.defineProperty(this, 'videoWidth', { value: 640, configurable: true });
            Object.defineProperty(this, 'videoHeight', { value: 480, configurable: true });
            return Promise.resolve();
        });
        class MockBarcodeDetector {
            static getSupportedFormats = vi.fn().mockResolvedValue(['qr_code']);
            detect = vi.fn().mockResolvedValue([{ rawValue: 'https://boardbuddy.kr/#crewInvite=abc123' }]);
        }
        (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector = MockBarcodeDetector;

        await act(async () => {
            findButton('QR 코드 스캔')!.click();
            await flushMicrotasks();
        });

        expect(stop).toHaveBeenCalledOnce();
        expect(container.querySelector('video')).toBeNull();
        expect(findButton('QR 코드 스캔')).toBeTruthy();
        expect(container.textContent).toContain('초대 코드를 확인해 주세요.');
    });

    it('stops camera tracks when the user stops scanning or unmounts before getUserMedia resolves', async () => {
        vi.useFakeTimers();
        const first = createMockStream();
        stubMediaDevices(vi.fn().mockResolvedValue(first.stream));
        vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
        class MockBarcodeDetector {
            static getSupportedFormats = vi.fn().mockResolvedValue(['qr_code']);
            detect = vi.fn().mockResolvedValue([]);
        }
        (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector = MockBarcodeDetector;

        await act(async () => {
            findButton('QR 코드 스캔')!.click();
            await flushMicrotasks();
        });
        expect(container.querySelector('video')).not.toBeNull();

        await act(async () => {
            findButton('스캔 그만두기')!.click();
        });
        expect(first.stop).toHaveBeenCalledOnce();
        expect(container.querySelector('video')).toBeNull();

        // Unmounting while getUserMedia is still pending stops the late-resolving stream.
        const second = createMockStream();
        let resolvePendingStream!: (value: MediaStream) => void;
        stubMediaDevices(vi.fn().mockImplementation(() => new Promise<MediaStream>(resolve => {
            resolvePendingStream = resolve;
        })));

        await act(async () => {
            findButton('QR 코드 스캔')!.click();
            await flushMicrotasks();
        });
        await act(async () => {
            root.unmount();
        });
        await act(async () => {
            resolvePendingStream(second.stream);
            await flushMicrotasks();
        });
        expect(second.stop).toHaveBeenCalledOnce();
    });

    it('shows clear fallback errors when camera APIs are unavailable or permission is denied', async () => {
        stubMediaDevices(undefined);
        await act(async () => {
            findButton('QR 코드 스캔')!.click();
            await flushMicrotasks();
        });
        expect(container.textContent).toContain('이 기기에서는 카메라 스캔을 지원하지 않습니다.');

        stubMediaDevices(vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError')));
        await act(async () => {
            findButton('QR 코드 스캔')!.click();
            await flushMicrotasks();
        });
        expect(container.textContent).toContain('카메라를 열 수 없습니다.');
    });
});
