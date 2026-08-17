import {
  CalendarCheck2,
  Check,
  ChevronLeft,
  Crown,
  Plus,
  Sparkles,
  UserRound,
} from 'lucide-react';

interface RoleGuideProps {
  onBack: () => void;
}

const basePermissions = [
  '크루 정보·멤버 확인',
  '예약 신청·취소',
  '모임 조회·참가',
  '내 달력·활동 확인',
] as const;

const crewManagerPermissions = [
  '예약 현황·참가자 관리',
  '결제 상태·관리 메모 수정',
  '가입 신청 승인·반려',
  '예약 일정·정원 설정',
  '크루 이용 통계 확인',
] as const;

const eventManagerPermissions = [
  '이벤트 그룹 생성·참여',
  '담당 이벤트 그룹 운영',
  '모임 생성·수정',
  '모임 참가자·결제 관리',
] as const;

const captainPermissions = [
  '크루 이름 변경',
  '가입 PIN 확인·재발급',
  '크루 매니저 부여·회수',
  '이벤트 그룹 매니저 부여·회수',
  '학교 연동 요청',
] as const;

function PermissionChips({ permissions }: { permissions: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {permissions.map(permission => (
        <li key={permission} className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-2 text-xs font-bold text-zinc-700">
          <Check className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          {permission}
        </li>
      ))}
    </ul>
  );
}

function ManagerNode({
  title,
  permissions,
  icon: Icon,
  color,
  iconStyle,
  borderStyle,
}: {
  title: string;
  permissions: readonly string[];
  icon: typeof CalendarCheck2;
  color: string;
  iconStyle: string;
  borderStyle: string;
}) {
  return (
    <article className={`relative z-10 h-full rounded-2xl border border-l-4 bg-white p-5 shadow-sm ${borderStyle}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyle} ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="text-base font-black text-zinc-950">{title}</h3>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-black text-zinc-500">담당 업무</span>
      </div>
      <div className="mt-4">
        <PermissionChips permissions={permissions} />
      </div>
    </article>
  );
}

export default function RoleGuide({ onBack }: RoleGuideProps) {
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-[#FAF8F3] text-zinc-950">
      <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-5 py-4 sm:px-7">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          aria-label="이전 화면으로 돌아가기"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-black">역할별 권한</h1>
          <p className="text-xs text-zinc-500">기본 활동에 역할별 운영 권한이 더해져요</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-7 sm:px-8 sm:py-9">
        <section className="mx-auto max-w-5xl" aria-label="역할별 권한 구조">
          <article className="relative z-10 mx-auto max-w-3xl rounded-2xl border border-l-4 border-amber-300 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <Crown className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-black">크루장</h2>
                  <p className="mt-0.5 text-xs font-bold text-zinc-500">두 매니저 역할을 모두 맡고 크루를 대표해요</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800">CAPTAIN</span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-black text-amber-900">
              <span className="rounded-lg bg-white px-2.5 py-2">크루 매니저가 하는 일</span>
              <Plus className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <span className="rounded-lg bg-white px-2.5 py-2">이벤트 그룹 매니저가 하는 일</span>
              <Plus className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <span className="rounded-lg bg-amber-200 px-2.5 py-2">크루 대표가 하는 일</span>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-[11px] font-black text-amber-800">크루장이 할 수 있는 일</p>
              <PermissionChips permissions={captainPermissions} />
            </div>
          </article>

          <div className="relative mx-auto h-12 max-w-5xl" aria-hidden="true">
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-zinc-300" />
            <div className="absolute bottom-0 left-[calc(25%_-_0.75rem)] right-[calc(25%_-_0.75rem)] hidden h-px bg-zinc-300 md:block" />
          </div>

          <div className="relative grid gap-4 md:grid-cols-2 md:gap-12">
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-zinc-300 md:hidden" aria-hidden="true" />
            <div className="absolute left-1/2 top-1/2 z-20 hidden -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-200 bg-white p-2 text-zinc-400 shadow-sm md:block" aria-hidden="true">
              <Plus className="h-4 w-4" />
            </div>
            <div className="relative">
              <ManagerNode
                title="크루 매니저"
                permissions={crewManagerPermissions}
                icon={CalendarCheck2}
                color="text-sky-800"
                iconStyle="bg-sky-100"
                borderStyle="border-sky-300"
              />
            </div>

            <div className="relative z-20 mx-auto flex w-fit items-center justify-center gap-1 bg-[#FAF8F3] px-3 py-1 text-xs font-black text-zinc-500 md:hidden" aria-hidden="true">
              <Plus className="h-4 w-4" />
              두 역할을 함께 부여할 수 있어요
            </div>

            <div className="relative">
              <ManagerNode
                title="이벤트 그룹 매니저"
                permissions={eventManagerPermissions}
                icon={Sparkles}
                color="text-indigo-800"
                iconStyle="bg-indigo-100"
                borderStyle="border-indigo-300"
              />
            </div>
          </div>

          <div className="relative mx-auto h-16 max-w-5xl" aria-hidden="true">
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-zinc-300" />
            <div className="absolute left-[calc(25%_-_0.75rem)] right-[calc(25%_-_0.75rem)] top-0 hidden h-px bg-zinc-300 md:block" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-black text-zinc-500 shadow-sm">
              모두 기본 활동부터 시작해요
            </div>
          </div>

          <article className="relative z-10 mx-auto max-w-3xl rounded-2xl border border-l-4 border-zinc-300 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                  <UserRound className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-black">일반 멤버</h2>
                  <p className="mt-0.5 text-xs font-bold text-zinc-500">역할과 관계없이 누구나 할 수 있어요</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-black text-zinc-500">기본 활동</span>
            </div>
            <div className="mt-4">
              <PermissionChips permissions={basePermissions} />
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
