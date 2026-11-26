import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import { getApiErrorStatus } from '../lib/apiError';
import { formatEventDateTime } from '../lib/eventDateTime';
import { readEventGuestToken } from '../lib/eventGuestLink';
import {
    confirmEventGuestVerification, previewEventGuestLink, startEventGuestVerification, type EventGuestPreview,
} from '../services/eventGuestVerification';

type Challenge = { id: string; expiresAt: number; retryAt: number };

function verificationError(error: unknown, step: 'send' | 'confirm'): string {
    switch (getApiErrorStatus(error)) {
        case 404: return '링크가 만료됐거나 폐기되었어요. 이벤트 운영진에게 새 링크를 요청해 주세요.';
        case 429: return '인증번호 요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
        case 503: return '문자를 보내지 못했어요. 잠시 후 다시 시도해 주세요.';
        default: return step === 'send'
            ? '인증번호를 받지 못했어요. 휴대전화 번호와 이벤트 접수 상태를 확인해 주세요.'
            : '인증번호를 확인해 주세요. 만료됐거나 입력 횟수를 초과했다면 새 인증번호를 받아 주세요.';
    }
}

export default function EventGuestVerification() {
    const [token, setToken] = useState(() => readEventGuestToken(window.location.hash));
    useEffect(() => {
        const restoreLink = () => setToken(readEventGuestToken(window.location.hash));
        window.addEventListener('hashchange', restoreLink);
        return () => window.removeEventListener('hashchange', restoreLink);
    }, []);
    return <VerificationForm key={token} token={token} />;
}

function VerificationForm({ token }: { token: string }) {
    const [preview, setPreview] = useState<EventGuestPreview | null>(null);
    const [linkError, setLinkError] = useState(token ? '' : '비회원 인증 링크를 확인해 주세요.');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const [pending, setPending] = useState(false);
    const [verified, setVerified] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) return;
        let active = true;
        previewEventGuestLink(token)
            .then(value => { if (active) setPreview(value); })
            .catch(error => {
                if (!active) return;
                setLinkError(getApiErrorStatus(error) === 404
                    ? '링크가 만료됐거나 폐기되었어요. 이벤트 운영진에게 새 링크를 요청해 주세요.'
                    : '이벤트 정보를 불러오지 못했어요. 잠시 후 다시 열어 주세요.');
            });
        return () => { active = false; };
    }, [token]);

    useEffect(() => {
        if (!challenge || verified) return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [challenge, verified]);

    async function sendCode() {
        if (pending || (challenge && Date.now() < challenge.retryAt)) return;
        setPending(true);
        setError('');
        try {
            const response = await startEventGuestVerification(token, phone);
            const sentAt = Date.now();
            setNow(sentAt);
            setChallenge({ id: response.challengeId, expiresAt: sentAt + response.expiresInSeconds * 1000,
                retryAt: sentAt + response.retryAfterSeconds * 1000 });
            setCode('');
        } catch (error) {
            setError(verificationError(error, 'send'));
        } finally {
            setPending(false);
        }
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!challenge) {
            await sendCode();
            return;
        }
        if (pending || Date.now() >= challenge.expiresAt || !/^\d{6}$/.test(code)) return;
        setPending(true);
        setError('');
        try {
            await confirmEventGuestVerification(token, challenge.id, code);
            setVerified(true);
            setPhone('');
            setCode('');
        } catch (error) {
            setError(verificationError(error, 'confirm'));
        } finally {
            setPending(false);
        }
    }

    const secondsLeft = challenge ? Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000)) : 0;
    const resendWait = challenge ? Math.max(0, Math.ceil((challenge.retryAt - now) / 1000)) : 0;

    return (
        <main className="min-h-0 flex-1 overflow-y-auto bg-[#FAF8F3] px-4 py-8 sm:px-6 sm:py-12">
            <section className="mx-auto max-w-xl space-y-5 rounded-3xl border border-zinc-100 bg-white p-6 text-zinc-900 shadow-sm sm:p-8">
                <p className="text-sm font-bold text-[#162660]">BoardBuddy · 비회원 인증</p>
                <h1 className="break-words text-2xl font-black sm:text-3xl">{preview?.title ?? '이벤트 휴대전화 인증'}</h1>
                {linkError && <p role="alert" className="text-sm text-rose-700">{linkError}</p>}
                {!linkError && !preview && <p role="status" className="text-sm text-zinc-600">이벤트 정보를 불러오는 중이에요.</p>}
                {preview && (
                    <>
                        <div className="space-y-1 text-sm text-zinc-600">
                            <p>{formatEventDateTime(preview.startsAt)}</p>
                            {preview.locationName && <p className="break-words">{preview.locationName}</p>}
                        </div>
                        {preview.registration === 'UPCOMING' && (
                            <p className="text-sm text-zinc-700">
                                {preview.applicationStartsAt ? `${formatEventDateTime(preview.applicationStartsAt)}부터 인증할 수 있어요.` : '이벤트가 열리면 인증할 수 있어요.'}
                            </p>
                        )}
                        {preview.registration === 'CLOSED' && <p className="text-sm text-zinc-700">현재 비회원 인증을 받을 수 없어요.</p>}
                        {verified && (
                            <div role="status" className="space-y-2 rounded-2xl bg-emerald-50 p-4 text-emerald-900">
                                <h2 className="font-bold">휴대전화 인증이 완료됐어요</h2>
                                <p className="text-sm">이 링크는 인증 확인용입니다. 이벤트 참가 신청은 아직 접수되지 않았어요.</p>
                            </div>
                        )}
                        {preview.registration === 'OPEN' && !verified && (
                            <form className="space-y-4" onSubmit={submit}>
                                <p className="text-sm text-zinc-600">입력한 번호로 인증번호를 보내요. 이 링크에서는 휴대전화 인증까지만 진행됩니다.</p>
                                <div className="space-y-1">
                                    <label htmlFor="event-guest-phone" className="text-sm font-bold">휴대전화 번호</label>
                                    <input id="event-guest-phone" type="tel" autoComplete="tel" value={phone} maxLength={32} required
                                        disabled={Boolean(challenge) || pending} onChange={event => setPhone(event.target.value)}
                                        placeholder="010-1234-5678" className="block w-full rounded-xl border border-zinc-200 p-3 text-base" />
                                </div>
                                {challenge && (
                                    <div className="space-y-2">
                                        <label htmlFor="event-guest-code" className="text-sm font-bold">인증번호 6자리</label>
                                        <input id="event-guest-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                                            value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))}
                                            disabled={pending || secondsLeft === 0} className="block w-full rounded-xl border border-zinc-200 p-3 text-base" />
                                        <p className="text-sm text-zinc-600">{secondsLeft ? `남은 시간 ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}` : '인증번호가 만료됐어요.'}</p>
                                        <div className="flex flex-wrap gap-2">
                                            <Button variant="outline" type="button" disabled={pending || resendWait > 0} onClick={() => void sendCode()}>
                                                인증번호 다시 받기{resendWait > 0 ? ` (${resendWait}초)` : ''}
                                            </Button>
                                            <Button variant="ghost" type="button" disabled={pending} onClick={() => {
                                                setChallenge(null); setCode(''); setError('');
                                            }}>전화번호 변경</Button>
                                        </div>
                                    </div>
                                )}
                                {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
                                <Button type="submit" className="w-full" disabled={pending || (challenge
                                    ? secondsLeft === 0 || code.length !== 6 : !phone.trim())}>
                                    {pending ? '처리 중…' : challenge ? '인증번호 확인' : '인증번호 받기'}
                                </Button>
                            </form>
                        )}
                    </>
                )}
            </section>
        </main>
    );
}
