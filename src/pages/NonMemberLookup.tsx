import { useEffect, useState, type FormEvent } from 'react';
import { ChevronLeft, ExternalLink, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '../components/Button';
import { participantStatusLabel } from '../constants/displayLabels';
import { getApiErrorMessage, getApiErrorStatus } from '../lib/apiError';
import { formatEventDateTime } from '../lib/eventDateTime';
import { saveNonMemberConversionIntent } from '../lib/nonMemberConversion';
import {
    cancelNonMemberApplication,
    confirmNonMemberLookupPhone,
    startNonMemberLookupPhone,
    type NonMemberReceipt,
} from '../services/nonMemberEvent';

interface NonMemberLookupProps {
    initialReceiptCode?: string;
    onBack: () => void;
    onConvertToStudent: (conversionToken: string, crewName: string) => void;
}

function formatKoreanPhoneInput(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function NonMemberLookup({
    initialReceiptCode = '',
    onBack,
    onConvertToStudent,
}: NonMemberLookupProps) {
    const [receiptCode, setReceiptCode] = useState(initialReceiptCode.toUpperCase());
    const [phone, setPhone] = useState('');
    const [challengeId, setChallengeId] = useState<string | null>(null);
    const [otpCode, setOtpCode] = useState('');
    const [expiresAt, setExpiresAt] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [proofToken, setProofToken] = useState('');
    const [receipt, setReceipt] = useState<NonMemberReceipt | null>(null);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!challengeId || receipt) return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [challengeId, receipt]);

    const secondsLeft = challengeId ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0;

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (pending) return;
        const code = receiptCode.trim().toUpperCase();
        if (!/^EG-[A-Z0-9]{8}$/.test(code)) {
            setError('신청번호 형식을 확인해 주세요. (예: EG-00000123)');
            return;
        }
        setPending(true);
        setError('');
        try {
            if (!challengeId) {
                const started = await startNonMemberLookupPhone(code, phone);
                const sentAt = Date.now();
                setNow(sentAt);
                setChallengeId(started.challengeId);
                setExpiresAt(sentAt + started.expiresInSeconds * 1000);
                setOtpCode('');
            } else {
                const result = await confirmNonMemberLookupPhone(code, challengeId, otpCode);
                setProofToken(result.proofToken);
                setReceipt(result.receipt);
            }
        } catch (err) {
            setError(
                getApiErrorStatus(err) === 404
                    ? '신청번호와 등록한 휴대전화가 일치하는 신청 내역을 찾을 수 없어요.'
                    : getApiErrorMessage(err) || '본인 확인을 완료하지 못했어요.',
            );
        } finally {
            setPending(false);
        }
    }

    async function handleCancel() {
        if (!receipt || !proofToken || pending) return;
        if (!window.confirm('이 참가 신청을 취소할까요?')) return;
        setPending(true);
        setError('');
        try {
            setReceipt(await cancelNonMemberApplication(receipt.receiptCode, proofToken));
        } catch (err) {
            setError(getApiErrorMessage(err) || '신청을 취소하지 못했어요.');
        } finally {
            setPending(false);
        }
    }

    return (
        <main className="min-h-0 flex-1 overflow-y-auto bg-[#FAF8F3]">
            <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-[#FAF8F3] sm:py-6">
                <article className="flex flex-1 flex-col overflow-hidden bg-[#FAF8F3] sm:rounded-3xl sm:border sm:border-zinc-200 sm:shadow-sm">
                    <header className="flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-3.5">
                        <button
                            type="button"
                            aria-label="뒤로 가기"
                            onClick={onBack}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <h1 className="text-base font-black text-zinc-900">비회원 신청 조회</h1>
                        <span className="w-9" />
                    </header>

                    <div className="flex-1 space-y-4 p-5">
                        {error && (
                            <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                                {error}
                            </p>
                        )}

                        {!receipt ? (
                            <>
                                <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
                                    <div>
                                        <h2 className="text-lg font-black text-zinc-900">내 신청 내역 확인</h2>
                                        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                                            신청번호와 신청할 때 인증한 휴대전화 번호로 본인 확인 후 상태를 확인할 수 있어요.
                                        </p>
                                    </div>

                                    <label className="block space-y-1.5 text-sm font-bold text-zinc-800">
                                        신청번호
                                        <input
                                            required
                                            maxLength={11}
                                            value={receiptCode}
                                            disabled={Boolean(challengeId) || pending}
                                            onChange={e => setReceiptCode(e.target.value.toUpperCase())}
                                            placeholder="EG-00000000"
                                            className="block w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 font-mono text-sm font-bold text-[#162660]"
                                        />
                                    </label>

                                    <label className="block space-y-1.5 text-sm font-bold text-zinc-800">
                                        휴대전화 번호
                                        <input
                                            type="tel"
                                            required
                                            value={phone}
                                            disabled={Boolean(challengeId) || pending}
                                            onChange={e => setPhone(formatKoreanPhoneInput(e.target.value))}
                                            placeholder="010-1234-5678"
                                            className="block w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm font-normal text-zinc-900"
                                        />
                                    </label>

                                    {challengeId && (
                                        <label className="block space-y-1.5 text-sm font-bold text-zinc-800">
                                            <div className="flex justify-between">
                                                <span>인증번호 6자리</span>
                                                <span className="text-xs font-extrabold text-rose-600">
                                                    {secondsLeft > 0 ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}` : '만료됨'}
                                                </span>
                                            </div>
                                            <input
                                                inputMode="numeric"
                                                maxLength={6}
                                                value={otpCode}
                                                onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                placeholder="6자리 숫자 입력"
                                                className="block w-full rounded-xl border border-zinc-200 px-4 py-3 text-center text-lg font-black tracking-[0.35em] text-[#162660]"
                                            />
                                        </label>
                                    )}

                                    <Button
                                        type="submit"
                                        className="min-h-12 w-full rounded-2xl bg-[#162660] text-sm font-black text-white"
                                        disabled={pending || (Boolean(challengeId) && (otpCode.length !== 6 || secondsLeft === 0))}
                                    >
                                        {pending ? '확인 중...' : challengeId ? '신청 내역 열기' : 'SMS 인증번호 받기'}
                                    </Button>
                                </form>

                                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-xs leading-relaxed text-zinc-700">
                                    <p className="flex items-center gap-1.5 font-extrabold text-[#162660]">
                                        <ShieldCheck className="h-4 w-4" /> 안전하게 보호돼요
                                    </p>
                                    <p className="mt-1">
                                        신청번호가 있더라도 등록된 번호로 재인증해야 내역과 채팅방 링크가 열립니다.
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <section className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
                                    <div className="text-center">
                                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-black ${
                                            receipt.status === 'JOINED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                        }`}>
                                            {participantStatusLabel[receipt.status]}
                                        </span>
                                        <h2 className="mt-2 text-lg font-black text-zinc-900">{receipt.eventTitle}</h2>
                                        <p className="mt-1 text-xs text-zinc-500">{formatEventDateTime(receipt.startsAt)}</p>
                                    </div>

                                    <dl className="mt-4 space-y-2 rounded-2xl bg-[#FAF8F3] p-4 text-xs">
                                        <div className="flex justify-between"><dt className="text-zinc-500">신청번호</dt><dd className="font-black text-[#162660]">{receipt.receiptCode}</dd></div>
                                        <div className="flex justify-between"><dt className="text-zinc-500">신청자</dt><dd className="font-bold text-zinc-900">{receipt.name}</dd></div>
                                        <div className="flex justify-between"><dt className="text-zinc-500">소속</dt><dd className="font-bold text-zinc-900">{receipt.schoolName} · {receipt.crewName}</dd></div>
                                        {receipt.locationName && <div className="flex justify-between"><dt className="text-zinc-500">장소</dt><dd className="font-bold text-zinc-900">{receipt.locationName}</dd></div>}
                                    </dl>

                                    {receipt.chatAccess?.chatUrl && (
                                        <a
                                            href={receipt.chatAccess.chatUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-3 flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 p-3.5 text-xs text-[#162660]"
                                        >
                                            <div>
                                                <p className="flex items-center gap-1.5 font-black"><MessageCircle className="h-4 w-4" /> 확정자 오픈채팅방 링크</p>
                                                {receipt.chatAccess.chatPasscode && <p className="mt-0.5 text-blue-700">입장 코드: <strong>{receipt.chatAccess.chatPasscode}</strong></p>}
                                            </div>
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    )}

                                    {!receipt.alreadyConverted && receipt.conversionToken && (
                                        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-3.5">
                                            <div className="text-xs">
                                                <p className="flex items-center gap-1 font-extrabold text-[#162660]"><Sparkles className="h-3.5 w-3.5" /> 학생 계정으로 연결하기</p>
                                                <p className="mt-0.5 text-zinc-600">매번 문자 인증 없이 내 이벤트에서 바로 확인해요.</p>
                                            </div>
                                            <Button
                                                type="button"
                                                size="small"
                                                onClick={() => {
                                                    saveNonMemberConversionIntent(receipt.conversionToken!, receipt.crewName);
                                                    onConvertToStudent(receipt.conversionToken!, receipt.crewName);
                                                }}
                                            >
                                                연결
                                            </Button>
                                        </div>
                                    )}

                                    {receipt.canCancel && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={pending}
                                            onClick={() => void handleCancel()}
                                            className="mt-3 w-full border-rose-200 text-rose-600 hover:bg-rose-50"
                                        >
                                            참가 신청 취소
                                        </Button>
                                    )}
                                </section>
                            </div>
                        )}
                    </div>
                </article>
            </div>
        </main>
    );
}
