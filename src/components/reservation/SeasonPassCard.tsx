import { useEffect, useState } from "react";
import {
  getSeasonPass,
  type SeasonPassSummary,
} from "../../services/seasonStays";

export default function SeasonPassCard({
  crewId,
  refreshKey = 0,
  compact = false,
}: {
  crewId: number;
  refreshKey?: number;
  compact?: boolean;
}) {
  const [pass, setPass] = useState<SeasonPassSummary>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    void getSeasonPass(crewId)
      .then((value) => {
        if (!cancelled) setPass(value);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [crewId, refreshKey]);
  return (
    <section
      aria-label="내 시즌방 이용권"
      className="mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-1">
        <h2 className="text-sm font-bold text-[#162660]">
          {pass?.registered ? pass.name : "내 이용권"}
        </h2>
        {pass?.registered && (
          <span className="text-xs font-semibold text-blue-700">
            {pass.remainingNights == null
              ? "박수 제한 없음"
              : `추가 예약 ${pass.remainingNights}박 가능`}
          </span>
        )}
      </div>
      {failed ? (
        <p role="alert" className="mt-2 text-xs text-red-700">
          이용권을 불러오지 못했습니다.
        </p>
      ) : !pass ? (
        <p role="status" className="mt-2 text-xs text-slate-500">
          이용권을 확인하고 있어요.
        </p>
      ) : pass.registered ? (
        <>
          {compact ? (
            <p className="mt-2 text-xs text-slate-500">
              이용 완료 {pass.usedNights}박 · 확정 예약 {pass.reservedNights}박
            </p>
          ) : (
            <>
              <dl className="mt-3 grid grid-cols-3 divide-x divide-slate-100 text-center">
                <div>
                  <dt className="text-[11px] text-slate-500">총 이용 가능</dt>
                  <dd className="mt-1 text-base font-bold text-[#162660]">
                    {pass.totalNights == null
                      ? "무제한"
                      : `${pass.totalNights}박`}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">이용 완료</dt>
                  <dd className="mt-1 text-base font-bold text-[#162660]">
                    {pass.usedNights}박
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">확정 예약</dt>
                  <dd className="mt-1 text-base font-bold text-[#162660]">
                    {pass.reservedNights}박
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-[11px] leading-5 text-slate-500">
                {pass.startsOn?.replace(/-/g, ".")} ~{" "}
                {pass.endsOn?.replace(/-/g, ".")}
                <br />
                대기는 차감하지 않아요. 이용 완료는 운영진이 확인해요.
                <br />
                잔여 박수가 없거나 이용 기간 밖이면 승격이 보류돼요.
              </p>
            </>
          )}
        </>
      ) : (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          아직 등록된 이용권이 없어요.
          <br />
          운영진에게 이용권 등록을 요청해 주세요.
        </p>
      )}
    </section>
  );
}
