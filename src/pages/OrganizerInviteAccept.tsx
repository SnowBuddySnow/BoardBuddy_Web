import { useEffect, useState } from 'react';
import { CheckCircle2, Link2, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '../components/Button';
import {
    acceptOrganizerInviteLink,
    previewOrganizerInviteLink,
} from '../services/organizerGroup';
import type {
    OrganizerGroupInviteLinkAcceptance,
    OrganizerGroupInviteLinkPreview,
} from '../types/api';
import { getApiErrorMessage, getApiErrorStatus } from '../lib/apiError';
import boardBuddyLogo from '../assets/boardbuddy-logo.png';

interface OrganizerInviteAcceptProps {
    token: string;
    onDone: () => void;
    onCancel: () => void;
}

const eligibilityText = (reason: string) => {
    if (reason.startsWith('Eligible')) return '현재 계정으로 참여할 수 있습니다.';
    if (reason.includes('crew captain or assigned event manager')) return '이벤트 그룹 관리 권한이 있는 계정만 수락할 수 있습니다.';
    if (reason.includes('assigned event manager')) return '이 링크는 크루에서 지정된 이벤트 매니저만 수락할 수 있습니다.';
    if (reason.includes('crew manager, captain')) return '이벤트 운영 권한이 있는 계정만 수락할 수 있습니다.';
    if (reason.includes('active crew membership')) return '활성 크루 가입 정보가 필요합니다.';
    if (reason.includes('already belong')) return '이미 이 운영진 그룹에 참여하고 있습니다.';
    if (reason.includes('expired, exhausted, or revoked')) return '만료되었거나 사용이 끝난 초대 링크입니다.';
    return reason;
};

export default function OrganizerInviteAccept({
    token,
    onDone,
    onCancel,
}: OrganizerInviteAcceptProps) {
    const [preview, setPreview] = useState<OrganizerGroupInviteLinkPreview | null>(null);
    const [accepted, setAccepted] = useState<OrganizerGroupInviteLinkAcceptance | null>(null);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        previewOrganizerInviteLink(token)
            .then((data) => {
                if (!cancelled) setPreview(data);
            })
            .catch((requestError: unknown) => {
                if (cancelled) return;
                setError(getApiErrorStatus(requestError) === 404
                    ? '유효하지 않은 초대 링크입니다.'
                    : getApiErrorMessage(requestError) || '초대 정보를 불러오지 못했습니다.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [token]);

    const handleAccept = async () => {
        if (!preview?.eligible) return;
        try {
            setAccepting(true);
            const result = await acceptOrganizerInviteLink(token);
            setAccepted(result);
            window.history.replaceState({}, '', window.location.pathname);
        } catch (requestError: unknown) {
            setError(getApiErrorMessage(requestError) || '초대 수락에 실패했습니다.');
        } finally {
            setAccepting(false);
        }
    };

    return (
        <div className="flex min-h-full flex-1 flex-col bg-[#FAF8F3]">
            <header className="flex items-center justify-center border-b border-zinc-100 bg-white px-5 py-4">
                <img src={boardBuddyLogo} alt="BoardBuddy" className="h-8 w-32 object-cover object-center" />
            </header>
            <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
                <section className="w-full max-w-lg rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm sm:p-8">
                    {loading ? (
                        <div className="flex flex-col items-center py-12 text-zinc-500">
                            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-[#162660]" />
                            <p className="text-sm">초대 자격을 확인하고 있습니다...</p>
                        </div>
                    ) : accepted ? (
                        <div className="text-center">
                            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                            <h1 className="mt-4 text-xl font-black text-zinc-900">운영진 그룹에 참여했습니다</h1>
                            <p className="mt-2 text-sm text-zinc-500">
                                {accepted.groupName} · {accepted.crewName}
                            </p>
                            <p className="mt-1 text-xs font-bold text-[#162660]">{accepted.role}</p>
                            <Button
                                variant="primary"
                                onClick={onDone}
                                className="mt-6 w-full rounded-full bg-[#162660] text-white"
                            >
                                BoardBuddy로 이동
                            </Button>
                        </div>
                    ) : error ? (
                        <div className="text-center">
                            <XCircle className="mx-auto h-12 w-12 text-red-500" />
                            <h1 className="mt-4 text-xl font-black text-zinc-900">초대를 확인할 수 없습니다</h1>
                            <p className="mt-2 text-sm text-zinc-500">{error}</p>
                            <Button variant="outline" onClick={onCancel} className="mt-6 w-full rounded-full">
                                홈으로 돌아가기
                            </Button>
                        </div>
                    ) : preview && (
                        <>
                            <div className="border-b border-zinc-100 pb-5">
                                <div className="flex items-center gap-2 text-xs font-bold text-[#162660]">
                                    <Link2 className="h-4 w-4" />
                                    운영진 초대
                                </div>
                                <h1 className="mt-3 text-2xl font-black text-zinc-900">{preview.groupName}</h1>
                                <p className="mt-2 text-sm text-zinc-500">
                                    수락하면 {preview.proposedRole === 'EVENT_GROUP_MANAGER' ? 'Manager' : 'Viewer'} 권한으로 참여합니다.
                                </p>
                            </div>

                            <div className="mt-5 rounded-2xl bg-zinc-50 p-4">
                                <p className="text-xs text-zinc-400">링크 만료</p>
                                <p className="mt-1 text-sm font-bold text-zinc-800">
                                    {new Date(preview.expiresAt).toLocaleString('ko-KR')}
                                </p>
                            </div>

                            <div className={`mt-4 rounded-2xl border p-4 ${
                                preview.eligible
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                    : 'border-amber-200 bg-amber-50 text-amber-900'
                            }`}>
                                <div className="flex items-start gap-3">
                                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold">
                                            {preview.eligible ? '참여할 수 있습니다' : '현재 계정은 수락할 수 없습니다'}
                                        </p>
                                        {!preview.eligible && (
                                            <p className="mt-1 text-xs leading-relaxed">
                                                {eligibilityText(preview.eligibilityReason)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Button
                                variant="primary"
                                onClick={handleAccept}
                                disabled={!preview.eligible || accepting}
                                className="mt-6 w-full rounded-full bg-[#162660] text-white disabled:bg-zinc-300"
                            >
                                {accepting
                                    ? '참여 처리 중...'
                                    : `${preview.proposedRole === 'EVENT_GROUP_MANAGER' ? 'Manager' : 'Viewer'}로 참여하기`}
                            </Button>
                            <Button variant="ghost" onClick={onCancel} className="mt-2 w-full rounded-full text-zinc-500">
                                나중에 하기
                            </Button>
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}
