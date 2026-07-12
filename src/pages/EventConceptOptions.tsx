import { Button } from '../components/Button';
import {
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    MapPin,
    MessageCircle,
    ShieldCheck,
    Sparkles,
    Users
} from 'lucide-react';

interface EventConceptOptionsProps {
    onBack: () => void;
    onOpenParties: () => void;
}

const options = [
    {
        label: 'Option A',
        title: '빠른 모집형',
        summary: '열린 소모임을 카드로 빠르게 탐색하고 바로 신청하는 버전',
        bestFor: '모집 속도와 참여 전환율 확인',
        tone: '즉시 신청',
        color: 'bg-[#162660]',
        accent: 'text-[#162660]',
        bg: 'bg-blue-50',
        border: 'border-blue-100',
        bullets: ['날짜, 장소, 잔여 정원 우선 노출', '신청 CTA를 목록 카드 안에 고정', '마감/승인대기 상태를 명확히 표시'],
        sampleTitle: '토요일 휘팍 카빙 소모임',
        sampleMeta: '6월 29일 08:30 · 휘닉스파크',
        joined: '7/12명 참여'
    },
    {
        label: 'Option B',
        title: '호스트 큐레이션형',
        summary: '운영진이 추천하는 소모임을 스토리처럼 보여주는 버전',
        bestFor: '브랜드감, 주최자 신뢰, 콘텐츠성 확인',
        tone: '추천/큐레이션',
        color: 'bg-emerald-700',
        accent: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
        bullets: ['주최 그룹과 난이도/분위기 강조', '추천 이유와 준비물 섹션 추가', '처음 참가하는 멤버의 불안 감소'],
        sampleTitle: '입문자 웰컴 라이딩',
        sampleMeta: '호스트 추천 · 장비 체크 포함',
        joined: '4/8명 확정'
    },
    {
        label: 'Option C',
        title: '운영 관리형',
        summary: '소모임 개설, 승인, 출석 체크를 운영진 중심으로 정리한 버전',
        bestFor: '관리 효율과 승인 플로우 검증',
        tone: '관리/승인',
        color: 'bg-zinc-900',
        accent: 'text-zinc-900',
        bg: 'bg-zinc-50',
        border: 'border-zinc-200',
        bullets: ['승인 대기, 확정, 취소 상태를 한 화면에서 관리', '정원 진행률과 정책 설정을 강조', '출석/노쇼 관리 확장에 적합'],
        sampleTitle: '운영진 승인 필요 소모임',
        sampleMeta: '승인 대기 3명 · 정원 15명',
        joined: '9/15명 확정'
    }
];

const dummySchedule = [
    { time: '08:30', label: '집결 및 장비 체크' },
    { time: '09:00', label: '레벨별 팀 나누기' },
    { time: '11:30', label: '점심 및 다음 일정 안내' }
];

export default function EventConceptOptions({ onBack, onOpenParties }: EventConceptOptionsProps) {
    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FAF8F3] relative">
            <header className="px-4 pt-3 pb-3 flex items-center justify-between border-b border-zinc-100 bg-[#FAF8F3]">
                <Button variant="ghost" onClick={onBack} className="-ml-2 gap-1 text-zinc-800 hover:bg-transparent">
                    <ChevronLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-lg font-bold text-zinc-900">소모임 옵션 샘플</h1>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 overflow-y-auto px-4 pb-[110px] pt-4 space-y-5">
                <section className="bg-white border border-zinc-100 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-zinc-950">테스터 리뷰 후보</h2>
                            <p className="text-sm text-zinc-500 leading-relaxed mt-1">
                                백엔드 변경 없이 비교할 수 있는 더미 화면입니다. 리뷰 후 하나의 방향을 골라 실제 소모임 플로우에 반영하면 됩니다.
                            </p>
                        </div>
                    </div>
                </section>

                <div className="space-y-4">
                    {options.map((option) => (
                        <section key={option.label} className="bg-white border border-zinc-100 rounded-3xl p-5 shadow-sm space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${option.bg} ${option.accent} ${option.border} border`}>
                                        {option.label}
                                    </span>
                                    <h2 className="text-lg font-black text-zinc-950 mt-2">{option.title}</h2>
                                    <p className="text-sm text-zinc-500 leading-relaxed mt-1">{option.summary}</p>
                                </div>
                                <div className={`${option.color} text-white px-3 py-1.5 rounded-full text-xs font-bold shrink-0`}>
                                    {option.tone}
                                </div>
                            </div>

                            <div className={`${option.bg} ${option.border} border rounded-2xl p-4 space-y-3`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-black text-zinc-900">{option.sampleTitle}</h3>
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-semibold mt-1">
                                            <CalendarDays className="w-3.5 h-3.5" />
                                            <span>{option.sampleMeta}</span>
                                        </div>
                                    </div>
                                    <span className="text-xs font-black text-zinc-700">{option.joined}</span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-white/80 rounded-xl p-2 border border-white">
                                        <Users className={`w-4 h-4 mx-auto ${option.accent}`} />
                                        <p className="text-[11px] font-bold text-zinc-600 mt-1">정원</p>
                                    </div>
                                    <div className="bg-white/80 rounded-xl p-2 border border-white">
                                        <MapPin className={`w-4 h-4 mx-auto ${option.accent}`} />
                                        <p className="text-[11px] font-bold text-zinc-600 mt-1">장소</p>
                                    </div>
                                    <div className="bg-white/80 rounded-xl p-2 border border-white">
                                        <ShieldCheck className={`w-4 h-4 mx-auto ${option.accent}`} />
                                        <p className="text-[11px] font-bold text-zinc-600 mt-1">정책</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-black text-zinc-400 uppercase tracking-wider">검증 포인트</p>
                                {option.bullets.map((bullet) => (
                                    <div key={bullet} className="flex items-start gap-2 text-sm text-zinc-600">
                                        <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${option.accent}`} />
                                        <span>{bullet}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>

                <section className="bg-white border border-zinc-100 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-black text-zinc-950">공통 더미 상세 구성</h2>
                        <ClipboardList className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div className="space-y-3">
                        {dummySchedule.map((item) => (
                            <div key={item.time} className="flex items-center gap-3">
                                <span className="w-14 text-xs font-black text-[#162660] bg-blue-50 border border-blue-100 rounded-full py-1 text-center">
                                    {item.time}
                                </span>
                                <span className="text-sm font-semibold text-zinc-700">{item.label}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-100 rounded-2xl p-3">
                        <MessageCircle className="w-4 h-4 text-zinc-500 shrink-0" />
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            리뷰 시에는 신청 전환, 호스트 설명 충분성, 운영진 승인 부담을 중심으로 비교하면 됩니다.
                        </p>
                    </div>
                </section>

                <Button
                    variant="primary"
                    onClick={onOpenParties}
                    className="w-full h-12 bg-[#162660] hover:bg-[#1e3a8a] text-white border-none rounded-full font-bold flex items-center justify-center gap-1.5"
                >
                    현재 소모임 목록과 비교하기
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </main>
        </div>
    );
}
