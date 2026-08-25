import { useEffect, useState } from 'react';
import { BadgeCheckIcon, GraduationCapIcon, MailCheckIcon } from 'lucide-react';
import { Button } from '../components/Button';
import { getApiErrorMessage } from '../lib/apiError';
import {
    activateSchoolEmailLink,
    confirmSchoolEmailCode,
    getSchoolEmailVerificationStatus,
    requestSchoolEmailVerification,
    type SchoolEmailVerificationStatus,
} from '../services/schoolEmailVerification';

interface StudentVerificationProps {
    onDone: () => void;
}

export default function StudentVerification({ onDone }: StudentVerificationProps) {
    const token = new URLSearchParams(window.location.search).get('token');
    const [status, setStatus] = useState<SchoolEmailVerificationStatus | null>(null);
    const [challengeId, setChallengeId] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [schoolEmail, setSchoolEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                if (token) {
                    await activateSchoolEmailLink(token);
                    if (!cancelled) setVerified(true);
                    return;
                }
                const current = await getSchoolEmailVerificationStatus();
                if (cancelled) return;
                setStatus(current);
                setChallengeId(current.challengeId);
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
            const challenge = await requestSchoolEmailVerification(schoolEmail.trim() || undefined);
            setChallengeId(challenge.challengeId);
            setStatus(current => current ? {
                ...current,
                status: 'PENDING',
                maskedEmail: challenge.maskedEmail,
                challengeId: challenge.challengeId,
                expiresAt: challenge.expiresAt,
            } : current);
            setSchoolEmail('');
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
            await confirmSchoolEmailCode(challengeId, code);
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
                    <h1 className="mt-5 text-2xl font-black text-zinc-950">학생 인증이 완료되었습니다</h1>
                    <p className="mt-3 text-sm leading-6 text-zinc-500">선택한 학교의 인증된 학생으로 등록되었습니다.</p>
                    <Button fullWidth onClick={onDone} className="mt-7 h-12 rounded-2xl border-[#162660] bg-[#162660] font-black">
                        계속하기
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
                <h1 className="mt-5 text-2xl font-black text-zinc-950">학교 이메일을 확인해주세요</h1>
                <p className="mt-3 text-sm leading-6 text-zinc-500">
                    {status?.maskedEmail
                        ? `${status.maskedEmail}로 인증번호와 활성화 링크를 함께 보냈습니다.`
                        : '이메일의 6자리 번호 또는 활성화 링크 중 편한 방법 하나를 사용하세요.'}
                </p>

                {status && !status.configured && (
                    <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                        이 학교는 아직 인증 이메일 도메인이 등록되지 않았습니다. 등록 후 이 화면에서 다시 요청할 수 있습니다.
                    </div>
                )}

                {status?.configured && !status.deliveryAvailable && (
                    <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                        학교 인증 이메일 서비스가 아직 준비되지 않았습니다. 회원가입은 완료되었으며, 이메일 서비스가 열리면 이 화면에서 인증할 수 있습니다.
                    </div>
                )}

                {challengeId && (
                    <div className="mt-6">
                        <label className="ml-1 text-sm font-bold text-zinc-800">6자리 인증번호</label>
                        <div className="mt-2 flex gap-2">
                            <input
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

                {status?.configured && status.deliveryAvailable && (
                    <div className="mt-5">
                        <label className="ml-1 text-sm font-bold text-zinc-800">학교 이메일 변경 또는 추가</label>
                        <input
                            type="email"
                            value={schoolEmail}
                            onChange={event => setSchoolEmail(event.target.value)}
                            maxLength={150}
                            placeholder="student@school.ac.kr"
                            autoComplete="email"
                            className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none focus:border-[#162660]"
                        />
                        <p className="ml-1 mt-2 text-xs leading-5 text-zinc-500">
                            비워두면 현재 계정 이메일로 보내고, 입력하면 계정 이메일도 함께 변경합니다.
                        </p>
                    </div>
                )}

                <div className="mt-5 flex items-start gap-3 rounded-2xl bg-zinc-50 p-4">
                    <MailCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" />
                    <p className="text-xs leading-5 text-zinc-500">활성화 링크를 누르면 인증번호를 입력하지 않아도 같은 학생 인증이 완료됩니다.</p>
                </div>

                {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

                {status?.configured && status.deliveryAvailable && (
                    <button
                        type="button"
                        onClick={() => void sendAgain()}
                        disabled={sending}
                        className="mt-5 w-full rounded-xl border-0 bg-transparent py-2 text-sm font-bold text-[#162660] disabled:text-zinc-400"
                    >
                        {sending ? '이메일 보내는 중...' : challengeId ? '인증 이메일 다시 보내기' : '인증 이메일 보내기'}
                    </button>
                )}
                {!token && (
                    <button type="button" onClick={onDone} className="mt-1 w-full border-0 bg-transparent py-2 text-xs text-zinc-400">
                        나중에 인증하기
                    </button>
                )}
            </main>
        </div>
    );
}
