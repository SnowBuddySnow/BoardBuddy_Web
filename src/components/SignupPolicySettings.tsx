import { useEffect, useState } from 'react';
import { getApiErrorMessage, getApiErrorStatus } from '../lib/apiError';
import { getSignupPolicy, updateSignupPolicy, type SignupPolicy, type SignupType } from '../services/signupPolicy';

const types = [
    { type: 'REGULAR', label: '일반회원', key: 'regularEnabled' },
    { type: 'KUSBF', label: '학생', key: 'studentEnabled' },
] as const;

export default function SignupPolicySettings() {
    const [policy, setPolicy] = useState<SignupPolicy | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [pending, setPending] = useState<SignupType | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getSignupPolicy().then(value => { if (!cancelled) setPolicy(value); })
            .catch(() => { if (!cancelled) setError('가입 허용 설정을 불러오지 못했습니다. 다시 시도해 주세요.'); });
        return () => { cancelled = true; };
    }, [attempt]);

    const save = async () => {
        if (!policy || !pending || saving) return;
        const item = types.find(item => item.type === pending)!;
        const enabled = !policy[item.key];
        setSaving(true);
        setError('');
        setNotice('');
        try {
            setPolicy(await updateSignupPolicy(pending, enabled, policy.version));
            setNotice(`${item.label} 신규 가입을 ${enabled ? '재개' : '중단'}했습니다.`);
            setPending(null);
        } catch (saveError) {
            if (getApiErrorStatus(saveError) === 409) {
                setError('다른 개발자가 설정을 변경했습니다. 최신 설정을 불러온 뒤 다시 확인해 주세요.');
                setPolicy(null);
                setPending(null);
            } else {
                setError(getApiErrorMessage(saveError) || '가입 허용 설정을 저장하지 못했습니다.');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <section aria-labelledby="signup-policy-title" className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:p-5">
            <h2 id="signup-policy-title" className="font-black text-zinc-900">회원 유형별 가입 허용</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">중단한 유형은 신규 가입을 완료할 수 없습니다. 기존 회원의 로그인·이용과 개발자의 회원 유형 변경은 유지됩니다.</p>
            {policy ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {types.map(item => (
                        <div key={item.type} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-4">
                            <div><p className="text-sm font-black">{item.label}</p>
                                <p className={`mt-1 text-xs font-bold ${policy[item.key] ? 'text-emerald-700' : 'text-amber-700'}`}>
                                    {policy[item.key] ? '신규 가입 허용' : '신규 가입 일시 중단'}
                                </p>
                            </div>
                            <button type="button" disabled={saving} onClick={() => { setPending(item.type); setError(''); setNotice(''); }}
                                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-black text-[#162660] disabled:opacity-40">
                                {item.label} 가입 {policy[item.key] ? '중단' : '재개'}
                            </button>
                        </div>
                    ))}
                </div>
            ) : !error && <p role="status" className="mt-3 text-sm text-zinc-500">가입 허용 설정을 불러오는 중...</p>}
            {pending && policy && (
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-bold text-blue-900">{types.find(item => item.type === pending)!.label} 신규 가입을 {policy[pending === 'REGULAR' ? 'regularEnabled' : 'studentEnabled'] ? '중단' : '재개'}합니다. 기존 회원은 계속 이용할 수 있습니다.</p>
                    <div className="mt-3 flex gap-2">
                        <button type="button" disabled={saving} onClick={() => void save()} className="rounded-lg bg-[#162660] px-4 py-2 text-sm font-black text-white disabled:opacity-40">{saving ? '저장 중...' : '설정 변경 확인'}</button>
                        <button type="button" disabled={saving} onClick={() => setPending(null)} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-bold">취소</button>
                    </div>
                </div>
            )}
            {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
            {notice && <p role="status" className="mt-3 text-sm font-bold text-emerald-700">{notice}</p>}
            {error && !policy && <button type="button" onClick={() => { setError(''); setAttempt(value => value + 1); }} className="mt-3 text-sm font-bold text-[#162660] underline">가입 허용 설정 다시 불러오기</button>}
        </section>
    );
}
