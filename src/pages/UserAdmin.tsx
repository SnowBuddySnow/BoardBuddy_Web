import {
    ChevronLeftIcon,
    LoaderCircle,
    RefreshCw,
    Search,
    ShieldCheck,
    UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { getApiErrorMessage } from '../lib/apiError';
import {
    searchAdminUsers,
    updatePlatformAdmin,
    type AccountStatus,
    type AdminUser,
} from '../services/userAdmin';

interface UserAdminProps {
    onBack: () => void;
}

const accountStatusCopy: Record<AccountStatus, { label: string; className: string }> = {
    PENDING_PROFILE: { label: '프로필 대기', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
    ACTIVE: { label: '활성', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    SUSPENDED: { label: '정지', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
    DELETED: { label: '탈퇴', className: 'bg-zinc-100 text-zinc-500 ring-zinc-200' },
};

const userTypeCopy = {
    GENERAL: '유형 확인 전',
    REGULAR: '일반',
    KUSBF: '학생',
} as const;

const formatDate = (value: string) => new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
}).format(new Date(value));

function AccountStatusBadge({ status }: { status: AccountStatus }) {
    const copy = accountStatusCopy[status];
    return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ring-inset ${copy.className}`}>
            {copy.label}
        </span>
    );
}

export default function UserAdmin({ onBack }: UserAdminProps) {
    const [query, setQuery] = useState('');
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [changingAccountId, setChangingAccountId] = useState<number | null>(null);
    const [error, setError] = useState('');

    const load = useCallback(async (searchQuery: string) => {
        setLoading(true);
        setError('');
        try {
            setUsers(await searchAdminUsers(searchQuery));
        } catch (loadError) {
            setError(getApiErrorMessage(loadError) || '사용자 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        const timeout = window.setTimeout(async () => {
            setLoading(true);
            setError('');
            try {
                const result = await searchAdminUsers(query.trim());
                if (!cancelled) setUsers(result);
            } catch (loadError) {
                if (!cancelled) setError(getApiErrorMessage(loadError) || '사용자 목록을 불러오지 못했습니다.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 300);
        return () => {
            cancelled = true;
            window.clearTimeout(timeout);
        };
    }, [query]);

    const handleAccessChange = async (user: AdminUser) => {
        const promote = !user.platformAdmin;
        const action = promote ? '플랫폼 관리자로 승격' : '플랫폼 관리자에서 강등';
        if (!window.confirm(`${user.name || user.userCode} 사용자를 ${action}하시겠습니까?`)) return;

        setChangingAccountId(user.accountId);
        setError('');
        try {
            const updated = await updatePlatformAdmin(user.accountId, promote);
            setUsers(current => current.map(item => item.accountId === updated.accountId ? updated : item));
        } catch (updateError) {
            setError(getApiErrorMessage(updateError) || '사용자 권한을 변경하지 못했습니다.');
        } finally {
            setChangingAccountId(null);
        }
    };

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#F5F4F0] text-zinc-900">
            <header className="shrink-0 border-b border-zinc-200 bg-white px-5 py-4 lg:px-8">
                <div className="mx-auto flex max-w-7xl items-center gap-4">
                    <Button variant="ghost" onClick={onBack} className="-ml-2 shrink-0">
                        <ChevronLeftIcon className="h-6 w-6" />
                    </Button>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#162660]">
                            <ShieldCheck className="h-4 w-4" /> Developer
                        </div>
                        <h1 className="mt-1 text-xl font-black lg:text-2xl">사용자 권한 관리</h1>
                    </div>
                    <button
                        type="button"
                        onClick={() => void load(query.trim())}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">새로고침</span>
                    </button>
                </div>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto max-w-7xl space-y-5 p-4 pb-28 lg:p-8">
                    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                        <p className="font-black">플랫폼 관리자 권한</p>
                        <p className="mt-1 leading-6 text-blue-800">
                            플랫폼 관리자는 모든 운영 기능에 접근할 수 있습니다. 승격 전에 대상 사용자 이름과 코드를 다시 확인해 주세요.
                        </p>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                        <div className="border-b border-zinc-200 p-4 lg:p-5">
                            <label className="relative block w-full lg:max-w-xl">
                                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="search"
                                    value={query}
                                    onChange={event => setQuery(event.target.value)}
                                    placeholder="이름, 사용자 코드 또는 내부 ID 검색"
                                    aria-label="사용자 검색"
                                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-[#162660] focus:bg-white focus:ring-2 focus:ring-[#162660]/10"
                                />
                            </label>
                            <p className="mt-2 text-xs text-zinc-500">
                                이름 일부로도 검색할 수 있습니다. 검색어가 없으면 최근 사용자 25명을 표시합니다.
                            </p>
                        </div>

                        {error && (
                            <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="flex min-h-52 items-center justify-center">
                                <LoaderCircle className="h-7 w-7 animate-spin text-[#162660]" aria-label="사용자 검색 중" />
                            </div>
                        ) : users.length === 0 ? (
                            <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
                                <UserRound className="h-9 w-9 text-zinc-300" />
                                <p className="mt-3 text-sm font-black text-zinc-600">일치하는 사용자가 없습니다</p>
                                <p className="mt-1 text-xs text-zinc-400">이름, 사용자 코드 또는 내부 ID를 확인해 주세요.</p>
                            </div>
                        ) : (
                            <>
                                <div className="hidden overflow-x-auto lg:block">
                                    <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                                        <thead className="bg-zinc-50 text-xs font-black uppercase tracking-wider text-zinc-500">
                                            <tr>
                                                <th className="px-5 py-3">사용자</th>
                                                <th className="px-5 py-3">식별자</th>
                                                <th className="px-5 py-3">계정 상태</th>
                                                <th className="px-5 py-3">가입</th>
                                                <th className="px-5 py-3 text-right">플랫폼 권한</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100">
                                            {users.map(user => (
                                                <tr key={user.accountId} className="hover:bg-zinc-50/70">
                                                    <td className="px-5 py-4">
                                                        <p className="font-black text-zinc-900">{user.name || '이름 미등록'}</p>
                                                        <p className="mt-1 text-xs text-zinc-500">{userTypeCopy[user.userType]}</p>
                                                    </td>
                                                    <td className="px-5 py-4 font-mono text-xs text-zinc-600">
                                                        <p>{user.userCode}</p>
                                                        <p className="mt-1 text-zinc-400">ID {user.accountId}</p>
                                                    </td>
                                                    <td className="px-5 py-4"><AccountStatusBadge status={user.accountStatus} /></td>
                                                    <td className="px-5 py-4 text-xs text-zinc-500">{formatDate(user.createdAt)}</td>
                                                    <td className="px-5 py-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleAccessChange(user)}
                                                            disabled={changingAccountId === user.accountId || (!user.platformAdmin && user.accountStatus !== 'ACTIVE')}
                                                            title={!user.platformAdmin && user.accountStatus !== 'ACTIVE' ? '활성 계정만 승격할 수 있습니다.' : undefined}
                                                            className={`rounded-xl px-4 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                                                user.platformAdmin
                                                                    ? 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
                                                                    : 'border border-[#162660] bg-[#162660] text-white hover:bg-blue-950'
                                                            }`}
                                                        >
                                                            {changingAccountId === user.accountId
                                                                ? '변경 중…'
                                                                : user.platformAdmin ? '관리자 강등' : '관리자 승격'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="divide-y divide-zinc-100 lg:hidden">
                                    {users.map(user => (
                                        <article key={user.accountId} className="space-y-4 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate font-black text-zinc-900">{user.name || '이름 미등록'}</p>
                                                    <p className="mt-1 truncate font-mono text-xs text-zinc-500">{user.userCode} · ID {user.accountId}</p>
                                                </div>
                                                <AccountStatusBadge status={user.accountStatus} />
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-xs font-semibold text-zinc-500">{userTypeCopy[user.userType]} · {formatDate(user.createdAt)} 가입</span>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleAccessChange(user)}
                                                    disabled={changingAccountId === user.accountId || (!user.platformAdmin && user.accountStatus !== 'ACTIVE')}
                                                    className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black disabled:opacity-40 ${
                                                        user.platformAdmin
                                                            ? 'border border-rose-200 bg-white text-rose-700'
                                                            : 'border border-[#162660] bg-[#162660] text-white'
                                                    }`}
                                                >
                                                    {changingAccountId === user.accountId
                                                        ? '변경 중…'
                                                        : user.platformAdmin ? '관리자 강등' : '관리자 승격'}
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
