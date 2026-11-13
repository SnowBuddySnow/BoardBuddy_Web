import { getSignupPrefill } from '../lib/signupPrefill';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, GraduationCap, ShieldCheck, UserRound } from 'lucide-react';
import { Button } from '../components/Button';
import { SchoolPicker } from '../components/SchoolPicker';
import { TermsModal } from '../components/TermsModal';
import { SIGNUP_TERMS } from '../content/signupTerms';
import apiClient from '../lib/axios';
import { clearTempAccessToken, getAccountId, getSignupToken, saveAccountId, saveAuthTokens, saveTempAccessToken } from '../lib/session';
import { confirmPhoneVerification, requestPhoneVerification } from '../services/phoneVerification';
import { getSchools, type SchoolOption } from '../services/schools';
import { getApiErrorMessage, getApiErrorStatus } from '../lib/apiError';
import { SCHOOL_EMAIL_AUTH_AVAILABLE } from '../config/features';
import { getSignupPolicy, type SignupPolicy } from '../services/signupPolicy';
import { getOnboardingStatus } from '../services/onboarding';

interface UserInfoInputProps {
    onBack: () => void;
    onSuccess?: (requiresStudentVerification?: boolean) => void;
}
const inputClass = 'mt-2 h-12 w-full min-w-0 rounded-2xl border border-zinc-300 bg-white px-4 text-base text-zinc-900 focus-visible:outline-2 focus-visible:outline-[#162660] disabled:bg-zinc-100';
const steps = ['내 정보', '본인 확인', '약관 동의'];

export default function UserInfoInput({ onBack, onSuccess }: UserInfoInputProps) {
    const [step, setStep] = useState(0);
    const [profileType, setProfileType] = useState<'GENERAL' | 'STUDENT'>('STUDENT');
    const [editProviderName, setEditProviderName] = useState(() => !getSignupPrefill().name);
    const [name, setName] = useState(() => getSignupPrefill().name || '');
    const [school, setSchool] = useState<SchoolOption | null>(null);
    const [studentNumber, setStudentNumber] = useState('');
    const [gender, setGender] = useState<'FEMALE' | 'MALE' | null>(null);
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState(() => {
        let digits = (getSignupPrefill().phoneNumber || '').replace(/\D/g, '');
        if (digits.startsWith('82')) digits = '0' + digits.slice(2);
        return /^010\d{8}$/.test(digits) ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}` : '';
    });
    const [phoneChallengeId, setPhoneChallengeId] = useState<string | null>(null);
    const [phoneCode, setPhoneCode] = useState('');
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [phoneVerificationSkipped, setPhoneVerificationSkipped] = useState(false);
    const [phoneRetryAfter, setPhoneRetryAfter] = useState(0);
    const [phoneBusy, setPhoneBusy] = useState(false);
    const [phoneNotice, setPhoneNotice] = useState('');
    const [terms, setTerms] = useState({ service: false, privacy: false });
    const [phoneConsentPreference, setPhoneConsentPreference] = useState<'each_time' | 'always'>('each_time');
    const [activeModal, setActiveModal] = useState<'service' | 'privacy' | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [schools, setSchools] = useState<SchoolOption[]>([]);
    const [schoolsLoading, setSchoolsLoading] = useState(false);
    const [schoolsError, setSchoolsError] = useState('');
    const [schoolsAttempt, setSchoolsAttempt] = useState(0);
    const [signupPolicy, setSignupPolicy] = useState<SignupPolicy | null>(null);
    const [policyError, setPolicyError] = useState('');
    const [policyAttempt, setPolicyAttempt] = useState(0);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const allTermsRef = useRef<HTMLInputElement>(null);
    const phoneEdited = useRef(false);
    const signupAllowed = !!signupPolicy && (profileType === 'STUDENT' ? signupPolicy.studentEnabled : signupPolicy.regularEnabled);
    const busy = phoneBusy || isLoading;

    useEffect(() => {
        let cancelled = false;
        const accountId = getAccountId();
        if (!accountId || !getSignupToken()) return;
        getOnboardingStatus().then(status => {
            if (cancelled || phoneEdited.current || getAccountId() !== accountId || !status.verifiedPhoneNumber) return;
            let digits = status.verifiedPhoneNumber.replace(/\D/g, '');
            if (digits.startsWith('82')) digits = '0' + digits.slice(2);
            if (!/^010\d{8}$/.test(digits)) return;
            setPhoneNumber(`${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`);
            setPhoneVerified(true);
        }).catch(() => { /* Keep the ordinary phone-verification path available. */ });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        getSignupPolicy().then(policy => {
            if (cancelled) return;
            setSignupPolicy(policy);
            if (policy.studentEnabled !== policy.regularEnabled) setProfileType(policy.studentEnabled ? 'STUDENT' : 'GENERAL');
        }).catch(() => { if (!cancelled) setPolicyError('가입 접수 상태를 불러오지 못했습니다. 다시 시도해 주세요.'); });
        return () => { cancelled = true; };
    }, [policyAttempt]);
    useEffect(() => {
        if (!signupPolicy?.studentEnabled || profileType !== 'STUDENT') return;
        let cancelled = false;
        setSchoolsLoading(true); setSchoolsError('');
        getSchools({ allowDevFallback: false }).then(data => { if (!cancelled) setSchools(data); })
            .catch(() => { if (!cancelled) setSchoolsError('학교 목록을 불러오지 못했습니다.'); })
            .finally(() => { if (!cancelled) setSchoolsLoading(false); });
        return () => { cancelled = true; };
    }, [profileType, signupPolicy?.studentEnabled, schoolsAttempt]);
    useEffect(() => {
        if (phoneRetryAfter <= 0) return;
        const timer = window.setTimeout(() => setPhoneRetryAfter(seconds => Math.max(0, seconds - 1)), 1000);
        return () => window.clearTimeout(timer);
    }, [phoneRetryAfter]);
    useEffect(() => { scrollRef.current?.scrollTo?.({ top: 0 }); titleRef.current?.focus({ preventScroll: true }); }, [step]);
    useEffect(() => { if (allTermsRef.current) allTermsRef.current.indeterminate = terms.service !== terms.privacy; }, [step, terms]);

    const personalError = () => {
        if (!name.trim()) return profileType === 'STUDENT' ? '실명을 입력해 주세요.' : '닉네임을 입력해 주세요.';
        if (profileType === 'STUDENT' && (!school || !schools.some(option => option.id === school.id))) return '검색 결과에서 학교를 선택해 주세요.';
        if (profileType === 'STUDENT' && !studentNumber.trim()) return '학번을 입력해 주세요.';
        if (!gender) return '성별을 선택해 주세요.';
        const visibleEmail = profileType === 'GENERAL' || SCHOOL_EMAIL_AUTH_AVAILABLE;
        if (visibleEmail && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return '이메일 형식을 확인해 주세요.';
        if (SCHOOL_EMAIL_AUTH_AVAILABLE && profileType === 'STUDENT' && school?.emailDomains.length) {
            const domain = email.trim().toLowerCase().split('@')[1] || '';
            if (!school.emailDomains.some(item => domain === item.toLowerCase() || domain.endsWith(`.${item.toLowerCase()}`))) return '선택한 학교의 이메일을 입력해 주세요.';
        }
        return '';
    };
    const phoneError = () => !/^010-\d{4}-\d{4}$/.test(phoneNumber) ? '휴대전화번호를 확인해 주세요. (010-1234-5678)' : !phoneVerified ? '전화번호 인증을 완료해 주세요.' : '';
    const move = (next: number) => { setError(''); setStep(next); };
    const sendCode = async () => {
        if (phoneBusy || phoneRetryAfter > 0) return;
        if (!/^010-\d{4}-\d{4}$/.test(phoneNumber)) { setError('휴대전화번호를 확인해 주세요. (010-1234-5678)'); return; }
        setPhoneBusy(true); setError(''); setPhoneNotice('');
        try {
            const challenge = await requestPhoneVerification(phoneNumber);
            setPhoneChallengeId(challenge.challengeId); setPhoneCode(''); setPhoneVerified(false); setPhoneVerificationSkipped(false);
            setPhoneRetryAfter(challenge.retryAfterSeconds); setPhoneNotice('인증번호를 보냈습니다. 문자로 받은 6자리 번호를 입력해 주세요.');
        } catch (requestError) {
            setError(getApiErrorStatus(requestError) === 503 ? '문자 발송이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.' : getApiErrorMessage(requestError) || '인증번호를 보내지 못했습니다. 다시 시도해 주세요.');
        } finally { setPhoneBusy(false); }
    };
    const confirmCode = async () => {
        if (phoneBusy || !phoneChallengeId || !/^\d{6}$/.test(phoneCode)) return;
        setPhoneBusy(true); setError('');
        try {
            const result = await confirmPhoneVerification(phoneChallengeId, phoneCode);
            saveAccountId(result.accountId); saveTempAccessToken(result.accessToken);
            setPhoneVerified(true); setPhoneVerificationSkipped(false);
            if (result.resolution === 'LINKED_EXISTING_ACCOUNT' && result.status === 'ACTIVE') {
                saveAuthTokens(result.accessToken, result.refreshToken); clearTempAccessToken(); onSuccess?.(); return;
            }
            setPhoneNotice('본인 확인을 완료했습니다. 같은 번호를 다시 인증할 필요가 없습니다.');
        } catch (requestError) { setError(getApiErrorMessage(requestError) || '인증번호가 올바르지 않거나 만료되었습니다.'); }
        finally { setPhoneBusy(false); }
    };
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (busy) return;
        if (!signupAllowed) { setError('선택한 유형의 신규 가입은 일시 중단되었습니다.'); return; }
        const firstError = personalError();
        if (firstError) { setStep(0); setError(firstError); return; }
        if (step === 0) { move(1); return; }
        const secondError = phoneError();
        if (secondError) { setStep(1); setError(secondError); return; }
        if (step === 1) { move(2); return; }
        if (!terms.service || !terms.privacy) { setError('필수 약관 두 가지에 모두 동의해 주세요.'); return; }
        const token = getSignupToken(); const accountId = getAccountId();
        if (!token || !accountId) { setError('로그인 정보가 만료되었습니다. 다시 로그인해 주세요.'); return; }
        setIsLoading(true); setError('');
        try {
            const response = await apiClient.put(`/accounts/${accountId}/profile`, {
                userType: profileType === 'STUDENT' ? 'KUSBF' : 'REGULAR', displayName: name.trim(),
                email: profileType === 'STUDENT' && !SCHOOL_EMAIL_AUTH_AVAILABLE ? undefined : email.trim() || undefined,
                schoolId: profileType === 'STUDENT' ? school?.id : undefined,
                studentNumber: profileType === 'STUDENT' ? studentNumber.trim() : undefined,
                gender, phoneNumber,
            }, { headers: { Authorization: `Bearer ${token}` } });
            const completed = response.data.data as { accessToken: string; refreshToken: string; universityVerificationStatus?: string };
            localStorage.setItem('phone_sharing_consent_preference', phoneConsentPreference);
            saveAuthTokens(completed.accessToken, completed.refreshToken); clearTempAccessToken();
            if (onSuccess) onSuccess(SCHOOL_EMAIL_AUTH_AVAILABLE && completed.universityVerificationStatus === 'PENDING');
            else onBack();
        } catch (requestError) {
            setError(getApiErrorMessage(requestError) || '가입을 완료하지 못했습니다. 입력한 정보는 유지됩니다. 다시 시도해 주세요.');
            if (getApiErrorStatus(requestError) === 403) { setStep(0); setSignupPolicy(null); setPolicyError(''); setPolicyAttempt(value => value + 1); }
        } finally { setIsLoading(false); }
    };

    if (!signupPolicy || (!signupPolicy.regularEnabled && !signupPolicy.studentEnabled)) return (
        <div className="flex h-full flex-1 items-center justify-center bg-[#FAF8F3] p-6">
            <main className="w-full max-w-md rounded-3xl bg-white p-6 text-center">
                <h1 className="text-xl font-bold text-[#162660]">회원가입 안내</h1>
                <p role={policyError ? 'alert' : 'status'} className="mt-4 text-sm leading-6 text-zinc-600">{policyError || (signupPolicy ? '현재 신규 회원가입을 일시 중단했습니다. 기존 회원은 계속 로그인할 수 있습니다.' : '가입 접수 상태를 확인하는 중...')}</p>
                {policyError && <Button type="button" onClick={() => { setPolicyError(''); setPolicyAttempt(value => value + 1); }} className="mt-5">다시 시도</Button>}
                <Button type="button" variant="ghost" onClick={onBack} className="mt-5 text-[#162660]">로그인으로 돌아가기</Button>
            </main>
        </div>
    );
    return (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-[#FAF8F3] text-zinc-900">
            <div className="mx-auto w-full max-w-6xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-8 lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:gap-12 lg:py-12">
                <aside className="mb-7 lg:mb-0 lg:pt-10">
                    <p className="text-sm font-black tracking-wide text-[#162660]">BoardBuddy</p>
                    <p className="mt-4 text-2xl font-black leading-snug text-[#162660] sm:text-3xl">함께할 준비,<br className="hidden lg:block" /> 처음 한 번이면 돼요.</p>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-600">필요한 정보만 차례대로 확인할게요.<br />가입 후 초대받은 크루로 이어갈 수 있어요.</p>
                    <ol aria-label="회원가입 진행 단계" className="mt-6 flex gap-2 lg:flex-col lg:gap-3">
                        {steps.map((label, index) => <li key={label} className="min-w-0 flex-1">
                            <button type="button" aria-current={step === index ? 'step' : undefined} disabled={index > step || busy}
                                onClick={() => move(index)} className={`flex min-h-12 w-full items-center gap-2 rounded-2xl px-3 py-3 text-left text-xs font-bold sm:text-sm lg:px-4 ${index === step ? 'bg-[#162660] text-white' : index < step ? 'bg-white text-[#162660]' : 'text-zinc-500'}`}>
                                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${index === step ? 'bg-[#FCCA59] text-[#162660]' : 'bg-zinc-200 text-zinc-700'}`}>{index < step ? <Check className="h-4 w-4" /> : index + 1}</span>{label}
                            </button>
                        </li>)}
                    </ol>
                    <p className="mt-5 hidden max-w-sm text-xs leading-6 text-zinc-600 lg:block">학생·일반 프로필은 개인 정보 유형입니다. 크루 운영 권한은 가입 후 별도 승인 절차에 따라 연결됩니다.</p>
                </aside>
                <main className="min-w-0 rounded-3xl bg-white p-5 shadow-sm sm:p-8">
                    <button type="button" disabled={busy} onClick={() => step > 0 ? move(step - 1) : onBack()} className="mb-5 flex min-h-11 items-center gap-1 text-sm font-bold text-[#162660]"><ArrowLeft className="h-4 w-4" />{step > 0 ? '이전 단계' : '로그인으로'}</button>
                    <p className="text-xs font-bold text-zinc-500">{step + 1} / 3 · {steps[step]}</p>
                    <h1 ref={titleRef} tabIndex={-1} className="mt-2 scroll-mt-5 text-2xl font-black leading-snug text-[#162660]">{['나를 소개해 주세요.', '본인을 확인할게요.', '동의 내용을 확인해 주세요.'][step]}</h1>
                    <p className="mt-3 text-sm leading-6 text-zinc-600">{['학교 정보는 내 소속 확인에 사용해요. 초대한 크루의 학교와 달라도 내 정보를 입력해 주세요.', '이미 가입했다면 기존 계정에 연결해 중복 가입을 줄여요.', '필수 동의와 선택 설정을 구분했어요. 약관을 읽기만 해서는 동의 처리되지 않아요.'][step]}</p>
                    <form noValidate onSubmit={submit} className="mt-7 space-y-6">
                        <p className="text-xs text-zinc-500">* 필수 입력 · (선택) 항목은 입력하지 않아도 가입할 수 있어요.</p>
                        {step === 0 && <>
                            <p className="rounded-2xl bg-[#FAF8F3] p-4 text-sm leading-6">카카오에서 제공한 이름이 있으면 채워드려요. 학생은 실제 이름인지 확인하고, 다르면 수정해 주세요. 닉네임을 실명으로 자동 판단하지 않아요.</p>
                            <div className="grid grid-cols-2 gap-3">
                                {(['STUDENT', 'GENERAL'] as const).map(type => { const Icon = type === 'STUDENT' ? GraduationCap : UserRound; const allowed = type === 'STUDENT' ? signupPolicy.studentEnabled : signupPolicy.regularEnabled;
                                    return <button key={type} type="button" aria-pressed={profileType === type} disabled={!allowed}
                                        onClick={() => { setProfileType(type); setError(''); }} className={`min-h-24 min-w-0 rounded-2xl border-2 p-3 text-left disabled:opacity-50 sm:p-4 ${profileType === type ? 'border-[#162660] bg-[#FAF8F3]' : 'border-zinc-200'}`}>
                                        <span className="flex items-center gap-2 text-sm font-black text-[#162660]"><Icon className="h-5 w-5 shrink-0" />{type === 'STUDENT' ? '학생' : '일반'}</span>
                                        <span className="mt-2 block text-xs leading-5 text-zinc-600">{allowed ? type === 'STUDENT' ? '학교 정보를 등록합니다.' : '학교 정보 없이 가입합니다.' : '신규 가입 일시 중단'}</span>
                                    </button>;
                                })}
                            </div>
                            <label className="block text-sm font-bold text-[#162660]">{profileType === 'STUDENT' ? '실명' : '닉네임'} *
                                <input readOnly={!editProviderName} autoComplete="name" maxLength={50} value={name} onChange={event => setName(event.target.value)} className={inputClass} placeholder={profileType === 'STUDENT' ? '김보드' : '보드버디'} />
                            </label>
                            {!editProviderName && <button type="button" onClick={() => setEditProviderName(true)} className="min-h-11 text-sm font-bold text-[#162660] underline">내 이름이 아니에요 · 수정하기</button>}
                            {profileType === 'STUDENT' && <div className="grid min-w-0 gap-5 sm:grid-cols-2">
                                <SchoolPicker value={school} options={schools} loading={schoolsLoading} error={schoolsError} onRetry={() => setSchoolsAttempt(value => value + 1)} onChange={setSchool} />
                                <label className="block min-w-0 text-sm font-bold text-[#162660]">학번 *<input value={studentNumber} maxLength={30} onChange={event => setStudentNumber(event.target.value)} className={inputClass} placeholder="학교에서 사용하는 학번" /><span className="mt-2 block text-xs font-normal leading-5 text-zinc-600">운영진이 동명이인을 구분할 때 사용해요.</span></label>
                            </div>}
                            <fieldset><legend className="text-sm font-bold text-[#162660]">성별 *</legend><div className="mt-2 flex flex-wrap gap-3">
                                {(['FEMALE', 'MALE'] as const).map(value => <label key={value} className="flex min-h-12 flex-1 items-center gap-3 rounded-2xl border border-zinc-200 px-4 text-sm"><input type="radio" name="gender" checked={gender === value} onChange={() => setGender(value)} className="h-5 w-5 accent-[#162660]" />{value === 'FEMALE' ? '여자' : '남자'}</label>)}
                            </div></fieldset>
                            {(profileType === 'GENERAL' || SCHOOL_EMAIL_AUTH_AVAILABLE) && <label className="block text-sm font-bold text-[#162660]">이메일 {profileType === 'STUDENT' && school?.emailDomains.length ? '(학교 인증용 · 선택)' : '(선택)'}<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className={inputClass} placeholder="name@example.com" /></label>}
                        </>}
                        {step === 1 && <>
                            <p className="text-sm leading-6 text-zinc-600">카카오 전화번호가 제공되면 미리 채워드려요. 번호를 확인한 뒤 문자 인증을 완료해 주세요.</p>
                            <label className="block text-sm font-bold text-[#162660]">휴대전화번호 *
                                <input type="tel" inputMode="tel" autoComplete="tel-national" value={phoneNumber} disabled={phoneBusy} className={inputClass} placeholder="010-1234-5678"
                                    onChange={event => { phoneEdited.current = true; const digits = event.target.value.replace(/\D/g, '').slice(0, 11); setPhoneNumber(digits.length > 7 ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}` : digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits); setPhoneChallengeId(null); setPhoneCode(''); setPhoneVerified(false); setPhoneVerificationSkipped(false); setPhoneNotice(''); }} />
                            </label>
                            {phoneVerified ? <p role="status" className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800"><ShieldCheck className="h-5 w-5" />{phoneVerificationSkipped ? '개발환경 인증 생략 상태' : '본인 확인 완료'}</p> : <>
                                <Button type="button" onClick={sendCode} disabled={phoneBusy || phoneRetryAfter > 0} className="min-h-12 w-full rounded-2xl border-[#162660] bg-[#162660] hover:bg-[#243878]">{phoneBusy ? '확인 중...' : phoneRetryAfter > 0 ? `${phoneRetryAfter}초 후 재전송 가능` : phoneChallengeId ? '인증번호 다시 받기' : '인증번호 받기'}</Button>
                                {phoneChallengeId && <div className="text-sm font-bold text-[#162660]"><label htmlFor="signup-phone-code">인증번호 *</label>
                                    <input id="signup-phone-code" value={phoneCode} disabled={phoneBusy} inputMode="numeric" autoComplete="one-time-code" maxLength={6} onChange={event => setPhoneCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className={inputClass} placeholder="6자리 인증번호" />
                                    <Button type="button" onClick={confirmCode} disabled={phoneBusy || phoneCode.length !== 6} className="mt-3 min-h-12 w-full rounded-2xl border-[#162660] bg-[#162660] hover:bg-[#243878]">인증번호 확인</Button>
                                </div>}
                            </>}
                            {phoneNotice && <p role="status" className="text-sm leading-6 text-zinc-600">{phoneNotice}</p>}
                            {import.meta.env.DEV && !phoneVerified && <button type="button" onClick={() => { if (/^010-\d{4}-\d{4}$/.test(phoneNumber)) { setPhoneVerified(true); setPhoneVerificationSkipped(true); } else setError('개발 테스트용 전화번호 형식을 확인해 주세요.'); }} className="min-h-11 text-xs text-zinc-500 underline">개발환경에서만 인증 생략</button>}
                        </>}
                        {step === 2 && <>
                            <label className="flex min-h-14 items-center gap-3 rounded-2xl bg-[#FAF8F3] p-4 text-sm font-bold text-[#162660]"><input ref={allTermsRef} type="checkbox" aria-checked={terms.service !== terms.privacy ? 'mixed' : terms.service && terms.privacy} checked={terms.service && terms.privacy} onChange={event => setTerms({ service: event.target.checked, privacy: event.target.checked })} className="h-5 w-5 shrink-0 accent-[#162660]" />필수 약관 모두 동의</label>
                            {(['service', 'privacy'] as const).map(key => <div key={key} className="rounded-2xl border border-zinc-200 p-4">
                                <label className="flex min-h-11 items-start gap-3 text-sm font-semibold leading-6"><input type="checkbox" checked={terms[key]} onChange={event => setTerms(current => ({ ...current, [key]: event.target.checked }))} className="mt-0.5 h-5 w-5 shrink-0 accent-[#162660]" /><span>{SIGNUP_TERMS[key].title} <span className="font-normal text-zinc-600">(필수)</span></span></label>
                                <button type="button" onClick={() => setActiveModal(key)} aria-label={`${SIGNUP_TERMS[key].title} 자세히 보기`} className="ml-8 min-h-11 text-sm text-[#162660] underline">자세히 보기</button>
                            </div>)}
                            <fieldset className="border-t border-zinc-200 pt-5"><legend className="text-sm font-bold text-[#162660]">전화번호 제공 방식 (선택)</legend>
                                <p className="mt-2 text-xs leading-6 text-zinc-600">모임 관리자에게 번호를 제공할 때의 설정이에요. 필수 약관 모두 동의에는 포함되지 않으며, 계정 관리에서 변경할 수 있어요.</p>
                                {(['each_time', 'always'] as const).map(value => <label key={value} className="mt-2 flex min-h-12 items-center gap-3 text-sm"><input type="radio" name="phoneConsentPref" checked={phoneConsentPreference === value} onChange={() => setPhoneConsentPreference(value)} className="h-5 w-5 accent-[#162660]" />{value === 'each_time' ? '제공할 때마다 확인' : '항상 동의'}</label>)}
                            </fieldset>
                        </>}
                        {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-800">{error}</p>}
                        <Button type="submit" disabled={busy || !signupAllowed || (step === 2 && (!terms.service || !terms.privacy))} className="min-h-14 w-full rounded-2xl border-[#162660] bg-[#162660] font-bold hover:bg-[#243878]">{isLoading ? '가입 중...' : step === 2 ? '필수 약관 전체 동의 후 가입 완료' : '다음'}</Button>
                    </form>
                </main>
            </div>
            <TermsModal isOpen={activeModal !== null} onClose={() => setActiveModal(null)} title={activeModal ? SIGNUP_TERMS[activeModal].title : ''} content={activeModal ? SIGNUP_TERMS[activeModal].content : ''} onAgree={() => { if (activeModal) setTerms(current => ({ ...current, [activeModal]: true })); setActiveModal(null); }} />
        </div>
    );
}
