import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import {
  assignSeasonPasses,
  getMemberStayHistory,
  listSeasonPassMembers,
  type SeasonPassMember,
  type PagedItems,
  type StayHistoryItem,
} from "../../services/seasonStays";
import { getApiErrorMessage } from "../../lib/apiError";
import { getReservationSeason } from "../../lib/reservationSeason";
import { localDateKey } from "../../lib/personalCalendar";
import SeasonPassEditor from "./SeasonPassEditor";

function ManagementDialog({
  title,
  onClose,
  children,
  blocked = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  blocked?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3"
      onClick={() => {
        if (!blocked) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        className="reservation-modal max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto outline-none"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !blocked) {
            event.stopPropagation();
            onClose();
          }
          if (event.key !== "Tab") return;
          const nodes = ref.current?.querySelectorAll<HTMLElement>(
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
              document.activeElement === ref.current)
          ) {
            event.preventDefault();
            last.focus();
          } else if (
            !event.shiftKey &&
            (document.activeElement === last ||
              document.activeElement === ref.current)
          ) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={id} className="text-lg font-bold text-[#162660]">
            {title}
          </h2>
          <button
            type="button"
            disabled={blocked}
            onClick={onClose}
            aria-label="닫기"
            className="flex h-10 w-10 shrink-0 items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function StayHistory({
  crewId,
  memberId,
}: {
  crewId: number;
  memberId: number;
}) {
  const [page, setPage] = useState(0),
    [revision, setRevision] = useState(0);
  const [data, setData] = useState<PagedItems<StayHistoryItem>>(),
    [failed, setFailed] = useState(false),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    void getMemberStayHistory(crewId, memberId, page)
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [crewId, memberId, page, revision]);
  return (
    <section
      aria-label="숙박 이력"
      className="mt-4 rounded-2xl border border-slate-200 p-4"
    >
      <h3 className="text-sm font-bold">숙박 이력</h3>
      <p className="mt-1 text-xs text-slate-500">
        이용 완료는 운영진이 확인한 기록이에요.
      </p>
      {loading ? (
        <p role="status" className="mt-3 text-sm">
          확인 중…
        </p>
      ) : failed ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          이력을 불러오지 못했습니다.
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
            className="ml-2 min-h-10 underline"
          >
            다시 시도
          </button>
        </p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-slate-100">
            {data?.items.map((item) => (
              <li
                key={item.reservationId}
                className="flex flex-wrap justify-between gap-2 py-3 text-sm"
              >
                <span>{item.date.replace(/-/g, ".")}</span>
                <span
                  className={
                    item.completed
                      ? "font-semibold text-blue-700"
                      : "text-slate-500"
                  }
                >
                  {item.completed
                    ? "이용 완료"
                    : item.status === "WAITING"
                      ? "대기"
                      : item.status === "CANCELED"
                        ? "취소"
                        : "확정 예약"}
                </span>
              </li>
            ))}
          </ul>
          {!data?.items.length && (
            <p className="mt-3 text-sm text-slate-500">
              예약·숙박 이력이 없어요.
            </p>
          )}
          <div className="mt-2 flex items-center justify-end gap-3 text-xs">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((value) => value - 1)}
              className="min-h-10 disabled:opacity-30"
            >
              이전
            </button>
            <span>{page + 1}</span>
            <button
              type="button"
              disabled={!data || (page + 1) * data.size >= data.total}
              onClick={() => setPage((value) => value + 1)}
              className="min-h-10 disabled:opacity-30"
            >
              다음
            </button>
          </div>
        </>
      )}
    </section>
  );
}
export default function SeasonPassManager({ crewId }: { crewId: number }) {
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [revision, setRevision] = useState(0);
  const [data, setData] = useState<PagedItems<SeasonPassMember>>(),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [selected, setSelected] = useState<number[]>([]),
    [person, setPerson] = useState<SeasonPassMember | null>(null);
  const [kind, setKind] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const season = getReservationSeason();
  const [startsOn, setStartsOn] = useState(localDateKey(season.start)),
    [endsOn, setEndsOn] = useState(localDateKey(season.end));
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void listSeasonPassMembers(crewId, query, page)
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch(() => {
        if (!cancelled) {
          setData(undefined);
          setError("부원 이용권 목록을 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [crewId, query, page, revision]);
  const rows = data?.items ?? [];
  const pending = loading || query !== search.trim();
  const assign = async () => {
    if (
      lock.current ||
      !kind ||
      !selected.length ||
      !startsOn ||
      !endsOn ||
      startsOn > endsOn
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await assignSeasonPasses(crewId, selected, {
        name: kind === "unlimited" ? "풀상주권" : `${kind}박권`,
        totalNights: kind === "unlimited" ? null : Number(kind),
        startsOn,
        endsOn,
      });
      setMessage(`${result.updated}명에게 이용권을 할당했습니다.`);
      setKind(null);
      setSelected([]);
      setRevision((value) => value + 1);
    } catch (err) {
      setError(
        getApiErrorMessage(err) ||
          "할당하지 못했습니다. 이용 기간과 확정 박수를 확인해 주세요.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section aria-label="부원 이용권 관리">
      <h2 className="text-base font-bold text-[#162660]">부원 이용권 관리</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        이용권 할당·변경은 크루장과 임원진만 할 수 있어요.
      </p>
      <label className="relative mt-4 block">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-3 h-5 w-5 text-slate-400"
        />
        <input
          aria-label="부원 검색"
          placeholder="이름 또는 학번 검색"
          value={search}
          disabled={busy}
          onChange={(event) => {
            setSearch(event.target.value);
            setSelected([]);
          }}
          className="reservation-input w-full pl-10"
        />
      </label>
      <div className="my-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <label className="flex min-h-10 items-center gap-2">
            <input
              type="checkbox"
              aria-label="현재 목록 전체 선택"
              checked={
                rows.length > 0 &&
                rows.every((row) => selected.includes(row.accountId))
              }
              disabled={busy || pending || !rows.length}
              onChange={(event) =>
                setSelected(
                  event.target.checked ? rows.map((row) => row.accountId) : [],
                )
              }
              className="h-4 w-4 accent-[#162660]"
            />
            현재 목록 전체 선택
          </label>
          <span>
            {selected.length}명 선택 · 전체 {data?.total ?? 0}명
          </span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            ["5", "5박권 할당"],
            ["10", "10박권 할당"],
            ["unlimited", "풀상주 할당"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={busy || pending || !selected.length}
              onClick={() => {
                setError("");
                setKind(value);
              }}
              className="min-h-11 rounded-xl border border-slate-200 px-1 text-xs font-semibold text-[#162660] disabled:opacity-40"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {message && (
        <p role="status" className="my-3 text-sm text-blue-700">
          {message}
        </p>
      )}
      {error && !kind && (
        <p role="alert" className="my-3 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
            className="ml-2 min-h-10 underline"
          >
            다시 시도
          </button>
        </p>
      )}
      {pending ? (
        <p role="status" className="py-6 text-sm text-slate-500">
          이용권을 확인하고 있어요.
        </p>
      ) : (
        <>
          <ul aria-label="부원 이용권 목록" className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.accountId}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    aria-label={`${row.name} 선택`}
                    checked={selected.includes(row.accountId)}
                    disabled={busy}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, row.accountId]
                          : current.filter((id) => id !== row.accountId),
                      )
                    }
                    className="h-4 w-4 shrink-0 accent-[#162660]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="break-words text-sm">
                        {row.name}
                      </strong>
                      {row.role !== "CREW_MEMBER" && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
                          {row.role === "CREW_CAPTAIN" ? "크루장" : "임원진"}
                        </span>
                      )}
                    </div>
                    {row.studentNumber && (
                      <p className="mt-1 text-xs text-slate-500">
                        {row.studentNumber}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`${row.name} 이력·수정`}
                    onClick={() => setPerson(row)}
                    className="min-h-10 shrink-0 text-xs font-semibold text-blue-700"
                  >
                    이력·수정 →
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs">
                  <div>
                    <span className="block text-slate-400">이용권</span>
                    <strong className="mt-1 block text-[#162660]">
                      {row.pass.registered ? row.pass.name : "미등록"}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-slate-400">누적 이용 완료</span>
                    <strong className="mt-1 block">
                      {row.completedNights}박
                    </strong>
                  </div>
                  <div>
                    <span className="block text-slate-400">잔여</span>
                    <strong className="mt-1 block">
                      {!row.pass.registered
                        ? "—"
                        : row.pass.remainingNights == null
                          ? "무제한"
                          : `${row.pass.remainingNights}박`}
                    </strong>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {!rows.length && !error && (
            <p className="py-6 text-center text-sm text-slate-500">
              검색 결과가 없어요.
            </p>
          )}
          <div className="mt-3 flex items-center justify-end gap-4 text-sm">
            <button
              type="button"
              disabled={page === 0 || busy}
              onClick={() => {
                setPage((value) => value - 1);
                setSelected([]);
              }}
              className="min-h-11 disabled:opacity-30"
            >
              이전
            </button>
            <span>{page + 1}</span>
            <button
              type="button"
              disabled={!data || (page + 1) * data.size >= data.total || busy}
              onClick={() => {
                setPage((value) => value + 1);
                setSelected([]);
              }}
              className="min-h-11 disabled:opacity-30"
            >
              다음
            </button>
          </div>
        </>
      )}
      {person && (
        <ManagementDialog title={person.name} onClose={() => setPerson(null)}>
          <SeasonPassEditor
            key={person.accountId}
            crewId={crewId}
            memberId={person.accountId}
            onSaved={() => setRevision((value) => value + 1)}
          />
          <StayHistory crewId={crewId} memberId={person.accountId} />
        </ManagementDialog>
      )}
      {kind && (
        <ManagementDialog
          title={`${selected.length}명 이용권 할당`}
          blocked={busy}
          onClose={() => {
            setKind(null);
            setError("");
          }}
        >
          <p className="text-sm font-semibold text-[#162660]">
            {kind === "unlimited" ? "풀상주권" : `${kind}박권`}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            선택한 기간의 이용권을 등록하거나 변경해요.
            <br />
            기간이 겹치거나 확정된 박수보다 적으면 전체 할당을 취소해요.
          </p>
          <p className="my-3 text-xs">
            {rows
              .filter((row) => selected.includes(row.accountId))
              .map((row) => row.name)
              .join(", ")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">
              시작일 *
              <input
                type="date"
                aria-label="할당 시작일"
                value={startsOn}
                disabled={busy}
                onChange={(event) => setStartsOn(event.target.value)}
                className="reservation-input mt-1 w-full min-w-0"
              />
            </label>
            <label className="text-xs">
              종료일 *
              <input
                type="date"
                aria-label="할당 종료일"
                value={endsOn}
                disabled={busy}
                onChange={(event) => setEndsOn(event.target.value)}
                className="reservation-input mt-1 w-full min-w-0"
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={
              busy ||
              !selected.length ||
              !startsOn ||
              !endsOn ||
              startsOn > endsOn
            }
            onClick={() => void assign()}
            className="reservation-primary mt-4 min-h-11 w-full"
          >
            {busy ? "할당 중…" : `선택 ${selected.length}명에게 할당`}
          </button>
        </ManagementDialog>
      )}
    </section>
  );
}
