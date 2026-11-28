/**
 * Waitlist position as progress: 신청 → 대기 N번 → 확정. The backend promotes waiting bookings
 * automatically when a seat frees up and sends an in-app notification, which the copy promises.
 */
export default function WaitlistProgress({ position, compact = false }: { position: number | null | undefined; compact?: boolean }) {
    const known = typeof position === 'number' && position > 0;
    const ahead = known ? position - 1 : null;
    return (
        <div className={compact ? '' : 'rounded-xl bg-amber-50/70 p-3'}>
            <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-black text-zinc-900">대기 {known ? `${position}번` : '중'}</p>
                <p className="text-[11px] font-semibold text-amber-700">{ahead === 0 ? '다음 자리가 나면 확정' : ahead ? `앞에 ${ahead}명` : ''}</p>
            </div>
            <ol aria-label="대기 진행 상태" className="mt-2 grid grid-cols-3 gap-1">
                {['신청', known ? `대기 ${position}번` : '대기', '확정'].map((label, index) => (
                    <li key={label} className="min-w-0">
                        <span aria-hidden="true" className={`block h-1.5 rounded-full ${index < 2 ? 'bg-amber-500' : 'bg-zinc-200'}`} />
                        <span className={`mt-1 block truncate text-[10px] font-bold ${index < 2 ? 'text-amber-700' : 'text-zinc-400'}`}>{label}</span>
                    </li>
                ))}
            </ol>
            {!compact && <p className="mt-2 text-[11px] leading-5 text-zinc-600">자리가 나면 자동으로 확정되고 알림으로 알려드려요.</p>}
        </div>
    );
}
