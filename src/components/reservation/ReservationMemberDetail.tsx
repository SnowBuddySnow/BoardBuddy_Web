import { useEffect, useRef, useState } from "react";
import { updateReservationManagement } from "../../services/crew";
import type {
  PaymentStatus,
  ReservationBookingResponse,
} from "../../types/api";

export default function ReservationMemberDetail({
  crewId,
  date,
  member,
  canManage,
  onSaved,
  onClose,
  onDelete,
}: {
  crewId: number;
  date: string;
  member: ReservationBookingResponse;
  canManage: boolean;
  onSaved: (value: {
    paymentStatus?: PaymentStatus | null;
    managerMemo?: string | null;
  }) => void;
  onClose: () => void;
  onDelete: () => Promise<void>;
}) {
  const [payment, setPayment] = useState<PaymentStatus | "">(
    member.paymentStatus ?? "",
  );
  const [memo, setMemo] = useState(member.managerMemo ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  const dialog = useRef<HTMLDivElement>(null);
  const guest = member.guestId != null;
  const name = member.participantName || (guest ? "게스트" : "부원");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => previous?.focus();
  }, []);
  const save = async () => {
    if (!canManage || lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const updated = await updateReservationManagement(
        crewId,
        member.reservationId,
        guest ? payment || null : (member.paymentStatus ?? null),
        memo.trim() || null,
      );
      onSaved(updated);
      setMessage("관리 정보를 저장했습니다.");
    } catch {
      setMessage(
        "저장하지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-person-title"
        tabIndex={-1}
        className="reservation-modal max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto outline-none"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !busy) {
            event.stopPropagation();
            onClose();
          }
          if (event.key !== "Tab") return;
          const nodes = dialog.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)",
          );
          if (!nodes?.length) {
            event.preventDefault();
            return;
          }
          const first = nodes[0],
            last = nodes[nodes.length - 1];
          if (
            event.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === dialog.current)
          ) {
            event.preventDefault();
            last.focus();
          } else if (
            !event.shiftKey &&
            (document.activeElement === last ||
              document.activeElement === dialog.current)
          ) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <h2
          id="reservation-person-title"
          className="text-lg font-bold text-[#162660]"
        >
          {name}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {guest ? "게스트 예약 상세" : "부원 예약 상세"}
        </p>
        <dl className="my-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-500">숙박일</dt>
          <dd>{date.replace(/-/g, ".")}</dd>
          <dt className="text-slate-500">예약 상태</dt>
          <dd>
            {member.status === "WAITING"
              ? `대기 ${member.waitlistPosition ?? "-"}번`
              : "확정"}
          </dd>
        </dl>
        {canManage && (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            {guest && (
              <label className="block text-sm font-semibold">
                입금 여부
                <select
                  aria-label="게스트 입금 여부"
                  value={payment}
                  disabled={busy}
                  onChange={(event) => {
                    setPayment(event.target.value as PaymentStatus | "");
                    setMessage("");
                  }}
                  className="reservation-input mt-1 w-full"
                >
                  <option value="">미확인</option>
                  <option value="UNPAID">미입금</option>
                  <option value="PAID">입금 완료</option>
                </select>
              </label>
            )}
            <label className="block text-sm font-semibold">
              관리자 메모 (선택)
              <textarea
                aria-label="예약 관리자 메모"
                rows={2}
                maxLength={1000}
                value={memo}
                disabled={busy}
                onChange={(event) => {
                  setMemo(event.target.value);
                  setMessage("");
                }}
                className="reservation-input mt-1 w-full resize-none"
              />
            </label>
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy}
              className="reservation-primary min-h-11 w-full"
            >
              {busy ? "저장 중…" : "관리 정보 저장"}
            </button>
            {message && (
              <p role="status" className="text-xs leading-5 text-slate-600">
                {message}
              </p>
            )}
            <button
              type="button"
              disabled={busy}
              className="min-h-10 text-xs text-red-700"
              onClick={async () => {
                if (
                  lock.current ||
                  !confirm(`${name}님의 예약을 삭제하시겠습니까?`)
                )
                  return;
                lock.current = true;
                setBusy(true);
                try {
                  await onDelete();
                } catch {
                  setMessage("예약을 삭제하지 못했습니다. 다시 시도해 주세요.");
                } finally {
                  lock.current = false;
                  setBusy(false);
                }
              }}
            >
              예약 삭제
            </button>
          </div>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="reservation-secondary mt-4 min-h-11 w-full"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
