import { CalendarDays, PartyPopper, ShieldCheck, UsersRound } from 'lucide-react';
import type { OperationPermission } from '../services/operations';
import { OperatingSeason, seasonCopy } from '../constants/operatingSeason';

interface OperationsCenterProps {
  permissions: OperationPermission[];
  season: OperatingSeason;
  onReservationsClick: () => void;
  onPartiesClick: () => void;
  onGroupsClick: () => void;
  onCrewClick: () => void;
}

const hasAny = (permissions: OperationPermission[], required: OperationPermission[]) =>
  required.some((permission) => permissions.includes(permission));

export default function OperationsCenter({
  permissions,
  season,
  onReservationsClick,
  onPartiesClick,
  onGroupsClick,
  onCrewClick,
}: OperationsCenterProps) {
  const canManageReservations = hasAny(permissions, ['RESERVATIONS_MANAGE']);
  const canManageParties = hasAny(permissions, ['PARTIES_CREATE', 'PARTIES_MANAGE']);
  const canManageGroups = hasAny(permissions, ['PARTY_GROUPS_CREATE', 'PARTY_GROUPS_MANAGE', 'PARTY_GROUPS_VIEW']);
  const canManageCrew = hasAny(permissions, ['CREW_MEMBERS_MANAGE', 'CREW_PARTY_MANAGERS_ASSIGN']);

  const modules = [
    canManageReservations && {
      id: 'reservations',
      title: '예약 관리',
      description: '예약 현황과 참가자 정보를 관리합니다.',
      icon: CalendarDays,
      onClick: onReservationsClick,
      priority: season === 'WINTER',
    },
    canManageParties && {
      id: 'parties',
      title: '소모임 관리',
      description: '소모임을 만들고 참가자를 운영합니다.',
      icon: PartyPopper,
      onClick: onPartiesClick,
      priority: season === 'OFF_SEASON',
    },
    canManageGroups && {
      id: 'groups',
      title: '소모임 그룹',
      description: '참여 크루와 운영 권한을 관리합니다.',
      icon: ShieldCheck,
      onClick: onGroupsClick,
      priority: false,
    },
    canManageCrew && {
      id: 'crew',
      title: '크루 관리',
      description: '크루 운영과 소모임 관리자 지정을 확인합니다.',
      icon: UsersRound,
      onClick: onCrewClick,
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
      <header className="border-b border-zinc-200 bg-white px-6 py-5">
        <p className="text-xs font-bold text-zinc-500">{seasonCopy[season].label}</p>
        <h1 className="mt-1 text-2xl font-black">운영 센터</h1>
        <p className="mt-1 text-sm text-zinc-500">{seasonCopy[season].description} 모든 운영 기능은 계속 사용할 수 있습니다.</p>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {modules.map(({ id, title, description, icon: Icon, onClick, priority }) => (
            <button
              key={id}
              type="button"
              onClick={onClick}
              className={`flex min-h-36 flex-col items-start justify-between rounded-lg border p-5 text-left transition-colors cursor-pointer ${
                priority
                  ? 'border-[#162660] bg-[#162660] text-white hover:bg-[#0f1b48]'
                  : 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400'
              }`}
            >
              <Icon className={`h-5 w-5 ${priority ? 'text-blue-200' : 'text-[#162660]'}`} />
              <div>
                <h2 className="text-base font-black">{title}</h2>
                <p className={`mt-1 text-sm ${priority ? 'text-blue-100' : 'text-zinc-500'}`}>{description}</p>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
