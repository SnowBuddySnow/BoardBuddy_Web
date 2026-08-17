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
    updateAdminCrewManager,
    updateAdminCrewRole,
    updateAdminEventManager,
    updatePlatformAdmin,
    type AccountStatus,
    type AdminCrewMembership,
    type AdminUser,
    type CrewRole,
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

const crewRoleCopy: Record<CrewRole, string> = {
    CREW_MEMBER: '크루 멤버',
    CREW_MANAGER: '크루 매니저',
    CREW_CAPTAIN: '크루장',
};

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
    const [changingKey, setChangingKey] = useState<string | null>(null);
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

    const handlePlatformAccessChange = async (user: AdminUser, platformAdmin: boolean) => {
        if (platformAdmin === user.platformAdmin) return;
        const question = platformAdmin
            ? `${user.name || user.userCode} 사용자에게 플랫폼 관리자 권한을 부여하시겠습니까?`
            : `${user.name || user.userCode} 사용자의 플랫폼 관리자 권한을 해제하시겠습니까?`;
        if (!window.confirm(question)) return;

        setChangingKey(`platform-${user.accountId}`);
        setError('');
        try {
            const updated = await updatePlatformAdmin(user.accountId, platformAdmin);
            setUsers(current => current.map(item => item.accountId === updated.accountId ? updated : item));
        } catch (updateError) {
            setError(getApiErrorMessage(updateError) || '사용자 권한을 변경하지 못했습니다.');
        } finally {
            setChangingKey(null);
        }
    };

    const handleCrewRoleChange = async (
        user: AdminUser,
        crewId: number,
        crewName: string,
        currentRole: CrewRole,
        role: CrewRole,
    ) => {
        if (role === currentRole) return;
        const captainNotice = role === 'CREW_CAPTAIN'
            ? ' 기존 크루장은 크루 매니저로 자동 변경됩니다.'
            : '';
        if (!window.confirm(
            `${user.name || user.userCode} 사용자의 ${crewName} 역할을 ${crewRoleCopy[role]}(으)로 변경하시겠습니까?${captainNotice}`,
        )) return;

        setChangingKey(`crew-${user.accountId}-${crewId}`);
        setError('');
        try {
            await updateAdminCrewRole(user.accountId, crewId, role);
            await load(query.trim());
        } catch (updateError) {
            setError(getApiErrorMessage(updateError) || '크루 역할을 변경하지 못했습니다.');
        } finally {
            setChangingKey(null);
        }
    };

    const handleCrewManagerChange = async (
        user: AdminUser,
        membership: AdminCrewMembership,
    ) => {
        const nextValue = !membership.crewManager;
        if (!window.confirm(
            `${user.name || user.userCode} 사용자의 ${membership.crewName} 크루 매니저 권한을 ${nextValue ? '부여' : '해제'}하시겠습니까?`,
        )) return;

        setChangingKey(`manager-${user.accountId}-${membership.crewId}`);
        setError('');
        try {
            const updated = await updateAdminCrewManager(user.accountId, membership.crewId, nextValue);
            setUsers(current => current.map(item => item.accountId === updated.accountId ? updated : item));
        } catch (updateError) {
            setError(getApiErrorMessage(updateError) || '크루 매니저 권한을 변경하지 못했습니다.');
        } finally {
            setChangingKey(null);
        }
    };

    const handleEventManagerChange = async (
        user: AdminUser,
        crewId: number,
        crewName: string,
        currentValue: boolean,
    ) => {
        const nextValue = !currentValue;
        if (!window.confirm(
            `${user.name || user.userCode} 사용자의 ${crewName} 이벤트 그룹 매니저 권한을 ${nextValue ? '부여' : '해제'}하시겠습니까?`,
        )) return;

        setChangingKey(`event-${user.accountId}-${crewId}`);
        setError('');
        try {
            const updated = await updateAdminEventManager(user.accountId, crewId, nextValue);
            setUsers(current => current.map(item => item.accountId === updated.accountId ? updated : item));
        } catch (updateError) {
            setError(getApiErrorMessage(updateError) || '이벤트 그룹 매니저 권한을 변경하지 못했습니다.');
        } finally {
            setChangingKey(null);
        }
    };

    const handleCaptainClick = (user: AdminUser, membership: AdminCrewMembership) => {
        if (membership.role === 'CREW_CAPTAIN') {
            window.alert('크루장을 변경하려면 같은 크루의 다른 멤버에서 크루장 지정을 선택해 주세요.');
            return;
        }
        void handleCrewRoleChange(
            user,
            membership.crewId,
            membership.crewName,
            membership.role,
            'CREW_CAPTAIN',
        );
    };

    const handleCrewManagerClick = (user: AdminUser, membership: AdminCrewMembership) => {
        void handleCrewManagerChange(user, membership);
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
                        <p className="font-black">권한 범위를 분리해서 관리합니다</p>
                        <p className="mt-1 leading-6 text-blue-800">
                            크루장 지정, 크루 매니저, 이벤트 그룹 매니저, 플랫폼 관리자는 서로 독립적입니다. 진하게 표시된 항목만 현재 부여된 권한입니다.
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
                                    <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
                                        <thead className="bg-zinc-50 text-xs font-black uppercase tracking-wider text-zinc-500">
                                            <tr>
                                                <th className="px-5 py-3">사용자</th>
                                                <th className="px-5 py-3">식별자</th>
                                                <th className="px-5 py-3">계정 상태</th>
                                                <th className="px-5 py-3">크루 역할</th>
                                                <th className="px-5 py-3">플랫폼 권한</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100">
                                            {users.map(user => (
                                                <tr key={user.accountId} className="hover:bg-zinc-50/70">
                                                    <td className="px-5 py-4">
                                                        <p className="font-black text-zinc-900">{user.name || '이름 미등록'}</p>
                                                        <p className="mt-1 text-xs text-zinc-500">{userTypeCopy[user.userType]} · {formatDate(user.createdAt)} 가입</p>
                                                    </td>
                                                    <td className="px-5 py-4 font-mono text-xs text-zinc-600">
                                                        <p>{user.userCode}</p>
                                                        <p className="mt-1 text-zinc-400">ID {user.accountId}</p>
                                                    </td>
                                                    <td className="px-5 py-4"><AccountStatusBadge status={user.accountStatus} /></td>
                                                    <td className="min-w-72 px-5 py-4">
                                                        {user.crewMemberships.length === 0 ? (
                                                            <span className="text-xs text-zinc-400">가입 크루 없음</span>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {user.crewMemberships.map(membership => {
                                                                    const roleKey = `crew-${user.accountId}-${membership.crewId}`;
                                                                    const managerKey = `manager-${user.accountId}-${membership.crewId}`;
                                                                    const eventKey = `event-${user.accountId}-${membership.crewId}`;
                                                                    const isCaptain = membership.role === 'CREW_CAPTAIN';
                                                                    const busy = changingKey === roleKey || changingKey === managerKey || changingKey === eventKey;
                                                                    return (
                                                                        <div key={membership.crewId} className="space-y-2 rounded-xl border border-zinc-100 bg-zinc-50 p-2.5">
                                                                            <span className="block truncate text-xs font-black text-zinc-700">{membership.crewName}</span>
                                                                            <div className="grid grid-cols-3 gap-1.5">
                                                                                <button
                                                                                    type="button"
                                                                                    aria-pressed={isCaptain}
                                                                                    disabled={busy}
                                                                                    onClick={() => handleCaptainClick(user, membership)}
                                                                                    className={`rounded-lg border px-2 py-2 text-[11px] font-black transition disabled:opacity-50 ${isCaptain ? 'border-violet-700 bg-violet-700 text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100'}`}
                                                                                >
                                                                                    크루장
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    aria-pressed={membership.crewManager}
                                                                                    disabled={busy}
                                                                                    onClick={() => handleCrewManagerClick(user, membership)}
                                                                                    className={`rounded-lg border px-2 py-2 text-[11px] font-black transition disabled:opacity-50 ${membership.crewManager ? 'border-zinc-800 bg-zinc-800 text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100'}`}
                                                                                >
                                                                                    크루 매니저
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    aria-pressed={membership.eventManager}
                                                                                    disabled={busy}
                                                                                    onClick={() => void handleEventManagerChange(
                                                                                        user,
                                                                                        membership.crewId,
                                                                                        membership.crewName,
                                                                                        membership.eventManager,
                                                                                    )}
                                                                                    className={`rounded-lg border px-2 py-2 text-[11px] font-black transition disabled:opacity-50 ${membership.eventManager ? 'border-[#162660] bg-[#162660] text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100'}`}
                                                                                >
                                                                                    이벤트 매니저
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <button
                                                            type="button"
                                                            aria-pressed={user.platformAdmin}
                                                            onClick={() => void handlePlatformAccessChange(user, !user.platformAdmin)}
                                                            disabled={changingKey === `platform-${user.accountId}` || (!user.platformAdmin && user.accountStatus !== 'ACTIVE')}
                                                            title={!user.platformAdmin && user.accountStatus !== 'ACTIVE' ? '활성 계정만 플랫폼 관리자로 지정할 수 있습니다.' : undefined}
                                                            className={`rounded-lg border px-3 py-2 text-xs font-black transition disabled:opacity-40 ${user.platformAdmin ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100'}`}
                                                        >
                                                            플랫폼 관리자
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
                                            <p className="text-xs font-semibold text-zinc-500">{userTypeCopy[user.userType]} · {formatDate(user.createdAt)} 가입</p>
                                            <div className="space-y-2 rounded-xl bg-zinc-50 p-3">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">크루 역할</p>
                                                {user.crewMemberships.length === 0 ? (
                                                    <p className="text-xs text-zinc-400">가입 크루 없음</p>
                                                ) : user.crewMemberships.map(membership => {
                                                    const roleKey = `crew-${user.accountId}-${membership.crewId}`;
                                                    const managerKey = `manager-${user.accountId}-${membership.crewId}`;
                                                    const eventKey = `event-${user.accountId}-${membership.crewId}`;
                                                    const isCaptain = membership.role === 'CREW_CAPTAIN';
                                                    const busy = changingKey === roleKey || changingKey === managerKey || changingKey === eventKey;
                                                    return (
                                                        <div key={membership.crewId} className="space-y-2">
                                                            <span className="block truncate text-xs font-black text-zinc-700">{membership.crewName}</span>
                                                            <div className="grid grid-cols-3 gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    aria-pressed={isCaptain}
                                                                    disabled={busy}
                                                                    onClick={() => handleCaptainClick(user, membership)}
                                                                    className={`rounded-lg border px-2 py-2 text-[10px] font-black disabled:opacity-50 ${isCaptain ? 'border-violet-700 bg-violet-700 text-white' : 'border-zinc-200 bg-white text-zinc-600'}`}
                                                                >
                                                                    크루장
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    aria-pressed={membership.crewManager}
                                                                    disabled={busy}
                                                                    onClick={() => handleCrewManagerClick(user, membership)}
                                                                    className={`rounded-lg border px-2 py-2 text-[10px] font-black disabled:opacity-50 ${membership.crewManager ? 'border-zinc-800 bg-zinc-800 text-white' : 'border-zinc-200 bg-white text-zinc-600'}`}
                                                                >
                                                                    크루 매니저
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    aria-pressed={membership.eventManager}
                                                                    disabled={busy}
                                                                    onClick={() => void handleEventManagerChange(
                                                                        user,
                                                                        membership.crewId,
                                                                        membership.crewName,
                                                                        membership.eventManager,
                                                                    )}
                                                                    className={`rounded-lg border px-2 py-2 text-[10px] font-black disabled:opacity-50 ${membership.eventManager ? 'border-[#162660] bg-[#162660] text-white' : 'border-zinc-200 bg-white text-zinc-600'}`}
                                                                >
                                                                    이벤트 매니저
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-xs font-black text-zinc-600">플랫폼 권한</span>
                                                <button
                                                    type="button"
                                                    aria-pressed={user.platformAdmin}
                                                    onClick={() => void handlePlatformAccessChange(user, !user.platformAdmin)}
                                                    disabled={changingKey === `platform-${user.accountId}` || (!user.platformAdmin && user.accountStatus !== 'ACTIVE')}
                                                    className={`rounded-lg border px-3 py-2 text-xs font-black disabled:opacity-40 ${user.platformAdmin ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-zinc-200 bg-white text-zinc-600'}`}
                                                >
                                                    플랫폼 관리자
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
