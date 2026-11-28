import { useEffect, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  ChevronRight,
  Map,
  Sparkles,
  Waypoints,
  UserRound,
  CalendarDays,
  LogOut,
} from "lucide-react";
import { ReservationLayout } from "../components/reservation/ReservationLayout";
import PersonalCalendarPreview from "../components/PersonalCalendarPreview";
import SeasonPassCard from "../components/reservation/SeasonPassCard";
import BuddyMascot from "../components/BuddyMascot";
import { SkeletonCard } from "../components/Skeleton";
import { getUserInfo } from "../services/user";
import type { UserDetail } from "../types/api";
import { signOut } from "../services/auth";
import { isCrewCaptainRole, normalizeCrewRole } from "../constants/crewRole";
import {
  SEASON_HOUSE_RESERVATIONS_ENABLED,
  getOperatingFeatures,
  getOperatingMode,
} from "../constants/operatingSeason";

interface MyPageProps {
  onBack: () => void;
  onAccountInfoClick?: () => void;
  onRoleGuideClick?: () => void;
  onCaptainOnboardingClick?: () => void;
  onEventManagerOnboardingClick?: () => void;
  onCalendarClick?: () => void;
  seasonAvailable?: boolean;
}
function MenuRow({
  title,
  icon,
  onClick,
}: {
  title: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-[#162660] hover:bg-slate-50"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50">
        {icon}
      </span>
      <span className="min-w-0 flex-1 break-keep">{title}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
    </button>
  );
}
export default function MyPage({
  onBack,
  onAccountInfoClick,
  onRoleGuideClick,
  onCaptainOnboardingClick,
  onEventManagerOnboardingClick,
  onCalendarClick,
  seasonAvailable,
}: MyPageProps) {
  const [userInfo, setUserInfo] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void getUserInfo()
      .then((data) => {
        if (!cancelled) setUserInfo(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  const season =
    seasonAvailable ??
    (SEASON_HOUSE_RESERVATIONS_ENABLED &&
      getOperatingFeatures(getOperatingMode()).season);
  const role = !userInfo?.crew
    ? "크루 미가입"
    : { CREW_CAPTAIN: "크루장", CREW_MANAGER: "임원진", CREW_MEMBER: "부원" }[
        normalizeCrewRole(userInfo.role)
      ];
  return (
    <ReservationLayout
      title="내 정보"
      onBack={onBack}
      className="is-page !bg-[#FAF8F3]"
    >
      <main className="reservation-content space-y-4 !bg-[#FAF8F3]">
        {loading ? (
          <div className="space-y-4">
            <SkeletonCard label="내 정보를 불러오고 있어요" lines={1} />
            <SkeletonCard label="이용권을 확인하고 있어요" lines={2} />
          </div>
        ) : error || !userInfo ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <p role="alert" className="text-sm text-slate-600">
              정보를 불러오지 못했습니다.
            </p>
            <button
              onClick={() => setAttempt((value) => value + 1)}
              className="mt-2 min-h-11 text-sm font-semibold text-blue-700"
            >
              다시 시도
            </button>
          </section>
        ) : (
          <>
            <section
              aria-label="내 프로필"
              className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-50">
                  {userInfo.profileImageUrl ? (
                    <img
                      src={userInfo.profileImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <BuddyMascot size={44} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-lg font-bold text-[#162660]">
                      {userInfo.name}
                    </h2>
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-[#162660]">
                      {role}
                    </span>
                    {onEventManagerOnboardingClick && (
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                        이벤트 운영
                      </span>
                    )}
                  </div>
                  <p className="mt-1 break-words text-sm text-slate-500">
                    {userInfo.crew?.crewName || "아직 소속 크루가 없어요."}
                  </p>
                </div>
              </div>
              {userInfo.school && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span>{userInfo.school}</span>
                  {userInfo.universityVerificationStatus === "VERIFIED" && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      학교 인증
                    </span>
                  )}
                </div>
              )}
            </section>
            {season && userInfo.crew && (
              <section aria-label="내 시즌방">
                <SeasonPassCard crewId={userInfo.crew.crewId} />
                <div className="rounded-2xl border border-slate-200 bg-white p-1">
                  <MenuRow
                    title="나의 달력"
                    icon={<CalendarDays className="h-4 w-4" />}
                    onClick={() => setShowCalendar((value) => !value)}
                  />
                  {showCalendar && (
                    <div className="pb-3">
                      <PersonalCalendarPreview
                        crewId={userInfo.crew.crewId}
                        onOpen={
                          onCalendarClick ?? (() => setShowCalendar(false))
                        }
                      />
                    </div>
                  )}
                </div>
              </section>
            )}
            <section
              aria-label="계정과 이용 안내"
              className="rounded-2xl border border-slate-200 bg-white p-1 sm:p-2"
            >
              {onAccountInfoClick && (
                <MenuRow
                  title="계정 관리"
                  icon={<UserRound className="h-4 w-4" />}
                  onClick={onAccountInfoClick}
                />
              )}
              {onRoleGuideClick && (
                <MenuRow
                  title="역할 안내"
                  icon={<Waypoints className="h-4 w-4" />}
                  onClick={onRoleGuideClick}
                />
              )}
              {isCrewCaptainRole(userInfo.role) && onCaptainOnboardingClick && (
                <MenuRow
                  title="크루장 시작 가이드"
                  icon={<Map className="h-4 w-4" />}
                  onClick={onCaptainOnboardingClick}
                />
              )}
              {onEventManagerOnboardingClick && (
                <MenuRow
                  title="이벤트 운영 가이드"
                  icon={<Sparkles className="h-4 w-4" />}
                  onClick={onEventManagerOnboardingClick}
                />
              )}
            </section>
            <button
              type="button"
              disabled={signingOut}
              onClick={async () => {
                if (!confirm("로그아웃 하시겠습니까?")) return;
                setSigningOut(true);
                try {
                  await signOut();
                  window.location.href = "/";
                } catch {
                  setSigningOut(false);
                }
              }}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {signingOut ? "로그아웃 중…" : "로그아웃"}
            </button>
          </>
        )}
      </main>
    </ReservationLayout>
  );
}
