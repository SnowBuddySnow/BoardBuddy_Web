import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ChevronLeftIcon, Search, ShieldCheck, UsersRound, X } from 'lucide-react';
import { Button } from '../components/Button';
import { applyToCrew, discoverCrews, type DiscoverableCrew } from '../services/crew';
import { getApiErrorMessage } from '../lib/apiError';

interface SearchCrewProps {
    onBack: () => void;
}

export default function SearchCrew({ onBack }: SearchCrewProps) {
    const [crews, setCrews] = useState<DiscoverableCrew[]>([]);
    const [query, setQuery] = useState('');
    const [selectedCrew, setSelectedCrew] = useState<DiscoverableCrew | null>(null);
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [appliedCrewId, setAppliedCrewId] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        discoverCrews()
            .then((result) => {
                if (!cancelled) setCrews(result);
            })
            .catch(() => {
                if (!cancelled) setError('크루 목록을 불러오지 못했습니다.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const filteredCrews = useMemo(() => {
        const normalized = query.trim().toLocaleLowerCase('ko-KR');
        if (!normalized) return crews;
        return crews.filter((crew) => [
            crew.crewName,
            crew.crewCode,
            crew.schoolName || '',
        ].some((value) => value.toLocaleLowerCase('ko-KR').includes(normalized)));
    }, [crews, query]);

    const openApplication = (crew: DiscoverableCrew) => {
        setSelectedCrew(crew);
        setPin('');
        setError('');
    };

    const submitApplication = async (event: FormEvent) => {
        event.preventDefault();
        if (!selectedCrew || pin.length !== 4) return;
        setSubmitting(true);
        setError('');
        try {
            await applyToCrew(selectedCrew.crewId, pin);
            setAppliedCrewId(selectedCrew.crewId);
            setSelectedCrew(null);
            setPin('');
        } catch (requestError) {
            const message = getApiErrorMessage(requestError);
            setError(message === 'Invalid crew PIN'
                ? '가입 PIN이 올바르지 않습니다.'
                : message || '가입 신청에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-[#FAF8F3]">
            <header className="relative z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 lg:px-6">
                <Button variant="ghost" onClick={onBack} className="-ml-2 gap-1 text-zinc-900 hover:bg-transparent">
                    <ChevronLeftIcon className="h-7 w-7" />
                </Button>
                <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-zinc-900">크루 검색</h1>
                <div className="w-8" />
            </header>

            <main className="flex-1 overflow-y-auto px-5 py-6 lg:px-8">
                <div className="mx-auto max-w-5xl">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="크루명, 학교명 또는 크루 코드 검색"
                            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white pl-11 pr-4 text-sm text-zinc-900 outline-none focus:border-[#162660] focus:ring-2 focus:ring-[#162660]/10"
                        />
                    </div>

                    {appliedCrewId != null && (
                        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                            <ShieldCheck className="h-4 w-4" />
                            가입 신청을 보냈습니다. 크루 운영진의 승인을 기다려 주세요.
                        </div>
                    )}
                    {error && !selectedCrew && (
                        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
                    )}

                    {loading ? (
                        <div className="flex h-52 items-center justify-center text-sm text-zinc-500">크루 목록을 불러오는 중...</div>
                    ) : filteredCrews.length === 0 ? (
                        <div className="flex h-52 flex-col items-center justify-center text-center">
                            <UsersRound className="mb-3 h-10 w-10 text-zinc-300" />
                            <p className="text-sm font-bold text-zinc-700">
                                {query.trim() ? '검색 결과가 없습니다.' : '가입 가능한 크루가 없습니다.'}
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">승인되어 활성화된 크루만 표시됩니다.</p>
                        </div>
                    ) : (
                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                            {filteredCrews.map((crew) => (
                                <article key={crew.crewId} className="flex min-h-36 items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#162660]/8 text-lg font-black text-[#162660]">
                                        {crew.profileImageUrl
                                            ? <img src={crew.profileImageUrl} alt="" className="h-full w-full object-cover" />
                                            : crew.crewName.slice(0, 1)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h2 className="truncate text-base font-black text-zinc-900">{crew.crewName}</h2>
                                        <p className="mt-1 truncate text-xs text-zinc-500">{crew.schoolName || '학교 미지정'}</p>
                                        <p className="mt-1 text-xs font-semibold text-zinc-400">{crew.crewCode} · 멤버 {crew.memberCount}명</p>
                                    </div>
                                    <Button
                                        size="small"
                                        disabled={appliedCrewId != null}
                                        onClick={() => openApplication(crew)}
                                        className="shrink-0 rounded-xl bg-[#162660] border-[#162660] hover:bg-[#0f1b48]"
                                    >
                                        가입
                                    </Button>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {selectedCrew && (
                <div className="absolute inset-0 z-[60] flex items-end justify-center bg-zinc-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6">
                    <form
                        onSubmit={submitApplication}
                        className="max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:max-w-md sm:rounded-3xl"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold text-zinc-400">크루 가입 신청</p>
                                <h2 className="mt-1 text-xl font-black text-zinc-900">{selectedCrew.crewName}</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedCrew(null)}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 cursor-pointer"
                                aria-label="닫기"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <label className="mt-6 block text-sm font-bold text-zinc-700">
                            4자리 가입 PIN
                            <span className="mt-2 flex gap-2">
                                <input
                                    autoFocus
                                    inputMode="numeric"
                                    enterKeyHint="done"
                                    autoComplete="one-time-code"
                                    maxLength={4}
                                    value={pin}
                                    onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="0000"
                                    aria-label="4자리 가입 PIN"
                                    className="h-14 min-w-0 flex-1 rounded-2xl border border-zinc-200 px-4 text-center text-2xl font-black tracking-[0.4em] text-zinc-900 outline-none focus:border-[#162660] focus:ring-2 focus:ring-[#162660]/10"
                                />
                                <Button
                                    type="submit"
                                    disabled={pin.length !== 4 || submitting}
                                    className="h-14 shrink-0 rounded-2xl border-[#162660] bg-[#162660] px-4 text-sm font-black hover:bg-[#0f1b48] sm:px-5"
                                >
                                    {submitting ? '신청 중' : '가입 신청'}
                                </Button>
                            </span>
                        </label>
                        <p className="mt-2 text-xs text-zinc-500">크루 운영진에게 전달받은 PIN을 입력해 주세요.</p>
                        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
                    </form>
                </div>
            )}
        </div>
    );
}
