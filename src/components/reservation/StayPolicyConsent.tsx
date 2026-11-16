export default function StayPolicyConsent({
  dates,
  checked,
  onChange,
  disabled = false,
}: {
  dates: string[];
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const date = dates.slice().sort()[0];
  if (!date) return null;
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(year, month - 1, day + 1, 12);
  return (
    <section
      aria-label="숙박일 안내"
      className="my-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600"
    >
      <h3 className="mb-1 font-bold text-[#162660]">
        밤을 보내는 날짜로 예약해 주세요.
      </h3>
      <p>
        {month}월 {day}일 밤부터 {next.getMonth() + 1}월 {next.getDate()}일
        아침까지 이용한다면,
        <br />
        자정이 지난 뒤 입실해도{" "}
        <strong>
          {month}월 {day}일 1박
        </strong>{" "}
        예약이 필요해요.
      </p>
      <p className="mt-1">
        예약 없이 이용할 수 없어요.
        <br />
        입실 시각이 아닌 숙박하는 밤을 기준으로 신청해 주세요.
      </p>
      <label className="mt-2 flex min-h-10 cursor-pointer items-center gap-2 font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
          className="h-4 w-4 shrink-0 accent-[#162660]"
        />
        <span>숙박일 기준을 확인하고 동의합니다. *</span>
      </label>
    </section>
  );
}
