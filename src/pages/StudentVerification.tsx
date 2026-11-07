import { useEffect, useRef, useState } from 'react';
import { BadgeCheckIcon, GraduationCapIcon, MailCheckIcon } from 'lucide-react';
import { Button } from '../components/Button';
import { getApiErrorMessage } from '../lib/apiError';
import { getUserInfo } from '../services/user';
import {
    activateSchoolEmailLink,
    confirmSchoolEmailCode,
    getSchoolEmailVerificationStatus,
    requestSchoolEmailVerification,
    type SchoolEmailVerificationStatus,
    type SchoolEmailVerificationResult,
} from '../services/schoolEmailVerification';
import { SCHOOL_EMAIL_AUTH_AVAILABLE } from '../config/features';

interface StudentVerificationProps {
    onDone: () => void;
}

export default function StudentVerification({ onDone }: StudentVerificationProps) {
    const [token] = useState(() => new URLSearchParams(window.location.search).get('token')?.trim() || null);
    const activation = useRef<ReturnType<typeof activateSchoolEmailLink> | null>(null);
    const [status, setStatus] = useState<SchoolEmailVerificationStatus | null>(null);
    const [challengeId, setChallengeId] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [schoolEmail, setSchoolEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(false);
    const [verifiedIdentity, setVerifiedIdentity] = useState<Pick<SchoolEmailVerificationResult, 'schoolName' | 'maskedEmail'> | null>(null);
    const [requiresStudentProfile, setRequiresStudentProfile] = useState(false);
    const [error, setError] = useState('');
    const [retryUntil, setRetryUntil] = useState(0);
    const [now, setNow] = useState(Date.now);
    const retrySeconds = Math.max(0, Math.ceil((retryUntil - now) / 1000));

    useEffect(() => {
        if (retryUntil <= Date.now()) return;
        const interval = window.setInterval(() => {
            setNow(Date.now());
            if (Date.now() >= retryUntil) window.clearInterval(interval);
        }, 1000);
        return () => window.clearInterval(interval);
    }, [retryUntil]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!SCHOOL_EMAIL_AUTH_AVAILABLE && !token) {
                setLoading(false);
                return;
            }
            try {
                if (token) {
                    activation.current ??= activateSchoolEmailLink(token);
                    const result = await activation.current;
                    if (!cancelled) {
                        setVerifiedIdentity(result);
                        setVerified(true);
                        const url = new URL(window.location.href);
                        url.searchParams.delete('token');
                        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
                    }
                    return;
                }
                const profile = await getUserInfo();
                if (cancelled) return;
                if (profile.userType !== 'KUSBF') {
                    setRequiresStudentProfile(true);
                    return;
                }
                setSchoolEmail(profile.email || '');
                const current = await getSchoolEmailVerificationStatus();
                if (cancelled) return;
                setStatus(current);
                setVerifiedIdentity(current);
                setChallengeId(current.challengeId);
                const receivedAt = Date.now();
                setNow(receivedAt);
                setRetryUntil(receivedAt + (current.retryAfterSeconds ?? 0) * 1000);
                setVerified(current.status === 'VERIFIED');
            } catch (requestError: unknown) {
                if (!cancelled) setError(getApiErrorMessage(requestError) || '학교 이메일 인증 정보를 불러오지 못했습니다.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void load();
        return () => { cancelled = true; };
    }, [token]);

    const sendAgain = async () => {
        setSending(true);
        setError('');
        try {
            const challenge = await requestSchoolEmailVerification(schoolEmail.trim());
            setChallengeId(challenge.challengeId);
            const receivedAt = Date.now();
            setNow(receivedAt);
            setRetryUntil(receivedAt + challenge.retryAfterSeconds * 1000);
            setStatus(current => current ? {
                ...current,
                status: 'PENDING',
                maskedEmail: challenge.maskedEmail,
                challengeId: challenge.challengeId,
                expiresAt: challenge.expiresAt,
            } : current);
        } catch (requestError: unknown) {
            setError(getApiErrorMessage(requestError) || '인증 이메일을 보내지 못했습니다.');
        } finally {
            setSending(false);
        }
    };

    const confirmCode = async () => {
        if (!challengeId || !/^\d{6}$/.test(code)) {
            setError('이메일에 적힌 6자리 인증번호를 입력해주세요.');
            return;
        }
        setVerifying(true);
        setError('');
        try {
            const result = await confirmSchoolEmailCode(challengeId, code);
            setVerifiedIdentity(result);
            setVerified(true);
        } catch (requestError: unknown) {
            setError(getApiErrorMessage(requestError) || '인증번호가 올바르지 않거나 만료되었습니다.');
        } finally {
            setVerifying(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-[#F5F4F0]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-[#162660]" />
            </div>
        );
    }

    if (verified) {
        return (
            <div className="flex h-full overflow-y-auto bg-[#F5F4F0] px-5 py-8">
                <main className="m-auto w-full max-w-lg rounded-[2rem] border border-emerald-100 bg-white p-8 text-center shadow-xl">
                    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <BadgeCheckIcon className="h-9 w-9" />
                    </span>
                    <h1 className="mt-5 text-2xl font-black text-zinc-950">학교 이메일 인증이 완료되었습니다</h1>
                    {(verifiedIdentity?.schoolName || verifiedIdentity?.maskedEmail) && (
                        <p className="mt-3 text-sm font-semibold text-zinc-700">
                            {[verifiedIdentity?.schoolName, verifiedIdentity?.maskedEmail].filter(Boolean).join(' · ')}
                        </p>
                    )}
                    <Button fullWidth onClick={onDone} className="mt-7 h-12 rounded-2xl border-[#162660] bg-[#162660] font-black">
                        계속하기
                    </Button>
                </main>
            </div>
        );
    }

    if (requiresStudentProfile) {
        return (
            <div className="flex h-full overflow-y-auto bg-[#F5F4F0] px-5 py-8">
                <main className="m-auto w-full max-w-lg rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-xl">
                    <h1 className="text-2xl font-black text-zinc-950">학생 프로필에서 이용할 수 있습니다</h1>
                    <Button fullWidth onClick={onDone} className="mt-7">서비스로 돌아가기</Button>
                </main>
            </div>
        );
    }

    if (!SCHOOL_EMAIL_AUTH_AVAILABLE && !token) {
        return (
            <div className="flex h-full overflow-y-auto bg-[#F5F4F0] px-5 py-8">
                <main className="m-auto w-full max-w-lg rounded-[2rem] border border-amber-200 bg-white p-8 text-center shadow-xl">
                    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <MailCheckIcon className="h-8 w-8" />
                    </span>
                    <h1 className="mt-5 text-2xl font-black text-zinc-950">학교 이메일 인증 준비 중</h1>
                    <p className="mt-3 text-sm leading-6 text-zinc-500">
                        학교 이메일 인증은 아직 사용할 수 없습니다. 인증 없이도 가입과 기본 서비스 이용을 계속할 수 있습니다.
                    </p>
                    <Button fullWidth onClick={onDone} className="mt-7 h-12 rounded-2xl border-[#162660] bg-[#162660] font-black">
                        서비스로 돌아가기
                    </Button>
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-full overflow-y-auto bg-[#F5F4F0] px-5 py-8">
            <main className="m-auto w-full max-w-lg rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-xl sm:p-9">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#162660]">
                    <GraduationCapIcon className="h-7 w-7" />
                </span>
                <h1 className="mt-5 text-2xl font-black text-zinc-950">학교 이메일 인증</h1>
                <p className="mt-3 text-sm leading-6 text-zinc-500">
                    학교 인증을 위해 학교 이메일을 입력해주세요. 입력한 학교 이메일은 계정 이메일로 설정됩니다.
                </p>

                {status && !status.configured && (
                    <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                        아직 이 학교의 이메일 인증을 지원하지 않습니다.
                    </div>
                )}

                {status?.configured && !status.deliveryAvailable && (
                    <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                        지금은 인증 이메일을 보낼 수 없습니다. 잠시 후 다시 시도해주세요.
                    </div>
                )}

                {status?.configured && status.deliveryAvailable && (
                    <form className="mt-5" onSubmit={event => { event.preventDefault(); void sendAgain(); }}>
                        <label htmlFor="school-email" className="ml-1 text-sm font-bold text-zinc-800">학교 이메일</label>
                        <input
                            id="school-email"
                            type="email"
                            required
                            value={schoolEmail}
                            onChange={event => setSchoolEmail(event.target.value)}
                            maxLength={150}
                            placeholder="학교 이메일 주소"
                            autoComplete="email"
                            className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none focus:border-[#162660]"
                        />
                        <Button
                            type="submit"
                            fullWidth
                            disabled={sending || retrySeconds > 0}
                            className="mt-4 h-12 rounded-2xl border-[#162660] bg-[#162660] font-black"
                        >
                            {sending ? '이메일 보내는 중...' : retrySeconds > 0 ? `${retrySeconds}초 후 다시 보내기` : challengeId ? '인증 이메일 다시 보내기' : '인증 이메일 보내기'}
                        </Button>
                    </form>
                )}

                {challengeId && (
                    <div className="mt-6">
                        {status?.maskedEmail && <p role="status" className="mb-4 text-sm text-zinc-600">{status.maskedEmail}로 인증번호를 보냈습니다.</p>}
                        <label htmlFor="school-email-code" className="ml-1 text-sm font-bold text-zinc-800">6자리 인증번호</label>
                        <div className="mt-2 flex gap-2">
                            <input
                                id="school-email-code"
                                value={code}
                                onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder="000000"
                                className="h-12 min-w-0 flex-1 rounded-2xl border border-zinc-200 px-4 text-center text-lg font-black tracking-[0.3em] outline-none focus:border-[#162660]"
                            />
                            <Button onClick={() => void confirmCode()} disabled={verifying} className="h-12 rounded-2xl border-[#162660] bg-[#162660] px-5 font-black">
                                {verifying ? '확인 중' : '인증'}
                            </Button>
                        </div>
                    </div>
                )}

                {error && <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
                {token && error && <Button fullWidth onClick={onDone} className="mt-4">서비스로 돌아가기</Button>}

                {!token && (
                    <button type="button" onClick={onDone} className="mt-1 w-full border-0 bg-transparent py-2 text-xs text-zinc-400">
                        나중에 인증하기
                    </button>
                )}
            </main>
        </div>
    );
}
