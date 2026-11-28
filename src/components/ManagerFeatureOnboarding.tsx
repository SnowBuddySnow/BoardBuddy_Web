import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  EyeOff,
  Lock,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  TableProperties,
  UserCheck,
  X,
} from 'lucide-react';
import './ManagerFeatureOnboarding.css';

export interface ManagerFeatureOnboardingProps {
  open: boolean;
  crewName?: string;
  onClose: () => void;
  onOpenMatrix?: () => void;
}

interface DemoStepMeta {
  id:
    | 'matrix-overview'
    | 'auto-open'
    | 'cancel-lock'
    | 'dual-charges'
    | 'unified-events'
    | 'guest-otp'
    | 'private-notes';
  badge: string;
  navLabel: string;
  title: string;
  description: string;
  icon: typeof TableProperties;
  highlights: string[];
}

const STEPS: DemoStepMeta[] = [
  {
    id: 'matrix-overview',
    badge: '01 · 이용 매트릭스',
    navLabel: '엑셀형 이용표',
    title: '엑셀처럼 한눈에 보는 시즌방 이용 매트릭스',
    description:
      '좌상단을 원점으로 가로(날짜)와 세로(가나다순 크루원)를 고정하고, 주차별 음영과 구분선으로 주간 이용 흐름을 즉시 파악합니다.',
    icon: TableProperties,
    highlights: [
      '행(가나다순 크루원·게스트)과 열(주차·일자 헤더)이 스크롤 시에도 고정됩니다.',
      '월–일 / 일–토 주간 기준을 전환하고, 현재 표를 엑셀 파일로 바로 내보낼 수 있습니다.',
    ],
  },
  {
    id: 'auto-open',
    badge: '02 · 자동 오픈 일정',
    navLabel: '주간 자동 오픈',
    title: '매주 정해진 요일·시각에 예약을 자동으로 오픈해요',
    description:
      '단일 반복 규칙(오픈 요일 · 오픈 시각 · 사전 오픈 일수 · 예약 가능 기간)만 설정하면 매주 운영진이 수동으로 열지 않아도 예약 창이 열립니다.',
    icon: CalendarClock,
    highlights: [
      '예외표 없이 깔끔한 주간 반복 규칙 하나로 크루 정책을 관리합니다.',
      '매트릭스 상단과 크루 설정에서 다음 자동 오픈 시각을 바로 확인할 수 있습니다.',
    ],
  },
  {
    id: 'cancel-lock',
    badge: '03 · 취소 잠금',
    navLabel: '지난 일정 잠금',
    title: '마감 시각 이후 취소를 막아 노쇼·어뷰징을 방지해요',
    description:
      '기본 마감은 숙박 당일 04:00이며 크루 정책으로 변경할 수 있습니다. 불가피한 상황에는 운영진이 사유를 남기고 예외 취소할 수 있습니다.',
    icon: Lock,
    highlights: [
      '마감 이후 일반 부원의 직접 취소는 차단되어 무단 취소 어뷰징을 막습니다.',
      '운영진 예외 취소는 감사 사유와 처리자 계정이 함께 기록됩니다.',
    ],
  },
  {
    id: 'dual-charges',
    badge: '04 · 이용권 & 입금',
    navLabel: '이중 정산·이용권',
    title: '이용권(예약금)과 숙박별 실제 이용금을 따로 관리해요',
    description:
      '정규 부원도 시즌 이용권 예약금과 숙박당 실제 이용금을 각각 기록하고, 남은 박수를 실시간으로 추적할 수 있습니다.',
    icon: CreditCard,
    highlights: [
      '이용권 플랜 → 부원 이용권 → 청구·입금 3단계 구조로 정규 부원과 게스트 모두 일관되게 정산합니다.',
      '미입금 필터로 미납 인원만 즉시 추려내고, 셀 클릭 한 번으로 입금 완료 처리합니다.',
    ],
  },
  {
    id: 'unified-events',
    badge: '05 · 내부 일정 연동',
    navLabel: '통합 내부 일정',
    title: '캠프·대청소 같은 크루 일정을 이용표 상단에 함께 표시해요',
    description:
      '비시즌·시즌 이벤트를 하나의 통합 이벤트로 관리하며, "크루 달력에 표시"를 켠 일정이 매트릭스 날짜 열 위에 자동으로 나타납니다.',
    icon: CalendarDays,
    highlights: [
      '대청소·강습 캠프·세션 일정을 별도로 이중 입력할 필요가 없습니다.',
      '일정이 겹치는 날짜의 숙박 인원과 정원을 같은 화면에서 대조할 수 있습니다.',
    ],
  },
  {
    id: 'guest-otp',
    badge: '06 · 외부 게스트 관리',
    navLabel: '외부 게스트 인증',
    title: '휴대폰 본인인증된 외부 게스트도 같은 표에서 통합 관리해요',
    description:
      '외부 게스트는 휴대폰 본인인증이 필수이며, 학교·크루별 승인 모드(초대 필수 / 초대+운영진 승인 / 오픈 링크)와 일일 게스트 상한을 적용합니다.',
    icon: UserCheck,
    highlights: [
      '인증된 휴대폰 번호와 초대한 내부 부원 정보가 매트릭스 하단 게스트 구역에 함께 표시됩니다.',
      '승인 대기 게스트를 별도 화면 이동 없이 매트릭스에서 즉시 승인·거절할 수 있습니다.',
    ],
  },
  {
    id: 'private-notes',
    badge: '07 · 비공개 메모 & 정책',
    navLabel: '비공개 메모·정책',
    title: '부원에게는 보이지 않는 운영진 전용 메모와 벌점을 기록해요',
    description:
      '벌점·청소·시설·일반 카테고리로 누적 메모를 관리합니다. 이메일은 더 이상 필수가 아니며, 문자 발송은 추후 확장 기능으로 분리되어 있습니다.',
    icon: EyeOff,
    highlights: [
      '비공개 메모와 누적 벌점은 운영진 전용 경로로만 조회되어 일반 부원에게는 절대 노출되지 않습니다.',
      '이메일 비필수화 적용: 학교 이메일 인증은 선택적 자동 승인 용도로만 유지됩니다.',
    ],
  },
];

let cachedDisplayTransitionSupport: boolean | undefined;

function canTransitionDisplay(): boolean {
  if (cachedDisplayTransitionSupport !== undefined) return cachedDisplayTransitionSupport;
  if (typeof window === 'undefined' || !window.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  void getComputedStyle(probe).display;
  probe.style.display = 'none';
  cachedDisplayTransitionSupport = getComputedStyle(probe).display === 'block';
  probe.remove();
  return cachedDisplayTransitionSupport;
}

function supportsTopLayerExit(): boolean {
  return typeof window !== 'undefined' && Boolean(window.CSS?.supports?.('overlay', 'auto')) && canTransitionDisplay();
}

/* ---------------- Step 1: Mini Excel Matrix Demo ---------------- */
const DEMO_DAYS = [
  { iso: '2026-12-07', day: 7, dow: '월', wkMon: 0, wkSun: 0 },
  { iso: '2026-12-08', day: 8, dow: '화', wkMon: 0, wkSun: 0 },
  { iso: '2026-12-09', day: 9, dow: '수', wkMon: 0, wkSun: 0 },
  { iso: '2026-12-10', day: 10, dow: '목', wkMon: 0, wkSun: 0 },
  { iso: '2026-12-11', day: 11, dow: '금', wkMon: 0, wkSun: 0 },
  { iso: '2026-12-12', day: 12, dow: '토', wkMon: 0, wkSun: 0 },
  { iso: '2026-12-13', day: 13, dow: '일', wkMon: 0, wkSun: 1 },
  { iso: '2026-12-14', day: 14, dow: '월', wkMon: 1, wkSun: 1 },
  { iso: '2026-12-15', day: 15, dow: '화', wkMon: 1, wkSun: 1 },
  { iso: '2026-12-16', day: 16, dow: '수', wkMon: 1, wkSun: 1 },
];

type DemoCellState = 'STAYED' | 'CONFIRMED' | 'WAITING' | 'UNPAID' | null;

const DEMO_ROWS: Array<{
  name: string;
  pass: string;
  cells: DemoCellState[];
}> = [
  { name: '김민수', pass: '6/10박', cells: ['STAYED', 'STAYED', null, null, 'CONFIRMED', 'CONFIRMED', null, null, 'CONFIRMED', null] },
  { name: '박서연', pass: '5/10박', cells: [null, 'STAYED', 'STAYED', null, 'UNPAID', 'CONFIRMED', 'CONFIRMED', null, null, 'WAITING'] },
  { name: '이도현', pass: '무제한', cells: ['STAYED', null, null, 'CONFIRMED', 'CONFIRMED', 'CONFIRMED', null, 'CONFIRMED', null, null] },
  { name: '정하은', pass: '3/5박', cells: [null, null, 'STAYED', null, null, 'CONFIRMED', 'CONFIRMED', null, null, null] },
];

const CELL_TOKEN: Record<Exclude<DemoCellState, null>, { glyph: string; label: string; cls: string }> = {
  STAYED: { glyph: '●', label: '숙박 완료', cls: 'bg-[#162660] text-white' },
  CONFIRMED: { glyph: '○', label: '예약 확정', cls: 'bg-emerald-100 text-emerald-900' },
  WAITING: { glyph: '△', label: '대기 순번', cls: 'bg-amber-100 text-amber-900' },
  UNPAID: { glyph: '!', label: '실제 이용금 미입금', cls: 'bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-300' },
};

function MatrixOverviewDemo() {
  const [weekStart, setWeekStart] = useState<'MON' | 'SUN'>('MON');
  const [picked, setPicked] = useState<{ row: string; day: string; state: Exclude<DemoCellState, null> } | null>({
    row: '박서연',
    day: '12/11 (금)',
    state: 'UNPAID',
  });

  const totals = useMemo(
    () =>
      DEMO_DAYS.map((_, idx) =>
        DEMO_ROWS.filter((row) => row.cells[idx] && row.cells[idx] !== 'WAITING').length,
      ),
    [],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#162660] px-2 py-0.5 text-white">● 숙박</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-900">○ 확정</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">△ 대기</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-rose-800">! 미입금</span>
        </div>
        <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-0.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setWeekStart('MON')}
            className={`rounded-lg px-2.5 py-1 transition-colors ${weekStart === 'MON' ? 'bg-[#162660] text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
          >
            월–일 음영
          </button>
          <button
            type="button"
            onClick={() => setWeekStart('SUN')}
            className={`rounded-lg px-2.5 py-1 transition-colors ${weekStart === 'SUN' ? 'bg-[#162660] text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
          >
            일–토 음영
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full min-w-[34rem] border-separate border-spacing-0 text-center text-xs tabular-nums">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-b border-r border-zinc-200 bg-zinc-100 px-3 py-2 text-left font-black text-zinc-700">
                이름 (가나다순)
              </th>
              <th className="border-b border-r border-zinc-200 bg-zinc-100 px-2 py-2 font-black text-zinc-600">
                이용권
              </th>
              {DEMO_DAYS.map((d, idx) => {
                const band = weekStart === 'MON' ? d.wkMon : d.wkSun;
                const prevBand = idx > 0 ? (weekStart === 'MON' ? DEMO_DAYS[idx - 1].wkMon : DEMO_DAYS[idx - 1].wkSun) : band;
                const weekBoundary = idx > 0 && band !== prevBand;
                return (
                  <th
                    key={d.iso}
                    className={`border-b border-r border-zinc-200 px-1.5 py-1.5 font-bold ${
                      band % 2 === 0 ? 'bg-blue-50/90 text-[#162660]' : 'bg-zinc-50 text-zinc-700'
                    } ${weekBoundary ? 'border-l-2 border-l-blue-400' : ''}`}
                  >
                    <div className="text-[10px] opacity-75">{d.dow}</div>
                    <div>{d.day}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {DEMO_ROWS.map((row) => (
              <tr key={row.name}>
                <th className="sticky left-0 z-10 border-b border-r border-zinc-200 bg-white px-3 py-2 text-left font-black text-zinc-900">
                  {row.name}
                </th>
                <td className="border-b border-r border-zinc-200 bg-white px-2 py-2 text-[11px] font-bold text-zinc-500">
                  {row.pass}
                </td>
                {row.cells.map((cell, idx) => {
                  const d = DEMO_DAYS[idx];
                  const band = weekStart === 'MON' ? d.wkMon : d.wkSun;
                  const prevBand = idx > 0 ? (weekStart === 'MON' ? DEMO_DAYS[idx - 1].wkMon : DEMO_DAYS[idx - 1].wkSun) : band;
                  const weekBoundary = idx > 0 && band !== prevBand;
                  const token = cell ? CELL_TOKEN[cell] : null;
                  return (
                    <td
                      key={d.iso}
                      className={`border-b border-r border-zinc-200 p-1 ${
                        band % 2 === 0 ? 'bg-blue-50/40' : 'bg-white'
                      } ${weekBoundary ? 'border-l-2 border-l-blue-400' : ''}`}
                    >
                      {token && cell ? (
                        <button
                          type="button"
                          onClick={() => setPicked({ row: row.name, day: `12/${d.day} (${d.dow})`, state: cell })}
                          aria-label={`${row.name} 12월 ${d.day}일 ${token.label}`}
                          className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black transition-transform hover:scale-105 ${token.cls}`}
                        >
                          {token.glyph}
                        </button>
                      ) : (
                        <span className="text-zinc-200">·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-zinc-50 font-black text-zinc-700">
              <th colSpan={2} className="border-r border-zinc-200 px-3 py-2 text-left text-[11px]">
                일일 확정 인원 (정원 12)
              </th>
              {totals.map((count, idx) => (
                <td key={DEMO_DAYS[idx].iso} className="border-r border-zinc-200 py-2 text-[11px]">
                  {count}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {picked && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-2.5 text-xs text-blue-950">
          <span>
            선택 셀: <strong>{picked.row}</strong> · {picked.day} →{' '}
            <strong className="underline decoration-blue-400">{CELL_TOKEN[picked.state].label}</strong>
          </span>
          <span className="text-[11px] font-semibold text-blue-700">셀을 눌러 상태를 확인해 보세요</span>
        </div>
      )}
    </div>
  );
}

/* ---------------- Step 2: 1.1 Auto Open Schedule Demo ---------------- */
const DAY_OPTIONS = [
  { key: 'SUNDAY', label: '일요일' },
  { key: 'MONDAY', label: '월요일' },
  { key: 'TUESDAY', label: '화요일' },
  { key: 'WEDNESDAY', label: '수요일' },
  { key: 'THURSDAY', label: '목요일' },
  { key: 'FRIDAY', label: '금요일' },
  { key: 'SATURDAY', label: '토요일' },
] as const;

function AutoOpenDemo() {
  const [openDay, setOpenDay] = useState<string>('WEDNESDAY');
  const [openTime, setOpenTime] = useState('20:00');
  const [windowDays, setWindowDays] = useState(7);

  const dayLabel = DAY_OPTIONS.find((d) => d.key === openDay)?.label ?? '수요일';

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-xs font-bold text-zinc-600">
          매주 오픈 요일
          <select
            value={openDay}
            onChange={(e) => setOpenDay(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-bold text-zinc-900"
          >
            {DAY_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                매주 {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold text-zinc-600">
          오픈 시각
          <input
            type="time"
            value={openTime}
            onChange={(e) => setOpenTime(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-bold text-zinc-900"
          />
        </label>
        <label className="block text-xs font-bold text-zinc-600">
          예약 가능 기간 (일)
          <input
            type="number"
            min={1}
            max={30}
            value={windowDays}
            onChange={(e) => setWindowDays(Math.max(1, Math.min(30, Number(e.target.value) || 7)))}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-bold text-zinc-900"
          />
        </label>
      </div>

      <div className="rounded-xl border border-[#162660]/20 bg-[#162660]/5 p-3.5">
        <p className="text-[11px] font-black tracking-wide text-[#162660]">실시간 적용 미리보기</p>
        <p className="mt-1 text-sm font-black text-zinc-900">
          매주 {dayLabel} {openTime} 자동 오픈 → 오픈 시점부터 {windowDays}일 치 예약 개방
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          복잡한 주차별 예외표 없이 단일 반복 정책으로 운영진의 반복 수작업을 제거합니다.
        </p>
      </div>
    </div>
  );
}

/* ---------------- Step 3: 1.2 Cancel Lock & Manager Override Demo ---------------- */
function CancelLockDemo() {
  const [cutoffPreset, setCutoffPreset] = useState<'SAME_04' | 'PREV_22'>('SAME_04');
  const [reason, setReason] = useState('부상으로 인한 병원 진단서 확인');
  const [overridden, setOverridden] = useState(false);

  const cutoffLabel = cutoffPreset === 'SAME_04' ? '숙박 당일 04:00 (기본값)' : '숙박 전날 22:00 (크루 설정)';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCutoffPreset('SAME_04')}
          className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${
            cutoffPreset === 'SAME_04' ? 'border-[#162660] bg-[#162660] text-white' : 'border-zinc-200 bg-white text-zinc-700'
          }`}
        >
          기본: 당일 04:00
        </button>
        <button
          type="button"
          onClick={() => setCutoffPreset('PREV_22')}
          className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${
            cutoffPreset === 'PREV_22' ? 'border-[#162660] bg-[#162660] text-white' : 'border-zinc-200 bg-white text-zinc-700'
          }`}
        >
          변경 예시: 전날 22:00
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-zinc-800">일반 부원 화면</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-bold text-zinc-600">
              <Lock className="h-3 w-3" /> 잠금 적용
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-600">
            마감 기준: <strong>{cutoffLabel}</strong>
          </p>
          <button
            type="button"
            disabled
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-2.5 text-xs font-bold text-zinc-400 cursor-not-allowed"
          >
            <Lock className="h-3.5 w-3.5" /> 취소 가능 시각이 지나 취소할 수 없어요
          </button>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-amber-950">운영진 예외 취소 (감사 기록)</span>
            <ShieldAlert className="h-4 w-4 text-amber-700" />
          </div>
          {overridden ? (
            <div className="mt-3 space-y-2">
              <p className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-900">
                ✓ 예외 취소 완료 · 사유: “{reason}”
              </p>
              <button
                type="button"
                onClick={() => setOverridden(false)}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 underline"
              >
                <RotateCcw className="h-3.5 w-3.5" /> 데모 상태 되돌리기
              </button>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                aria-label="예외 취소 사유"
                placeholder="예외 취소 사유를 입력하세요"
                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs text-zinc-900"
              />
              <button
                type="button"
                onClick={() => {
                  if (reason.trim()) setOverridden(true);
                }}
                className="w-full rounded-xl bg-amber-700 px-3 py-2 text-xs font-black text-white hover:bg-amber-800"
              >
                운영진 예외 취소 체험하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Step 4: 1.3 Dual-Layer Charges Demo ---------------- */
function DualChargesDemo() {
  const [stayPaid, setStayPaid] = useState(false);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
        <div>
          <p className="text-sm font-black text-zinc-900">박서연 · 정규 부원</p>
          <p className="text-xs text-zinc-500">시즌권(예약금) + 숙박당 실제 이용금 이중 구조</p>
        </div>
        <span className="rounded-full bg-[#162660]/10 px-3 py-1 text-xs font-black text-[#162660]">
          남은 이용권 5 / 10박
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black text-emerald-900">1) 이용권 예약금</span>
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">입금완료</span>
          </div>
          <p className="mt-2 text-lg font-black tabular-nums text-zinc-900">150,000원</p>
          <p className="mt-1 text-xs text-zinc-600">시즌 10박권 · 입금자 박서연 · 11/20 확인</p>
        </div>

        <div
          className={`rounded-xl border p-3.5 transition-colors ${
            stayPaid ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/70'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[11px] font-black ${stayPaid ? 'text-emerald-900' : 'text-rose-900'}`}>
              2) 12/11 숙박 실제 이용금
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black text-white ${
                stayPaid ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              {stayPaid ? '입금완료' : '미입금'}
            </span>
          </div>
          <p className="mt-2 text-lg font-black tabular-nums text-zinc-900">15,000원</p>
          <button
            type="button"
            onClick={() => setStayPaid((prev) => !prev)}
            className={`mt-2 w-full rounded-lg px-3 py-1.5 text-xs font-black transition-colors ${
              stayPaid
                ? 'border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100'
                : 'bg-[#162660] text-white hover:bg-[#0f1b48]'
            }`}
          >
            {stayPaid ? '미입금으로 되돌리기' : '입금 확인 처리 체험하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Step 5: 1.4 Unified All-Season Internal Events Demo ---------------- */
const INITIAL_EVENTS = [
  { id: 1, date: '12/08 (화)', title: '시즌방 대청소', kind: '내부 운영', onCalendar: true },
  { id: 2, date: '12/12 (토)', title: '초보자 강습 캠프', kind: '크루 캠프', onCalendar: true },
  { id: 3, date: '12/15 (화)', title: '졸업생 친선 카빙 세션', kind: '연합 모임', onCalendar: false },
];

function UnifiedEventsDemo() {
  const [events, setEvents] = useState(INITIAL_EVENTS);

  const toggleEvent = (id: number) => {
    setEvents((prev) => prev.map((ev) => (ev.id === id ? { ...ev, onCalendar: !ev.onCalendar } : ev)));
  };

  const visibleEvents = events.filter((e) => e.onCalendar);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3.5">
        <p className="text-[11px] font-black text-indigo-900">매트릭스 상단 내부 일정 배너 행 미리보기</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {visibleEvents.length > 0 ? (
            visibleEvents.map((ev) => (
              <span
                key={ev.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-indigo-700 px-3 py-1 text-xs font-bold text-white"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                {ev.date} · {ev.title}
              </span>
            ))
          ) : (
            <span className="text-xs text-indigo-700">표시 중인 내부 일정이 없습니다. 아래 스위치를 켜 보세요.</span>
          )}
        </div>
      </div>

      <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
        {events.map((ev) => (
          <div key={ev.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-zinc-900">{ev.title}</p>
              <p className="text-xs text-zinc-500">
                {ev.date} · {ev.kind}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={ev.onCalendar}
              onClick={() => toggleEvent(ev.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition-colors ${
                ev.onCalendar ? 'bg-[#162660] text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
              }`}
            >
              {ev.onCalendar ? '표에 표시 중' : '표에서 숨김'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Step 6: 1.5 Guest Phone OTP & Approval Demo ---------------- */
function GuestOtpDemo() {
  const [approvalMode, setApprovalMode] = useState<'INVITE_REQUIRED' | 'INVITE_WITH_MANAGER_APPROVAL' | 'OPEN_LINK'>(
    'INVITE_WITH_MANAGER_APPROVAL',
  );
  const [guestStatus, setGuestStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-black text-zinc-700">학교·크루별 게스트 정책</span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-bold text-zinc-700">
            일일 게스트 상한: 3명 · 1박 25,000원
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {[
            { id: 'INVITE_REQUIRED', label: '초대 링크 필수' },
            { id: 'INVITE_WITH_MANAGER_APPROVAL', label: '초대 + 운영진 승인' },
            { id: 'OPEN_LINK', label: '오픈 링크 허용' },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setApprovalMode(mode.id as typeof approvalMode)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                approvalMode === mode.id
                  ? 'border-[#162660] bg-[#162660] text-white'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-black text-zinc-900">최지훈 (외부 게스트)</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                <BadgeCheck className="h-3.5 w-3.5" /> 휴대폰 본인인증 완료 (010-****-4821)
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">초대 부원: 김민수 · 신청일: 12/12 (토) · 1박 25,000원</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-black ${
              guestStatus === 'APPROVED'
                ? 'bg-emerald-100 text-emerald-900'
                : guestStatus === 'REJECTED'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-900'
            }`}
          >
            {guestStatus === 'APPROVED' ? '승인 확정' : guestStatus === 'REJECTED' ? '거절됨' : '운영진 승인 대기'}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setGuestStatus('APPROVED')}
            className="rounded-xl bg-[#162660] px-3.5 py-2 text-xs font-black text-white hover:bg-[#0f1b48]"
          >
            게스트 승인
          </button>
          <button
            type="button"
            onClick={() => setGuestStatus('REJECTED')}
            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-black text-rose-700 hover:bg-rose-100"
          >
            거절
          </button>
          {guestStatus !== 'PENDING' && (
            <button
              type="button"
              onClick={() => setGuestStatus('PENDING')}
              className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> 초기화
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Step 7: 1.6 Private Notes + A.1 Optional Email Demo ---------------- */
interface DemoNote {
  id: number;
  category: '벌점' | '청소' | '시설' | '일반';
  occurredOn: string;
  delta: number;
  text: string;
}

function PrivateNotesDemo() {
  const [notes, setNotes] = useState<DemoNote[]>([
    { id: 1, category: '청소', occurredOn: '2026-12-08', delta: 0, text: '대청소 분리수거 담당 완료' },
    { id: 2, category: '벌점', occurredOn: '2026-12-10', delta: 1, text: '퇴실 점검 미체크' },
  ]);
  const [category, setCategory] = useState<DemoNote['category']>('벌점');
  const [occurredOn, setOccurredOn] = useState('2026-12-12');
  const [delta, setDelta] = useState<number>(1);
  const [draft, setDraft] = useState('');

  const totalPenalty = notes.reduce((sum, n) => sum + n.delta, 0);

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setNotes((prev) => [{ id: Date.now(), category, occurredOn: occurredOn.trim(), delta, text: trimmed }, ...prev]);
    setDraft('');
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-zinc-900">김민수 · 비공개 운영 메모</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2.5 py-0.5 text-[10px] font-black text-white">
              <EyeOff className="h-3 w-3" /> 부원 본인 비공개
            </span>
          </div>
          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-black text-rose-800">
            누적 벌점 {totalPenalty}점
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DemoNote['category'])}
            aria-label="메모 분류"
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs font-bold text-zinc-900"
          >
            <option value="벌점">벌점</option>
            <option value="청소">청소</option>
            <option value="시설">시설</option>
            <option value="일반">일반</option>
          </select>
          <input
            type="date"
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            aria-label="메모 날짜"
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs font-bold tabular-nums text-zinc-900"
          />
          <select
            value={delta}
            onChange={(e) => setDelta(Number(e.target.value))}
            aria-label="벌점 증감"
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs font-bold text-zinc-900"
          >
            <option value={1}>벌점 +1</option>
            <option value={0}>벌점 변동 없음</option>
            <option value={-1}>벌점 -1 (상쇄)</option>
          </select>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="예: 보드 거치대 정리 도움 (-1점)"
            className="min-w-[10rem] flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1 rounded-xl bg-[#162660] px-3 py-2 text-xs font-black text-white hover:bg-[#0f1b48]"
          >
            <Plus className="h-3.5 w-3.5" /> 메모 추가
          </button>
        </div>

        <ul className="space-y-1.5">
          {notes.map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs">
              <span className="flex flex-wrap items-center gap-2 text-zinc-800">
                <span className="rounded-md bg-zinc-200 px-1.5 py-0.5 text-[10px] font-black text-zinc-700">{n.category}</span>
                {n.occurredOn && (
                  <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#162660]">
                    {n.occurredOn}
                  </span>
                )}
                <span>{n.text}</span>
              </span>
              {n.delta !== 0 && (
                <span className={`font-black tabular-nums ${n.delta > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {n.delta > 0 ? `+${n.delta}` : n.delta}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-xs text-sky-950">
          <p className="font-black">이메일 비필수화 적용</p>
          <p className="mt-1 leading-5 text-sky-900">
            가입·예약 시 이메일 없이 이용할 수 있으며, 학교 이메일은 선택적 자동 승인 용도로만 유지됩니다.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
          <p className="font-black text-zinc-900">문자 발송은 추후 확장 예정</p>
          <p className="mt-1 leading-5">
            현재는 인앱 공지 중심으로 운영되며, 발송 한도 정책 확정 후 문자 연동이 추가될 예정입니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function StepInteractiveDemo({ stepId }: { stepId: DemoStepMeta['id'] }) {
  switch (stepId) {
    case 'matrix-overview':
      return <MatrixOverviewDemo />;
    case 'auto-open':
      return <AutoOpenDemo />;
    case 'cancel-lock':
      return <CancelLockDemo />;
    case 'dual-charges':
      return <DualChargesDemo />;
    case 'unified-events':
      return <UnifiedEventsDemo />;
    case 'guest-otp':
      return <GuestOtpDemo />;
    case 'private-notes':
      return <PrivateNotesDemo />;
  }
}

export default function ManagerFeatureOnboarding({
  open,
  crewName,
  onClose,
  onOpenMatrix,
}: ManagerFeatureOnboardingProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const closingRef = useRef(false);

  const step = STEPS[stepIndex];
  const StepIcon = step.icon;

  const closeTopLayer = useCallback((dialog: HTMLDialogElement) => {
    if (closingRef.current) return;
    const finish = () => {
      closingRef.current = false;
      dialog.removeAttribute('data-closing');
      if (dialog.open) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      }
      onClose();
    };

    if (!supportsTopLayerExit()) {
      closingRef.current = true;
      dialog.setAttribute('data-closing', '');
      const animations = typeof dialog.getAnimations === 'function' ? dialog.getAnimations({ subtree: true }) : [];
      if (animations.length > 0) {
        void Promise.race([
          Promise.allSettled(animations.map((a) => a.finished)),
          new Promise((resolve) => window.setTimeout(resolve, 400)),
        ]).then(() => {
          if (dialog.hasAttribute('data-closing')) finish();
        });
        return;
      }
      finish();
      return;
    }

    if (dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    } else {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      setStepIndex(0);
      closingRef.current = false;
      dialog.removeAttribute('data-closing');
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      }
    } else if (dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      closingRef.current = false;
      dialog.removeAttribute('data-closing');
      onClose();
    };

    const handleCancel = (event: Event) => {
      if (!supportsTopLayerExit()) {
        event.preventDefault();
        closeTopLayer(dialog);
      }
    };

    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('cancel', handleCancel);

    // Fallback for browsers without native closedby="any" (e.g. Safari)
    let cleanupBackdrop: (() => void) | undefined;
    if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutside = (event: PointerEvent) => {
        const rect = dialog.getBoundingClientRect();
        return (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        );
      };
      const onPointerDown = (event: PointerEvent) => {
        pressedOutside = isOutside(event);
      };
      const onPointerUp = (event: PointerEvent) => {
        if (pressedOutside && isOutside(event)) {
          closeTopLayer(dialog);
        }
        pressedOutside = false;
      };
      dialog.addEventListener('pointerdown', onPointerDown);
      dialog.addEventListener('pointerup', onPointerUp);
      cleanupBackdrop = () => {
        dialog.removeEventListener('pointerdown', onPointerDown);
        dialog.removeEventListener('pointerup', onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('cancel', handleCancel);
      cleanupBackdrop?.();
    };
  }, [closeTopLayer, onClose]);

  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [open, stepIndex]);

  useEffect(() => {
    if (!open) return;
    const handleArrowNav = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'ArrowRight') {
        setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
      } else if (event.key === 'ArrowLeft') {
        setStepIndex((current) => Math.max(current - 1, 0));
      }
    };
    window.addEventListener('keydown', handleArrowNav);
    return () => window.removeEventListener('keydown', handleArrowNav);
  }, [open]);

  const handleRequestClose = () => {
    const dialog = dialogRef.current;
    if (dialog) closeTopLayer(dialog);
    else onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="mfo-dialog"
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      <div className="flex h-full w-full flex-col overflow-hidden rounded-t-[2rem] bg-[#FAF8F3] text-zinc-900 shadow-2xl sm:rounded-[2rem]">
        {/* Header */}
        <header className="shrink-0 border-b border-zinc-200 bg-white px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#162660] px-2.5 py-0.5 text-[10px] font-black text-white">
                  <Sparkles className="h-3 w-3" /> 기능 체험
                </span>
                <span className="text-xs font-bold text-zinc-500">
                  {crewName ? `${crewName} 운영진` : '크루 운영진'} · 시연용 인터랙티브 데모 (실제 데이터 미변경)
                </span>
              </div>
              <h1 id={titleId} className="mt-1.5 text-lg font-black text-zinc-950 sm:text-2xl">
                시즌방 매니저 기능 온보딩
              </h1>
            </div>
            <button
              type="button"
              autoFocus
              onClick={handleRequestClose}
              aria-label="매니저 기능 온보딩 닫기"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            role="progressbar"
            aria-label="온보딩 진행률"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={stepIndex + 1}
            className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-zinc-100"
          >
            <div
              className="h-full rounded-full bg-[#162660] transition-all duration-200"
              style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </header>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Desktop Step Rail */}
          <aside className="hidden w-60 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white p-4 md:block">
            <p className="mb-2.5 px-2 text-[11px] font-black text-zinc-400">기능 목록 ({STEPS.length})</p>
            <ol className="space-y-1">
              {STEPS.map((item, idx) => {
                const Icon = idx < stepIndex ? Check : item.icon;
                const active = idx === stepIndex;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-current={active ? 'step' : undefined}
                      onClick={() => setStepIndex(idx)}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-black transition-colors ${
                        active ? 'bg-[#162660] text-white' : 'text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.navLabel}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="mt-5 rounded-2xl bg-blue-50 p-3.5 text-[11px] leading-5 text-blue-950">
              각 단계의 버튼과 입력창을 직접 눌러 보며 실제 운영 흐름을 시연할 수 있어요.
            </p>
          </aside>

          {/* Step Content */}
          <main ref={contentRef} className="min-w-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8">
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="flex items-center justify-between gap-2 text-xs font-bold">
                <span className="rounded-full bg-[#162660]/10 px-3 py-1 text-[#162660]">{step.badge}</span>
                <span aria-live="polite" className="tabular-nums text-zinc-400">
                  {stepIndex + 1} / {STEPS.length}
                </span>
              </div>

              <div className="flex items-start gap-3">
                <StepIcon className="mt-0.5 h-7 w-7 shrink-0 text-[#162660]" />
                <div>
                  <h2 className="text-xl font-black leading-snug text-zinc-950 sm:text-2xl">{step.title}</h2>
                  <p className="mt-1.5 text-sm leading-6 text-zinc-600">{step.description}</p>
                </div>
              </div>

              {/* Interactive Demo Sandbox */}
              <section aria-label={`${step.navLabel} 인터랙티브 데모`} className="pt-1">
                <StepInteractiveDemo stepId={step.id} />
              </section>

              {/* Key Points */}
              <ul className="space-y-2 rounded-2xl bg-white/90 border border-zinc-200/80 p-4">
                {step.highlights.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-xs leading-5 text-zinc-700 sm:text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#162660]" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </main>
        </div>

        {/* Footer */}
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-white px-5 py-3.5 sm:px-7">
          <div className="flex items-center gap-1.5 md:hidden" aria-hidden="true">
            {STEPS.map((item, idx) => (
              <span
                key={item.id}
                className={`h-1.5 rounded-full transition-all ${
                  idx === stepIndex ? 'w-5 bg-[#162660]' : 'w-1.5 bg-zinc-200'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            className="hidden text-xs font-bold text-zinc-500 hover:text-zinc-900 md:inline-block"
          >
            데모 닫기
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              className="flex h-10 items-center gap-1 rounded-xl border border-zinc-200 px-3.5 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-35 sm:text-sm"
            >
              <ChevronLeft className="h-4 w-4" /> 이전
            </button>

            {stepIndex < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStepIndex((current) => Math.min(STEPS.length - 1, current + 1))}
                className="flex h-10 items-center gap-1 rounded-xl bg-[#162660] px-4 text-xs font-black text-white transition-colors hover:bg-[#0f1b48] sm:text-sm"
              >
                다음 <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                {onOpenMatrix && (
                  <button
                    type="button"
                    onClick={() => {
                      handleRequestClose();
                      onOpenMatrix();
                    }}
                    className="flex h-10 items-center gap-1.5 rounded-xl border border-[#162660] bg-white px-3.5 text-xs font-black text-[#162660] transition-colors hover:bg-blue-50 sm:text-sm"
                  >
                    실제 매트릭스 열기 <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRequestClose}
                  className="flex h-10 items-center gap-1.5 rounded-xl bg-[#162660] px-4 text-xs font-black text-white transition-colors hover:bg-[#0f1b48] sm:text-sm"
                >
                  체험 마치기
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </dialog>
  );
}
