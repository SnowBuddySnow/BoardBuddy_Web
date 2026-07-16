import { useMemo, useState } from 'react';
import { Button } from '../components/Button';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock3,
    MapPin,
    ShieldCheck,
    SlidersHorizontal,
    Users,
    X,
} from 'lucide-react';

interface EventConceptOptionsProps {
    onBack: () => void;
    onOpenParties: () => void;
}

type EventSample = {
    id: number;
    name: string;
    date: string;
    gatheringTime?: string;
    location?: string;
    currentCount: number;
    capacity: number;
    planningMode: 'SELF_ORGANIZED' | 'HOST_MANAGED';
    crewPolicies: Array<{ name: string; limit?: number }>;
};

const eventSamples: EventSample[] = [
    {
        id: 1,
        name: '토요일 휘팍 카빙 소모임',
        date: '6월 29일 (토)',
        gatheringTime: '08:30 집결',
        location: '휘닉스파크 스노우파크 정문',
        currentCount: 7,
        capacity: 12,
        planningMode: 'SELF_ORGANIZED',
        crewPolicies: [
            { name: '보드버디 연합', limit: 4 },
            { name: '스노우브릿지', limit: 3 },
        ],
    },
    {
        id: 2,
        name: '여름 MT 사전 모임',
        date: '7월 6일 (토)',
        gatheringTime: '13:00 집결',
        location: '건국대학교 서울캠퍼스',
        currentCount: 18,
        capacity: 24,
        planningMode: 'HOST_MANAGED',
        crewPolicies: [
            { name: '보드버디 연합', limit: 8 },
            { name: '웨이브클럽' },
            { name: '스노우브릿지', limit: 6 },
        ],
    },
    {
        id: 3,
        name: '주말 라이딩 번개',
        date: '7월 13일 (토)',
        currentCount: 3,
        capacity: 10,
        planningMode: 'SELF_ORGANIZED',
        crewPolicies: [
            { name: '보드버디 연합' },
        ],
    },
    {
        id: 4,
        name: '신입 부원 오리엔테이션',
        date: '7월 20일 (토)',
        gatheringTime: '11:00 집결',
        location: '서울숲 커뮤니티룸',
        currentCount: 20,
        capacity: 20,
        planningMode: 'HOST_MANAGED',
        crewPolicies: [
            { name: '보드버디 연합', limit: 20 },
        ],
    },
];

const formatAvailability = (event: EventSample) => `${event.currentCount} / ${event.capacity}`;

export default function EventConceptOptions({ onBack, onOpenParties }: EventConceptOptionsProps) {
    const [sort, setSort] = useState<'date' | 'availability' | 'participants'>('date');
    const [selectedEvent, setSelectedEvent] = useState<EventSample | null>(null);

    const events = useMemo(() => [...eventSamples].sort((left, right) => {
        if (sort === 'availability') {
            return (right.capacity - right.currentCount) - (left.capacity - left.currentCount);
        }
        if (sort === 'participants') {
            return right.currentCount - left.currentCount;
        }
        return left.id - right.id;
    }), [sort]);

    return (
        <div className="flex h-full flex-1 flex-col overflow-hidden bg-[#FAF8F3]">
            <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
                <Button variant="ghost" onClick={onBack} className="-ml-2 gap-1 text-zinc-800 hover:bg-transparent">
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-lg font-black text-zinc-900">이벤트 목록 샘플</h1>
                <div className="w-10" />
            </header>

            <main className="flex-1 overflow-y-auto px-4 pb-28 pt-5">
                <div className="mx-auto max-w-3xl">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-zinc-700">다가오는 이벤트</p>
                        <label className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                            <SlidersHorizontal className="h-4 w-4" />
                            <select
                                value={sort}
                                onChange={(event) => setSort(event.target.value as typeof sort)}
                                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs font-bold text-zinc-700 outline-none focus:border-[#162660]"
                                aria-label="이벤트 정렬"
                            >
                                <option value="date">날짜순</option>
                                <option value="availability">여유 인원순</option>
                                <option value="participants">참가 인원순</option>
                            </select>
                        </label>
                    </div>

                    <div className="space-y-3">
                        {events.map((event) => {
                            const isFull = event.currentCount >= event.capacity;
                            return (
                                <article key={event.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <h2 className="text-base font-black text-zinc-900">{event.name}</h2>
                                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-xs font-semibold text-zinc-500">
                                                <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{event.date}</span>
                                                {event.gatheringTime && <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{event.gatheringTime}</span>}
                                                {event.location && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{event.location}</span>}
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-black ${isFull ? 'bg-zinc-100 text-zinc-500' : 'bg-emerald-50 text-emerald-700'}`}>
                                                <Users className="h-3.5 w-3.5" /> {formatAvailability(event)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
                                        <span className={`text-xs font-bold ${event.planningMode === 'SELF_ORGANIZED' ? 'text-[#162660]' : 'text-amber-700'}`}>
                                            {event.planningMode === 'SELF_ORGANIZED' ? '자율 소모임' : '호스트 운영'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedEvent(event)}
                                            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                                        >
                                            <ShieldCheck className="h-3.5 w-3.5 text-[#162660]" /> 정책
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <Button
                        variant="primary"
                        onClick={onOpenParties}
                        className="mt-6 h-12 w-full rounded-lg border-none bg-[#162660] font-bold text-white hover:bg-[#0f1b48]"
                    >
                        현재 이벤트 목록과 비교하기
                        <ChevronRight className="ml-1 inline h-4 w-4" />
                    </Button>
                </div>
            </main>

            {selectedEvent && (
                <div className="fixed inset-0 z-[100] flex items-end bg-black/35 p-0 sm:items-center sm:justify-center sm:p-5" role="presentation">
                    <section className="w-full max-w-lg rounded-t-xl bg-white p-5 shadow-2xl sm:rounded-xl" role="dialog" aria-modal="true" aria-labelledby="event-policy-title">
                        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-4">
                            <div>
                                <h2 id="event-policy-title" className="text-lg font-black text-zinc-900">{selectedEvent.name}</h2>
                                <p className="mt-1 text-sm font-semibold text-zinc-500">
                                    {selectedEvent.date}{selectedEvent.gatheringTime ? ` · ${selectedEvent.gatheringTime}` : ''}
                                </p>
                            </div>
                            <button type="button" onClick={() => setSelectedEvent(null)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 cursor-pointer" aria-label="정책 닫기">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-5 py-5">
                            <section>
                                <p className="mb-2 text-xs font-black uppercase tracking-wide text-zinc-400">참여 가능 크루</p>
                                <div className="space-y-2">
                                    {selectedEvent.crewPolicies.map((crew) => (
                                        <div key={crew.name} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-3 text-sm">
                                            <span className="font-bold text-zinc-800">{crew.name}</span>
                                            <span className="font-semibold text-zinc-500">{crew.limit ? `크루당 최대 ${crew.limit}명` : '크루별 제한 없음'}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="rounded-lg border border-zinc-200 p-4">
                                <p className="text-xs font-black uppercase tracking-wide text-zinc-400">운영 방식</p>
                                <p className="mt-2 text-sm font-black text-zinc-900">
                                    {selectedEvent.planningMode === 'SELF_ORGANIZED' ? '자율 소모임' : '호스트 운영 이벤트'}
                                </p>
                                <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                                    {selectedEvent.planningMode === 'SELF_ORGANIZED'
                                        ? '주최자는 일정과 참가 슬롯을 열고, 참가 멤버가 장소와 세부 활동을 함께 정합니다.'
                                        : '운영진 또는 호스트가 장소, 일정, 진행 방식을 정하고 참가자를 관리합니다.'}
                                </p>
                            </section>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
