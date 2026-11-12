import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { SchoolOption } from '../services/schools';

interface Props {
    options: SchoolOption[];
    value: SchoolOption | null;
    onChange: (value: SchoolOption | null) => void;
    loading: boolean;
    error?: string;
    onRetry: () => void;
    invalid?: boolean;
}

const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s/g, '');

/** Keep the selected identity separate from search text, including duplicate school names. */
export function SchoolPicker({ options, value, onChange, loading, error, onRetry, invalid }: Props) {
    const id = useId();
    const root = useRef<HTMLDivElement>(null);
    const [query, setQuery] = useState(value?.name || '');
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const matches = useMemo(() => options.filter(option => !normalize(query) || [option.name, ...option.aliases]
        .some(name => normalize(name).includes(normalize(query)))).slice(0, 50), [options, query]);
    const expanded = open && !loading && !error;
    useEffect(() => {
        if (expanded && active >= 0 && matches[active]) document.getElementById(`${id}-${matches[active].id}`)?.scrollIntoView?.({ block: 'nearest' });
    }, [active, expanded, id, matches]);
    useEffect(() => {
        const outside = (event: PointerEvent) => {
            if (!root.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('pointerdown', outside);
        return () => document.removeEventListener('pointerdown', outside);
    }, []);
    const select = (option: SchoolOption) => {
        onChange(option); setQuery(option.name); setActive(-1); setOpen(false);
    };
    return (
        <div ref={root} className="min-w-0 space-y-2">
            <label htmlFor={id} className="block text-sm font-bold text-[#162660]">학교</label>
            <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={expanded}
                aria-controls={`${id}-results`} aria-activedescendant={expanded && active >= 0 && matches[active] ? `${id}-${matches[active].id}` : undefined}
                aria-describedby={`${id}-hint`} aria-invalid={invalid || undefined}
                value={query} autoComplete="off" placeholder="학교명을 검색하세요" disabled={loading}
                className="h-12 w-full min-w-0 rounded-2xl border border-zinc-300 bg-white px-4 text-base text-zinc-900 focus-visible:outline-2 focus-visible:outline-[#162660] disabled:bg-zinc-100"
                onChange={event => { setQuery(event.target.value); onChange(null); setOpen(true); setActive(-1); }}
                onFocus={() => setOpen(true)}
                onBlur={event => { if (!root.current?.contains(event.relatedTarget as Node)) setOpen(false); }}
                onKeyDown={event => {
                    if (event.nativeEvent.isComposing) return;
                    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                        event.preventDefault(); setOpen(true);
                        setActive(current => !matches.length ? -1 : current < 0 ? (event.key === 'ArrowDown' ? 0 : matches.length - 1) : (current + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length);
                    }
                    if (event.key === 'Enter' && expanded) {
                        event.preventDefault();
                        if (active >= 0 && matches[active]) select(matches[active]);
                    }
                }} />
            {expanded && <div id={`${id}-results`} role="listbox" aria-label="학교 검색 결과"
                className="max-h-56 overflow-y-auto overscroll-contain rounded-2xl border border-zinc-200 bg-white p-1">
                {matches.map((option, index) => <button key={option.id} id={`${id}-${option.id}`} type="button"
                    role="option" aria-selected={value?.id === option.id} tabIndex={-1}
                    onPointerDown={event => event.preventDefault()} onClick={() => select(option)}
                    className={`block min-h-12 w-full rounded-xl px-3 py-3 text-left text-sm ${active === index ? 'bg-[#162660] text-white' : 'text-zinc-900 hover:bg-[#FAF8F3]'}`}>
                    <span className="block font-bold">{option.name}</span>
                    <span className="mt-1 block break-words text-xs opacity-75">{[...option.aliases.slice(0, 2), option.schoolCode].join(' · ')}</span>
                </button>)}
                {matches.length === 0 && <p role="status" className="p-3 text-sm text-zinc-600">검색 결과가 없습니다. 학교명이나 약칭을 다시 확인해 주세요.</p>}
            </div>}
            <p id={`${id}-hint`} role="status" className="text-xs leading-5 text-zinc-600">
                {loading ? '학교 목록을 불러오는 중입니다.' : value ? `${value.name} 선택됨` : '학교명 또는 약칭으로 검색한 뒤 결과를 선택해 주세요.'}
            </p>
            {error && <div role="alert" className="text-sm text-red-700">{error}
                <button type="button" onClick={onRetry} className="ml-2 min-h-11 underline">다시 시도</button>
            </div>}
        </div>
    );
}
