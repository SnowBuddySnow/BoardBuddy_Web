import { useEffect, useState } from "react";
import { ChevronLeft, ShieldCheck, UserRound } from "lucide-react";
import { getUserInfo } from "../services/user";
import {
  grantEventManager,
  grantGeneralAdmin,
  listCrewMemberAccess,
  revokeEventManager,
  revokeGeneralAdmin,
  type CrewMemberAccess,
} from "../services/crewPermissions";
import { crewRoleLabel } from "../constants/displayLabels";
import SeasonPassManager from "../components/reservation/SeasonPassManager";
import { isCrewManagerRole } from "../constants/crewRole";
import "../components/reservation/reservation.css";

interface CrewPermissionsProps {
  onBack: () => void;
  onPermissionsChanged?: () => void;
  initialSection?: "permissions" | "passes";
  canAssignRoles?: boolean;
}

export default function CrewPermissions({
  onBack,
  onPermissionsChanged,
  initialSection = "permissions",
  canAssignRoles = false,
}: CrewPermissionsProps) {
  const [section, setSection] = useState(initialSection);
  const [canManageCrew, setCanManageCrew] = useState(false);
  const [crewId, setCrewId] = useState<number | null>(null);
  const [members, setMembers] = useState<CrewMemberAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingAccountId, setChangingAccountId] = useState<number | null>(
    null,
  );
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const user = await getUserInfo();
      if (!user.crew?.crewId) {
        setError("소속 크루를 찾을 수 없습니다.");
        return;
      }
      if (!isCrewManagerRole(user.role)) {
        setError("크루장과 임원진만 크루를 관리할 수 있어요.");
        return;
      }
      setCanManageCrew(true);
      setCrewId(user.crew.crewId);
    } catch {
      setError("크루 권한 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!canManageCrew || !crewId || section !== "permissions") return;
    let cancelled = false;
    setLoading(true);
    setError("");
    void listCrewMemberAccess(crewId)
      .then((value) => {
        if (!cancelled) setMembers(value);
      })
      .catch(() => {
        if (!cancelled) setError("크루 권한 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canManageCrew, crewId, section]);

  const toggleEventManager = async (member: CrewMemberAccess) => {
    if (!canAssignRoles || crewId == null || member.crewRole === "CREW_CAPTAIN")
      return;
    setChangingAccountId(member.accountId);
    setError("");
    try {
      if (member.eventManager) {
        await revokeEventManager(crewId, member.accountId);
      } else {
        await grantEventManager(crewId, member.accountId);
      }
      setMembers((current) =>
        current.map((item) =>
          item.accountId === member.accountId
            ? { ...item, eventManager: !item.eventManager }
            : item,
        ),
      );
      onPermissionsChanged?.();
    } catch {
      setError(
        "이벤트 그룹 매니저 권한을 변경할 수 없습니다. 계정 권한을 확인해 주세요.",
      );
    } finally {
      setChangingAccountId(null);
    }
  };

  const toggleGeneralAdmin = async (member: CrewMemberAccess) => {
    if (!canAssignRoles || crewId == null || member.crewRole === "CREW_CAPTAIN")
      return;
    setChangingAccountId(member.accountId);
    setError("");
    try {
      if (member.crewRole === "CREW_MANAGER") {
        await revokeGeneralAdmin(crewId, member.accountId);
      } else {
        await grantGeneralAdmin(crewId, member.accountId);
      }
      setMembers((current) =>
        current.map((item) =>
          item.accountId === member.accountId
            ? {
                ...item,
                crewRole:
                  item.crewRole === "CREW_MANAGER"
                    ? "CREW_MEMBER"
                    : "CREW_MANAGER",
              }
            : item,
        ),
      );
      onPermissionsChanged?.();
    } catch {
      setError(
        "크루 매니저 권한을 변경할 수 없습니다. 계정 권한을 확인해 주세요.",
      );
    } finally {
      setChangingAccountId(null);
    }
  };

  return (
    <div className="reservation-shell flex h-full flex-1 flex-col overflow-hidden bg-[#FAF8F3]">
      <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-6 py-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 cursor-pointer"
          aria-label="뒤로 가기"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-black text-zinc-900">크루 관리</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {canManageCrew && (
          <nav
            aria-label="크루 관리 메뉴"
            className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1"
          >
            {(
              [
                ["permissions", "멤버·권한"],
                ["passes", "이용권 관리"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-current={section === key ? "page" : undefined}
                onClick={() => setSection(key)}
                className={`min-h-11 rounded-xl text-sm font-semibold ${section === key ? "bg-white text-[#162660] shadow-sm" : "text-slate-500"}`}
              >
                {label}
              </button>
            ))}
          </nav>
        )}
        {error && (!canManageCrew || section === "permissions") && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {canManageCrew && crewId && section === "passes" ? (
          <SeasonPassManager crewId={crewId} />
        ) : loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-500">
            권한 정보를 불러오는 중...
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {!canAssignRoles && canManageCrew && (
              <p className="border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
                역할 변경은 크루장만 할 수 있어요. 이용권 관리는 임원진도 할 수
                있어요.
              </p>
            )}
            {members.map((member) => (
              <div
                key={member.accountId}
                className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 shrink-0 text-zinc-400" />
                    <p className="truncate text-sm font-bold text-zinc-900">
                      {member.displayName || `User ${member.accountId}`}
                    </p>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-zinc-500">
                    {crewRoleLabel[member.crewRole]}
                    {member.crewRole === "CREW_CAPTAIN" && (
                      <span className="ml-2 text-[#162660]">
                        · 두 권한 기본 보유
                      </span>
                    )}
                  </p>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
                  <button
                    type="button"
                    disabled={
                      !canAssignRoles ||
                      member.crewRole === "CREW_CAPTAIN" ||
                      changingAccountId === member.accountId
                    }
                    onClick={() => void toggleGeneralAdmin(member)}
                    className={`rounded-lg border px-3 py-2 text-xs font-black transition-colors cursor-pointer disabled:cursor-default ${
                      member.crewRole === "CREW_MANAGER" ||
                      member.crewRole === "CREW_CAPTAIN"
                        ? "border-zinc-700 bg-zinc-800 text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    크루 매니저
                  </button>
                  <button
                    type="button"
                    disabled={
                      !canAssignRoles ||
                      member.crewRole === "CREW_CAPTAIN" ||
                      changingAccountId === member.accountId
                    }
                    onClick={() => void toggleEventManager(member)}
                    className={`rounded-lg border px-3 py-2 text-xs font-black transition-colors cursor-pointer disabled:cursor-default ${
                      member.eventManager
                        ? "border-[#162660] bg-[#162660] text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
                    이벤트 그룹 매니저
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
