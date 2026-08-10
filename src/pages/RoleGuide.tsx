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

const roles = [
  {
    id: 'captain',
    title: 'Captain',
    subtitle: '크루의 대표자',
    description: '크루의 방향과 운영 기준을 관리하고, 두 종류의 매니저를 지정합니다.',
    responsibilities: ['크루 설정과 멤버 운영', '크루·이벤트 권한 지정'],
    icon: Crown,
    accent: 'border-amber-200 bg-amber-50 text-amber-900',
    iconStyle: 'bg-amber-200 text-amber-900',
  },
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
                <p className="text-xs font-black tracking-[0.16em] text-blue-200">PARALLEL ROLES</p>
                <h2 className="mt-2 text-xl font-black sm:text-2xl">직급표가 아니라 역할 지도예요</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100">
                  각 역할은 담당 영역을 설명합니다. 한 사람이 크루 매니저와 이벤트 그룹 매니저를 함께 맡을 수도 있고,
                  Captain은 필요에 따라 두 매니저 역할을 지정합니다.
                </p>
              </div>
            </div>
          </section>

          <section className="relative mt-8" aria-label="서로 평행한 네 가지 역할">
            <div className="absolute left-[12.5%] right-[12.5%] top-6 hidden h-px bg-zinc-300 lg:block" />
            <div className="grid snap-x grid-flow-col auto-cols-[minmax(260px,82%)] gap-4 overflow-x-auto pb-3 lg:grid-flow-row lg:grid-cols-4 lg:auto-cols-auto lg:overflow-visible lg:pb-0">
              {roles.map(({ id, title, subtitle, description, responsibilities, icon: Icon, accent, iconStyle }) => (
                <article key={id} className={`relative flex min-h-72 snap-start flex-col rounded-3xl border p-5 shadow-sm ${accent}`}>
                  <div className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl ${iconStyle}`}>
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
              ))}
            </div>
          </section>

          <section className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="text-sm font-black">크루 매니저와 이벤트 그룹 매니저는 별개예요</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                크루 매니저는 크루 운영을, 이벤트 그룹 매니저는 이벤트 운영을 담당합니다. 필요하면 두 역할을 동시에 가질 수 있습니다.
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
