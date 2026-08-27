import type { ReactNode } from 'react';
import boardBuddyLogo from '../assets/boardbuddy-logo.png';
import {
  CalendarDays,
  CircleUserRound,
  ClipboardPenLine,
  FlaskConical,
  Home,
  LayoutDashboard,
  ShieldCheck,
  School,
  Sparkles,
  UserCog,
  UsersRound,
} from 'lucide-react';
import NotificationBell from './NotificationBell';

export type DesktopDestination =
  | 'home'
  | 'my_reservations'
  | 'reservation'
  | 'crew_detail'
  | 'parties'
  | 'my_parties'
  | 'my_page'
  | 'operations_center'
  | 'crew_admin'
  | 'school_admin'
  | 'user_admin'
  | 'signup_audit';

interface DesktopShellProps {
  activeDestination: DesktopDestination;
  canManage: boolean;
  canReviewCrews: boolean;
  hasCrew: boolean;
  seasonAvailable: boolean;
  offSeasonAvailable: boolean;
  availableEventCount?: number;
  children: ReactNode;
  onNavigate: (destination: DesktopDestination) => void;
  notificationRefreshKey?: number;
  onNotificationsClick: () => void;
}

const primaryItems = [
  { id: 'home', label: '홈', icon: Home },
  { id: 'my_reservations', label: '내 예약', icon: CalendarDays },
  { id: 'reservation', label: '예약하기', icon: ClipboardPenLine },
  { id: 'crew_detail', label: '내 크루', icon: UsersRound },
  { id: 'parties', label: '크루 이벤트', icon: Sparkles },
  { id: 'my_parties', label: '내 이벤트', icon: CalendarDays },
  { id: 'my_page', label: '내 정보', icon: CircleUserRound },
] as const;

export default function DesktopShell({
  activeDestination,
  canManage,
  canReviewCrews,
  hasCrew,
  seasonAvailable,
  offSeasonAvailable,
  availableEventCount = 0,
  children,
  onNavigate,
  notificationRefreshKey = 0,
  onNotificationsClick,
}: DesktopShellProps) {
  return (
    <div className="flex h-full min-h-0 w-full bg-[#F5F4F0]">
      <aside className="flex min-h-0 w-64 shrink-0 flex-col overflow-y-auto border-r border-zinc-200 bg-white px-4 py-6">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="mb-8 h-10 w-44 border-0 bg-transparent px-3 text-left cursor-pointer"
          aria-label="BoardBuddy 홈"
        >
          <img src={boardBuddyLogo} alt="BoardBuddy" className="h-full w-full object-cover object-center" />
        </button>

        <nav className="flex flex-1 flex-col gap-1" aria-label="주요 메뉴">
          {primaryItems.filter(({ id }) => {
            if (!hasCrew && ['my_reservations', 'reservation', 'crew_detail'].includes(id)) return false;
            if (!seasonAvailable && ['my_reservations', 'reservation'].includes(id)) return false;
            if (!offSeasonAvailable && ['parties', 'my_parties'].includes(id)) return false;
            return true;
          }).map(({ id, label, icon: Icon }) => {
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
                <span className="min-w-0 flex-1">{label}</span>
                {id === 'parties' && availableEventCount > 0 && (
                  <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
                    active ? 'bg-white text-[#162660]' : 'bg-rose-500 text-white'
                  }`}>
                    {availableEventCount > 99 ? '99+' : availableEventCount}
                  </span>
                )}
              </button>
            );
          })}
          <NotificationBell
            refreshKey={notificationRefreshKey}
            onClick={onNotificationsClick}
          />
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

        {canReviewCrews && (
          <div className="mt-3 border-t border-zinc-100 pt-4">
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
              Developer
            </p>
            <button
              type="button"
              onClick={() => onNavigate('crew_admin')}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-black cursor-pointer ${
                activeDestination === 'crew_admin'
                  ? 'border-[#162660] bg-[#162660] text-white'
                  : 'border-[#162660]/10 bg-[#162660]/5 text-[#162660] hover:bg-[#162660]/10'
              }`}
            >
              <ShieldCheck className="h-4.5 w-4.5" />
              크루 생성 검토
            </button>
            <button
              type="button"
              onClick={() => onNavigate('school_admin')}
              className={`mt-1 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-black cursor-pointer ${
                activeDestination === 'school_admin'
                  ? 'border-[#162660] bg-[#162660] text-white'
                  : 'border-[#162660]/10 bg-[#162660]/5 text-[#162660] hover:bg-[#162660]/10'
              }`}
            >
              <School className="h-4.5 w-4.5" />
              학교 카탈로그
            </button>
            <button
              type="button"
              onClick={() => onNavigate('user_admin')}
              className={`mt-1 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-black cursor-pointer ${
                activeDestination === 'user_admin'
                  ? 'border-[#162660] bg-[#162660] text-white'
                  : 'border-[#162660]/10 bg-[#162660]/5 text-[#162660] hover:bg-[#162660]/10'
              }`}
            >
              <UserCog className="h-4.5 w-4.5" />
              사용자 권한
            </button>
            <button
              type="button"
              onClick={() => onNavigate('signup_audit')}
              className={`mt-1 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-black cursor-pointer ${
                activeDestination === 'signup_audit'
                  ? 'border-[#162660] bg-[#162660] text-white'
                  : 'border-[#162660]/10 bg-[#162660]/5 text-[#162660] hover:bg-[#162660]/10'
              }`}
            >
              <FlaskConical className="h-4.5 w-4.5" />
              가입 점검
            </button>
          </div>
        )}
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden">
        <div data-desktop-page className={`mx-auto h-full w-full overflow-hidden bg-[#FAF8F3] shadow-[0_0_40px_rgba(24,24,27,0.06)] ${
          ['crew_admin', 'school_admin', 'user_admin', 'signup_audit'].includes(activeDestination) ? 'max-w-none' : 'max-w-6xl'
        }`}>
          {children}
        </div>
      </main>
    </div>
  );
}
