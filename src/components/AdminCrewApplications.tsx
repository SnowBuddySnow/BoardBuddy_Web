import type { AdminCrewApplication, AdminUser, CrewApplicationStatus } from '../services/userAdmin';

const statusCopy: Record<CrewApplicationStatus, string> = {
    PENDING: '가입 승인 대기',
    APPROVED: '가입 승인 완료',
    REJECTED: '가입 거절',
    CANCELED: '신청 취소',
};

const formatDate = (value: string | null) => value
    ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '기록 없음';

export default function AdminCrewApplications({ user, busy, onApprove }: {
    user: AdminUser;
    busy: boolean;
    onApprove: (application: AdminCrewApplication) => void;
}) {
    // Allow the web deployment to precede the additive backend contract.
    const applications = user.crewApplications ?? [];
    const pending = applications.filter(application => application.status === 'PENDING');
    const history = applications.filter(application => application.status !== 'PENDING');
    const blockedReason = user.accountStatus !== 'ACTIVE'
        ? '활성 계정만 승인할 수 있습니다.'
        : user.crewMemberships.length > 0 ? '이미 가입된 크루가 있습니다.' : '';

    return (
        <div className="mb-3 space-y-2 text-xs">
            <p className="font-black text-zinc-500">크루 가입 상태</p>
            {pending.length === 0 && <p className="text-zinc-400">승인 대기 신청 없음</p>}
            {pending.map(application => {
                const reason = blockedReason || (!application.crewJoinable ? '운영 중인 승인된 크루만 가입할 수 있습니다.' : '');
                return (
                    <div key={application.applicationId} className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="break-words font-black text-amber-900">{application.crewName} · {statusCopy[application.status]}</p>
                        <p className="text-amber-800">{application.crewCode} · 신청 {formatDate(application.createdAt)}</p>
                        <button type="button" disabled={busy || Boolean(reason)} onClick={() => onApprove(application)}
                            className="rounded-lg bg-[#162660] px-3 py-2 font-black text-white disabled:opacity-40">
                            즉시 승인
                        </button>
                        {reason && <p className="text-amber-800">{reason}</p>}
                    </div>
                );
            })}
            {history.length > 0 && (
                <details className="rounded-xl border border-zinc-200 bg-white p-3">
                    <summary className="cursor-pointer font-bold text-zinc-600">가입 신청 이력 ({history.length})</summary>
                    <ul className="mt-2 space-y-3">
                        {history.map(application => (
                            <li key={application.applicationId}>
                                <p className="break-words font-bold text-zinc-700">{application.crewName} · {statusCopy[application.status]}</p>
                                <p className="mt-1 text-zinc-500">신청 {formatDate(application.createdAt)}</p>
                                <p className="text-zinc-500">처리 {formatDate(application.processedAt)}</p>
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </div>
    );
}
