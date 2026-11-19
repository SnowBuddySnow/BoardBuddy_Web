import { useEffect, useId, useRef, useState } from "react";
import {
  getStayAnnouncements,
  sendStayAnnouncement,
  type StayAnnouncement,
} from "../../services/seasonStays";

function AnnouncementContent({
  crewId,
  date,
  confirmedCount,
}: {
  crewId: number;
  date: string;
  confirmedCount: number;
}) {
  const [items, setItems] = useState<StayAnnouncement[]>([]);
  const [title, setTitle] = useState(
    `${Number(date.slice(5, 7))}월 ${Number(date.slice(8))}일 숙박 안내`,
  );
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const key = useRef(crypto.randomUUID());
  const lock = useRef(false);
  const revision = useRef(0);
  const [refreshVersion, setRefreshVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const request = ++revision.current;
    setLoading(true);
    void getStayAnnouncements(crewId, date)
      .then((data) => {
        if (!cancelled && request === revision.current) setItems(data);
      })
      .catch(() => {
        if (!cancelled && request === revision.current)
          setMessage("공지 이력을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled && request === revision.current) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [crewId, date, refreshVersion]);
  const send = async () => {
    if (lock.current || !body.trim() || !title.trim() || !confirmedCount)
      return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const item = await sendStayAnnouncement(crewId, {
        date,
        title,
        body,
        requestKey: key.current,
      });
      revision.current += 1;
      setLoading(false);
      setItems((current) =>
        [item, ...current.filter((existing) => existing.id !== item.id)].slice(
          0,
          10,
        ),
      );
      setBody("");
      key.current = crypto.randomUUID();
      setMessage(
        `${item.recipients.length}명의 서비스 알림함에 공지를 보냈습니다.`,
      );
    } catch {
      setMessage(
        "발송 결과를 확인하지 못했습니다. 다시 누르면 같은 요청으로 확인합니다.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section aria-label="숙박자 공지" className="reservation-panel mb-3">
      <h3 className="text-sm font-bold text-[#162660]">숙박자에게 공지</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        현재 확정된 숙박자 {confirmedCount}명을 대상으로 보내요.
        <br />
        게스트는 신청자에게 전달해요. 카카오톡 메시지는 발송하지 않아요.
      </p>
      <div className="mt-3 space-y-2">
        <label className="block text-xs">
          제목 *
          <input
            aria-label="숙박 공지 제목"
            value={title}
            maxLength={120}
            disabled={busy}
            onChange={(event) => {
              setTitle(event.target.value);
              key.current = crypto.randomUUID();
            }}
            className="reservation-input mt-1 w-full"
          />
        </label>
        <label className="block text-xs">
          내용 *
          <textarea
            aria-label="숙박 공지 내용"
            value={body}
            maxLength={1000}
            rows={3}
            disabled={busy}
            onChange={(event) => {
              setBody(event.target.value);
              key.current = crypto.randomUUID();
            }}
            placeholder="입실 안내, 청소 분담 등을 알려 주세요."
            className="reservation-input mt-1 w-full resize-y"
          />
        </label>
        <button
          onClick={() => void send()}
          disabled={busy || !confirmedCount || !title.trim() || !body.trim()}
          className="reservation-primary min-h-10 w-full px-3 py-2 text-sm"
        >
          {busy ? "발송 중…" : "확정 숙박자에게 보내기"}
        </button>
      </div>
      {message && (
        <p role="status" className="mt-2 text-xs leading-5 text-slate-600">
          {message}
        </p>
      )}
      <div className="mt-4 flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-600">최근 공지</h4>
        <button
          disabled={loading}
          onClick={() => setRefreshVersion((value) => value + 1)}
          className="min-h-10 text-xs text-blue-700"
        >
          읽음 현황 새로고침
        </button>
      </div>
      {loading && (
        <p role="status" className="text-xs text-slate-500">
          공지 이력을 확인하고 있어요.
        </p>
      )}
      <div className="space-y-2">
        {items.map((item) => (
          <details
            key={item.id}
            className="rounded-xl bg-slate-50 px-3 py-2 text-xs"
          >
            <summary className="cursor-pointer leading-6">
              <strong>{item.title}</strong>
              <span className="ml-2 text-slate-500">
                읽음{" "}
                {item.recipients.filter((recipient) => recipient.read).length}/
                {item.recipients.length}
              </span>
            </summary>
            <p className="mt-2 whitespace-pre-wrap leading-5">{item.body}</p>
            <p className="mt-2 text-[11px] text-slate-400">
              발송 당시의 확정자 기준
            </p>
            <ul className="mt-2 space-y-1">
              {item.recipients.map((recipient) => (
                <li
                  key={recipient.accountId}
                  className="flex justify-between gap-2"
                >
                  <span>{recipient.name}</span>
                  <span
                    className={
                      recipient.read ? "text-blue-700" : "text-slate-400"
                    }
                  >
                    {recipient.read ? "읽음" : "미확인"}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function StayAnnouncementPanel(props: {
  crewId: number;
  date: string;
  confirmedCount: number;
}) {
  const [open, setOpen] = useState(false),
    [opened, setOpened] = useState(false);
  const id = useId();
  return (
    <div className="mt-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setOpened(true);
          setOpen((value) => !value);
        }}
        className="reservation-secondary min-h-11 w-full"
      >
        {open ? "공지 닫기" : "공지하기"}
      </button>
      <div id={id} hidden={!open} className="mt-3">
        {opened && <AnnouncementContent {...props} />}
      </div>
    </div>
  );
}
