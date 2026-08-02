import axios from 'axios';
import {
    CheckCircle2,
    ChevronLeftIcon,
    CircleX,
    Clock3,
    Link2,
    LoaderCircle,
    PlusIcon,
    Search,
    ShieldCheck,
    UsersRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import {
    affiliateCrewSchool,
    createCrew,
    getCrewAdminData,
    reviewCrew,
    type AdminCrew,
    type AdminCrewData,
} from '../services/crewAdmin';

interface CrewAdminProps {
    onBack: () => void;
    mode?: 'create' | 'review';
}

type ReviewFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';
type ReviewDecision = 'APPROVE' | 'REJECT';

const approvalCopy: Record<AdminCrew['approvalStatus'], { label: string; className: string }> = {
    PENDING: { label: '승인 대기', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
    APPROVED: { label: '승인 완료', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    REJECTED: { label: '반려', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

const getErrorMessage = (error: unknown) => {
    if (axios.isAxiosError<{ message?: string }>(error)) {
        return error.response?.data?.message || error.message;
    }
    return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.';
};

const formatDate = (value: string | null) => {
    if (!value) return '—';
    return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
};

const ApprovalBadge = ({ status }: { status: AdminCrew['approvalStatus'] }) => {
    const copy = approvalCopy[status];
    return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ring-inset ${copy.className}`}>{copy.label}</span>;
};

export default function CrewAdmin({ onBack, mode = 'create' }: CrewAdminProps) {
    const [data, setData] = useState<AdminCrewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [actingCrewId, setActingCrewId] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [name, setName] = useState('');
    const [filter, setFilter] = useState<ReviewFilter>('PENDING');
    const [query, setQuery] = useState('');
    const [reviewTarget, setReviewTarget] = useState<AdminCrew | null>(null);
    const [reviewDecision, setReviewDecision] = useState<ReviewDecision>('APPROVE');
    const [reviewNote, setReviewNote] = useState('');
    const [schoolSelections, setSchoolSelections] = useState<Record<number, string>>({});

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setData(await getCrewAdminData(mode === 'create'));
        } catch (loadError) {
            setError(getErrorMessage(loadError));
        } finally {
            setLoading(false);
        }
    }, [mode]);

    useEffect(() => {
        void load();
    }, [load]);

    const updateCrew = (updated: AdminCrew) => {
        setData(current => current ? {
            ...current,
            crews: current.crews
                .map(crew => crew.id === updated.id ? updated : crew)
                .sort((left, right) => left.name.localeCompare(right.name)),
        } : current);
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        setSaving(true);
        setError('');
        try {
            const crew = await createCrew({
                name: name.trim(),
                profileImageUrl: null,
            });
            setData(current => current ? {
                ...current,
                crews: [...current.crews, crew].sort((left, right) => left.name.localeCompare(right.name)),
            } : current);
            setName('');
        } catch (saveError) {
            setError(getErrorMessage(saveError));
        } finally {
            setSaving(false);
        }
    };

    const openReview = (crew: AdminCrew, decision: ReviewDecision) => {
        setReviewTarget(crew);
        setReviewDecision(decision);
        setReviewNote('');
    };

    const submitReview = async () => {
        if (!reviewTarget) return;
        setActingCrewId(reviewTarget.id);
        setError('');
        try {
            updateCrew(await reviewCrew(reviewTarget.id, reviewDecision, reviewNote));
            setReviewTarget(null);
        } catch (reviewError) {
            setError(getErrorMessage(reviewError));
        } finally {
            setActingCrewId(null);
        }
    };

    const submitAffiliation = async (crew: AdminCrew) => {
        const schoolId = Number(schoolSelections[crew.id]);
        if (!schoolId) return;
        setActingCrewId(crew.id);
        setError('');
        try {
            updateCrew(await affiliateCrewSchool(crew.id, schoolId));
        } catch (affiliationError) {
            setError(getErrorMessage(affiliationError));
        } finally {
            setActingCrewId(null);
        }
    };

    const filteredCrews = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
        return (data?.crews || []).filter(crew => (
            (filter === 'ALL' || crew.approvalStatus === filter)
            && (!normalizedQuery || `${crew.name} ${crew.schoolName || ''} ${crew.requestedByAccountId || ''}`
                .toLocaleLowerCase('ko-KR')
                .includes(normalizedQuery))
        ));
    }, [data?.crews, filter, query]);

    if (loading && !data) {
        return (
            <div className="flex h-full items-center justify-center bg-[#F5F4F0]">
                <LoaderCircle className="h-7 w-7 animate-spin text-[#162660]" aria-label="크루 관리 데이터 불러오는 중" />
            </div>
        );
    }

    if (mode === 'review' && data?.developerAccess) {
        const pendingCount = data.crews.filter(crew => crew.approvalStatus === 'PENDING').length;
        const unlinkedCount = data.crews.filter(crew => crew.approvalStatus === 'APPROVED' && !crew.kusbfAssociated).length;
        const approvedCount = data.crews.filter(crew => crew.approvalStatus === 'APPROVED').length;

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
                            <h1 className="mt-1 text-xl font-black lg:text-2xl">크루 생성 검토</h1>
                        </div>
                        <button
                            type="button"
                            onClick={() => void load()}
                            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
                        >
                            새로고침
                        </button>
                    </div>
                </header>

                <main className="min-h-0 flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-7xl space-y-5 p-4 lg:p-8">
                        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

                        <section className="grid gap-3 sm:grid-cols-3">
                            {[
                                { label: '승인 대기', value: pendingCount, icon: Clock3, tone: 'text-amber-700 bg-amber-50' },
                                { label: '승인된 크루', value: approvedCount, icon: UsersRound, tone: 'text-emerald-700 bg-emerald-50' },
                                { label: '학교 미연동', value: unlinkedCount, icon: Link2, tone: 'text-blue-700 bg-blue-50' },
                            ].map(({ label, value, icon: Icon, tone }) => (
                                <div key={label} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></div>
                                    <p className="mt-4 text-3xl font-black">{value}</p>
                                    <p className="mt-1 text-sm font-bold text-zinc-500">{label}</p>
                                </div>
                            ))}
                        </section>

                        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                            <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex flex-wrap gap-1.5">
                                    {([
                                        ['PENDING', '승인 대기'],
                                        ['APPROVED', '승인 완료'],
                                        ['REJECTED', '반려'],
                                        ['ALL', '전체'],
                                    ] as const).map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setFilter(value)}
                                            className={`rounded-lg px-3 py-2 text-xs font-black transition-colors ${
                                                filter === value ? 'bg-[#162660] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <label className="relative block w-full lg:w-80">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                    <input
                                        value={query}
                                        onChange={event => setQuery(event.target.value)}
                                        placeholder="크루명, 학교, 요청자 ID 검색"
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#162660]"
                                    />
                                </label>
                            </div>

                            <div className="hidden overflow-x-auto lg:block">
                                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                                    <thead className="bg-zinc-50 text-xs font-black uppercase tracking-wider text-zinc-500">
                                        <tr>
                                            <th className="px-5 py-3">크루</th>
                                            <th className="px-5 py-3">요청자</th>
                                            <th className="px-5 py-3">승인</th>
                                            <th className="px-5 py-3">시즌방</th>
                                            <th className="px-5 py-3">KUSBF 연동</th>
                                            <th className="px-5 py-3 text-right">작업</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100">
                                        {filteredCrews.map(crew => (
                                            <tr key={crew.id} className="align-top hover:bg-zinc-50/70">
                                                <td className="px-5 py-4">
                                                    <p className="font-black">{crew.name}</p>
                                                    <p className="mt-1 text-xs text-zinc-400">#{crew.id} · {formatDate(crew.createdAt)}</p>
                                                </td>
                                                <td className="px-5 py-4 font-semibold text-zinc-600">
                                                    {crew.requestedByAccountId ? `계정 #${crew.requestedByAccountId}` : '시스템 등록'}
                                                </td>
                                                <td className="px-5 py-4"><ApprovalBadge status={crew.approvalStatus} /></td>
                                                <td className="px-5 py-4">
                                                    <span className={`text-xs font-black ${crew.seasonHouseActive ? 'text-emerald-700' : 'text-zinc-400'}`}>
                                                        {crew.seasonHouseActive ? '운영 중' : '비활성'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {crew.kusbfAssociated ? (
                                                        <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                                                            <CheckCircle2 className="h-4 w-4" /> {crew.schoolName}
                                                        </div>
                                                    ) : crew.approvalStatus === 'APPROVED' ? (
                                                        <div className="flex min-w-64 gap-2">
                                                            <select
                                                                value={schoolSelections[crew.id] || ''}
                                                                onChange={event => setSchoolSelections(current => ({ ...current, [crew.id]: event.target.value }))}
                                                                className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs font-semibold"
                                                            >
                                                                <option value="">학교 선택</option>
                                                                {data.schools.map(school => <option key={school.id} value={school.id}>{school.name}</option>)}
                                                            </select>
                                                            <button
                                                                type="button"
                                                                disabled={!schoolSelections[crew.id] || actingCrewId === crew.id}
                                                                onClick={() => void submitAffiliation(crew)}
                                                                className="rounded-lg bg-[#162660] px-3 py-2 text-xs font-black text-white disabled:opacity-40"
                                                            >
                                                                연동
                                                            </button>
                                                        </div>
                                                    ) : <span className="text-xs text-zinc-400">미연동</span>}
                                                </td>
                                                <td className="px-5 py-4">
                                                    {crew.approvalStatus === 'PENDING' && (
                                                        <div className="flex justify-end gap-2">
                                                            <button type="button" onClick={() => openReview(crew, 'REJECT')} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-50">반려</button>
                                                            <button type="button" onClick={() => openReview(crew, 'APPROVE')} className="rounded-lg bg-[#162660] px-3 py-2 text-xs font-black text-white hover:bg-[#0f1b48]">승인</button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="divide-y divide-zinc-100 lg:hidden">
                                {filteredCrews.map(crew => (
                                    <article key={crew.id} className="space-y-4 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h2 className="font-black">{crew.name}</h2>
                                                <p className="mt-1 text-xs text-zinc-400">요청자 #{crew.requestedByAccountId || '—'} · {formatDate(crew.createdAt)}</p>
                                            </div>
                                            <ApprovalBadge status={crew.approvalStatus} />
                                        </div>
                                        {crew.kusbfAssociated ? (
                                            <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> {crew.schoolName}</p>
                                        ) : crew.approvalStatus === 'APPROVED' && (
                                            <div className="flex gap-2">
                                                <select
                                                    value={schoolSelections[crew.id] || ''}
                                                    onChange={event => setSchoolSelections(current => ({ ...current, [crew.id]: event.target.value }))}
                                                    className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm"
                                                >
                                                    <option value="">연동할 학교 선택</option>
                                                    {data.schools.map(school => <option key={school.id} value={school.id}>{school.name}</option>)}
                                                </select>
                                                <button type="button" disabled={!schoolSelections[crew.id] || actingCrewId === crew.id} onClick={() => void submitAffiliation(crew)} className="rounded-xl bg-[#162660] px-4 text-sm font-black text-white disabled:opacity-40">연동</button>
                                            </div>
                                        )}
                                        {crew.approvalStatus === 'PENDING' && (
                                            <div className="grid grid-cols-2 gap-2">
                                                <button type="button" onClick={() => openReview(crew, 'REJECT')} className="rounded-xl border border-rose-200 py-2.5 text-sm font-black text-rose-700">반려</button>
                                                <button type="button" onClick={() => openReview(crew, 'APPROVE')} className="rounded-xl bg-[#162660] py-2.5 text-sm font-black text-white">승인</button>
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </div>

                            {filteredCrews.length === 0 && (
                                <div className="px-6 py-16 text-center text-sm font-semibold text-zinc-400">조건에 맞는 크루가 없습니다.</div>
                            )}
                        </section>
                    </div>
                </main>

                {reviewTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${reviewDecision === 'APPROVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                {reviewDecision === 'APPROVE' ? <CheckCircle2 className="h-6 w-6" /> : <CircleX className="h-6 w-6" />}
                            </div>
                            <h2 className="mt-4 text-xl font-black">{reviewTarget.name}을(를) {reviewDecision === 'APPROVE' ? '승인' : '반려'}할까요?</h2>
                            <p className="mt-2 text-sm leading-6 text-zinc-500">
                                {reviewDecision === 'APPROVE'
                                    ? '요청자가 크루 캡틴으로 등록되고 크루가 활성화됩니다.'
                                    : '이 요청은 보관되며 요청자에게 크루 권한이 부여되지 않습니다.'}
                            </p>
                            <label className="mt-5 block text-sm font-bold text-zinc-700">
                                검토 메모 <span className="font-normal text-zinc-400">(선택)</span>
                                <textarea
                                    value={reviewNote}
                                    onChange={event => setReviewNote(event.target.value)}
                                    maxLength={500}
                                    rows={4}
                                    className="mt-2 w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm outline-none focus:border-[#162660]"
                                />
                            </label>
                            <div className="mt-5 grid grid-cols-2 gap-2">
                                <button type="button" disabled={actingCrewId === reviewTarget.id} onClick={() => setReviewTarget(null)} className="rounded-xl border border-zinc-200 py-3 text-sm font-black text-zinc-600">취소</button>
                                <button
                                    type="button"
                                    disabled={actingCrewId === reviewTarget.id}
                                    onClick={() => void submitReview()}
                                    className={`flex items-center justify-center rounded-xl py-3 text-sm font-black text-white disabled:opacity-50 ${reviewDecision === 'APPROVE' ? 'bg-[#162660]' : 'bg-rose-600'}`}
                                >
                                    {actingCrewId === reviewTarget.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : reviewDecision === 'APPROVE' ? '승인 확정' : '반려 확정'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (mode === 'review') {
        return (
            <div className="flex h-full flex-1 items-center justify-center bg-zinc-50 p-6">
                <div className="max-w-md rounded-3xl border border-zinc-200 bg-white p-7 text-center shadow-sm">
                    <ShieldCheck className="mx-auto h-8 w-8 text-zinc-400" />
                    <h1 className="mt-4 text-xl font-black">검토 권한이 없습니다</h1>
                    <p className="mt-2 text-sm text-zinc-500">개발자 계정으로 로그인해 주세요.</p>
                    <button onClick={onBack} className="mt-6 rounded-xl bg-[#162660] px-5 py-3 text-sm font-black text-white">돌아가기</button>
                </div>
            </div>
        );
    }

    const inputClass = 'mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-700';

    return (
        <div className="flex h-full flex-1 flex-col overflow-hidden bg-zinc-50 text-zinc-900">
            <header className="flex items-center border-b border-zinc-200 bg-white px-4 py-3">
                <Button variant="ghost" onClick={onBack} className="-ml-2">
                    <ChevronLeftIcon className="h-6 w-6" />
                </Button>
                <h1 className="ml-2 text-lg font-bold">크루 만들기</h1>
            </header>

            <main className="flex-1 overflow-y-auto p-4">
                <div className="mx-auto max-w-md space-y-5">
                    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2">
                            <PlusIcon className="h-4 w-4" />
                            <div>
                                <h2 className="font-black">새 크루 생성 요청</h2>
                                <p className="mt-0.5 text-xs text-zinc-500">가입 PIN은 자동 생성되며 승인 후 크루 설정에서 확인할 수 있습니다.</p>
                            </div>
                        </div>

                        <label className="block text-sm font-bold">
                            크루 이름
                            <input required maxLength={50} value={name} onChange={event => setName(event.target.value)} className={inputClass} />
                        </label>

                        <div className="rounded-xl bg-blue-50 px-4 py-3 text-xs font-semibold leading-5 text-blue-800">
                            예약 오픈일과 정원은 크루 승인 후 크루 설정에서 관리합니다.
                        </div>

                        <button disabled={saving || loading} className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
                            {saving ? '요청 중...' : '생성 요청 보내기'}
                        </button>
                    </form>

                    {(data?.crews.length || 0) > 0 && (
                        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                            <h2 className="mb-3 font-black">내 생성 요청</h2>
                            <div className="divide-y divide-zinc-100">
                                {data?.crews.map(crew => (
                                    <div key={crew.id} className="flex items-center justify-between gap-3 py-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold">{crew.name}</p>
                                            <p className="mt-1 text-xs text-zinc-400">{formatDate(crew.createdAt)}</p>
                                        </div>
                                        <ApprovalBadge status={crew.approvalStatus} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
}
