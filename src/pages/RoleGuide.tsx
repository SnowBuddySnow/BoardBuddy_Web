import {
  CalendarCheck2,
  ChevronLeft,
  Crown,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';

interface RoleGuideProps {
  onBack: () => void;
}

const captainRole = {
  id: 'captain',
  title: 'Captain',
  subtitle: '크루의 대표자',
  description: '크루의 방향과 운영 기준을 관리하고, 필요한 운영 역할을 지정합니다.',
  responsibilities: ['크루 설정과 멤버 운영', '크루·이벤트 권한 지정'],
  icon: Crown,
  accent: 'border-amber-200 bg-amber-50 text-amber-900',
  iconStyle: 'bg-amber-200 text-amber-900',
} as const;

const branchRoles = [
  {
    id: 'crew-manager',
    title: '크루 매니저',
    subtitle: '크루 일상 운영 담당',
    description: '크루 안에서 예약과 일상적인 운영 업무를 맡습니다.',
    responsibilities: ['예약 현황 관리', '크루 운영 지원'],
    icon: CalendarCheck2,
    accent: 'border-sky-200 bg-sky-50 text-sky-950',
    iconStyle: 'bg-sky-200 text-sky-900',
  },
  {
    id: 'event-manager',
    title: '이벤트 그룹 매니저',
    subtitle: '이벤트 운영 담당',
    description: '이벤트 그룹에 참여해 모임을 만들고 참가 흐름을 운영합니다.',
    responsibilities: ['이벤트 그룹과 모임 운영', '참가자·진행 정보 관리'],
    icon: Sparkles,
    accent: 'border-indigo-200 bg-indigo-50 text-indigo-950',
    iconStyle: 'bg-indigo-200 text-indigo-900',
  },
  {
    id: 'member',
    title: '일반 멤버',
    subtitle: '크루 활동 참여자',
    description: '크루에 소속되어 예약과 이벤트에 참여하고 활동 정보를 확인합니다.',
    responsibilities: ['예약과 이벤트 참여', '내 활동 정보 확인'],
    icon: UserRound,
    accent: 'border-zinc-200 bg-white text-zinc-950',
    iconStyle: 'bg-zinc-200 text-zinc-700',
  },
] as const;

type RoleCardProps = typeof captainRole | (typeof branchRoles)[number];

function RoleCard({ role, compact = false }: { role: RoleCardProps; compact?: boolean }) {
  const { title, subtitle, description, responsibilities, icon: Icon, accent, iconStyle } = role;
  return (
    <article className={`relative z-10 flex h-full flex-col rounded-3xl border p-5 shadow-sm ${accent} ${compact ? 'lg:min-h-60' : 'min-h-64'}`}>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconStyle}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-5">
        <h3 className="text-lg font-black">{title}</h3>
        <p className="mt-0.5 text-xs font-bold opacity-65">{subtitle}</p>
        <p className="mt-4 text-sm leading-6 opacity-80">{description}</p>
      </div>
      <ul className="mt-auto space-y-2 pt-5 text-xs font-bold">
        {responsibilities.map(item => (
          <li key={item} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-45" />
            {item}
          </li>
        ))}
      </ul>
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
          <h1 className="text-lg font-black">BoardBuddy 역할 안내</h1>
          <p className="text-xs text-zinc-500">네 역할은 위아래가 아닌 같은 선 위의 서로 다른 책임입니다.</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-7 sm:px-8 sm:py-9">
        <div className="mx-auto max-w-6xl">
          <section className="rounded-3xl bg-[#162660] px-6 py-7 text-white sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/12">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black tracking-[0.16em] text-blue-200">ROLE TREE</p>
                <h2 className="mt-2 text-xl font-black sm:text-2xl">Captain을 중심으로 나뉘는 역할 구조예요</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100">
                  Captain이 크루의 운영 책임을 맡고, 그 아래에서 크루 매니저와 이벤트 그룹 매니저가 서로 다른 영역을 담당합니다.
                  일반 멤버는 운영 권한 없이 활동에 참여합니다.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8" aria-label="Captain에서 세 역할로 이어지는 역할 트리">
            <div className="mx-auto max-w-sm">
              <RoleCard role={captainRole} compact />
            </div>

            <div className="relative mx-auto h-14 w-full max-w-4xl" aria-hidden="true">
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-zinc-300" />
              <div className="absolute bottom-0 left-[16.666%] right-[16.666%] hidden h-px bg-zinc-300 lg:block" />
            </div>

            <div className="relative grid gap-4 pl-8 lg:grid-cols-3 lg:pl-0">
              <div className="absolute bottom-1/2 left-3 top-0 w-px bg-zinc-300 lg:hidden" aria-hidden="true" />
              {branchRoles.map(role => (
                <div key={role.id} className="relative">
                  <div className="absolute -left-5 top-1/2 h-px w-5 bg-zinc-300 lg:left-1/2 lg:top-[-1px] lg:h-5 lg:w-px lg:-translate-x-1/2" aria-hidden="true" />
                  <RoleCard role={role} />
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="text-sm font-black">두 매니저는 같은 가지 높이에 있어요</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                크루 매니저는 크루 운영을, 이벤트 그룹 매니저는 이벤트 운영을 담당합니다. 한 역할이 다른 역할보다 높지 않으며 동시에 맡을 수도 있습니다.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="text-sm font-black">Captain은 번역하지 않아요</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Captain은 BoardBuddy에서 사용하는 고유 역할명입니다. 다른 상태·정책·역할명은 한국어로 표시합니다.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
