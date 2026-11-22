// @vitest-environment jsdom
import QRCode from 'qrcode';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVideoQrDecoder, isVideoFrameReady } from './qrCodeScanner';

function renderQrToImageData(payload: string, scale = 4, quietZone = 4): ImageData {
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

function makeVideoElement(props: { readyState: number; videoWidth: number; videoHeight: number }): HTMLVideoElement {
    const video = document.createElement('video');
    Object.defineProperty(video, 'readyState', { value: props.readyState, configurable: true });
    Object.defineProperty(video, 'videoWidth', { value: props.videoWidth, configurable: true });
    Object.defineProperty(video, 'videoHeight', { value: props.videoHeight, configurable: true });
    return video;
}

describe('qrCodeScanner', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        delete (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector;
    });

    it('reports video frame readiness only when data and dimensions are available', () => {
        expect(isVideoFrameReady(makeVideoElement({ readyState: 1, videoWidth: 640, videoHeight: 480 }))).toBe(false);
        expect(isVideoFrameReady(makeVideoElement({ readyState: 2, videoWidth: 0, videoHeight: 480 }))).toBe(false);
        expect(isVideoFrameReady(makeVideoElement({ readyState: 2, videoWidth: 640, videoHeight: 0 }))).toBe(false);
        expect(isVideoFrameReady(makeVideoElement({ readyState: 2, videoWidth: 640, videoHeight: 480 }))).toBe(true);
    });

    it('uses native BarcodeDetector when qr_code format is supported', async () => {
        const detect = vi.fn().mockResolvedValue([{ rawValue: 'BB:EVENT:34' }]);
        const getSupportedFormats = vi.fn().mockResolvedValue(['qr_code', 'ean_13']);
        class MockBarcodeDetector {
            static getSupportedFormats = getSupportedFormats;
            detect = detect;
        }
        (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector = MockBarcodeDetector;

        const decoder = await createVideoQrDecoder();
        const video = makeVideoElement({ readyState: 2, videoWidth: 640, videoHeight: 480 });
        await expect(decoder(video)).resolves.toBe('BB:EVENT:34');
        expect(getSupportedFormats).toHaveBeenCalledOnce();
        expect(detect).toHaveBeenCalledExactlyOnceWith(video);
    });

    it('falls back to canvas + jsQR when BarcodeDetector is unavailable or lacks qr_code support', async () => {
        class UnsupportedBarcodeDetector {
            static getSupportedFormats = vi.fn().mockResolvedValue(['ean_13']);
            detect = vi.fn();
        }
        (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector = UnsupportedBarcodeDetector;

        const qrImage = renderQrToImageData('BB:EVENT:34');
        const drawImage = vi.fn();
        const getImageData = vi.fn().mockReturnValue(qrImage);
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
            drawImage,
            getImageData,
        } as unknown as CanvasRenderingContext2D);

        const decoder = await createVideoQrDecoder();
        const video = makeVideoElement({ readyState: 4, videoWidth: 1920, videoHeight: 1080 });
        await expect(decoder(video)).resolves.toBe('BB:EVENT:34');
        // Large 1920x1080 frames are scaled down to max 720px on the longest side.
        expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 720, 405);
        expect(getImageData).toHaveBeenCalledWith(0, 0, 720, 405);
    });

    it('throws QR_SCANNER_UNSUPPORTED when neither BarcodeDetector nor 2D canvas is available', async () => {
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
        await expect(createVideoQrDecoder()).rejects.toThrow('QR_SCANNER_UNSUPPORTED');
    });
});
