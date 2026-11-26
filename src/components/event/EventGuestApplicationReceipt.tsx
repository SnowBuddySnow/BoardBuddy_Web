import { Button } from '../Button';
import { formatEventDateTime } from '../../lib/eventDateTime';
import { buildEventGuestReceiptLink } from '../../lib/eventGuestLink';
import { participantStatusLabel } from '../../constants/displayLabels';
import type { EventGuestApplication } from '../../services/eventGuestVerification';

export function EventGuestApplicationReceipt({ application, pending, onCancel }: {
    application: EventGuestApplication;
    pending: boolean;
    onCancel: () => void;
}) {
    return (
        <section className="space-y-4 rounded-2xl bg-zinc-50 p-4" aria-label="비회원 신청 내역">
            <h2 className="text-lg font-bold" aria-live="polite">
                {application.eventCancelled ? '이벤트가 취소됐어요' : participantStatusLabel[application.status]}
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt>이벤트</dt><dd className="break-words">{application.eventTitle}</dd>
                <dt>일시</dt><dd>{formatEventDateTime(application.startsAt)}</dd>
                <dt>신청번호</dt><dd className="font-bold">{application.receiptCode}</dd>
                <dt>신청자</dt><dd className="break-words">{application.name} · {application.school} · {application.crew}</dd>
                <dt>휴대전화</dt><dd>{application.maskedPhone}</dd>
                {application.question && (
                    <><dt className="max-w-28 break-words">{application.question}</dt>
                        <dd className="whitespace-pre-wrap break-words">{application.answer || '미입력'}</dd></>
                )}
            </dl>
            <label className="block space-y-1 text-sm font-semibold">
                신청 조회 링크
                <input readOnly value={buildEventGuestReceiptLink(window.location.origin, application.receiptCode)}
                    onFocus={event => event.target.select()} className="block w-full rounded-xl border border-zinc-200 bg-white p-2 text-sm" />
            </label>
            <p className="text-sm text-zinc-600">다시 확인하려면 신청번호 또는 조회 링크와 등록한 휴대전화가 필요해요.</p>
            {application.canCancel && (
                <Button variant="outline" type="button" disabled={pending} onClick={onCancel}>신청 취소</Button>
            )}
        </section>
    );
}
