import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Keyboard, ScanLine, Sparkles } from 'lucide-react';

interface GuestAccessProps {
    onBack: () => void;
    onSeasonHouseAccess: (crewId: number) => void;
    onEventAccess: (eventId: number) => void;
    seasonAvailable: boolean;
    offSeasonAvailable: boolean;
}

type GuestDestination = { type: 'SEASON'; id: number } | { type: 'EVENT'; id: number };

const parseGuestCode = (rawCode: string): GuestDestination | null => {
    const code = rawCode.trim();
    const match = code.match(/^(?:BB:)?(SEASON|EVENT)[:\-/](\d+)$/i);
    if (match) return { type: match[1].toUpperCase() as 'SEASON' | 'EVENT', id: Number(match[2]) };

    try {
        const url = new URL(code);
        const type = url.searchParams.get('type')?.toUpperCase();
        const id = Number(url.searchParams.get('id'));
        if ((type === 'SEASON' || type === 'EVENT') && Number.isInteger(id) && id > 0) return { type, id };
    } catch {
        // The code may be a short code rather than a URL.
    }
    return null;
};

export default function GuestAccess({ onBack, onSeasonHouseAccess, onEventAccess, seasonAvailable, offSeasonAvailable }: GuestAccessProps) {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [scanning, setScanning] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanTimerRef = useRef<number | null>(null);

    const stopScanner = () => {
        if (scanTimerRef.current) window.clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setScanning(false);
    };

    useEffect(() => () => {
        if (scanTimerRef.current) window.clearTimeout(scanTimerRef.current);
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    }, []);

    const openDestination = (rawCode: string) => {
        const destination = parseGuestCode(rawCode);
        if (!destination) {
            setError('초대 코드를 확인해 주세요. 예: BB:SEASON:12 또는 BB:EVENT:34');
            return;
        }
        stopScanner();
        if (destination.type === 'SEASON') {
            if (!seasonAvailable) {
                setError('현재는 오프시즌 운영 중이라 시즌방 게스트 예약을 이용할 수 없습니다.');
                return;
            }
            onSeasonHouseAccess(destination.id);
        } else {
            if (!offSeasonAvailable) {
                setError('현재는 시즌 운영 중이라 이벤트 게스트 신청을 이용할 수 없습니다.');
                return;
            }
            onEventAccess(destination.id);
        }
    };

    const startScanner = async () => {
        setError('');
        const Detector = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector;
        if (!Detector || !navigator.mediaDevices?.getUserMedia) {
            setError('이 기기에서는 카메라 스캔을 지원하지 않습니다. 아래에 초대 코드를 입력해 주세요.');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setScanning(true);
            const detector = new Detector({ formats: ['qr_code'] });
            const scan = async () => {
                if (!videoRef.current || !streamRef.current) return;
                const result = await detector.detect(videoRef.current);
                if (result[0]?.rawValue) {
                    setCode(result[0].rawValue);
                    openDestination(result[0].rawValue);
                    return;
                }
                scanTimerRef.current = window.setTimeout(scan, 350);
            };
            void scan();
        } catch {
            stopScanner();
            setError('카메라를 열 수 없습니다. 카메라 권한을 확인하거나 초대 코드를 입력해 주세요.');
        }
    };

    return (
        <div className="flex h-full flex-1 flex-col bg-[#FAF8F3] text-zinc-900">
            <header className="flex items-center px-4 pt-3">
                <button onClick={onBack} className="rounded-full p-2 text-zinc-500 hover:bg-white" aria-label="뒤로 가기"><ChevronLeft className="h-6 w-6" /></button>
                <h1 className="flex-1 pr-10 text-center text-base font-black">게스트 이용</h1>
            </header>
            <main className="flex-1 overflow-y-auto px-5 pb-8 pt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)] lg:content-start lg:gap-x-6">
                <div className="rounded-[2rem] bg-[#162660] p-6 text-white shadow-sm">
                    <span className="mb-4 flex h-12 w-12 -rotate-6 items-center justify-center rounded-2xl border border-white/20 bg-white/15"><Sparkles className="h-6 w-6 text-amber-200" /></span>
                    <h2 className="text-xl font-black">초대 코드를 스캔하세요</h2>
                    <p className="mt-2 text-sm leading-6 text-blue-100">
                        {seasonAvailable && offSeasonAvailable
                            ? '초대장 QR을 읽으면 시즌방 게스트 예약 또는 이벤트 게스트 신청으로 바로 안내합니다.'
                            : seasonAvailable
                                ? '초대장 QR을 읽으면 시즌방 게스트 예약으로 바로 안내합니다.'
                                : '초대장 QR을 읽으면 이벤트 게스트 신청으로 바로 안내합니다.'}
                    </p>
                </div>

                <section className="mt-5 rounded-3xl border border-zinc-100 bg-white p-4 shadow-sm lg:mt-0">
                    {scanning ? <video ref={videoRef} muted playsInline className="aspect-square w-full rounded-2xl bg-zinc-900 object-cover" /> : (
                        <button onClick={startScanner} className="flex aspect-square w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 text-[#162660] hover:bg-blue-100">
                            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm"><ScanLine className="h-7 w-7" /></span>
                            <span className="mt-3 text-sm font-black">QR 코드 스캔</span>
                            <span className="mt-1 text-xs text-zinc-500">카메라로 초대장을 비춰 주세요</span>
                        </button>
                    )}
                    {scanning && <button onClick={stopScanner} className="mt-3 w-full rounded-xl bg-zinc-100 py-3 text-sm font-bold text-zinc-700">스캔 그만두기</button>}
                </section>

                <div className="lg:col-start-2">
                    <div className="my-5 flex items-center gap-3 text-xs font-bold text-zinc-400"><span className="h-px flex-1 bg-zinc-200" />또는 코드 입력<span className="h-px flex-1 bg-zinc-200" /></div>
                    <label className="block text-sm font-black text-zinc-800">초대 코드</label>
                    <div className="mt-2 flex gap-2">
                        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 focus-within:border-[#162660]"><Keyboard className="h-4 w-4 text-zinc-400" /><input value={code} onChange={event => setCode(event.target.value)} onKeyDown={event => event.key === 'Enter' && openDestination(code)} placeholder={seasonAvailable ? 'BB:SEASON:12' : 'BB:EVENT:34'} className="min-w-0 flex-1 py-3 text-sm font-semibold outline-none" /></div>
                        <button onClick={() => openDestination(code)} className="rounded-2xl bg-[#162660] px-4 text-sm font-black text-white">확인</button>
                    </div>
                    {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-600">{error}</p>}
                    <p className="mt-3 text-xs leading-5 text-zinc-400">
                        {seasonAvailable && <span>시즌방: <strong>BB:SEASON:크루번호</strong></span>}
                        {seasonAvailable && offSeasonAvailable && <span> · </span>}
                        {offSeasonAvailable && <span>이벤트: <strong>BB:EVENT:이벤트번호</strong></span>}
                    </p>
                </div>
            </main>
        </div>
    );
}
