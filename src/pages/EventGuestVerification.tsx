import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import { EventGuestApplicationForm, type GuestApplicationDraft } from '../components/event/EventGuestApplicationForm';
import { EventGuestApplicationReceipt } from '../components/event/EventGuestApplicationReceipt';
import { getApiErrorStatus } from '../lib/apiError';
import { formatEventDateTime } from '../lib/eventDateTime';
import { isEventGuestReceiptCode, readEventGuestReceipt, readEventGuestToken } from '../lib/eventGuestLink';
import {
    cancelEventGuestApplication, confirmEventGuestVerification, createEventGuestApplication,
    lookupEventGuestApplication, previewEventGuestLink, startEventGuestVerification,
    type EventGuestApplication, type EventGuestPreview, type EventGuestScope,
} from '../services/eventGuestVerification';

type Challenge = { id: string; expiresAt: number; retryAt: number };

function verificationError(error: unknown, step: 'send' | 'confirm', lookup: boolean): string {
    switch (getApiErrorStatus(error)) {
        case 404: return lookup
            ? '신청번호와 등록한 휴대전화가 일치하는지 확인해 주세요.'
            : '링크가 만료됐거나 폐기되었어요. 운영진에게 새 링크를 요청해 주세요.';
        case 429: return '인증번호 요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
        case 503: return '문자를 보내지 못했어요. 잠시 후 다시 시도해 주세요.';
        default: return step === 'send'
            ? '인증번호를 받지 못했어요. 입력 정보와 행사 접수 상태를 확인해 주세요.'
            : '인증번호를 확인해 주세요. 만료됐거나 입력 횟수를 초과했다면 새 인증번호를 받아 주세요.';
    }
}

export default function EventGuestVerification() {
    const [hash, setHash] = useState(() => window.location.hash);
    useEffect(() => {
        const restoreLink = () => setHash(window.location.hash);
        window.addEventListener('hashchange', restoreLink);
        return () => window.removeEventListener('hashchange', restoreLink);
    }, []);
    const token = readEventGuestToken(hash);
    const receipt = readEventGuestReceipt(hash);
    return <VerificationForm key={`${token}:${receipt}`} token={token} initialReceipt={receipt} />;
}

function VerificationForm({ token, initialReceipt }: { token: string; initialReceipt: string }) {
    const [lookup, setLookup] = useState(Boolean(initialReceipt) || !token);
    const [receiptCode, setReceiptCode] = useState(initialReceipt);
    const [preview, setPreview] = useState<EventGuestPreview | null>(null);
    const [linkError, setLinkError] = useState('');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const [pending, setPending] = useState(false);
    const [proofToken, setProofToken] = useState('');
    const [application, setApplication] = useState<EventGuestApplication | null>(null);
    const [draft, setDraft] = useState<GuestApplicationDraft>({ school: '', crew: '', name: '', answer: '', privacyAccepted: false });
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) return;
        let active = true;
        previewEventGuestLink(token)
            .then(value => { if (active) setPreview(value); })
            .catch(error => {
                if (!active) return;
                setLinkError(getApiErrorStatus(error) === 404
                    ? '신청 링크가 만료됐거나 폐기되었어요. 운영진에게 새 링크를 요청해 주세요.'
                    : '이벤트 정보를 불러오지 못했어요. 잠시 후 다시 열어 주세요.');
            });
        return () => { active = false; };
    }, [token]);

    useEffect(() => {
        if (!challenge || proofToken) return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [challenge, proofToken]);

    const normalizedReceipt = receiptCode.trim().toUpperCase();
    const scope: EventGuestScope = lookup ? { receiptCode: normalizedReceipt } : { linkToken: token };

    function resetVerification() {
        setChallenge(null);
        setProofToken('');
        setCode('');
        setError('');
    }

    function toggleLookup() {
        resetVerification();
        setLookup(current => !current);
    }

    async function sendCode() {
        if (pending || (challenge && Date.now() < challenge.retryAt) || (lookup && !isEventGuestReceiptCode(normalizedReceipt))) return;
        setPending(true);
        setError('');
        try {
            const response = await startEventGuestVerification(scope, phone);
            const sentAt = Date.now();
            setNow(sentAt);
            setChallenge({ id: response.challengeId, expiresAt: sentAt + response.expiresInSeconds * 1000,
                retryAt: sentAt + response.retryAfterSeconds * 1000 });
            setCode('');
        } catch (error) {
            setError(verificationError(error, 'send', lookup));
        } finally {
            setPending(false);
        }
    }

    function handleApplicationError(error: unknown, fallback: string) {
        if (getApiErrorStatus(error) === 403) {
            resetVerification();
            setError('휴대전화 인증이 만료됐어요. 다시 인증해 주세요.');
        } else if (getApiErrorStatus(error) === 404) {
            setError('사용할 수 없는 신청 링크예요. 신청번호가 있다면 신청 조회에서 확인해 주세요.');
        } else {
            setError(fallback);
        }
    }

    async function loadReceipt(proof: string) {
        try {
            setApplication(await lookupEventGuestApplication({ receiptCode: normalizedReceipt, proofToken: proof }));
            setPhone('');
        } catch (error) {
            handleApplicationError(error, '신청 내역을 불러오지 못했어요. 다시 시도해 주세요.');
        }
    }

    async function submitVerification(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!challenge) {
            await sendCode();
            return;
        }
        if (pending || Date.now() >= challenge.expiresAt || !/^\d{6}$/.test(code)) return;
        setPending(true);
        setError('');
        try {
            const result = await confirmEventGuestVerification(scope, challenge.id, code);
            setProofToken(result.proofToken);
            setCode('');
            if (lookup) await loadReceipt(result.proofToken);
        } catch (error) {
            setError(verificationError(error, 'confirm', lookup));
        } finally {
            setPending(false);
        }
    }

    async function submitApplication(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (pending || !proofToken || !draft.privacyAccepted) return;
        setPending(true);
        setError('');
        try {
            setApplication(await createEventGuestApplication({ linkToken: token, proofToken, phoneNumber: phone,
                name: draft.name.trim(), school: draft.school.trim(), crew: draft.crew.trim(),
                answer: draft.answer.trim() || undefined, privacyVersion: 1 }));
            setPhone('');
            setDraft({ school: '', crew: '', name: '', answer: '', privacyAccepted: false });
        } catch (error) {
            handleApplicationError(error, getApiErrorStatus(error) === 409
                ? '정원이 찼거나 같은 번호로 회원 신청이 있어요. 기존 신청은 로그인 후 확인해 주세요.'
                : '신청을 저장하지 못했어요. 행사 접수 상태와 입력 내용을 확인해 주세요.');
        } finally {
            setPending(false);
        }
    }

    async function cancelApplication() {
        if (pending || !application?.canCancel || !window.confirm('이 신청을 취소할까요?')) return;
        setPending(true);
        setError('');
        try {
            setApplication(await cancelEventGuestApplication({ receiptCode: application.receiptCode, proofToken,
                ...(!lookup ? { linkToken: token } : {}) }));
        } catch (error) {
            if (getApiErrorStatus(error) === 403 || getApiErrorStatus(error) === 404) {
                resetVerification();
                setReceiptCode(application.receiptCode);
                setApplication(null);
                setLookup(true);
            }
            handleApplicationError(error, '신청을 취소하지 못했어요. 행사 시작 시간과 신청 상태를 확인해 주세요.');
        } finally {
            setPending(false);
        }
    }

    const secondsLeft = challenge ? Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000)) : 0;
    const resendWait = challenge ? Math.max(0, Math.ceil((challenge.retryAt - now) / 1000)) : 0;
    const mayVerify = lookup || preview?.registration === 'OPEN';

    return (
        <main className="min-h-0 flex-1 overflow-y-auto bg-[#FAF8F3] px-4 py-8 sm:px-6 sm:py-12">
            <section className="mx-auto max-w-xl space-y-5 rounded-3xl border border-zinc-100 bg-white p-6 text-zinc-900 shadow-sm sm:p-8">
                <p className="text-sm font-bold text-[#162660]">BoardBuddy · 비회원 이벤트</p>
                <h1 className="break-words text-2xl font-black sm:text-3xl">
                    {application?.eventTitle ?? (lookup ? '비회원 신청 조회' : preview?.title ?? '비회원 이벤트 신청')}
                </h1>
                {!lookup && !application && (
                    <>
                        {linkError && <p role="alert" className="text-sm text-rose-700">{linkError}</p>}
                        {!linkError && !preview && <p role="status" className="text-sm text-zinc-600">이벤트 정보를 불러오는 중이에요.</p>}
                        {preview && (
                            <div className="space-y-1 text-sm text-zinc-600">
                                <p>{formatEventDateTime(preview.startsAt)}</p>
                                {preview.locationName && <p className="break-words">{preview.locationName}</p>}
                                {preview.registration === 'UPCOMING' && <p>{preview.applicationStartsAt
                                    ? `${formatEventDateTime(preview.applicationStartsAt)}부터 신청할 수 있어요.` : '이벤트가 열리면 신청할 수 있어요.'}</p>}
                                {preview.registration === 'CLOSED' && <p>현재 비회원 신청을 받을 수 없어요.</p>}
                            </div>
                        )}
                    </>
                )}
                {mayVerify && !proofToken && !application && (
                    <form className="space-y-4" onSubmit={submitVerification}>
                        {lookup && (
                            <label className="block space-y-1 text-sm font-bold">
                                신청번호
                                <input value={receiptCode} maxLength={11} required disabled={Boolean(challenge) || pending}
                                    onChange={event => setReceiptCode(event.target.value.toUpperCase())}
                                    placeholder="EG-00000000" autoCapitalize="characters"
                                    className="block w-full rounded-xl border border-zinc-200 p-3 text-base font-normal" />
                            </label>
                        )}
                        <label className="block space-y-1 text-sm font-bold">
                            휴대전화 번호
                            <input type="tel" autoComplete="tel" value={phone} maxLength={32} required
                                disabled={Boolean(challenge) || pending} onChange={event => setPhone(event.target.value)}
                                placeholder="010-1234-5678" className="block w-full rounded-xl border border-zinc-200 p-3 text-base font-normal" />
                        </label>
                        {challenge && (
                            <div className="space-y-2">
                                <label className="block space-y-1 text-sm font-bold">
                                    인증번호 6자리
                                    <input inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                                        value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))}
                                        disabled={pending || secondsLeft === 0} className="block w-full rounded-xl border border-zinc-200 p-3 text-base font-normal" />
                                </label>
                                <p className="text-sm text-zinc-600">{secondsLeft ? `남은 시간 ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}` : '인증번호가 만료됐어요.'}</p>
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" type="button" disabled={pending || resendWait > 0} onClick={() => void sendCode()}>
                                        인증번호 다시 받기{resendWait > 0 ? ` (${resendWait}초)` : ''}
                                    </Button>
                                    <Button variant="ghost" type="button" disabled={pending} onClick={resetVerification}>입력 정보 변경</Button>
                                </div>
                            </div>
                        )}
                        <Button type="submit" className="w-full" disabled={pending || (challenge
                            ? secondsLeft === 0 || code.length !== 6 : !phone.trim() || (lookup && !isEventGuestReceiptCode(normalizedReceipt)))}>
                            {pending ? '처리 중…' : challenge ? '인증번호 확인' : '인증번호 받기'}
                        </Button>
                    </form>
                )}
                {proofToken && !application && !lookup && (
                    <>
                        <p role="status" className="text-sm font-bold text-emerald-700">휴대전화 인증이 완료됐어요.</p>
                        <EventGuestApplicationForm draft={draft} onChange={setDraft} pending={pending}
                            question={preview?.optionalQuestion ?? null} onSubmit={submitApplication} />
                    </>
                )}
                {proofToken && !application && lookup && (
                    <Button disabled={pending} onClick={async () => {
                        setPending(true); setError('');
                        try { await loadReceipt(proofToken); } finally { setPending(false); }
                    }}>신청 내역 불러오기</Button>
                )}
                {application && <EventGuestApplicationReceipt application={application} pending={pending} onCancel={() => void cancelApplication()} />}
                {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
                {token && !application && (
                    <Button type="button" variant="ghost" disabled={pending} onClick={toggleLookup}>
                        {lookup ? '새로 신청하기' : '이미 신청했어요'}
                    </Button>
                )}
            </section>
        </main>
    );
}
