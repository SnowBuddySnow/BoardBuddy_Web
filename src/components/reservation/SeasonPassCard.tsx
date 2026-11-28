import { useEffect, useState } from "react";
import { m } from "motion/react";
import { ChevronDown } from "lucide-react";
import {
  getMemberStayHistory,
  getSeasonPass,
  type SeasonPassSummary,
  type StayHistoryItem,
} from "../../services/seasonStays";
import { getAccountId } from "../../lib/session";
import { Skeleton } from "../Skeleton";
import { CountUpNumber } from "../KpiStat";


const dateLabel = (value: string) => value.slice(0, 10).replace(/-/g, ".");

/** The member's own stay history (the API allows reading your own record); loaded on first open. */
function PassHistory({ crewId }: { crewId: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StayHistoryItem[]>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!open || items) return;
    const accountId = Number(getAccountId());
    if (!accountId) { setFailed(true); return; }
    let cancelled = false;
    void getMemberStayHistory(crewId, accountId)
      .then((page) => { if (!cancelled) setItems(page.items); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [crewId, items, open]);
  return (
    <div className="mt-3 border-t border-slate-100 pt-2">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}
        className="flex min-h-9 w-full items-center justify-between text-xs font-bold text-slate-600">
        사용 이력
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        failed ? <p role="alert" className="pb-1 text-xs text-red-700">사용 이력을 불러오지 못했어요.</p>
        : !items ? <div role="status" aria-label="사용 이력을 불러오는 중" className="space-y-2 pb-1"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
        : items.length === 0 ? <p className="pb-1 text-xs text-slate-500">아직 이용한 날이 없어요.</p>
        : (
          <ol className="space-y-1 pb-1">
            {items.map((item) => (
              <li key={item.reservationId} className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 tabular-nums">{dateLabel(item.date)}</span>
                <span className={item.completed ? "font-bold text-emerald-700" : item.status === "WAITING" ? "font-bold text-amber-700" : "font-bold text-brand-navy"}>
                  {item.completed ? "이용 완료" : item.status === "WAITING" ? "대기" : item.status === "CONFIRMED" ? "확정" : "취소"}
                </span>
              </li>
            ))}
          </ol>
        )
      )}
    </div>
  );
}

/** Booked nights include stays already completed: "3박 / 5박" means 3 of 5 nights are spoken for. */
function PassUsage({ pass }: { pass: SeasonPassSummary }) {
  const booked = pass.usedNights + pass.reservedNights;
  const total = pass.totalNights;
  const ratio = total ? Math.min(1, booked / total) : 0;
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex items-baseline gap-1 text-brand-navy">
          <CountUpNumber value={booked} suffix="박" className="text-2xl font-black leading-none" />
          <span className="text-sm font-bold text-slate-400">/ {total == null ? "무제한" : `${total}박`}</span>
        </p>
        <span className="text-[11px] font-semibold text-slate-500">확정 예약 (이용 완료 포함)</span>
      </div>
      {total != null && total > 0 && (
        <div
          role="progressbar"
          aria-label="이용권 사용 현황"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={Math.min(booked, total)}
          aria-valuetext={`${booked}박 / ${total}박`}
          className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-slate-100"
        >
          <m.div
            className="h-full w-full origin-left rounded-full bg-brand-navy"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: ratio }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      )}
    </div>
  );
}

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
      className="mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h2 className="text-sm font-black text-brand-navy">
          {pass?.registered ? pass.name : "내 이용권"}
        </h2>
        {pass?.registered && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
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
        <div role="status" aria-label="이용권을 확인하고 있어요" className="mt-3 space-y-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-2.5 w-full" />
        </div>
      ) : pass.registered ? (
        compact ? (
          <p className="mt-2 text-xs text-slate-500">
            이용 완료 {pass.usedNights}박 · 확정 예약 {pass.reservedNights}박
          </p>
        ) : (
          <>
            <PassUsage pass={pass} />
            <p className="mt-2.5 text-[11px] leading-5 text-slate-500">
              {pass.endsOn ? `${dateLabel(pass.endsOn)}까지 사용할 수 있어요. ` : ""}대기는 차감하지 않으며, 잔여 박수가 없으면 승격이 보류돼요.
            </p>
            <PassHistory crewId={crewId} />
          </>
        )
      ) : (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          아직 등록된 이용권이 없어요. 운영진에게 이용권 등록을 요청해 주세요.
        </p>
      )}
    </section>
  );
}
