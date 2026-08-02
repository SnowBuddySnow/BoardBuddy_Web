import axios from 'axios';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronLeftIcon,
    ClipboardPaste,
    Copy,
    LoaderCircle,
    Plus,
    School,
    Send,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../components/Button';
import {
    importSchools,
    type SchoolImportAction,
    type SchoolImportInput,
    type SchoolImportResult,
} from '../services/schoolAdmin';

interface SchoolAdminProps {
    onBack: () => void;
}

interface SchoolDraft {
    key: string;
    schoolCode: string;
    name: string;
    active: boolean;
    aliases: string;
    emailDomains: string;
    externalIdentifiers: string;
    expanded: boolean;
}

const createDraft = (initial?: Partial<SchoolDraft>): SchoolDraft => ({
    key: crypto.randomUUID(),
    schoolCode: '',
    name: '',
    active: true,
    aliases: '',
    emailDomains: '',
    externalIdentifiers: '',
    expanded: true,
    ...initial,
});

const splitValues = (value: string) => value
    .split(/[\n,]/)
    .map(item => item.trim())
    .filter(Boolean);

const parseExternalIdentifiers = (value: string) => {
    const entries = value
        .split('\n')
        .map(item => item.trim())
        .filter(Boolean)
        .map((line) => {
            const separator = line.indexOf('=');
            if (separator < 1 || separator === line.length - 1) {
                throw new Error(`외부 식별자는 AUTHORITY=value 형식이어야 합니다: ${line}`);
            }
            return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()] as const;
        });
    return Object.fromEntries(entries);
};

const toImportInput = (draft: SchoolDraft): SchoolImportInput => ({
    schoolCode: draft.schoolCode.trim() || undefined,
    name: draft.name.trim(),
    active: draft.active,
    aliases: splitValues(draft.aliases),
    emailDomains: splitValues(draft.emailDomains),
    externalIdentifiers: parseExternalIdentifiers(draft.externalIdentifiers),
});

const actionStyle: Record<SchoolImportAction, { label: string; className: string }> = {
    CREATE: { label: '신규 생성', className: 'bg-blue-50 text-blue-700 ring-blue-200' },
    UPDATE: { label: '기존 수정', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
    UNCHANGED: { label: '변경 없음', className: 'bg-zinc-100 text-zinc-600 ring-zinc-200' },
};

const getErrorMessage = (error: unknown) => {
    if (axios.isAxiosError<{ message?: string }>(error)) {
        return error.response?.data?.message || error.message;
    }
    return error instanceof Error ? error.message : '학교 가져오기에 실패했습니다.';
};

export default function SchoolAdmin({ onBack }: SchoolAdminProps) {
    const [drafts, setDrafts] = useState<SchoolDraft[]>([createDraft()]);
    const [bulkText, setBulkText] = useState('');
    const [showBulkInput, setShowBulkInput] = useState(false);
    const [preview, setPreview] = useState<SchoolImportResult | null>(null);
    const [applied, setApplied] = useState<SchoolImportResult | null>(null);
    const [loadingMode, setLoadingMode] = useState<'preview' | 'apply' | null>(null);
    const [error, setError] = useState('');

    const usableDrafts = useMemo(
        () => drafts.filter(draft => draft.name.trim()),
        [drafts],
    );

    const invalidatePreview = () => {
        setPreview(null);
        setApplied(null);
        setError('');
    };

    const updateDraft = (key: string, patch: Partial<SchoolDraft>) => {
        setDrafts(current => current.map(draft => draft.key === key ? { ...draft, ...patch } : draft));
        invalidatePreview();
    };

    const addDraft = () => {
        setDrafts(current => [...current, createDraft()]);
        invalidatePreview();
    };

    const duplicateDraft = (draft: SchoolDraft) => {
        setDrafts(current => [...current, createDraft({
            active: draft.active,
            aliases: draft.aliases,
            emailDomains: draft.emailDomains,
            externalIdentifiers: draft.externalIdentifiers,
        })]);
        invalidatePreview();
    };

    const removeDraft = (key: string) => {
        setDrafts(current => current.length === 1
            ? [createDraft()]
            : current.filter(draft => draft.key !== key));
        invalidatePreview();
    };

    const addBulkRows = () => {
        try {
            const additions = bulkText
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .map((line) => {
                    const [name = '', aliases = '', domains = ''] = line.split('|').map(value => value.trim());
                    if (!name) throw new Error(`학교명이 없는 줄이 있습니다: ${line}`);
                    return createDraft({
                        name,
                        aliases: aliases.split(',').map(value => value.trim()).filter(Boolean).join('\n'),
                        emailDomains: domains.split(',').map(value => value.trim()).filter(Boolean).join('\n'),
                    });
                });
            if (!additions.length) throw new Error('추가할 학교를 한 줄 이상 입력해 주세요.');
            setDrafts(current => [
                ...current.filter(draft => draft.name.trim()),
                ...additions,
            ]);
            setBulkText('');
            setShowBulkInput(false);
            invalidatePreview();
        } catch (bulkError) {
            setError(getErrorMessage(bulkError));
        }
    };

    const preparePayload = () => {
        if (!usableDrafts.length) throw new Error('학교명을 한 개 이상 입력해 주세요.');
        return usableDrafts.map(toImportInput);
    };

    const runPreview = async () => {
        setLoadingMode('preview');
        setError('');
        setApplied(null);
        try {
            setPreview(await importSchools(preparePayload(), true));
        } catch (previewError) {
            setPreview(null);
            setError(getErrorMessage(previewError));
        } finally {
            setLoadingMode(null);
        }
    };

    const applyImport = async () => {
        if (!preview) return;
        setLoadingMode('apply');
        setError('');
        try {
            const result = await importSchools(preparePayload(), false);
            setApplied(result);
            setPreview(null);
            setDrafts(current => current.map((draft) => {
                const match = result.schools.find(item => item.name === draft.name.trim());
                return match?.schoolCode ? { ...draft, schoolCode: match.schoolCode } : draft;
            }));
        } catch (applyError) {
            setError(getErrorMessage(applyError));
        } finally {
            setLoadingMode(null);
        }
    };

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#F5F4F0] text-zinc-900">
            <header className="shrink-0 border-b border-zinc-200 bg-white px-5 py-4 lg:px-8">
                <div className="mx-auto flex max-w-6xl items-center gap-4">
                    <Button variant="ghost" onClick={onBack} className="-ml-2 shrink-0 text-zinc-700 hover:bg-zinc-100">
                        <ChevronLeftIcon className="h-6 w-6" />
                    </Button>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#162660]">
                            <School className="h-4 w-4" /> Developer
                        </div>
                        <h1 className="mt-1 text-xl font-black lg:text-2xl">학교 카탈로그 관리</h1>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowBulkInput(current => !current)}
                        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-black text-zinc-700 hover:bg-zinc-50"
                    >
                        <ClipboardPaste className="h-4 w-4" />
                        빠른 입력
                    </button>
                </div>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto max-w-6xl space-y-5 p-4 pb-28 lg:p-8">
                    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                        <p className="font-black">안전한 2단계 등록</p>
                        <p className="mt-1 leading-6 text-blue-800">
                            먼저 미리보기로 신규 생성/기존 수정 여부를 확인한 뒤 실제 반영할 수 있습니다.
                            신규 학교의 코드는 서버가 자동으로 생성합니다.
                        </p>
                    </section>

                    {showBulkInput && (
                        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                                <label className="min-w-0 flex-1">
                                    <span className="text-sm font-black">여러 학교 붙여넣기</span>
                                    <span className="mt-1 block text-xs text-zinc-500">
                                        한 줄에 학교명 | 별칭1, 별칭2 | domain.ac.kr
                                    </span>
                                    <textarea
                                        value={bulkText}
                                        onChange={event => setBulkText(event.target.value)}
                                        rows={5}
                                        placeholder={'KAIST | 한국과학기술원 | kaist.ac.kr\n홍익대학교 | 홍대, Hongik University | hongik.ac.kr'}
                                        className="mt-2 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 font-mono text-sm outline-none focus:border-[#162660]"
                                    />
                                </label>
                                <button
                                    type="button"
                                    onClick={addBulkRows}
                                    className="rounded-xl bg-[#162660] px-5 py-3 text-sm font-black text-white"
                                >
                                    입력 행 추가
                                </button>
                            </div>
                        </section>
                    )}

                    {error && (
                        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <section className="space-y-3">
                        {drafts.map((draft, index) => (
                            <article key={draft.key} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                                <div className="flex items-center gap-3 p-4 lg:px-5">
                                    <button
                                        type="button"
                                        onClick={() => updateDraft(draft.key, { expanded: !draft.expanded })}
                                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                    >
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#162660]/8 text-sm font-black text-[#162660]">
                                            {index + 1}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-black">{draft.name || '새 학교'}</span>
                                            <span className="block truncate text-xs text-zinc-400">
                                                {draft.schoolCode || '코드는 생성 시 자동 발급'}
                                            </span>
                                        </span>
                                        <ChevronDown className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${draft.expanded ? 'rotate-180' : ''}`} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => duplicateDraft(draft)}
                                        className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                        title="입력 형식 복제"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeDraft(draft.key)}
                                        className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                                        title="학교 행 삭제"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>

                                {draft.expanded && (
                                    <div className="grid gap-4 border-t border-zinc-100 p-4 lg:grid-cols-2 lg:p-5">
                                        <label>
                                            <span className="text-xs font-black text-zinc-600">학교명 *</span>
                                            <input
                                                value={draft.name}
                                                onChange={event => updateDraft(draft.key, { name: event.target.value })}
                                                maxLength={100}
                                                placeholder="정식 학교명"
                                                className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-[#162660]"
                                            />
                                        </label>
                                        <label>
                                            <span className="text-xs font-black text-zinc-600">학교 코드</span>
                                            <input
                                                value={draft.schoolCode}
                                                onChange={event => updateDraft(draft.key, { schoolCode: event.target.value.toUpperCase() })}
                                                maxLength={11}
                                                placeholder="신규 생성 시 비워 두세요"
                                                className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 font-mono text-sm outline-none focus:border-[#162660]"
                                            />
                                        </label>
                                        <label>
                                            <span className="text-xs font-black text-zinc-600">검색 별칭</span>
                                            <span className="ml-2 text-[11px] text-zinc-400">줄바꿈 또는 쉼표로 구분</span>
                                            <textarea
                                                value={draft.aliases}
                                                onChange={event => updateDraft(draft.key, { aliases: event.target.value })}
                                                rows={4}
                                                placeholder={'홍대\nHongik University'}
                                                className="mt-1.5 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-[#162660]"
                                            />
                                        </label>
                                        <label>
                                            <span className="text-xs font-black text-zinc-600">허용 이메일 도메인</span>
                                            <span className="ml-2 text-[11px] text-zinc-400">줄바꿈 또는 쉼표로 구분</span>
                                            <textarea
                                                value={draft.emailDomains}
                                                onChange={event => updateDraft(draft.key, { emailDomains: event.target.value })}
                                                rows={4}
                                                placeholder={'hongik.ac.kr\nmail.hongik.ac.kr'}
                                                className="mt-1.5 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 font-mono text-sm outline-none focus:border-[#162660]"
                                            />
                                        </label>
                                        <label className="lg:col-span-2">
                                            <span className="text-xs font-black text-zinc-600">외부 식별자</span>
                                            <span className="ml-2 text-[11px] text-zinc-400">선택 · 한 줄에 AUTHORITY=value</span>
                                            <textarea
                                                value={draft.externalIdentifiers}
                                                onChange={event => updateDraft(draft.key, { externalIdentifiers: event.target.value })}
                                                rows={2}
                                                placeholder="KUSBF=school-123"
                                                className="mt-1.5 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 font-mono text-sm outline-none focus:border-[#162660]"
                                            />
                                        </label>
                                        <label className="flex items-center gap-3 lg:col-span-2">
                                            <input
                                                type="checkbox"
                                                checked={draft.active}
                                                onChange={event => updateDraft(draft.key, { active: event.target.checked })}
                                                className="h-4 w-4 accent-[#162660]"
                                            />
                                            <span className="text-sm font-bold">가입 화면에서 선택 가능한 활성 학교</span>
                                        </label>
                                    </div>
                                )}
                            </article>
                        ))}
                    </section>

                    <button
                        type="button"
                        onClick={addDraft}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 bg-white/60 px-4 py-4 text-sm font-black text-zinc-600 hover:border-[#162660] hover:text-[#162660]"
                    >
                        <Plus className="h-5 w-5" /> 학교 한 개 추가
                    </button>

                    {(preview || applied) && (
                        <section className={`rounded-2xl border bg-white p-5 shadow-sm ${applied ? 'border-emerald-200' : 'border-zinc-200'}`}>
                            <div className="flex items-center gap-2">
                                {applied
                                    ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                    : <AlertTriangle className="h-5 w-5 text-amber-600" />}
                                <h2 className="font-black">{applied ? '반영 완료' : '미리보기 결과'}</h2>
                            </div>
                            <div className="mt-4 divide-y divide-zinc-100">
                                {(applied || preview)?.schools.map((school, index) => {
                                    const style = actionStyle[school.action];
                                    return (
                                        <div key={`${school.name}-${index}`} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold">{school.name}</p>
                                                <p className="mt-0.5 font-mono text-xs text-zinc-400">{school.schoolCode || '반영 시 코드 생성'}</p>
                                            </div>
                                            <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-black ring-1 ring-inset ${style.className}`}>
                                                {style.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </div>
            </main>

            <footer className="shrink-0 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur lg:px-8">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
                    <p className="hidden text-sm font-semibold text-zinc-500 sm:block">
                        입력 {usableDrafts.length}개
                    </p>
                    <div className="ml-auto flex gap-2">
                        <button
                            type="button"
                            disabled={loadingMode !== null || !usableDrafts.length}
                            onClick={() => void runPreview()}
                            className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-black text-zinc-700 disabled:opacity-40"
                        >
                            {loadingMode === 'preview'
                                ? <LoaderCircle className="h-4 w-4 animate-spin" />
                                : <Send className="h-4 w-4" />}
                            미리보기
                        </button>
                        <button
                            type="button"
                            disabled={!preview || loadingMode !== null}
                            onClick={() => void applyImport()}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#162660] px-4 py-2.5 text-sm font-black text-white disabled:opacity-40"
                        >
                            {loadingMode === 'apply'
                                ? <LoaderCircle className="h-4 w-4 animate-spin" />
                                : <CheckCircle2 className="h-4 w-4" />}
                            실제 반영
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
