import { useEffect, useMemo, useState, type ReactNode } from 'react';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, LoaderCircle, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { getApiErrorMessage } from '../lib/apiError';
import { getAccountId } from '../lib/session';
import {
    completeAuditSignup,
    createSignupAudit,
    deleteSignupAudit,
    getAuditSchools,
    type SignupAuditAccount,
} from '../services/signupAudit';
import { confirmPhoneVerification, requestPhoneVerification } from '../services/phoneVerification';
import type { SchoolOption } from '../services/schools';

interface SignupAuditProps {
    onBack: () => void;
}

type CheckState = 'idle' | 'running' | 'passed' | 'failed';

const statusText: Record<CheckState, string> = {
    idle: '대기',
    running: '확인 중',
    passed: '통과',
    failed: '실패',
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

export default function SignupAudit({ onBack }: SignupAuditProps) {
    const [oauthState, setOauthState] = useState<CheckState>('idle');
    const [smsState, setSmsState] = useState<CheckState>('idle');
    const [schoolState, setSchoolState] = useState<CheckState>('idle');
    const [signupState, setSignupState] = useState<CheckState>('idle');
    const [message, setMessage] = useState('각 단계는 현재 배포된 API를 직접 호출합니다.');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [challengeId, setChallengeId] = useState<string | null>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [audit, setAudit] = useState<SignupAuditAccount | null>(null);
    const [schools, setSchools] = useState<SchoolOption[]>([]);
    const [schoolQuery, setSchoolQuery] = useState('');
    const [schoolId, setSchoolId] = useState<number | null>(null);
    const [displayName, setDisplayName] = useState('가입 점검 계정');
    const [studentNumber, setStudentNumber] = useState('');
    const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (window.Kakao && !window.Kakao.isInitialized()) {
            const key = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;
            if (key && key !== 'YOUR_KAKAO_JAVASCRIPT_KEY') window.Kakao.init(key);
        }
    }, []);

    const filteredSchools = useMemo(() => {
        const query = schoolQuery.trim().toLocaleLowerCase('ko-KR');
        if (!query) return schools;
        return schools.filter((school) => (
            school.name.toLocaleLowerCase('ko-KR').includes(query)
            || (school.aliases ?? []).some((alias) => alias.toLocaleLowerCase('ko-KR').includes(query))
        ));
    }, [schoolQuery, schools]);

    const runOAuthCheck = () => {
        if (!window.Kakao || !window.Kakao.isInitialized()) {
            setOauthState('failed');
            setMessage('Kakao SDK가 초기화되지 않았습니다. 배포 환경 키를 확인하세요.');
            return;
        }
        setOauthState('running');
        window.Kakao.Auth.login({
            success: async (auth) => {
                try {
                    const response = await axios.post(`${apiBaseUrl}/auth/social/kakao`, undefined, {
                        headers: { Authorization: `Bearer ${auth.access_token}` },
                    });
                    const returnedAccountId = String(response.data?.data?.accountId ?? '');
                    const currentAccountId = getAccountId() ?? '';
                    if (currentAccountId && returnedAccountId !== currentAccountId) {
                        throw new Error('다른 카카오 계정으로 인증되었습니다.');
                    }
                    setOauthState('passed');
                    setMessage(`OAuth 통과: 계정 ${returnedAccountId || '확인됨'}이(가) 정상 인증되었습니다.`);
                } catch (error) {
                    setOauthState('failed');
                    setMessage(getApiErrorMessage(error) || 'OAuth 확인에 실패했습니다.');
                }
            },
            fail: () => {
                setOauthState('failed');
                setMessage('카카오 인증이 취소되었거나 실패했습니다.');
            },
        });
    };

    const requestSms = async () => {
        setBusy(true);
        setSmsState('running');
        try {
            const result = await requestPhoneVerification(phoneNumber);
            setChallengeId(result.challengeId);
            setMessage('실제 SMS를 보냈습니다. 받은 6자리 코드를 입력하세요.');
        } catch (error) {
            setSmsState('failed');
            setMessage(getApiErrorMessage(error) || 'SMS 요청에 실패했습니다.');
        } finally {
            setBusy(false);
        }
    };

    const confirmSms = async () => {
        if (!challengeId) return;
        setBusy(true);
        try {
            const result = await confirmPhoneVerification(challengeId, verificationCode);
            setSmsState('passed');
            setMessage(`SMS 통과: ${result.resolution} (계정 ${result.accountId})`);
        } catch (error) {
            setSmsState('failed');
            setMessage(getApiErrorMessage(error) || 'SMS 코드 확인에 실패했습니다.');
        } finally {
            setBusy(false);
        }
    };

    const prepareAudit = async () => {
        setBusy(true);
        setSchoolState('running');
        try {
            if (audit) {
                await deleteSignupAudit(audit.accountId);
                setAudit(null);
            }
            const created = await createSignupAudit();
            setAudit(created);
            const loadedSchools = await getAuditSchools(created.accessToken);
            setSchools(loadedSchools);
            setSchoolId(loadedSchools[0]?.id ?? null);
            setStudentNumber(`AUDIT-${created.accountId}`);
            setSchoolState('passed');
            setSignupState('idle');
            setMessage(`격리 계정 ${created.accountCode || created.accountId} 생성 및 학교 ${loadedSchools.length}개 조회 완료.`);
        } catch (error) {
            setSchoolState('failed');
            setMessage(getApiErrorMessage(error) || '가입 점검 계정 준비에 실패했습니다.');
        } finally {
            setBusy(false);
        }
    };

    const completeSignup = async () => {
        if (!audit || !schoolId) return;
        setBusy(true);
        setSignupState('running');
        try {
            const result = await completeAuditSignup(audit, {
                displayName: displayName.trim(),
                schoolId,
                studentNumber: studentNumber.trim(),
                gender,
            });
            setSignupState('passed');
            setMessage(`가입 완료 통과: ${result.accountCode || result.accountId} / ${result.userType}`);
        } catch (error) {
            setSignupState('failed');
            setMessage(getApiErrorMessage(error) || '프로필 완료 API 확인에 실패했습니다.');
        } finally {
            setBusy(false);
        }
    };

    const cleanup = async () => {
        if (!audit) return;
        setBusy(true);
        try {
            await deleteSignupAudit(audit.accountId);
            setAudit(null);
            setSchools([]);
            setSchoolId(null);
            setMessage('격리 점검 계정을 삭제했습니다. 실제 개발자 계정에는 변경이 없습니다.');
        } catch (error) {
            setMessage(getApiErrorMessage(error) || '점검 계정 삭제에 실패했습니다.');
        } finally {
            setBusy(false);
        }
    };

    const Stage = ({ title, state, children }: { title: string; state: CheckState; children: ReactNode }) => (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-black text-zinc-900">{title}</h2>
                <span className={`rounded-full px-2.5 py-1 text-xs font-black ${
                    state === 'passed' ? 'bg-emerald-100 text-emerald-700'
                        : state === 'failed' ? 'bg-rose-100 text-rose-700'
                            : state === 'running' ? 'bg-amber-100 text-amber-700'
                                : 'bg-zinc-100 text-zinc-500'
                }`}>
                    {state === 'passed' && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}
                    {statusText[state]}
                </span>
            </div>
            {children}
        </section>
    );

    return (
        <div className="h-full overflow-y-auto bg-[#FAF8F3] px-6 py-6 lg:px-10">
            <div className="mx-auto max-w-5xl pb-16">
                <button type="button" onClick={onBack} className="mb-5 flex items-center gap-2 text-sm font-bold text-zinc-600 hover:text-zinc-950">
                    <ArrowLeft className="h-4 w-4" /> 돌아가기
                </button>
                <div className="mb-6">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#162660]">Developer</p>
                    <h1 className="mt-1 text-3xl font-black text-zinc-950">프로덕션 가입 점검</h1>
                    <p className="mt-2 text-sm text-zinc-600">OAuth와 SMS는 현재 계정으로 재검증하고, 나머지는 삭제 가능한 격리 계정으로 실제 가입 API를 실행합니다.</p>
                </div>

                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>{message}</p>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                    <Stage title="1. Kakao OAuth" state={oauthState}>
                        <p className="mb-4 text-sm text-zinc-600">카카오 SDK와 <code>/auth/social/kakao</code>를 다시 호출해 현재 개발자 계정과 일치하는지 확인합니다.</p>
                        <button type="button" onClick={runOAuthCheck} className="w-full rounded-xl bg-[#FEE500] px-4 py-3 text-sm font-black text-zinc-950 hover:brightness-95">
                            카카오 OAuth 다시 확인
                        </button>
                    </Stage>

                    <Stage title="2. 실제 SMS 인증" state={smsState}>
                        <div className="space-y-3">
                            <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="01012345678" className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm" />
                            <button type="button" disabled={busy || !phoneNumber.trim()} onClick={requestSms} className="w-full rounded-xl bg-[#162660] px-4 py-3 text-sm font-black text-white disabled:opacity-40">
                                실제 인증번호 발송
                            </button>
                            {challengeId && (
                                <div className="flex gap-2">
                                    <input value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6자리 코드" className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-sm" />
                                    <button type="button" disabled={busy || verificationCode.length !== 6} onClick={confirmSms} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-40">확인</button>
                                </div>
                            )}
                        </div>
                    </Stage>

                    <Stage title="3. 학교 목록과 선택" state={schoolState}>
                        <button type="button" disabled={busy} onClick={prepareAudit} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#162660] px-4 py-3 text-sm font-black text-white disabled:opacity-40">
                            {busy && schoolState === 'running' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            격리 가입 계정 준비
                        </button>
                        {audit && (
                            <div className="space-y-2">
                                <input value={schoolQuery} onChange={(event) => setSchoolQuery(event.target.value)} placeholder="학교 검색" className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm" />
                                <select value={schoolId ?? ''} onChange={(event) => setSchoolId(Number(event.target.value))} className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm">
                                    {filteredSchools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
                                </select>
                            </div>
                        )}
                    </Stage>

                    <Stage title="4. 가입 완료" state={signupState}>
                        <div className="space-y-2">
                            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="이름" className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm" />
                            <input value={studentNumber} onChange={(event) => setStudentNumber(event.target.value)} placeholder="학번" className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm" />
                            <select value={gender} onChange={(event) => setGender(event.target.value as 'MALE' | 'FEMALE')} className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm">
                                <option value="MALE">남성</option>
                                <option value="FEMALE">여성</option>
                            </select>
                            <button type="button" disabled={busy || !audit || !schoolId || !displayName.trim() || !studentNumber.trim() || signupState === 'passed'} onClick={completeSignup} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-40">
                                실제 프로필 완료 API 실행
                            </button>
                        </div>
                    </Stage>
                </div>

                {audit && (
                    <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-white p-4">
                        <p className="text-sm text-zinc-600">점검 계정 #{audit.accountId} · 합성 전화번호 {audit.phoneNumber}</p>
                        <button type="button" disabled={busy} onClick={cleanup} className="flex shrink-0 items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">
                            <Trash2 className="h-4 w-4" /> 점검 계정 삭제
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
