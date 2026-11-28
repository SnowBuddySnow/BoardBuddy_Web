import { ArrowRight, CalendarDays, Sparkles, ShieldCheck, UsersRound, Settings, TableProperties } from 'lucide-react';
import { m } from 'motion/react';
import { hoverLift, listContainerVariants, listItemVariants, springSnappy, tapPress } from '../lib/motion';
import type { OperationPermission } from '../services/operations';
import { hasEventManagementAccess } from '../lib/eventManagerOnboarding';
import { getOperatingFeatures, OperatingMode, operatingModeCopy } from '../constants/operatingSeason';

interface OperationsCenterProps {
  permissions: OperationPermission[];
  operatingMode: OperatingMode;
  seasonAvailable: boolean;
  onReservationsClick: () => void;
  onSeasonMatrixClick?: () => void;
  onPartiesClick: () => void;
  onGroupsClick: () => void;
  onCrewClick: () => void;
  onCrewSettingsClick?: () => void;
  onEventManagerOnboardingClick?: () => void;
}

const hasAny = (permissions: OperationPermission[], required: OperationPermission[]) =>
  required.some((permission) => permissions.includes(permission));

export default function OperationsCenter({
  permissions,
  operatingMode,
  seasonAvailable,
  onReservationsClick,
  onSeasonMatrixClick,
  onPartiesClick,
  onGroupsClick,
  onCrewClick,
  onCrewSettingsClick,
  onEventManagerOnboardingClick,
}: OperationsCenterProps) {
  const features = getOperatingFeatures(operatingMode);
  const canManageReservations = hasAny(permissions, ['RESERVATIONS_MANAGE']);
  const canManageParties = hasAny(permissions, ['PARTIES_CREATE', 'PARTIES_MANAGE']);
  const canManageGroups = hasAny(permissions, ['EVENT_GROUPS_CREATE', 'EVENT_GROUPS_MANAGE', 'EVENT_GROUPS_VIEW']);
  const canManageCrew = hasAny(permissions, ['CREW_MEMBERS_MANAGE', 'CREW_MANAGERS_ASSIGN']);

  const modules = [
    features.season && seasonAvailable && canManageReservations && onSeasonMatrixClick && {
      id: 'season-matrix',
      title: '시즌방 이용 매트릭스',
      description: '가나다순 일별 이용표·이용권·입금·비공개 메모를 한눈에 관리합니다.',
      icon: TableProperties,
      onClick: onSeasonMatrixClick,
      priority: operatingMode === 'SEASON',
    },
    features.season && seasonAvailable && canManageReservations && {
      id: 'reservations',
      title: '예약 관리',
      description: '예약 현황과 참가자 정보를 관리합니다.',
      icon: CalendarDays,
      onClick: onReservationsClick,
      priority: operatingMode === 'SEASON',
    },
    features.offSeason && canManageParties && {
      id: 'parties',
      title: '이벤트 관리',
      description: '이벤트를 만들고 참가자를 운영합니다.',
      icon: Sparkles,
      onClick: onPartiesClick,
      priority: operatingMode === 'OFF_SEASON',
    },
    features.offSeason && canManageGroups && {
      id: 'groups',
      title: '호스트 그룹',
      description: '참여 크루와 운영 권한을 관리합니다.',
      icon: ShieldCheck,
      onClick: onGroupsClick,
      priority: false,
    },
    canManageCrew && {
      id: 'crew',
      title: '크루 관리',
      description: '멤버 권한과 부원 이용권을 관리합니다.',
      icon: UsersRound,
      onClick: onCrewClick,
      priority: false,
    },
    canManageCrew && onCrewSettingsClick && {
      id: 'crew-settings',
      title: '크루 설정',
      description: '예약 오픈 시간·정원·가입 설정을 관리합니다.',
      icon: Settings,
      onClick: onCrewSettingsClick,
      priority: false,
    },
  ].filter(Boolean) as Array<{
    id: string;
    title: string;
    description: string;
    icon: typeof CalendarDays;
    onClick: () => void;
    priority: boolean;
  }>;

  modules.sort((left, right) => Number(right.priority) - Number(left.priority));

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-[#FAF8F3] text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6">
        <p className="inline-flex rounded-full bg-brand-navy/5 px-2 py-0.5 text-[11px] font-bold text-brand-navy">{operatingModeCopy[operatingMode].label}</p>
        <h1 className="mt-1.5 text-xl font-black sm:text-2xl">운영 센터</h1>
        <p className="mt-0.5 text-sm text-zinc-500">{operatingModeCopy[operatingMode].description}</p>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {features.offSeason && hasEventManagementAccess(permissions) && onEventManagerOnboardingClick && (
          <button
            type="button"
            onClick={onEventManagerOnboardingClick}
            className="mb-5 flex w-full items-center justify-between gap-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-left hover:bg-indigo-100"
          >
            <span className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 shrink-0 text-indigo-700" />
              <span>
                <span className="block text-sm font-black text-indigo-950">이벤트 운영 시작 가이드</span>
                <span className="mt-1 block text-xs text-indigo-800">크루 초대부터 모집·참가자 관리까지</span>
              </span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-indigo-700" />
          </button>
        )}
        <m.div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" variants={listContainerVariants} initial="hidden" animate="visible">
          {modules.map(({ id, title, description, icon: Icon, onClick, priority }) => (
            <m.button
              key={id}
              type="button"
              onClick={onClick}
              variants={listItemVariants}
              whileHover={hoverLift}
              whileTap={tapPress}
              transition={springSnappy}
              className={`flex min-h-32 flex-col items-start justify-between gap-6 rounded-2xl border p-4 text-left transition-colors cursor-pointer hover:shadow-[0_8px_24px_-12px_rgba(22,38,96,0.25)] sm:p-5 ${
                priority
                  ? 'border-brand-navy bg-brand-navy text-white hover:bg-brand-navy-deep'
                  : 'border-zinc-200 bg-white text-zinc-900 hover:border-brand-navy/30'
              }`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${priority ? 'bg-white/10' : 'bg-brand-navy/5'}`}>
                <Icon className={`h-5 w-5 ${priority ? 'text-blue-200' : 'text-brand-navy'}`} />
              </span>
              <div>
                <h2 className="text-base font-black">{title}</h2>
                <p className={`mt-1 text-sm ${priority ? 'text-blue-100' : 'text-zinc-500'}`}>{description}</p>
              </div>
            </m.button>
          ))}
        </m.div>
      </main>
    </div>
  );
}
