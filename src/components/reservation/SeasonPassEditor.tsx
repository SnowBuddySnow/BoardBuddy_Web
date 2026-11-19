import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSeasonPass,
  saveSeasonPass,
  type SeasonPassSummary,
} from "../../services/seasonStays";

export default function SeasonPassEditor({
  crewId,
  memberId,
  onSaved,
}: {
  crewId: number;
  memberId: number;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pass, setPass] = useState<SeasonPassSummary>();
  const [name, setName] = useState("5박권");
  const [nights, setNights] = useState("5");
  const [kind, setKind] = useState("5");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const restoreDraft = useCallback((value: SeasonPassSummary) => {
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
  }, []);
  useEffect(() => {
    setEditing(false);
    if (!memberId) return;
    let cancelled = false;
    setLoading(true);
    setPass(undefined);
    setMessage("");
    void getSeasonPass(crewId, Number(memberId))
      .then((value) => {
        if (cancelled) return;
        setPass(value);
        restoreDraft(value);
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
  }, [crewId, memberId, restoreDraft]);
  const save = async () => {
    if (lock.current || !pass || !memberId) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const value = await saveSeasonPass(crewId, Number(memberId), {
        name,
        totalNights: kind === "unlimited" ? null : Number(nights),
      });
      setPass(value);
      setEditing(false);
      setMessage("이용권을 저장했습니다.");
      onSaved();
    } catch {
      setMessage(
        "저장하지 못했습니다. 이미 확정된 박수와 권한을 확인해 주세요.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section
      aria-label="부원 이용권 정보"
      className="rounded-2xl border border-slate-200 bg-white p-4"
    >
      <h3 className="text-sm font-bold text-[#162660]">이용권 정보</h3>
      <div className="space-y-3 py-2 text-xs">
        {loading && <p role="status">이용권을 확인하고 있어요.</p>}
        {pass && (
          <section
            aria-label="선택한 부원 이용권"
            className="rounded-xl bg-slate-50 p-3 text-[#162660]"
          >
            <h3 className="text-sm font-bold">
              {pass.registered ? pass.name : "이용권 미등록"}
            </h3>
            {pass.registered && (
              <>
                <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    [
                      "총 박수",
                      pass.totalNights == null
                        ? "무제한"
                        : `${pass.totalNights}박`,
                    ],
                    ["이용 완료", `${pass.usedNights}박`],
                    ["확정 예약", `${pass.reservedNights}박`],
                    [
                      "잔여",
                      pass.remainingNights == null
                        ? "무제한"
                        : `${pass.remainingNights}박`,
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[11px] text-slate-500">{label}</dt>
                      <dd className="mt-1 text-sm font-bold">{value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </section>
        )}
        {pass && !editing && (
          <button
            type="button"
            onClick={() => {
              restoreDraft(pass);
              setEditing(true);
            }}
            className="reservation-secondary min-h-11 w-full"
          >
            {pass.registered ? "이용권 수정" : "이용권 등록"}
          </button>
        )}
        {pass && editing && (
          <div className="space-y-3 border-t border-slate-100 pt-3">
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
                (kind !== "unlimited" &&
                  (!Number.isInteger(Number(nights)) ||
                    Number(nights) < 1 ||
                    Number(nights) > 366))
              }
              className="reservation-primary min-h-10 w-full px-3 py-2"
            >
              {busy ? "저장 중…" : "이용권 저장"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(false)}
              className="min-h-11 w-full text-slate-500"
            >
              수정 취소
            </button>
          </div>
        )}
        {message && (
          <p role="status" className="leading-5 text-slate-600">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
