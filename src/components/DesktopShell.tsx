import type { ReactNode } from 'react';
import {
  CalendarDays,
  CircleUserRound,
  ClipboardPenLine,
  Home,
  LayoutDashboard,
  PartyPopper,
  UsersRound,
} from 'lucide-react';

export type DesktopDestination =
  | 'home'
  | 'my_reservations'
  | 'reservation'
  | 'crew_detail'
  | 'parties'
  | 'my_parties'
  | 'my_page'
  | 'operations_center';

interface DesktopShellProps {
  activeDestination: DesktopDestination;
  canManage: boolean;
  children: ReactNode;
  onNavigate: (destination: DesktopDestination) => void;
}

const primaryItems = [
  { id: 'home', label: '홈', icon: Home },
  { id: 'my_reservations', label: '내 예약', icon: CalendarDays },
  { id: 'reservation', label: '예약하기', icon: ClipboardPenLine },
  { id: 'crew_detail', label: '내 크루', icon: UsersRound },
  { id: 'parties', label: '소모임 찾기', icon: PartyPopper },
  { id: 'my_parties', label: '내 소모임', icon: CalendarDays },
  { id: 'my_page', label: '내 정보', icon: CircleUserRound },
] as const;

export default function DesktopShell({
  activeDestination,
  canManage,
  children,
  onNavigate,
}: DesktopShellProps) {
  return (
    <div className="flex h-full min-h-0 w-full bg-[#F5F4F0]">
      <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-white px-4 py-6">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="mb-8 border-0 bg-transparent px-3 text-left text-2xl font-black italic text-[#162660] font-['Joti_One'] cursor-pointer"
        >
          BoardBuddy
        </button>

        <nav className="flex flex-1 flex-col gap-1" aria-label="주요 메뉴">
          {primaryItems.map(({ id, label, icon: Icon }) => {
            const active = activeDestination === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                className={`flex items-center gap-3 rounded-xl border-0 px-3 py-2.5 text-left text-sm font-bold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#162660] text-white'
                    : 'bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                {label}
              </button>
            );
          })}
        </nav>

        {canManage && (
          <div className="border-t border-zinc-100 pt-4">
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
              Management
            </p>
            <button
              type="button"
              onClick={() => onNavigate('operations_center')}
              className="flex w-full items-center gap-3 rounded-xl border border-[#162660]/10 bg-[#162660]/5 px-3 py-2.5 text-left text-sm font-black text-[#162660] hover:bg-[#162660]/10 cursor-pointer"
            >
              <LayoutDashboard className="h-4.5 w-4.5" />
              운영 센터
            </button>
          </div>
        )}
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden">
        <div className="mx-auto h-full w-full max-w-5xl overflow-hidden bg-[#FAF8F3] shadow-[0_0_40px_rgba(24,24,27,0.06)]">
          {children}
        </div>
      </main>
    </div>
  );
}
