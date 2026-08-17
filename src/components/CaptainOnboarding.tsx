import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Crown,
  KeyRound,
  Map,
  School,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserCog,
  UsersRound,
  X,
} from 'lucide-react';

export type CaptainOnboardingDestination =
  | 'crew_settings'
  | 'crew_permissions'
  | 'operations_center'
  | 'dashboard_groups';

interface CaptainOnboardingProps {
  open: boolean;
  isDesktop: boolean;
  initialStep?: number;
  onClose: () => void;
  onComplete: () => void;
  onNavigate: (destination: CaptainOnboardingDestination, stepIndex: number) => void;
}

interface OnboardingStep {
  id: string;
  navigationLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof Crown;
  points: string[];
  action?: {
    label: string;
    destination: CaptainOnboardingDestination;
    desktopOnly?: boolean;
  };
}

const steps: OnboardingStep[] = [
  {
    id: 'role-stack',
    navigationLabel: '역할 구조',
    eyebrow: '01 · Captain의 위치',
    title: 'Captain은 모든 일을 혼자 하는 사람이 아니에요',
    description: '일반 멤버의 기본 활동 위에 두 매니저 역할이 쌓이고, Captain은 크루를 대표하는 권한을 더 가집니다.',
    icon: Crown,
    points: [
      '크루 매니저와 이벤트 그룹 매니저 역할은 같은 사람에게 함께 부여할 수 있어요.',
      'Captain은 두 역할의 업무를 이해하되, 실제 운영은 적절한 사람에게 나누는 것이 좋아요.',
    ],
  },
  {
    id: 'crew-foundation',
    navigationLabel: '크루 준비',
    eyebrow: '02 · 크루의 기준 만들기',
    title: '사람을 초대하기 전에 크루 정보를 먼저 정리해요',
    description: '크루 이름, 가입 PIN, 학교 연동 상태는 모든 멤버가 처음 마주하는 운영 기준입니다.',
    icon: Settings2,
    points: [
      '크루 이름과 학교 정보를 실제 운영 기준에 맞게 확인해요.',
      '가입 PIN은 필요한 사람에게만 공유하고, 노출되었다면 바로 재발급해요.',
    ],
    action: { label: '크루 설정 열기', destination: 'crew_settings' },
  },
  {
    id: 'delegate',
    navigationLabel: '역할 배치',
    eyebrow: '03 · 운영진 구성하기',
    title: '업무 단위로 역할을 부여하면 운영이 선명해져요',
    description: '사람의 서열이 아니라 맡길 업무를 기준으로 크루 매니저와 이벤트 그룹 매니저를 부여하세요.',
    icon: UserCog,
    points: [
      '예약·가입·결제 운영은 크루 매니저에게 맡겨요.',
      '호스트 그룹·이벤트·참가자 운영은 이벤트 그룹 매니저에게 맡겨요.',
    ],
    action: { label: '역할 관리 열기', destination: 'crew_permissions' },
  },
  {
    id: 'season-operations',
    navigationLabel: '시즌 운영',
    eyebrow: '04 · 반복 업무의 흐름',
    title: '시즌 운영은 승인부터 통계까지 한 흐름으로 봐요',
    description: '예약과 가입을 따로 처리하기보다 운영 센터에서 상태가 어떻게 이어지는지 확인하는 것이 중요합니다.',
    icon: CalendarCheck2,
    points: [
      '가입 신청, 예약 정원, 결제 상태와 관리 메모를 같은 기준으로 관리해요.',
      '이용 통계는 다음 일정과 정원 설정을 조정하는 근거로 사용해요.',
    ],
    action: { label: '운영 센터 열기', destination: 'operations_center', desktopOnly: true },
  },
  {
    id: 'event-operations',
    navigationLabel: '이벤트 운영',
    eyebrow: '05 · 호스트 그룹에서 시작하기',
    title: '이벤트는 호스트 그룹과 참가자 응답까지 연결돼요',
    description: '호스트를 구성한 뒤 이벤트를 만들고, 필요한 응답과 결제 정보를 수집하는 순서로 운영하세요.',
    icon: Sparkles,
    points: [
      '호스트 역할과 그룹 오너를 확인한 뒤 이벤트를 만들어요.',
      '응답 시트는 꼭 필요한 항목만 받고, 민감정보는 필요한 순간에만 열어봐요.',
    ],
    action: { label: '호스트 그룹 열기', destination: 'dashboard_groups', desktopOnly: true },
  },
  {
    id: 'launch-check',
    navigationLabel: '최종 점검',
    eyebrow: '06 · Captain 체크리스트',
    title: '이 다섯 가지만 확인하면 운영을 시작할 수 있어요',
    description: '완료하면 이 안내는 자동으로 열리지 않습니다. 내 정보에서 언제든 다시 볼 수 있어요.',
    icon: ClipboardCheck,
    points: [
      '크루 정보와 가입 PIN을 확인했어요.',
      '두 매니저 역할을 업무에 맞게 배치했어요.',
      '예약과 이벤트의 담당자를 정했어요.',
      '개인정보를 필요한 범위에서만 다루기로 했어요.',
      '운영진에게 각자 시작할 화면을 알려줬어요.',
    ],
  },
];

function RoleStackVisual() {
  return (
    <div className="space-y-3">
      <div className="mx-auto max-w-sm rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-black text-amber-950">
          <Crown className="h-4 w-4 text-amber-700" /> Captain
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {['두 매니저 역할', '크루 대표', '역할 부여'].map(label => (
            <span key={label} className="rounded-full bg-amber-200 px-2.5 py-1 text-[10px] font-black text-amber-900">{label}</span>
          ))}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-sky-200 bg-white p-4">
          <p className="text-xs font-black text-sky-900">크루 매니저</p>
          <p className="mt-1 text-[11px] leading-5 text-zinc-500">가입 · 예약 · 결제 · 통계</p>
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-white p-4">
          <p className="text-xs font-black text-indigo-900">이벤트 그룹 매니저</p>
          <p className="mt-1 text-[11px] leading-5 text-zinc-500">호스트 그룹 · 이벤트 · 응답</p>
        </div>
      </div>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-center text-[11px] font-bold text-emerald-900">
        모든 역할은 일반 멤버의 기본 활동 위에 더해져요
      </div>
    </div>
  );
}

function CrewFoundationVisual() {
  const items = [
    { icon: UsersRound, title: '크루 이름', copy: '멤버가 알아보기 쉬운 이름' },
    { icon: KeyRound, title: '가입 PIN', copy: '공유 범위 확인과 재발급' },
    { icon: School, title: '학교 연동', copy: '소속과 승인 상태 확인' },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {items.map(({ icon: Icon, title, copy }) => (
        <div key={title} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <Icon className="h-5 w-5 text-[#162660]" />
          <p className="mt-4 text-xs font-black text-zinc-900">{title}</p>
          <p className="mt-1 text-[11px] leading-5 text-zinc-500">{copy}</p>
        </div>
      ))}
    </div>
  );
}

function DelegateVisual() {
  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
          <p className="text-xs font-black text-sky-950">크루 매니저에게</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['가입 승인', '예약 운영', '결제·메모', '이용 통계'].map(label => <span key={label} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-sky-800">{label}</span>)}
          </div>
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
          <p className="text-xs font-black text-indigo-950">이벤트 그룹 매니저에게</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['호스트 그룹', '이벤트 생성', '참가자·결제', '응답 시트'].map(label => <span key={label} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-800">{label}</span>)}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-3 py-2.5 text-[11px] font-bold text-white">
        <CheckCircle2 className="h-4 w-4 text-emerald-300" /> 필요하면 한 사람에게 두 역할을 함께 부여할 수 있어요
      </div>
    </div>
  );
}

function FlowVisual({ event }: { event?: boolean }) {
  const labels = event
    ? ['호스트 구성', '이벤트 생성', '응답·결제', '운영 자료']
    : ['가입 승인', '예약·정원', '결제·메모', '이용 통계'];
  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      {labels.map((label, index) => (
        <div key={label} className="flex flex-1 flex-col items-center gap-2 sm:flex-row">
          <div className={`flex min-h-14 w-full items-center justify-center rounded-2xl border px-3 text-center text-[11px] font-black sm:min-h-16 ${event ? 'border-indigo-200 bg-indigo-50 text-indigo-950' : 'border-sky-200 bg-sky-50 text-sky-950'}`}>
            {label}
          </div>
          {index < labels.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 rotate-90 text-zinc-300 sm:rotate-0" />}
        </div>
      ))}
    </div>
  );
}

function LaunchVisual() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {['크루 정보', '운영진 역할', '담당자', '개인정보 원칙', '시작 화면 공유'].map((label, index) => (
        <div key={label} className={`flex items-center gap-3 rounded-xl border p-3 ${index === 4 ? 'sm:col-span-2 border-amber-200 bg-amber-50' : 'border-zinc-200 bg-white'}`}>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-bold text-zinc-700">{label}</span>
        </div>
      ))}
    </div>
  );
}

function StepVisual({ stepId }: { stepId: string }) {
  if (stepId === 'role-stack') return <RoleStackVisual />;
  if (stepId === 'crew-foundation') return <CrewFoundationVisual />;
  if (stepId === 'delegate') return <DelegateVisual />;
  if (stepId === 'season-operations') return <FlowVisual />;
  if (stepId === 'event-operations') return <FlowVisual event />;
  return <LaunchVisual />;
}

export function CaptainOnboardingReturnButton({ onReturn, onDismiss }: { onReturn: () => void; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-24 right-4 z-[9000] flex items-center overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 text-amber-950 shadow-[0_12px_32px_rgba(24,24,27,0.18)] sm:bottom-6 sm:right-6">
      <button type="button" onClick={onReturn} className="flex items-center gap-3 border-0 bg-transparent px-4 py-3 text-left hover:bg-amber-100">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-200">
          <Crown className="h-4 w-4" />
        </span>
        <span>
          <span className="block text-xs font-black">Captain 가이드로 돌아가기</span>
          <span className="mt-0.5 block text-[10px] font-semibold text-amber-800">보던 단계에서 계속해요</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-amber-700" />
      </button>
      <button type="button" onClick={onDismiss} className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent text-amber-700 hover:bg-amber-200" aria-label="Captain 가이드 돌아가기 숨기기">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function CaptainOnboarding({ open, isDesktop, initialStep = 0, onClose, onComplete, onNavigate }: CaptainOnboardingProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const contentRef = useRef<HTMLElement | null>(null);
  const step = steps[stepIndex];
  const progress = useMemo(() => `${((stepIndex + 1) / steps.length) * 100}%`, [stepIndex]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight' && stepIndex < steps.length - 1) setStepIndex(current => current + 1);
      if (event.key === 'ArrowLeft' && stepIndex > 0) setStepIndex(current => current - 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open, stepIndex]);

  useEffect(() => {
    if (open) setStepIndex(Math.min(Math.max(initialStep, 0), steps.length - 1));
  }, [initialStep, open]);

  useEffect(() => {
    if (open && contentRef.current) contentRef.current.scrollTop = 0;
  }, [open, stepIndex]);

  if (!open) return null;

  const StepIcon = step.icon;
  const actionUnavailable = Boolean(step.action?.desktopOnly && !isDesktop);

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-zinc-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="captain-onboarding-title"
        className="flex h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[2rem] bg-[#FAF8F3] shadow-2xl sm:h-[min(48rem,92dvh)] sm:rounded-[2rem]"
      >
        <header className="relative shrink-0 border-b border-zinc-200 bg-white px-5 pb-4 pt-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">
                <Crown className="h-4 w-4" /> Captain 시작 가이드
              </div>
              <h1 id="captain-onboarding-title" className="mt-1 truncate text-xl font-black text-zinc-950 sm:text-2xl">크루 운영의 전체 지도를 먼저 볼게요</h1>
            </div>
            <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-100" aria-label="Captain 시작 가이드 나중에 보기">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-[#162660] transition-all duration-300" style={{ width: progress }} />
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white p-5 md:block">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">전체 순서</p>
            <ol className="space-y-1.5">
              {steps.map((item, index) => {
                const Icon = item.icon;
                const active = index === stepIndex;
                const complete = index < stepIndex;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setStepIndex(index)}
                      className={`flex w-full items-center gap-3 rounded-xl border-0 px-3 py-3 text-left text-xs font-black transition-colors ${active ? 'bg-[#162660] text-white' : 'bg-transparent text-zinc-500 hover:bg-zinc-100'}`}
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-white/15' : complete ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                        {complete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </span>
                      <span>{item.navigationLabel}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <Map className="h-5 w-5 text-amber-700" />
              <p className="mt-3 text-xs font-black text-amber-950">다시 보고 싶을 때</p>
              <p className="mt-1 text-[11px] leading-5 text-amber-800">내 정보 → Captain 시작 가이드에서 언제든 열 수 있어요.</p>
            </div>
          </aside>

          <main ref={contentRef} className="min-w-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full bg-[#162660]/8 px-3 py-1.5 text-[11px] font-black text-[#162660]">{step.eyebrow}</span>
                <span className="text-xs font-bold text-zinc-400">{stepIndex + 1} / {steps.length}</span>
              </div>

              <div className="mt-5 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#162660] text-white shadow-sm">
                  <StepIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black leading-tight text-zinc-950 sm:text-3xl">{step.title}</h2>
                  <p className="mt-3 text-sm font-medium leading-6 text-zinc-600">{step.description}</p>
                </div>
              </div>

              <div className="mt-7 rounded-3xl border border-zinc-200 bg-[#F5F4F0] p-4 sm:p-5">
                <StepVisual stepId={step.id} />
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
                <p className="flex items-center gap-2 text-xs font-black text-zinc-900">
                  <ShieldCheck className="h-4 w-4 text-[#162660]" /> 이 단계에서 기억할 것
                </p>
                <ul className="mt-3 space-y-2.5">
                  {step.points.map(point => (
                    <li key={point} className="flex items-start gap-2 text-sm leading-6 text-zinc-600">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {step.action && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#162660]/10 bg-[#162660]/5 p-4">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#162660]">서비스에서 바로 확인해 보세요</p>
                    {!actionUnavailable && <p className="mt-1 text-[11px] font-medium text-zinc-500">확인 중에도 가이드로 돌아오는 버튼이 유지돼요.</p>}
                    {actionUnavailable && <p className="mt-1 text-[11px] font-medium text-zinc-500">이 작업은 데스크톱 화면에서 사용할 수 있어요.</p>}
                  </div>
                  {!actionUnavailable && (
                    <button type="button" onClick={() => onNavigate(step.action!.destination, stepIndex)} className="flex shrink-0 items-center gap-1.5 rounded-xl border-0 bg-white px-4 py-2.5 text-xs font-black text-[#162660] shadow-sm hover:bg-blue-50">
                      {step.action.label} <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-200 bg-white px-5 py-4 sm:px-7">
          <button type="button" onClick={onClose} className="hidden text-xs font-bold text-zinc-400 hover:text-zinc-700 sm:block">나중에 보기</button>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStepIndex(current => Math.max(0, current - 1))}
              disabled={stepIndex === 0}
              className="flex h-11 items-center gap-1 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-600 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" /> 이전
            </button>
            {stepIndex < steps.length - 1 ? (
              <button type="button" onClick={() => setStepIndex(current => current + 1)} className="flex h-11 items-center gap-1 rounded-xl border-0 bg-[#162660] px-5 text-sm font-black text-white hover:bg-[#0f1b48]">
                다음 <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={onComplete} className="flex h-11 items-center gap-2 rounded-xl border-0 bg-amber-400 px-5 text-sm font-black text-amber-950 hover:bg-amber-300">
                <Crown className="h-4 w-4" /> Captain 준비 완료
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
