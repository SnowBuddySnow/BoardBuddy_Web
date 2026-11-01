import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck,
  FileCheck2, ListChecks, MessageCircle, Play, ShieldCheck, Sparkles, UsersRound, X,
} from 'lucide-react';
import { PLANNING_MODE_COPY } from './event/planningModeCopy';

export type EventManagerOnboardingDestination = 'dashboard_groups' | 'dashboard_event_new' | 'dashboard_parties';

interface EventManagerOnboardingProps {
  open: boolean;
  isDesktop: boolean;
  canCreateEvents: boolean;
  initialStep?: number;
  onClose: () => void;
  onComplete: () => void;
  onNavigate: (destination: EventManagerOnboardingDestination, stepIndex: number) => void;
}

interface EventManagerStep {
  id: string;
  label: string;
  title: string;
  description: string;
  icon: typeof Sparkles;
  cards: Array<{ title: string; description: string }>;
  points: string[];
  action?: { label: string; destination: EventManagerOnboardingDestination };
}

const steps: EventManagerStep[] = [
  {
    id: 'host-group', label: '권한·호스트 그룹', icon: UsersRound,
    title: '호스트 그룹에서 운영을 시작해요',
    description: '크루에서 이벤트 권한을 받은 뒤, 함께 운영할 호스트 그룹에 참여하세요.',
    cards: [
      { title: '크루의 이벤트 그룹 매니저', description: '크루장이 지정하는 이벤트 담당자예요. 크루 매니저 권한도 함께 가질 수 있어요.' },
      { title: '호스트 그룹의 오너·매니저', description: '해당 그룹의 이벤트를 운영해요. 뷰어는 조회 역할이며, 멤버 초대·삭제는 오너가 맡아요.' },
    ],
    points: ['기존 그룹은 오너에게 초대 링크를 받아 수락하세요.', '그룹 상세에서 내 크루와 그룹 역할을 확인하세요. 크루 권한과 그룹 참여는 별도예요.'],
    action: { label: '호스트 그룹 확인하기', destination: 'dashboard_groups' },
  },
  {
    id: 'event-setup', label: '이벤트 구성', icon: Sparkles,
    title: '진행 방식에 맞춰 이벤트를 만들어요',
    description: '호스트 그룹·날짜·정원·활동 분류를 정하고, 참가자가 읽을 소개를 작성하세요.',
    cards: [
      { title: PLANNING_MODE_COPY.MANAGER_PLANNED.label, description: PLANNING_MODE_COPY.MANAGER_PLANNED.description },
      { title: PLANNING_MODE_COPY.MEMBER_PLANNED.label, description: PLANNING_MODE_COPY.MEMBER_PLANNED.description },
    ],
    points: ['신청 시작과 모임 시작 시간을 확인하세요. 날짜별 모임은 이벤트를 나눠 만들 수 있어요.', '호스트 개설형은 장소를 비워 두고 참가자가 협의하도록 소개에 안내해도 돼요.'],
    action: { label: '새 이벤트 만들기', destination: 'dashboard_event_new' },
  },
  {
    id: 'registration', label: '신청·응답 설정', icon: FileCheck2,
    title: '신청 조건과 필요한 응답을 정해요',
    description: '공개 범위와 참가 신청 정책을 구분하고, 필요한 질문만 받으세요.',
    cards: [
      { title: '즉시 승인 / 승인 후 참가', description: '즉시 승인은 호스트의 수동 승인 없이 진행해요. 승인 후 참가는 신청자를 확인해 확정해요.' },
      { title: '필수 / 선택 / 안내문', description: '필수 응답과 작성 제한시간을 정해요. 안내문은 읽기 전용이며, 미리보기로 참가자 화면을 확인해요.' },
    ],
    points: ['크루 한정 이벤트는 호스트 그룹에 참여한 크루가 대상이에요.', '취소·환불 규정은 모집 전에 안내하고, 개인정보와 사진 활용 항목은 실제 운영에 필요한 만큼만 설정하세요.'],
    action: { label: '이벤트 목록 열기', destination: 'dashboard_parties' },
  },
  {
    id: 'open-registration', label: '초안·모집 오픈', icon: Play,
    title: '초안을 검토한 뒤 모집을 열어요',
    description: '준비 중으로 저장하기는 초안 저장이에요. 설정을 확인한 뒤 모집 오픈을 눌러 주세요.',
    cards: [
      { title: '준비 중', description: '날짜·정원·공개 범위·응답·환불 규정을 점검해요. 저장 결과가 불확실하면 기존 초안부터 확인하세요.' },
      { title: '모집 중', description: '모집 오픈 후 상태가 바뀌었는지 확인해요. 신청 시작 시간이 있다면 해당 시간부터 신청할 수 있어요.' },
    ],
    points: ['참가자나 응답 증빙이 생기면 동의 항목·환불 규정 수정이 제한될 수 있어요.', '초안이 이미 저장됐다면 같은 초안을 이어서 수정해 중복 생성을 피하세요.'],
    action: { label: '모집 상태 확인하기', destination: 'dashboard_parties' },
  },
  {
    id: 'participants', label: '참가자·채팅 관리', icon: MessageCircle,
    title: '참가 상태와 안내를 함께 관리해요',
    description: '이벤트 상세에서 참가자 목록·응답 제출 여부·채팅 안내를 확인하세요.',
    cards: [
      { title: '참가자와 응답', description: '동의 대기·승인 대기·참가 확정을 구분하세요. 응답의 자동 저장과 최종 제출도 달라요.' },
      { title: '입금 기록과 채팅', description: '입금 상태·메모는 행별로 저장해요. 채팅 링크·입장 안내는 채팅방 정보 저장을 누르면 확정 참가자에게 공개돼요.' },
    ],
    points: ['입금 상태는 수동 기록이에요. 자동 청구·송금·환불은 진행되지 않아요.', '응답 조회와 XLSX 내보내기는 필요한 대상과 항목만 선택하세요.'],
    action: { label: '참가자 관리할 이벤트 찾기', destination: 'dashboard_parties' },
  },
  {
    id: 'finish', label: '마감·최종 점검', icon: ClipboardCheck,
    title: '마감과 취소를 구분해 마무리해요',
    description: '모집 마감은 추가 신청을 멈추는 기능이에요. 모임 취소와는 달라요.',
    cards: [
      { title: '모집 마감', description: '이벤트 상세에서 모집 마감을 누르세요. 기존 확정 참가자는 유지돼요.' },
      { title: '이벤트 전체 취소', description: '수정 화면에서 모집 상태를 취소됨으로 바꾸고 저장하세요. 참가자 안내와 비용 정산은 별도로 진행해요.' },
    ],
    points: ['그룹 역할, 모집 조건, 참가자 안내를 확인했다면 운영을 시작할 수 있어요.', '이 안내는 내 정보와 운영 센터에서 언제든 다시 볼 수 있어요.'],
  },
];

export function EventManagerOnboardingReturnButton({ onReturn, onDismiss }: { onReturn: () => void; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-24 right-4 z-[9000] flex max-w-[calc(100%-2rem)] items-center overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-50 text-indigo-950 shadow-lg sm:bottom-6 sm:right-6">
      <button type="button" onClick={onReturn} className="flex min-w-0 items-center gap-3 px-4 py-3 text-left hover:bg-indigo-100">
        <Sparkles className="h-5 w-5 shrink-0" />
        <span>
          <span className="block text-xs font-black">이벤트 가이드로 돌아가기</span>
          <span className="mt-0.5 block text-[11px] text-indigo-800">보던 단계에서 계속하기</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0" />
      </button>
      <button type="button" onClick={onDismiss} aria-label="이벤트 가이드 돌아가기 숨기기" className="mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-indigo-200">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

const clampStep = (index: number) => Number.isFinite(index) ? Math.min(Math.max(Math.floor(index), 0), steps.length - 1) : 0;

export default function EventManagerOnboarding({ open, isDesktop, canCreateEvents, initialStep = 0, onClose, onComplete, onNavigate }: EventManagerOnboardingProps) {
  const [stepIndex, setStepIndex] = useState(() => clampStep(initialStep));
  const dialogRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const step = steps[stepIndex];
  const StepIcon = step.icon;
  const action = step.action?.destination === 'dashboard_event_new' && !canCreateEvents
    ? { label: '이벤트 목록 열기', destination: 'dashboard_parties' as const }
    : step.action;

  useEffect(() => {
    if (open) setStepIndex(clampStep(initialStep));
  }, [initialStep, open]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);

  useEffect(() => {
    if (open && contentRef.current) contentRef.current.scrollTop = 0;
  }, [open, stepIndex]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'ArrowRight') setStepIndex(current => Math.min(current + 1, steps.length - 1));
      if (event.key === 'ArrowLeft') setStepIndex(current => Math.max(current - 1, 0));
      if (event.key !== 'Tab') return;
      const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
      const visibleButtons = buttons ? Array.from(buttons).filter(button => button.getClientRects().length > 0) : [];
      const first = visibleButtons[0];
      const last = visibleButtons[visibleButtons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-zinc-950/55 backdrop-blur-sm sm:items-center sm:p-6">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="event-manager-onboarding-title" className="flex h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[2rem] bg-[#FAF8F3] shadow-2xl sm:h-[min(48rem,92dvh)] sm:rounded-[2rem]">
        <header className="shrink-0 border-b border-zinc-200 bg-white px-5 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-black text-indigo-700"><Sparkles className="h-4 w-4 shrink-0" /> 이벤트 그룹 매니저 시작 가이드</p>
              <h1 id="event-manager-onboarding-title" className="mt-1 text-xl font-black text-zinc-950 sm:text-2xl">이벤트 운영 시작하기</h1>
            </div>
            <button ref={closeRef} type="button" onClick={onClose} aria-label="이벤트 그룹 매니저 시작 가이드 나중에 보기" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 hover:bg-zinc-100"><X className="h-5 w-5" /></button>
          </div>
          <div role="progressbar" aria-label="이벤트 가이드 진행률" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={stepIndex + 1} className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-[#162660] transition-all" style={{ width: `${(stepIndex + 1) / steps.length * 100}%` }} />
          </div>
        </header>
        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-60 shrink-0 border-r border-zinc-200 bg-white p-5 md:block">
            <p className="mb-3 text-[11px] font-black text-zinc-400">전체 순서</p>
            <ol className="space-y-1.5">
              {steps.map((item, index) => {
                const Icon = index < stepIndex ? Check : item.icon;
                return <li key={item.id}><button type="button" aria-current={index === stepIndex ? 'step' : undefined} onClick={() => setStepIndex(index)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-black ${index === stepIndex ? 'bg-[#162660] text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}><Icon className="h-4 w-4 shrink-0" />{item.label}</button></li>;
              })}
            </ol>
            <p className="mt-6 rounded-2xl bg-indigo-50 p-4 text-xs leading-6 text-indigo-900">내 정보와 운영 센터에서<br />언제든 다시 열 수 있어요.</p>
          </aside>
          <main ref={contentRef} className="min-w-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-center justify-between gap-3 text-xs font-bold"><span className="rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-900">{step.label}</span><span aria-live="polite" className="text-zinc-400">{stepIndex + 1} / {steps.length}</span></div>
              <div className="mt-4 flex items-start gap-3"><StepIcon className="mt-1 h-7 w-7 shrink-0 text-[#162660]" /><h2 className="text-2xl font-black leading-tight text-zinc-950 sm:text-3xl">{step.title}</h2></div>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{step.description}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {step.cards.map(card => <div key={card.title} className="rounded-2xl border border-indigo-100 bg-white p-4"><h3 className="text-sm font-black text-[#162660]">{card.title}</h3><p className="mt-2 text-sm leading-6 text-zinc-600">{card.description}</p></div>)}
              </div>
              <ul className="mt-4 space-y-2 rounded-2xl bg-indigo-50/70 p-4">
                {step.points.map(point => <li key={point} className="flex items-start gap-2 text-sm leading-5 text-zinc-600"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" /><span>{point}</span></li>)}
              </ul>
              {action && <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-3">
                {isDesktop ? <button type="button" onClick={() => onNavigate(action.destination, stepIndex)} className="flex min-h-11 items-center gap-2 text-sm font-black text-[#162660]">{action.label}<ArrowRight className="h-4 w-4" /></button>
                  : <p className="flex items-start gap-2 text-xs leading-6 text-zinc-500"><ShieldCheck className="mt-1 h-4 w-4 shrink-0" />이벤트 설정과 참가자 관리는 PC에서 진행해 주세요.</p>}
              </div>}
            </div>
          </main>
        </div>
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-200 bg-white px-5 py-4 sm:px-7">
          <button type="button" onClick={onClose} className="hidden text-xs font-bold text-zinc-500 hover:text-zinc-800 sm:block">나중에 보기</button>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" disabled={stepIndex === 0} onClick={() => setStepIndex(current => current - 1)} className="flex h-11 items-center gap-1 rounded-xl border border-zinc-200 px-4 text-sm font-bold text-zinc-600 disabled:opacity-35"><ChevronLeft className="h-4 w-4" />이전</button>
            {stepIndex < steps.length - 1
              ? <button type="button" onClick={() => setStepIndex(current => current + 1)} className="flex h-11 items-center gap-1 rounded-xl bg-[#162660] px-5 text-sm font-black text-white hover:bg-[#0f1b48]">다음<ChevronRight className="h-4 w-4" /></button>
              : <button type="button" onClick={onComplete} className="flex h-11 items-center gap-2 rounded-xl bg-[#162660] px-5 text-sm font-black text-white hover:bg-[#0f1b48]"><ListChecks className="h-4 w-4" />가이드 완료</button>}
          </div>
        </footer>
      </section>
    </div>
  );
}
