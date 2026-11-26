import { useEffect, useState } from 'react';
import { Button } from '../Button';
import { getApiErrorStatus } from '../../lib/apiError';
import { formatEventDateTime } from '../../lib/eventDateTime';
import { buildEventGuestLink } from '../../lib/eventGuestLink';
import {
    getEventGuestVerificationSettings,
    issueEventGuestVerificationLink,
    revokeEventGuestVerificationLink,
    type EventGuestVerificationSettings as Settings,
} from '../../services/eventGuestVerification';

export function EventGuestVerificationSettings({ eventId }: { eventId: number }) {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [question, setQuestion] = useState('');
    const [link, setLink] = useState('');
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        getEventGuestVerificationSettings(eventId)
            .then(value => { if (active) { setSettings(value); setQuestion(value.optionalQuestion ?? ''); } })
            .catch(error => {
                // The previous API and view-only managers can still use the event dashboard.
                if (active && ![403, 404].includes(getApiErrorStatus(error) ?? 0)) {
                    setError('비회원 인증 설정을 불러오지 못했어요.');
                }
            });
        return () => { active = false; };
    }, [eventId]);

    async function issueLink() {
        if (pending || !settings?.canIssue) return;
        if (settings.linkActive && !window.confirm('새 링크를 발급하면 기존 링크를 사용할 수 없어요. 계속할까요?')) return;
        setPending(true);
        setError('');
        setMessage('');
        setLink('');
        try {
            const issued = await issueEventGuestVerificationLink(eventId, question.trim() || null);
            setLink(buildEventGuestLink(window.location.origin, issued.linkToken));
            setSettings({ ...settings, linkActive: true, expiresAt: issued.expiresAt });
        } catch {
            setError('링크를 발급하지 못했어요. 화면을 새로고침해 현재 상태를 확인해 주세요.');
        } finally {
            setPending(false);
        }
    }

    async function revokeLink() {
        if (pending || !settings?.linkActive
            || !window.confirm('이 링크와 이 링크로 진행 중인 인증을 중단할까요?')) return;
        setPending(true);
        setError('');
        setMessage('');
        try {
            await revokeEventGuestVerificationLink(eventId);
            setLink('');
            setSettings({ ...settings, linkActive: false, expiresAt: null });
            setMessage('링크를 폐기했어요.');
        } catch {
            setError('링크를 폐기하지 못했어요. 다시 시도해 주세요.');
        } finally {
            setPending(false);
        }
    }

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(link);
            setMessage('링크를 복사했어요.');
        } catch {
            setMessage('링크 주소를 선택해 직접 복사해 주세요.');
        }
    }

    if (!settings?.available && !error) return null;

    return (
        <section className="space-y-3 rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm sm:p-6" aria-label="비회원 신청 설정">
            <h2 className="text-base font-bold text-zinc-900">비회원 신청</h2>
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            {settings?.available && (
                <>
                    <p className="text-sm text-zinc-600">공유 링크를 열면 로그인 없이 문자 인증 후 이벤트에 신청할 수 있어요.</p>
                    {!settings.canIssue && (
                        <p className="text-sm text-zinc-600">공개 또는 링크 공개로 설정한 무료 이벤트에서 신청 링크를 발급할 수 있어요. 크루·학교 제한이나 크루별 정원이 없는 행사에 적용됩니다. 자동 조 배정과 추가 필수 동의 항목이 설정된 행사는 제외됩니다.</p>
                    )}
                    {settings.linkActive && settings.expiresAt && (
                        <p className="text-sm font-semibold text-[#162660]">링크 발급됨 · {formatEventDateTime(settings.expiresAt)}까지</p>
                    )}
                    {settings.canIssue && (
                        <label className="block space-y-1 text-sm font-semibold text-zinc-700">
                            추가 질문 (선택)
                            <input value={question} maxLength={160} disabled={pending}
                                onChange={event => setQuestion(event.target.value)}
                                className="block w-full rounded-xl border border-zinc-200 px-3 py-2 font-normal"
                                placeholder="예: 선호하는 게임이 있나요?" />
                        </label>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" disabled={pending || !settings.canIssue} onClick={() => void issueLink()}>
                            {settings.linkActive ? '새 링크 발급' : '신청 링크 발급'}
                        </Button>
                        {settings.linkActive && (
                            <Button type="button" variant="ghost" disabled={pending} onClick={() => void revokeLink()}>링크 폐기</Button>
                        )}
                    </div>
                    {link && (
                        <div className="flex flex-wrap gap-2">
                            <input aria-label="비회원 신청 링크" readOnly value={link} onFocus={event => event.target.select()}
                                className="min-w-0 flex-1 rounded-xl border border-zinc-200 p-2 text-sm" />
                            <Button type="button" variant="outline" onClick={() => void copyLink()}>링크 복사</Button>
                        </div>
                    )}
                </>
            )}
            {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
        </section>
    );
}
