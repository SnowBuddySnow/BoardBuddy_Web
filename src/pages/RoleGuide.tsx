import {
  CalendarCheck2,
  ChevronLeft,
  Crown,
  Plus,
  Sparkles,
  UserRound,
} from 'lucide-react';

interface RoleGuideProps {
  onBack: () => void;
}

const roles = [
  {
    id: 'member',
    title: '일반 멤버',
    permissions: ['예약 신청 및 확인', '모임 참가', '내 활동 정보 확인'],
    icon: UserRound,
    accent: 'border-zinc-300',
    iconStyle: 'bg-zinc-100 text-zinc-700',
  },
  {
    id: 'captain',
    title: 'Captain',
    permissions: ['크루 정보 및 설정 변경', '크루 멤버 관리', '매니저 역할 부여 및 회수'],
    icon: Crown,
    accent: 'border-amber-300',
    iconStyle: 'bg-amber-100 text-amber-800',
  },
  {
    id: 'crew-manager',
    title: '크루 매니저',
    permissions: ['예약 현황 관리', '예약 참가자 관리'],
    icon: CalendarCheck2,
    accent: 'border-sky-300',
    iconStyle: 'bg-sky-100 text-sky-800',
  },
  {
    id: 'event-manager',
    title: '이벤트 그룹 매니저',
    permissions: ['이벤트 그룹 생성 및 참여', '모임 생성·수정', '모임 참가자 관리'],
    icon: Sparkles,
    accent: 'border-indigo-300',
    iconStyle: 'bg-indigo-100 text-indigo-800',
  },
] as const;

type RoleDefinition = (typeof roles)[number];

function RoleCard({ role }: { role: RoleDefinition }) {
  const { title, permissions, icon: Icon, accent, iconStyle } = role;
  return (
    <article className={`h-full rounded-2xl border border-t-4 bg-white p-5 shadow-sm ${accent}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-base font-black text-zinc-950">{title}</h3>
      </div>
      <ul className="mt-5 space-y-2.5 text-sm text-zinc-700">
        {permissions.map(permission => (
          <li key={permission} className="flex items-start gap-2.5">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
            {permission}
          </li>
        ))}
      </ul>
    </article>
  );
}

const exampleRoles = [
  { label: '일반 멤버', style: 'border-zinc-200 bg-zinc-50 text-zinc-700' },
  { label: '크루 매니저', style: 'border-sky-200 bg-sky-50 text-sky-800' },
  { label: '이벤트 그룹 매니저', style: 'border-indigo-200 bg-indigo-50 text-indigo-800' },
] as const;

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
          <h1 className="text-lg font-black">사용자 역할</h1>
          <p className="text-xs text-zinc-500">역할은 한 사용자에게 함께 부여할 수 있어요</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-7 sm:px-8 sm:py-9">
        <div className="mx-auto max-w-5xl">
          <section aria-labelledby="role-combination-title" className="rounded-2xl border border-zinc-200 bg-white px-5 py-6 shadow-sm sm:px-7">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#162660] text-white">
                <UserRound className="h-6 w-6" />
              </div>
              <h2 id="role-combination-title" className="mt-3 text-base font-black">사용자에게 역할 부여</h2>
              <p className="mt-1 text-sm text-zinc-500">필요한 역할을 독립적으로 조합합니다.</p>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label="한 사용자가 여러 역할을 함께 가진 예시">
              {exampleRoles.map((role, index) => (
                <div key={role.label} className="contents">
                  {index > 0 && <Plus className="h-4 w-4 text-zinc-400" aria-hidden="true" />}
                  <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${role.style}`}>
                    {role.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-7" aria-labelledby="available-roles-title">
            <div className="mb-3 flex items-end justify-between gap-4">
              <h2 id="available-roles-title" className="text-sm font-black text-zinc-900">부여할 수 있는 역할</h2>
              <p className="text-xs text-zinc-500">역할은 서로 배타적이지 않습니다.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {roles.map(role => <RoleCard key={role.id} role={role} />)}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
