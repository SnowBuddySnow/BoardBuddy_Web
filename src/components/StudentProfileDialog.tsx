import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getApiErrorMessage } from '../lib/apiError';
import { SCHOOL_EMAIL_AUTH_AVAILABLE } from '../config/features';
import { getSchools, type SchoolOption } from '../services/schools';
import { convertAdminUserToStudent, type AdminUser } from '../services/userAdmin';

interface StudentProfileDialogProps {
    user: AdminUser;
    onClose: () => void;
    onConverted: (user: AdminUser) => void;
}

export default function StudentProfileDialog({ user, onClose, onConverted }: StudentProfileDialogProps) {
    const [displayName, setDisplayName] = useState(user.name);
    const [schoolId, setSchoolId] = useState('');
    const [studentNumber, setStudentNumber] = useState('');
    const [schools, setSchools] = useState<SchoolOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [loadError, setLoadError] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const dialogRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const opener = document.activeElement as HTMLElement | null;
        dialogRef.current?.querySelector('input')?.focus();
        return () => { if (opener?.isConnected) opener.focus(); };
    }, []);

    useEffect(() => {
        let cancelled = false;
        getSchools({ allowDevFallback: false })
            .then(result => {
                if (!cancelled) setSchools(result);
            })
            .catch(() => {
                if (!cancelled) setLoadError('학교 목록을 불러오지 못했습니다. 다시 시도해 주세요.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [loadAttempt]);

    const ready = displayName.trim() && schoolId && studentNumber.trim() && !loading && !loadError;

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!ready || saving) return;
        setSaving(true);
        setError('');
        try {
            const updated = await convertAdminUserToStudent(user.accountId, {
                displayName: displayName.trim(),
                schoolId: Number(schoolId),
                studentNumber: studentNumber.trim(),
            });
            onConverted(updated);
        } catch (updateError) {
            setError(getApiErrorMessage(updateError) || '학생으로 변경하지 못했습니다. 입력 정보를 확인해 주세요.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/45 p-4">
            <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="student-profile-title"
                aria-describedby="student-profile-description"
                className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
                onKeyDown={event => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        if (!saving) onClose();
                    }
                    if (event.key === 'Tab') {
                        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
                            'input:not([disabled]), select:not([disabled]), button:not([disabled])',
                        ));
                        const first = controls[0];
                        const last = controls[controls.length - 1];
                        if (!first) event.preventDefault();
                        else if (event.shiftKey && document.activeElement === first) {
                            event.preventDefault();
                            last.focus();
                        } else if (!event.shiftKey && document.activeElement === last) {
                            event.preventDefault();
                            first.focus();
                        }
                    }
                }}
            >
                <h2 id="student-profile-title" className="text-lg font-black text-zinc-900">학생으로 변경</h2>
                <p className="mt-2 text-xs text-zinc-500">{user.name || '이름 미등록'} · {user.userCode} · ID {user.accountId}</p>
                <p id="student-profile-description" className="mt-3 text-sm leading-6 text-zinc-600">
                    학생의 실명, 학교, 학번을 확인해 주세요.{' '}
                    {SCHOOL_EMAIL_AUTH_AVAILABLE
                        ? '변경 후 학교 이메일 인증은 본인이 별도로 진행해야 합니다. '
                        : '학교 이메일 인증은 현재 준비 중이며, 변경 후에도 미인증 상태입니다. '}
                    기존 크루 소속과 관리자 권한은 유지됩니다.
                </p>
                <form onSubmit={event => void submit(event)} className="mt-5 space-y-4">
                    <label className="block text-sm font-bold text-zinc-700">
                        실명
                        <input
                            required maxLength={50} value={displayName}
                            disabled={saving} onChange={event => setDisplayName(event.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-zinc-300 px-3 py-2.5 font-normal"
                        />
                    </label>
                    <label className="block text-sm font-bold text-zinc-700">
                        학교
                        <select
                            required value={schoolId} disabled={loading || saving || !!loadError}
                            onChange={event => setSchoolId(event.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 font-normal"
                        >
                            <option value="">{loading ? '학교 목록을 불러오는 중...' : '학교를 선택해 주세요'}</option>
                            {schools.map(school => <option key={school.id} value={school.id}>{school.name}</option>)}
                        </select>
                    </label>
                    {!loading && !loadError && schools.length === 0 && (
                        <p className="text-sm text-amber-700">등록된 학교가 없습니다. 학교 관리에서 먼저 학교를 등록해 주세요.</p>
                    )}
                    {loadError && (
                        <div role="alert" className="text-sm text-red-700">
                            <p>{loadError}</p>
                            <button type="button" className="mt-2 font-bold underline" onClick={() => {
                                setLoadError('');
                                setLoading(true);
                                setLoadAttempt(current => current + 1);
                            }}>학교 목록 다시 불러오기</button>
                        </div>
                    )}
                    <label className="block text-sm font-bold text-zinc-700">
                        학번
                        <input
                            required maxLength={30} value={studentNumber} disabled={saving}
                            onChange={event => setStudentNumber(event.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-zinc-300 px-3 py-2.5 font-normal"
                        />
                    </label>
                    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" disabled={saving} onClick={onClose}
                            className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-black disabled:opacity-40">취소</button>
                        <button type="submit" disabled={!ready || saving}
                            className="rounded-xl bg-[#162660] px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">
                            {saving ? '변경 중...' : '학생으로 변경'}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
