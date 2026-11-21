type BarcodeDetectorResult = { rawValue?: string };

type BarcodeDetectorInstance = {
    detect: (source: HTMLVideoElement) => Promise<BarcodeDetectorResult[]>;
};

type BarcodeDetectorConstructor = {
    new (options?: { formats: string[] }): BarcodeDetectorInstance;
    getSupportedFormats?: () => Promise<string[]>;
};

export type VideoQrDecoder = (video: HTMLVideoElement) => Promise<string | null>;

const MAX_CANVAS_SCAN_DIMENSION = 720;
const VIDEO_HAVE_CURRENT_DATA = 2;

export function isVideoFrameReady(video: HTMLVideoElement): boolean {
    return video.readyState >= VIDEO_HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0;
}

async function createNativeQrDecoder(): Promise<VideoQrDecoder | null> {
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    if (!Detector) return null;

    try {
        if (typeof Detector.getSupportedFormats === 'function') {
            const supportedFormats = await Detector.getSupportedFormats();
            if (!supportedFormats.includes('qr_code')) return null;
        }

        const detector = new Detector({ formats: ['qr_code'] });
        return async (video: HTMLVideoElement) => {
            const results = await detector.detect(video);
            return results.find(result => Boolean(result.rawValue))?.rawValue ?? null;
        };
    } catch {
        return null;
    }
}

async function createCanvasQrDecoder(): Promise<VideoQrDecoder> {
    const { default: jsQR } = await import('jsqr');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
        throw new Error('QR_SCANNER_UNSUPPORTED');
    }

    return async (video: HTMLVideoElement) => {
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (width <= 0 || height <= 0) return null;

        const scale = Math.min(1, MAX_CANVAS_SCAN_DIMENSION / Math.max(width, height));
        const targetWidth = Math.max(1, Math.round(width * scale));
        const targetHeight = Math.max(1, Math.round(height * scale));

        if (canvas.width !== targetWidth) canvas.width = targetWidth;
        if (canvas.height !== targetHeight) canvas.height = targetHeight;

        context.drawImage(video, 0, 0, targetWidth, targetHeight);
        const imageData = context.getImageData(0, 0, targetWidth, targetHeight);
        const decoded = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
        return decoded?.data || null;
    };
}

export async function createVideoQrDecoder(): Promise<VideoQrDecoder> {
    const nativeDecoder = await createNativeQrDecoder();
    if (nativeDecoder) return nativeDecoder;
    return createCanvasQrDecoder();
}
