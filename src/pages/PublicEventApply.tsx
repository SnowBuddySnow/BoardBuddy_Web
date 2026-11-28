import { useEffect, useState, type FormEvent } from 'react';
import {
    Calendar,
    CheckCircle2,
    ChevronLeft,
    Copy,
    ExternalLink,
    MapPin,
    MessageCircle,
    ShieldCheck,
    Sparkles,
    Users,
} from 'lucide-react';
import boardBuddyLogo from '../assets/boardbuddy-logo.png';
import buddySoft from '../assets/buddy-soft.png';
import { Button } from '../components/Button';
import { PlanningModeBadge } from '../components/event/PlanningModeBadge';
import { SchoolPicker } from '../components/SchoolPicker';
import { participantStatusLabel } from '../constants/displayLabels';
import { getEventActivityLabel } from '../constants/eventActivity';
import { getApiErrorMessage, getApiErrorStatus } from '../lib/apiError';
import { formatEventDateTime } from '../lib/eventDateTime';
import {
    buildNonMemberLookupUrl,
    saveNonMemberConversionIntent,
} from '../lib/nonMemberConversion';
import {
    cancelNonMemberApplication,
    confirmNonMemberApplyPhone,
    previewPublicEvent,
    startNonMemberApplyPhone,
    submitNonMemberApplication,
    type NonMemberReceipt,
    type PublicConsentItem,
    type PublicEventPreview,
} from '../services/nonMemberEvent';
import { getSchools, type SchoolOption } from '../services/schools';

interface PublicEventApplyProps {
    eventCode: string;
    onLoginClick: () => void;
    onLookupClick: (receiptCode?: string) => void;
    onConvertToStudent: (conversionToken: string, crewName: string) => void;
}

type Step = 'landing' | 'otp' | 'form' | 'receipt';

interface ConsentDraft {
    agreed?: boolean;
    responseText?: string;
}

function formatKoreanPhoneInput(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function PublicEventApply({
    eventCode,
    onLoginClick,
    onLookupClick,
    onConvertToStudent,
}: PublicEventApplyProps) {
    const [step, setStep] = useState<Step>('landing');
    const [preview, setPreview] = useState<PublicEventPreview | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    // OTP state
    const [phone, setPhone] = useState('');
    const [challengeId, setChallengeId] = useState<string | null>(null);
    const [otpCode, setOtpCode] = useState('');
    const [expiresAt, setExpiresAt] = useState(0);
    const [retryAt, setRetryAt] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [proofToken, setProofToken] = useState('');
    const [existingAccountDetected, setExistingAccountDetected] = useState(false);

    // Application form state
    const [schools, setSchools] = useState<SchoolOption[]>([]);
    const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);
    const [customSchoolName, setCustomSchoolName] = useState('');
    const [useCustomSchool, setUseCustomSchool] = useState(false);
    const [crewName, setCrewName] = useState('');
    const [name, setName] = useState('');
    const [consentDrafts, setConsentDrafts] = useState<Record<number, ConsentDraft>>({});
    const [privacyAccepted, setPrivacyAccepted] = useState(false);

    // Receipt & status
    const [receipt, setReceipt] = useState<NonMemberReceipt | null>(null);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!eventCode) {
            setLoadError('올바른 이벤트 공유 링크가 아닙니다.');
            setLoading(false);
            return;
        }
        let active = true;
        setLoading(true);
        setLoadError('');
        previewPublicEvent(eventCode)
            .then(data => { if (active) setPreview(data); })
            .catch(err => {
                if (!active) return;
                setLoadError(
                    getApiErrorStatus(err) === 404
                        ? '이벤트를 찾을 수 없거나 공개되지 않은 행사입니다.'
                        : '이벤트 정보를 불러오지 못했어요. 잠시 후 다시 열어 주세요.',
                );
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [eventCode]);

    useEffect(() => {
        if (step !== 'form' || schools.length > 0) return;
        let active = true;
        getSchools({ allowDevFallback: false })
            .then(list => { if (active) setSchools(list); })
            .catch(() => { /* Free-text school input remains available. */ });
        return () => { active = false; };
    }, [step, schools.length]);

    useEffect(() => {
        if (!challengeId || proofToken) return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [challengeId, proofToken]);

    const secondsLeft = challengeId ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0;
    const resendWait = challengeId ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0;

    async function handleSendOtp() {
        if (pending || (challengeId && Date.now() < retryAt)) return;
        if (!/^010-\d{4}-\d{4}$/.test(phone)) {
            setError('휴대전화 번호를 정확히 입력해 주세요. (010-1234-5678)');
            return;
        }
        setPending(true);
        setError('');
        try {
            const started = await startNonMemberApplyPhone(eventCode, phone);
            const sentAt = Date.now();
            setNow(sentAt);
            setChallengeId(started.challengeId);
            setExpiresAt(sentAt + started.expiresInSeconds * 1000);
            setRetryAt(sentAt + started.retryAfterSeconds * 1000);
            setOtpCode('');
        } catch (err) {
            setError(getApiErrorStatus(err) === 429
                ? '인증번호 요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'
                : getApiErrorMessage(err) || '인증번호를 보내지 못했어요.');
        } finally {
            setPending(false);
        }
    }

    async function handleConfirmOtp(e: FormEvent) {
        e.preventDefault();
        if (!challengeId) {
            await handleSendOtp();
            return;
        }
        if (pending || !/^\d{6}$/.test(otpCode) || secondsLeft === 0) return;
        setPending(true);
        setError('');
        try {
            const result = await confirmNonMemberApplyPhone(eventCode, challengeId, otpCode);
            setProofToken(result.proofToken);
            setExistingAccountDetected(result.existingAccountDetected);
            setStep('form');
        } catch (err) {
            setError(getApiErrorMessage(err) || '인증번호를 확인해 주세요. 만료되었다면 다시 받아 주세요.');
        } finally {
            setPending(false);
        }
    }

    function resetPhoneVerification() {
        setChallengeId(null);
        setProofToken('');
        setOtpCode('');
        setExistingAccountDetected(false);
        setError('');
        setStep('otp');
    }

    async function handleSubmitApplication(e: FormEvent) {
        e.preventDefault();
        if (pending || !preview || !proofToken) return;
        const resolvedSchoolName = useCustomSchool
            ? customSchoolName.trim()
            : (selectedSchool?.name || customSchoolName.trim());
        if (!resolvedSchoolName) {
            setError('소속 학교를 선택하거나 직접 입력해 주세요.');
            return;
        }
        if (!crewName.trim()) {
            setError('소속 크루(외부 동아리) 이름을 입력해 주세요.');
            return;
        }
        if (!name.trim()) {
            setError('실명을 입력해 주세요.');
            return;
        }
        if (!privacyAccepted) {
            setError('행사 운영을 위한 개인정보 수집·이용에 동의해 주세요.');
            return;
        }

        const consentResponses = preview.consentItems
            .filter(item => item.responseType !== 'INFORMATION')
            .map(item => {
                const draft = consentDrafts[item.id];
                return {
                    consentItemId: item.id,
                    agreed: item.responseType === 'CHECKBOX' ? Boolean(draft?.agreed) : null,
                    responseText: item.responseType !== 'CHECKBOX' ? (draft?.responseText?.trim() || null) : null,
                };
            });

        setPending(true);
        setError('');
        try {
            const submitted = await submitNonMemberApplication(preview.eventCode, {
                proofToken,
                phoneNumber: phone,
                name: name.trim(),
                schoolId: useCustomSchool ? null : (selectedSchool?.id ?? null),
                schoolName: resolvedSchoolName,
                crewName: crewName.trim(),
                privacyAccepted: true,
                privacyVersion: 1,
                consentResponses,
            });
            setReceipt(submitted);
            setStep('receipt');
        } catch (err) {
            const status = getApiErrorStatus(err);
            if (status === 403) {
                resetPhoneVerification();
                setError('휴대전화 인증이 만료됐어요. 다시 인증해 주세요.');
            } else if (status === 409) {
                setError('정원이 찼거나 같은 번호로 기존 회원 신청이 있어요. 로그인 후 확인해 주세요.');
            } else {
                setError(getApiErrorMessage(err) || '신청을 저장하지 못했어요. 입력 내용을 확인해 주세요.');
            }
        } finally {
            setPending(false);
        }
    }

    async function handleCancelReceipt() {
        if (!receipt || !proofToken || pending) return;
        if (!window.confirm('이 참가 신청을 취소할까요?')) return;
        setPending(true);
        setError('');
        try {
            const updated = await cancelNonMemberApplication(receipt.receiptCode, proofToken);
            setReceipt(updated);
        } catch (err) {
            setError(getApiErrorMessage(err) || '신청을 취소하지 못했어요.');
        } finally {
            setPending(false);
        }
    }

    async function copyLookupLink() {
        if (!receipt) return;
        try {
            await navigator.clipboard.writeText(buildNonMemberLookupUrl(window.location.origin, receipt.receiptCode));
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }

    function renderConsentField(item: PublicConsentItem) {
        const draft = consentDrafts[item.id] || {};
        if (item.responseType === 'INFORMATION') {
            return (
                <div key={item.id} className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-zinc-700">
                    <p className="font-bold text-[#162660]">{item.title}</p>
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed">{item.content}</p>
                </div>
            );
        }
        if (item.responseType === 'CHECKBOX') {
            return (
                <label key={item.id} className="block rounded-2xl border border-zinc-200 bg-white p-3.5">
                    <div className="flex items-start gap-2.5">
                        <input
                            type="checkbox"
                            checked={Boolean(draft.agreed)}
                            required={item.required}
                            onChange={e => setConsentDrafts(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], agreed: e.target.checked },
                            }))}
                            className="mt-0.5 h-4 w-4 accent-[#162660]"
                        />
                        <div className="min-w-0 flex-1 text-xs">
                            <p className="font-bold text-zinc-900">
                                {item.title}{' '}
                                <span className={item.required ? 'text-rose-600' : 'text-zinc-400'}>
                                    ({item.required ? '필수' : '선택'})
                                </span>
                            </p>
                            {item.content && <p className="mt-1 whitespace-pre-wrap text-zinc-600">{item.content}</p>}
                        </div>
                    </div>
                </label>
            );
        }
        return (
            <label key={item.id} className="block space-y-1.5 text-sm font-bold text-zinc-800">
                <span>
                    {item.title}{' '}
                    <span className={`text-xs font-semibold ${item.required ? 'text-rose-600' : 'text-zinc-400'}`}>
                        ({item.required ? '필수' : '선택'})
                    </span>
                </span>
                {item.content && <p className="text-xs font-normal text-zinc-500">{item.content}</p>}
                {item.responseType === 'TEXTAREA' ? (
                    <textarea
                        rows={3}
                        required={item.required}
                        value={draft.responseText ?? ''}
                        onChange={e => setConsentDrafts(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], responseText: e.target.value },
                        }))}
                        className="block w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm font-normal text-zinc-900 focus:border-[#162660] focus:outline-none"
                    />
                ) : (
                    <input
                        type={item.responseType === 'NUMBER' ? 'number' : item.responseType === 'EMAIL' ? 'email' : 'text'}
                        required={item.required}
                        value={draft.responseText ?? ''}
                        onChange={e => setConsentDrafts(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], responseText: e.target.value },
                        }))}
                        className="block w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm font-normal text-zinc-900 focus:border-[#162660] focus:outline-none"
                    />
                )}
            </label>
        );
    }

    if (loading) {
        return (
            <main className="flex min-h-0 flex-1 items-center justify-center bg-[#FAF8F3] p-6">
                <div className="text-center text-sm text-zinc-500">
                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-[#162660]" />
                    이벤트 정보를 불러오는 중이에요...
                </div>
            </main>
        );
    }

    if (loadError || !preview) {
        return (
            <main className="flex min-h-0 flex-1 items-center justify-center bg-[#FAF8F3] p-6">
                <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-7 text-center shadow-sm">
                    <img src={boardBuddyLogo} alt="BoardBuddy" className="mx-auto mb-4 h-8 w-36 object-cover object-center" />
                    <p role="alert" className="text-base font-bold text-zinc-900">{loadError || '이벤트를 찾을 수 없어요.'}</p>
                    <div className="mt-5 flex flex-col gap-2">
                        <Button type="button" onClick={() => onLookupClick()}>비회원 신청 조회</Button>
                        <Button type="button" variant="outline" onClick={onLoginClick}>BoardBuddy 로그인</Button>
                    </div>
                </div>
            </main>
        );
    }

    const stepIndex = step === 'otp' ? 1 : step === 'form' ? 2 : step === 'receipt' ? 3 : 0;

    return (
        <main className="min-h-0 flex-1 overflow-y-auto bg-[#FAF8F3]">
            <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-[#FAF8F3] sm:py-6">
                {step === 'landing' && (
                    <article className="flex flex-1 flex-col overflow-hidden bg-[#FAF8F3] sm:rounded-3xl sm:border sm:border-zinc-200 sm:shadow-sm">
                        <div className="relative bg-gradient-to-br from-[#162660] via-[#1e3a8a] to-[#2563eb] px-5 pb-6 pt-5 text-white">
                            <div className="mb-5 flex items-center justify-between gap-2">
                                <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 shadow-sm">
                                    <img src={boardBuddyLogo} alt="BoardBuddy" className="h-5 w-24 object-cover object-center" />
                                </span>
                                {preview.allowNonMemberApplications && preview.registrationState === 'OPEN' && (
                                    <span className="rounded-full bg-[#FCCA59] px-3 py-1 text-[11px] font-black text-[#162660]">
                                        비회원 신청 가능
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {preview.visibilityType === 'PUBLIC' && (
                                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
                                        전체 공개
                                    </span>
                                )}
                                <PlanningModeBadge mode={preview.planningMode} />
                                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-100">
                                    {getEventActivityLabel(preview.activityType)}
                                </span>
                            </div>
                            <h1 className="mt-2.5 text-xl font-black leading-snug text-white">{preview.title}</h1>
                        </div>

                        <div className="flex flex-1 flex-col gap-4 p-5">
                            {preview.description && (
                                <section className="rounded-3xl border border-zinc-100 bg-white p-4 shadow-sm">
                                    <h2 className="text-xs font-bold text-zinc-400">상세 설명</h2>
                                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{preview.description}</p>
                                </section>
                            )}

                            <section className="space-y-3.5 rounded-3xl border border-zinc-100 bg-white p-4 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <Calendar className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#162660]" />
                                    <div>
                                        <p className="text-[11px] font-bold text-zinc-400">언제 하나요</p>
                                        <p className="text-sm font-bold text-zinc-900">{formatEventDateTime(preview.startsAt)}</p>
                                        {preview.endsAt && <p className="text-xs text-zinc-500">~ {formatEventDateTime(preview.endsAt)}</p>}
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 border-t border-zinc-100 pt-3.5">
                                    <MapPin className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#162660]" />
                                    <div>
                                        <p className="text-[11px] font-bold text-zinc-400">어디서 만나나요</p>
                                        <p className="text-sm font-bold text-zinc-900">{preview.locationName || '추후 안내'}</p>
                                        {preview.locationAddress && <p className="text-xs text-zinc-500">{preview.locationAddress}</p>}
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 border-t border-zinc-100 pt-3.5">
                                    <Users className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#162660]" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-bold text-zinc-400">주최 · 공동 운영 / 정원</p>
                                        <p className="text-sm font-bold text-zinc-900">
                                            {preview.hostCrewName || 'BoardBuddy'}
                                            {preview.coHostCrewName && <span className="text-blue-600"> × {preview.coHostCrewName}</span>}
                                        </p>
                                        <p className="mt-0.5 text-xs text-zinc-500">
                                            {preview.joinedCount} / {preview.capacityLimited ? `${preview.capacity}명` : '제한 없음'} 참여 중 ·{' '}
                                            {preview.joinPolicy === 'APPROVAL_REQUIRED' ? '승인 후 참가' : '즉시 승인'}
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {preview.allowNonMemberApplications && (
                                <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5">
                                    <img src={buddySoft} alt="" className="h-11 w-14 shrink-0 object-contain" />
                                    <div className="text-xs leading-5">
                                        <p className="font-black text-[#162660]">BoardBuddy 계정이 없어도 OK!</p>
                                        <p className="text-zinc-600">휴대전화 문자 인증만으로 1분 만에 참가 신청할 수 있어요.</p>
                                    </div>
                                </div>
                            )}

                            <div className="mt-auto space-y-2.5 pt-2">
                                {preview.allowNonMemberApplications && preview.registrationState === 'OPEN' ? (
                                    <Button
                                        type="button"
                                        className="min-h-12 w-full rounded-2xl bg-[#162660] text-sm font-black text-white"
                                        onClick={() => { setError(''); setStep('otp'); }}
                                    >
                                        비회원으로 신청하기
                                    </Button>
                                ) : (
                                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 text-center text-xs font-semibold text-zinc-600">
                                        {!preview.allowNonMemberApplications
                                            ? '이 이벤트는 현재 회원 전용으로 접수 중이에요.'
                                            : preview.registrationState === 'UPCOMING'
                                                ? '아직 신청 시작 전이에요.'
                                                : '모집이 마감되었어요.'}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={onLoginClick}
                                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FEE500] px-4 text-sm font-bold text-zinc-900 cursor-pointer"
                                >
                                    이미 회원이라면? 로그인하고 신청
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onLookupClick()}
                                    className="w-full py-2 text-center text-xs font-semibold text-zinc-500 hover:text-[#162660] cursor-pointer"
                                >
                                    이미 신청하셨나요? <strong className="text-[#162660]">비회원 신청 조회 →</strong>
                                </button>
                            </div>
                        </div>
                    </article>
                )}

                {step !== 'landing' && (
                    <article className="flex flex-1 flex-col overflow-hidden bg-[#FAF8F3] sm:rounded-3xl sm:border sm:border-zinc-200 sm:shadow-sm">
                        <header className="flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-3.5">
                            {step !== 'receipt' ? (
                                <button
                                    type="button"
                                    aria-label="이전 단계"
                                    onClick={() => {
                                        setError('');
                                        setStep(step === 'form' ? 'otp' : 'landing');
                                    }}
                                    className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                            ) : <span className="w-9" />}
                            <h1 className="text-base font-black text-zinc-900">
                                {step === 'otp' ? '비회원 참가 신청' : step === 'form' ? '비회원 신청 정보' : '신청 접수 완료'}
                            </h1>
                            <span className="w-9" />
                        </header>

                        <ol aria-label="비회원 신청 단계" className="flex items-center justify-center gap-2 border-b border-zinc-100 bg-white px-4 py-2.5 text-xs font-bold">
                            {[
                                { idx: 1, label: '본인인증' },
                                { idx: 2, label: '정보입력' },
                                { idx: 3, label: '접수완료' },
                            ].map((s, i) => (
                                <li key={s.idx} className="flex items-center gap-1.5">
                                    {i > 0 && <span className={`h-0.5 w-4 rounded ${stepIndex > i ? 'bg-emerald-500' : 'bg-zinc-200'}`} />}
                                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                                        stepIndex > s.idx ? 'bg-emerald-500 text-white'
                                            : stepIndex === s.idx ? 'bg-[#162660] text-white'
                                                : 'bg-zinc-100 text-zinc-400'
                                    }`}>
                                        {stepIndex > s.idx ? '✓' : s.idx}
                                    </span>
                                    <span className={stepIndex === s.idx ? 'text-[#162660]' : stepIndex > s.idx ? 'text-emerald-700' : 'text-zinc-400'}>
                                        {s.label}
                                    </span>
                                </li>
                            ))}
                        </ol>

                        <div className="flex-1 space-y-4 p-5">
                            {error && (
                                <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                                    {error}
                                </p>
                            )}

                            {step === 'otp' && (
                                <>
                                    <form onSubmit={handleConfirmOtp} className="space-y-4 rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
                                        <div>
                                            <h2 className="text-lg font-black text-zinc-900">휴대전화 본인 확인</h2>
                                            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                                                신청 내역 확인과 현장 비상 연락을 위해 문자(SMS) 인증이 필요해요.
                                            </p>
                                        </div>

                                        <label className="block space-y-1.5 text-sm font-bold text-zinc-800">
                                            휴대전화 번호 <span className="text-rose-500">*</span>
                                            <div className="flex gap-2">
                                                <input
                                                    type="tel"
                                                    autoComplete="tel"
                                                    value={phone}
                                                    disabled={Boolean(challengeId) || pending}
                                                    onChange={e => setPhone(formatKoreanPhoneInput(e.target.value))}
                                                    placeholder="010-1234-5678"
                                                    required
                                                    className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm font-normal text-zinc-900 disabled:bg-zinc-50"
                                                />
                                                {challengeId && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="small"
                                                        disabled={pending || resendWait > 0}
                                                        onClick={() => void handleSendOtp()}
                                                    >
                                                        {resendWait > 0 ? `${resendWait}초` : '재전송'}
                                                    </Button>
                                                )}
                                            </div>
                                        </label>

                                        {challengeId && (
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between text-sm font-bold text-zinc-800">
                                                    <label htmlFor="nm-otp-code">인증번호 6자리 <span className="text-rose-500">*</span></label>
                                                    <span className="text-xs font-extrabold text-rose-600">
                                                        {secondsLeft > 0
                                                            ? `남은 시간 ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`
                                                            : '만료됨'}
                                                    </span>
                                                </div>
                                                <input
                                                    id="nm-otp-code"
                                                    inputMode="numeric"
                                                    autoComplete="one-time-code"
                                                    maxLength={6}
                                                    value={otpCode}
                                                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                    placeholder="6자리 숫자 입력"
                                                    className="block w-full rounded-xl border border-zinc-200 px-4 py-3 text-center text-lg font-black tracking-[0.35em] text-[#162660]"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={resetPhoneVerification}
                                                    className="text-xs font-semibold text-zinc-500 underline cursor-pointer"
                                                >
                                                    휴대전화 번호 다시 입력
                                                </button>
                                            </div>
                                        )}

                                        <Button
                                            type="submit"
                                            className="min-h-12 w-full rounded-2xl bg-[#162660] text-sm font-black text-white"
                                            disabled={pending || (Boolean(challengeId) && (otpCode.length !== 6 || secondsLeft === 0))}
                                        >
                                            {pending ? '처리 중...' : challengeId ? '인증번호 확인' : '인증번호 받기'}
                                        </Button>
                                    </form>

                                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-xs leading-relaxed text-zinc-700">
                                        <p className="flex items-center gap-1.5 font-extrabold text-[#162660]">
                                            <ShieldCheck className="h-4 w-4" /> 기존 회원이신가요?
                                        </p>
                                        <p className="mt-1">
                                            입력한 번호로 가입된 BoardBuddy 계정이 있으면 로그인 신청으로 바로 연결해 드려요.
                                        </p>
                                    </div>
                                </>
                            )}

                            {step === 'form' && (
                                <form onSubmit={handleSubmitApplication} className="space-y-4">
                                    <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
                                        <span className="flex items-center gap-1.5 font-bold">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            {phone} 인증 완료
                                        </span>
                                        <button
                                            type="button"
                                            onClick={resetPhoneVerification}
                                            className="font-bold text-[#162660] underline cursor-pointer"
                                        >
                                            번호 변경
                                        </button>
                                    </div>

                                    {existingAccountDetected && (
                                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                                            <p className="font-bold">이미 가입된 BoardBuddy 계정이 있어요!</p>
                                            <p className="mt-1 leading-relaxed">
                                                로그인하면 입력 없이 1초 만에 신청하고 &lsquo;내 이벤트&rsquo;에서 바로 관리할 수 있어요.
                                            </p>
                                            <Button type="button" size="small" variant="outline" className="mt-2" onClick={onLoginClick}>
                                                로그인하고 신청하기
                                            </Button>
                                        </div>
                                    )}

                                    <div className="space-y-4 rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-zinc-800">
                                                    소속 학교 <span className="text-rose-500">*</span>
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setUseCustomSchool(v => !v);
                                                        setSelectedSchool(null);
                                                    }}
                                                    className="text-xs font-semibold text-[#162660] underline cursor-pointer"
                                                >
                                                    {useCustomSchool ? '학교 목록에서 검색' : '목록에 없나요? 직접 입력'}
                                                </button>
                                            </div>
                                            {!useCustomSchool && schools.length > 0 ? (
                                                <SchoolPicker
                                                    options={schools}
                                                    value={selectedSchool}
                                                    loading={false}
                                                    onRetry={() => {
                                                        void getSchools({ allowDevFallback: false }).then(setSchools).catch(() => {});
                                                    }}
                                                    onChange={(school: SchoolOption | null) => {
                                                        setSelectedSchool(school);
                                                        setCustomSchoolName(school?.name ?? '');
                                                    }}
                                                />
                                            ) : (
                                                <input
                                                    required
                                                    maxLength={120}
                                                    value={customSchoolName}
                                                    onChange={e => setCustomSchoolName(e.target.value)}
                                                    placeholder="예: 고려대학교"
                                                    className="block w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900"
                                                />
                                            )}
                                        </div>

                                        <label className="block space-y-1.5 text-sm font-bold text-zinc-800">
                                            소속 크루 (외부 동아리) <span className="text-rose-500">*</span>
                                            <input
                                                required
                                                maxLength={120}
                                                value={crewName}
                                                onChange={e => setCrewName(e.target.value)}
                                                placeholder="예: 고려대 스노우폭스"
                                                className="block w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm font-normal text-zinc-900"
                                            />
                                        </label>

                                        <label className="block space-y-1.5 text-sm font-bold text-zinc-800">
                                            실명 <span className="text-rose-500">*</span>
                                            <input
                                                required
                                                maxLength={100}
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                                placeholder="참가자 실명을 입력해 주세요"
                                                className="block w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm font-normal text-zinc-900"
                                            />
                                        </label>

                                        {preview.consentItems.length > 0 && (
                                            <div className="space-y-3 border-t border-dashed border-zinc-200 pt-4">
                                                <p className="text-xs font-black uppercase tracking-wider text-[#162660]">
                                                    이벤트 추가 정보 · 동의 항목
                                                </p>
                                                {preview.consentItems.map(renderConsentField)}
                                            </div>
                                        )}

                                        <label className="flex items-start gap-2.5 rounded-2xl bg-[#FAF8F3] p-3.5 text-xs font-semibold text-zinc-700">
                                            <input
                                                type="checkbox"
                                                required
                                                checked={privacyAccepted}
                                                onChange={e => setPrivacyAccepted(e.target.checked)}
                                                className="mt-0.5 h-4 w-4 accent-[#162660]"
                                            />
                                            <span>
                                                행사 운영 및 본인 확인을 위한 개인정보 수집·이용에 동의합니다. <strong className="text-rose-600">(필수)</strong>
                                                <span className="mt-1 block font-normal text-zinc-500">
                                                    미전환 비회원의 개인정보는 마지막 행사 종료 30일 후 비식별화됩니다.
                                                </span>
                                            </span>
                                        </label>

                                        <Button
                                            type="submit"
                                            className="min-h-12 w-full rounded-2xl bg-[#162660] text-sm font-black text-white"
                                            disabled={pending || !privacyAccepted}
                                        >
                                            {pending ? '신청하는 중...' : '참가 신청 완료하기'}
                                        </Button>
                                    </div>
                                </form>
                            )}

                            {step === 'receipt' && receipt && (
                                <div className="space-y-4">
                                    <section className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm">
                                        <div className="text-center">
                                            <span className={`inline-block rounded-full px-3 py-1 text-xs font-black ${
                                                receipt.status === 'JOINED'
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : receipt.status === 'CANCELLED'
                                                        ? 'bg-zinc-100 text-zinc-500'
                                                        : 'bg-amber-50 text-amber-700'
                                            }`}>
                                                {participantStatusLabel[receipt.status]}
                                            </span>
                                            <h2 className="mt-2.5 text-lg font-black text-zinc-900">
                                                {receipt.status === 'JOINED'
                                                    ? '참가가 확정되었어요!'
                                                    : receipt.status === 'CANCELLED'
                                                        ? '참가 신청이 취소되었어요.'
                                                        : '참가 신청을 접수했어요!'}
                                            </h2>
                                            <p className="mt-1 text-xs text-zinc-500">{receipt.eventTitle}</p>
                                        </div>

                                        <dl className="mt-4 space-y-2 rounded-2xl bg-[#FAF8F3] p-4 text-xs">
                                            <div className="flex justify-between gap-3"><dt className="text-zinc-500">신청번호</dt><dd className="font-black text-[#162660]">{receipt.receiptCode}</dd></div>
                                            <div className="flex justify-between gap-3"><dt className="text-zinc-500">일시</dt><dd className="font-bold text-zinc-900">{formatEventDateTime(receipt.startsAt)}</dd></div>
                                            <div className="flex justify-between gap-3"><dt className="text-zinc-500">신청자</dt><dd className="font-bold text-zinc-900">{receipt.name}</dd></div>
                                            <div className="flex justify-between gap-3"><dt className="text-zinc-500">소속</dt><dd className="font-bold text-zinc-900">{receipt.schoolName} · {receipt.crewName}</dd></div>
                                            {receipt.maskedPhone && (
                                                <div className="flex justify-between gap-3"><dt className="text-zinc-500">연락처</dt><dd className="font-bold text-zinc-900">{receipt.maskedPhone}</dd></div>
                                            )}
                                            {receipt.consentAnswers.map(ans => (
                                                <div key={ans.consentItemId} className="flex justify-between gap-3 border-t border-zinc-200/70 pt-2">
                                                    <dt className="text-zinc-500">{ans.title}</dt>
                                                    <dd className="font-bold text-zinc-900">{ans.responseText ?? (ans.agreed ? '동의' : '미동의')}</dd>
                                                </div>
                                            ))}
                                        </dl>

                                        {receipt.chatAccess?.chatUrl && (
                                            <a
                                                href={receipt.chatAccess.chatUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-3 flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 p-3.5 text-xs text-[#162660]"
                                            >
                                                <div>
                                                    <p className="flex items-center gap-1.5 font-black">
                                                        <MessageCircle className="h-4 w-4" /> 참가자 오픈채팅방 공개됨
                                                    </p>
                                                    {receipt.chatAccess.chatPasscode && (
                                                        <p className="mt-0.5 text-blue-700">입장 코드: <strong>{receipt.chatAccess.chatPasscode}</strong></p>
                                                    )}
                                                </div>
                                                <ExternalLink className="h-4 w-4 shrink-0" />
                                            </a>
                                        )}

                                        <div className="mt-3 flex gap-2">
                                            <Button type="button" variant="outline" className="flex-1 text-xs" onClick={() => void copyLookupLink()}>
                                                <Copy className="mr-1.5 inline h-3.5 w-3.5" />
                                                {copied ? '링크 복사됨!' : '신청 조회 링크 복사'}
                                            </Button>
                                            {receipt.canCancel && (
                                                <Button type="button" variant="ghost" className="text-xs text-rose-600" disabled={pending} onClick={() => void handleCancelReceipt()}>
                                                    신청 취소
                                                </Button>
                                            )}
                                        </div>
                                    </section>

                                    {!receipt.alreadyConverted && receipt.conversionToken && (
                                        <section className="rounded-3xl bg-gradient-to-br from-[#162660] to-[#1e3a8a] p-5 text-white shadow-md">
                                            <div className="flex items-center gap-3">
                                                <img src={buddySoft} alt="" className="h-14 w-16 rounded-2xl bg-white/10 p-1.5 object-contain" />
                                                <div>
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FCCA59] px-2.5 py-0.5 text-[10px] font-black text-[#162660]">
                                                        <Sparkles className="h-3 w-3" /> 선택 · 30초 완료
                                                    </span>
                                                    <h3 className="mt-1 text-base font-black leading-snug">
                                                        학생 계정 만들고 다음 모임도 함께할까요?
                                                    </h3>
                                                </div>
                                            </div>
                                            <ul className="mt-3 space-y-1 text-xs text-blue-100">
                                                <li>✓ 방금 인증한 전화번호 · 소속 학교 자동 입력</li>
                                                <li>✓ 학번 입력 후 일반 크루 가입 절차로 바로 연결</li>
                                                <li>✓ 신청한 이벤트가 &lsquo;내 이벤트&rsquo;에 자동 연동</li>
                                            </ul>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    saveNonMemberConversionIntent(receipt.conversionToken!, receipt.crewName);
                                                    onConvertToStudent(receipt.conversionToken!, receipt.crewName);
                                                }}
                                                className="mt-4 min-h-12 w-full rounded-2xl bg-[#FCCA59] px-4 text-sm font-black text-[#162660] cursor-pointer"
                                            >
                                                SNS로 학생 계정 만들기 →
                                            </button>
                                        </section>
                                    )}
                                </div>
                            )}
                        </div>
                    </article>
                )}
            </div>
        </main>
    );
}
