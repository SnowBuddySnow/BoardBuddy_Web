import { useEffect, useRef, useState } from "react";
import { getCrewMembers } from "../../services/crew";
import {
  getSeasonPass,
  saveSeasonPass,
  type SeasonPassSummary,
} from "../../services/seasonStays";
import { getReservationSeason } from "../../lib/reservationSeason";
import { localDateKey } from "../../lib/personalCalendar";
import type { CrewMember } from "../../types/api";

export default function SeasonPassManager({ crewId }: { crewId: number }) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [memberId, setMemberId] = useState("");
  const [pass, setPass] = useState<SeasonPassSummary>();
  const [name, setName] = useState("5박권");
  const [nights, setNights] = useState("5");
  const [kind, setKind] = useState("5");
  const season = getReservationSeason();
  const [startsOn, setStartsOn] = useState(localDateKey(season.start));
  const [endsOn, setEndsOn] = useState(localDateKey(season.end));
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void getCrewMembers(crewId)
      .then((value) => {
        if (!cancelled) setMembers(value);
      })
      .catch(() => {
        if (!cancelled) setMessage("부원 명단을 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [crewId, open]);
  useEffect(() => {
    if (!memberId) return;
    let cancelled = false;
    setLoading(true);
    setPass(undefined);
    setMessage("");
    void getSeasonPass(crewId, Number(memberId))
      .then((value) => {
        if (cancelled) return;
        setPass(value);
        setKind(
          !value.registered
            ? "5"
            : value.totalNights == null
              ? "unlimited"
              : [5, 10].includes(value.totalNights)
                ? String(value.totalNights)
                : "custom",
        );
        setName(value.name ?? "5박권");
        setNights(
          value.registered
            ? value.totalNights == null
              ? ""
              : String(value.totalNights)
            : "5",
        );
        setStartsOn(
          value.startsOn ?? localDateKey(getReservationSeason().start),
        );
        setEndsOn(value.endsOn ?? localDateKey(getReservationSeason().end));
      })
      .catch(() => {
        if (!cancelled) setMessage("이용권을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [crewId, memberId]);
  const save = async () => {
    if (lock.current || !pass || !memberId) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const value = await saveSeasonPass(crewId, Number(memberId), {
        name,
        startsOn,
        endsOn,
        totalNights: kind === "unlimited" ? null : Number(nights),
      });
      setPass(value);
      setMessage("이용권을 저장했습니다.");
    } catch {
      setMessage(
        "저장하지 못했습니다. 기간과 이미 확정된 박수를 확인해 주세요.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <details
      className="mb-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="min-h-9 cursor-pointer py-2 text-sm font-semibold text-[#162660]">
        부원 이용권 관리
      </summary>
      {open && (
        <div className="space-y-3 py-2 text-xs">
          <label className="block">
            부원 *
            <select
              aria-label="이용권 부원"
              className="reservation-input mt-1 w-full"
              value={memberId}
              onChange={(event) => setMemberId(event.target.value)}
              disabled={busy}
            >
              <option value="">부원을 선택해 주세요.</option>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          {loading && <p role="status">이용권을 확인하고 있어요.</p>}
          {pass?.registered &&
            pass.endsOn &&
            pass.endsOn < localDateKey(new Date()) && (
              <button
                className="min-h-10 text-blue-700"
                onClick={() => {
                  setPass({
                    ...pass,
                    registered: false,
                    startsOn: null,
                    endsOn: null,
                  });
                  setStartsOn(localDateKey(getReservationSeason().start));
                  setEndsOn(localDateKey(getReservationSeason().end));
                }}
              >
                새 시즌 이용권 등록
              </button>
            )}
          {pass && (
            <>
              <label className="block">
                이용권 *
                <select
                  aria-label="이용권 종류"
                  value={kind}
                  onChange={(event) => {
                    const value = event.target.value;
                    setKind(value);
                    setNights(
                      value === "custom"
                        ? "1"
                        : value === "unlimited"
                          ? ""
                          : value,
                    );
                    setName(
                      value === "custom"
                        ? "이용권"
                        : value === "unlimited"
                          ? "풀상주권"
                          : `${value}박권`,
                    );
                  }}
                  className="reservation-input mt-1 w-full"
                >
                  <option value="5">5박권</option>
                  <option value="10">10박권</option>
                  <option value="unlimited">풀상주권</option>
                  <option value="custom">직접 입력</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label>
                  이용권 이름 *
                  <input
                    aria-label="이용권 이름"
                    className="reservation-input mt-1 w-full"
                    maxLength={60}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <label>
                  총 박수 {kind === "unlimited" ? "(제한 없음)" : "*"}
                  <input
                    aria-label="이용권 총 박수"
                    type="number"
                    min={1}
                    max={366}
                    className="reservation-input mt-1 w-full"
                    disabled={kind === "unlimited"}
                    value={nights}
                    onChange={(event) => setNights(event.target.value)}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label>
                  시작일 *
                  <input
                    aria-label="이용권 시작일"
                    type="date"
                    value={startsOn}
                    onChange={(event) => setStartsOn(event.target.value)}
                    disabled={pass.registered}
                    className="reservation-input mt-1 w-full min-w-0"
                  />
                </label>
                <label>
                  종료일 *
                  <input
                    aria-label="이용권 종료일"
                    type="date"
                    value={endsOn}
                    onChange={(event) => setEndsOn(event.target.value)}
                    disabled={pass.registered}
                    className="reservation-input mt-1 w-full min-w-0"
                  />
                </label>
              </div>
              <p className="leading-5 text-slate-500">
                이용 {pass.usedNights}박 · 확정 예약 {pass.reservedNights}박
                <br />
                풀상주권도 날짜별 정원을 초과하면 대기해요.
              </p>
              <button
                onClick={() => void save()}
                disabled={
                  busy ||
                  !name.trim() ||
                  !startsOn ||
                  !endsOn ||
                  (kind !== "unlimited" &&
                    (!Number.isInteger(Number(nights)) ||
                      Number(nights) < 1 ||
                      Number(nights) > 366))
                }
                className="reservation-primary min-h-10 w-full px-3 py-2"
              >
                {busy ? "저장 중…" : "이용권 저장"}
              </button>
            </>
          )}
          {message && (
            <p role="status" className="leading-5 text-slate-600">
              {message}
            </p>
          )}
        </div>
      )}
    </details>
  );
}
