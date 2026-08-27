import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, RefreshCw, Search, Sliders, X } from 'lucide-react';
import { getSchools, type SchoolOption } from '../services/schools';

interface DevPanelProps {
    onOpenCrewAdmin: () => void;
    onOpenSchoolAdmin: () => void;
    onOpenUserAdmin: () => void;
    deployedDeveloperAccess: boolean;
}

interface SimulationOption {
    id: string;
    label: string;
    description?: string;
}

interface SimulationSection {
    id: string;
    label: string;
    value: string;
    setValue: (value: string) => void;
    storageKey: string;
    options: SimulationOption[];
}

const clearSimulationData = () => {
    const keysToRemove: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key && (
            key === 'dev_sample_events_list'
            || key === 'dev_onboarding_events_list'
            || key === 'dev_response_sheet_events_v2'
            || key.startsWith('dev_event_consent_')
            || key.startsWith('dev_crew_school_verification_required_')
        )) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
};

export default function DevPanel({ onOpenCrewAdmin, onOpenSchoolAdmin, onOpenUserAdmin, deployedDeveloperAccess }: DevPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [crewOverride, setCrewOverride] = useState(localStorage.getItem('dev_crew_override') || 'server');
    const [schoolOverride, setSchoolOverride] = useState(localStorage.getItem('dev_school_override') || 'server');
    const [schools, setSchools] = useState<SchoolOption[]>([]);
    const [roleOverride, setRoleOverride] = useState(localStorage.getItem('dev_role_override') || 'server');
    const [eventDataMode, setEventDataMode] = useState(localStorage.getItem('dev_event_data_mode') || 'server');
    const [operatingMode, setOperatingMode] = useState(localStorage.getItem('dev_operating_mode') || 'server');

    useEffect(() => {
        let cancelled = false;
        getSchools().then(options => {
            if (!cancelled) setSchools(options);
        });
        return () => { cancelled = true; };
    }, []);

    const sections: SimulationSection[] = useMemo(() => [
        {
            id: 'operating-mode',
            label: '운영 모드',
            value: operatingMode,
            setValue: setOperatingMode,
            storageKey: 'dev_operating_mode',
            options: [
                { id: 'server', label: '일정에 따라 자동' },
                { id: 'SEASON', label: '시즌', description: '시즌방 · 예약만 표시' },
                { id: 'OFF_SEASON', label: '오프시즌', description: '이벤트만 표시' },
                { id: 'BOTH', label: '둘 다', description: '시즌과 오프시즌 기능 동시 표시' },
            ],
        },
        {
            id: 'crew',
            label: '크루 상태',
            value: crewOverride,
            setValue: setCrewOverride,
            storageKey: 'dev_crew_override',
            options: [
                { id: 'server', label: '서버 데이터 사용' },
                { id: 'none', label: '크루 없음', description: '크루 미소속 상태' },
                { id: 'has_crew', label: '크루 가입됨', description: '아웃런 (OUTRUN)' },
                { id: 'pending', label: '가입 승인 대기', description: '가입 신청 중' },
            ],
        },
        {
            id: 'school',
            label: '학교',
            value: schoolOverride,
            setValue: setSchoolOverride,
            storageKey: 'dev_school_override',
            options: [
                { id: 'server', label: '서버 학교 사용' },
                ...schools.map(school => ({
                    id: school.name,
                    label: school.name,
                    description: school.schoolCode,
                })),
            ],
        },
        {
            id: 'role',
            label: '플랫폼 권한',
            value: roleOverride,
            setValue: setRoleOverride,
            storageKey: 'dev_role_override',
            options: [
                { id: 'server', label: '실제 서버 권한' },
                { id: 'admin', label: '플랫폼 관리자' },
                { id: 'organizer', label: '이벤트 운영자' },
                { id: 'viewer', label: '그룹 뷰어', description: '읽기 전용' },
                { id: 'member', label: '일반 멤버' },
            ],
        },
        {
            id: 'event',
            label: '이벤트 데이터',
            value: eventDataMode,
            setValue: setEventDataMode,
            storageKey: 'dev_event_data_mode',
            options: [
                { id: 'server', label: '실제 서버 데이터' },
                { id: 'sample_events', label: '기본 샘플 이벤트' },
                {
                    id: 'onboarding_simulation',
                    label: '최신 응답 시트 + 필수 입금',
                    description: '독립 체크·연락처·약물·접근성·안내 항목 체험',
                },
            ],
        },
    ], [crewOverride, eventDataMode, operatingMode, roleOverride, schoolOverride, schools]);

    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
    const visibleSections = sections
        .map(section => ({
            ...section,
            options: normalizedQuery
                ? section.options.filter(option => (
                    `${section.label} ${option.label} ${option.description || ''}`
                        .toLocaleLowerCase('ko-KR')
                        .includes(normalizedQuery)
                ))
                : section.options,
        }))
        .filter(section => section.options.length > 0);

    const handleApply = () => {
        sections.forEach(section => {
            if (section.value === 'server') {
                localStorage.removeItem(section.storageKey);
            } else {
                localStorage.setItem(section.storageKey, section.value);
            }
        });
        window.location.reload();
    };

    const handleClear = () => {
        sections.forEach(section => localStorage.removeItem(section.storageKey));
        clearSimulationData();
        window.location.reload();
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(current => !current)}
                className="fixed bottom-4 left-4 z-[9999] flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 p-3.5 text-white shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all hover:scale-105"
                aria-label={isOpen ? '개발 시뮬레이션 닫기' : '개발 시뮬레이션 열기'}
            >
                {isOpen ? <X className="h-5 w-5" /> : <Sliders className="h-5 w-5" />}
            </button>

            {isOpen && (
                <aside className="fixed bottom-20 left-4 z-[9999] flex max-h-[calc(100dvh-6rem)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white/95 text-zinc-800 shadow-[0_8px_32px_rgba(0,0,0,0.16)] backdrop-blur-md">
                    <header className="shrink-0 border-b border-zinc-100 bg-white/90 px-5 pb-3 pt-4 backdrop-blur">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                                <Sliders className="h-4 w-4 shrink-0 text-zinc-500" />
                                <div className="min-w-0">
                                    <h2 className="truncate text-sm font-black text-zinc-900">Dev simulations</h2>
                                    <p className="text-[10px] font-semibold text-zinc-400">상태를 선택한 뒤 적용하세요</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClear}
                                className="shrink-0 rounded-lg border border-zinc-200 bg-zinc-100 px-2.5 py-1.5 text-[10px] font-bold text-zinc-600 transition-colors hover:bg-zinc-200"
                            >
                                전체 초기화
                            </button>
                        </div>

                        <div className="relative mt-3">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                            <input
                                value={query}
                                onChange={event => setQuery(event.target.value)}
                                placeholder="시뮬레이션 검색"
                                className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-8 text-xs font-semibold outline-none transition focus:border-[#162660]/40 focus:bg-white focus:ring-2 focus:ring-[#162660]/10"
                            />
                            {query && (
                                <button
                                    onClick={() => setQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:bg-zinc-200"
                                    aria-label="검색어 지우기"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </header>

                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4">
                        <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-2.5 text-[10px] font-semibold leading-relaxed text-amber-800">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                            <span>클라이언트 시뮬레이션입니다. 실제 API의 권한 검증에는 영향을 주지 않습니다.</span>
                        </div>

                        {visibleSections.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-zinc-200 py-10 text-center">
                                <p className="text-xs font-bold text-zinc-500">일치하는 시뮬레이션이 없습니다</p>
                                <button onClick={() => setQuery('')} className="mt-2 text-[11px] font-bold text-[#162660]">
                                    검색 초기화
                                </button>
                            </div>
                        ) : visibleSections.map(section => (
                            <details
                                key={section.id}
                                open={Boolean(normalizedQuery) || section.value !== 'server'}
                                className="group rounded-2xl border border-zinc-200/80 bg-white"
                            >
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3">
                                    <div>
                                        <h3 className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                                            {section.label}
                                        </h3>
                                        <p className="mt-0.5 text-[10px] font-semibold text-[#162660]">
                                            {section.options.find(option => option.id === section.value)?.label || '선택됨'}
                                        </p>
                                    </div>
                                    <ChevronDown className="h-4 w-4 text-zinc-400 transition-transform group-open:rotate-180" />
                                </summary>
                                <div className="space-y-1.5 border-t border-zinc-100 p-2.5">
                                    {section.options.map(option => (
                                        <label
                                            key={option.id}
                                            className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-xs transition-all ${
                                                section.value === option.id
                                                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                                                    : 'border-zinc-200/70 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                                            }`}
                                        >
                                            <span className="min-w-0">
                                                <span className="block font-bold">{option.label}</span>
                                                {option.description && (
                                                    <span className={`mt-0.5 block truncate text-[10px] ${
                                                        section.value === option.id ? 'text-zinc-300' : 'text-zinc-400'
                                                    }`}>
                                                        {option.description}
                                                    </span>
                                                )}
                                            </span>
                                            <input
                                                type="radio"
                                                name={section.storageKey}
                                                checked={section.value === option.id}
                                                onChange={() => section.setValue(option.id)}
                                                className="hidden"
                                            />
                                            {section.value === option.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                                        </label>
                                    ))}
                                </div>
                            </details>
                        ))}
                    </div>

                    <footer className="grid shrink-0 grid-cols-3 gap-2 border-t border-zinc-100 bg-white/95 px-5 py-3">
                        {deployedDeveloperAccess && (
                            <>
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        onOpenCrewAdmin();
                                    }}
                                    className="rounded-xl border border-zinc-300 bg-white py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50"
                                >
                                    크루 관리
                                </button>
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        onOpenSchoolAdmin();
                                    }}
                                    className="rounded-xl border border-zinc-300 bg-white py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50"
                                >
                                    학교 관리
                                </button>
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        onOpenUserAdmin();
                                    }}
                                    className="rounded-xl border border-zinc-300 bg-white py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50"
                                >
                                    사용자 권한
                                </button>
                            </>
                        )}
                        <a
                            href="/guide/index.html"
                            target="_blank"
                            rel="noreferrer"
                            className="col-span-3 flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/70 py-2 text-xs font-bold text-amber-900 shadow-sm transition hover:bg-amber-100"
                        >
                            <span>📱</span> 사용자 이용 가이드 (Instagram Card Deck)
                        </a>
                        <button
                            onClick={handleApply}
                            className="col-span-3 flex items-center justify-center gap-1.5 rounded-xl border-none bg-[#162660] py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-900"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            적용 후 새로고침
                        </button>
                    </footer>
                </aside>
            )}
        </>
    );
}
