import { useEffect, useState } from 'react';
import { ChevronLeft, ShieldCheck, UserRound } from 'lucide-react';
import { getUserInfo } from '../services/user';
import { grantPartyManager, listCrewMemberAccess, revokePartyManager, type CrewMemberAccess } from '../services/crewPermissions';

interface CrewPermissionsProps {
  onBack: () => void;
}

const roleLabel: Record<CrewMemberAccess['crewRole'], string> = {
  CREW_MEMBER: 'CREW MEMBER',
  CREW_MANAGER: 'CREW MANAGER',
  CREW_CAPTAIN: 'CREW CAPTAIN',
};

export default function CrewPermissions({ onBack }: CrewPermissionsProps) {
  const [crewId, setCrewId] = useState<number | null>(null);
  const [members, setMembers] = useState<CrewMemberAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingAccountId, setChangingAccountId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await getUserInfo();
      if (!user.crew?.crewId) {
        setError('소속 크루를 찾을 수 없습니다.');
        return;
      }
      setCrewId(user.crew.crewId);
      setMembers(await listCrewMemberAccess(user.crew.crewId));
    } catch {
      setError('크루 권한 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const togglePartyManager = async (member: CrewMemberAccess) => {
    if (crewId == null) return;
    setChangingAccountId(member.accountId);
    setError('');
    try {
      if (member.partyManager) {
        await revokePartyManager(crewId, member.accountId);
      } else {
        await grantPartyManager(crewId, member.accountId);
      }
      setMembers((current) => current.map((item) => item.accountId === member.accountId
        ? { ...item, partyManager: !item.partyManager }
        : item));
    } catch {
      setError('소모임 관리자 권한을 변경하지 못했습니다. CREW CAPTAIN 권한을 확인해 주세요.');
    } finally {
      setChangingAccountId(null);
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-[#FAF8F3]">
      <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-6 py-4">
        <button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 cursor-pointer" aria-label="운영 센터로 돌아가기">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-black text-zinc-900">크루 권한</h1>
          <p className="text-xs text-zinc-500">CREW CAPTAIN이 소모임 관리자를 지정합니다.</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-500">권한 정보를 불러오는 중...</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {members.map((member) => (
              <div key={member.accountId} className="flex items-center justify-between gap-4 border-b border-zinc-100 px-5 py-4 last:border-b-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 shrink-0 text-zinc-400" />
                    <p className="truncate text-sm font-bold text-zinc-900">{member.displayName || `User ${member.accountId}`}</p>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-zinc-500">{roleLabel[member.crewRole]}</p>
                </div>
                <button
                  type="button"
                  disabled={changingAccountId === member.accountId}
                  onClick={() => void togglePartyManager(member)}
                  className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-black transition-colors cursor-pointer disabled:cursor-wait ${
                    member.partyManager
                      ? 'border-[#162660] bg-[#162660] text-white hover:bg-[#0f1b48]'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
                  {member.partyManager ? 'PARTY MANAGER' : '관리자 지정'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
