import { Button } from '../Button';
import { participantStatusLabel } from '../../constants/displayLabels';
import { formatEventDateTime } from '../../lib/eventDateTime';
import type { EventGuestApplication } from '../../services/eventGuestVerification';

interface Props {
    guest: EventGuestApplication;
    pending: boolean;
    onStatusChange: (status: 'JOINED' | 'REMOVED') => void;
}

export function EventGuestApplicationRow({ guest, pending, onStatusChange }: Props) {
    const active = guest.status === 'JOINED' || guest.status === 'PENDING';
    return (
        <tr className="hover:bg-zinc-50/50">
            <td data-label="참가자" className="px-2 py-3.5 text-zinc-800">
                <p className="break-words font-bold">{guest.name || '보관 기간 종료'}</p>
                <p className="break-words text-xs text-zinc-600">
                    비회원 {guest.school && `· ${guest.school}`} {guest.crew && `· ${guest.crew}`}
                </p>
                <p className="text-xs text-zinc-500">{guest.receiptCode}{guest.maskedPhone && ` · ${guest.maskedPhone}`}</p>
            </td>
            <td data-label="상태" className="px-2 py-3.5 text-xs font-semibold">{participantStatusLabel[guest.status]}</td>
            <td data-label="신청 일시" className="px-2 py-3.5 text-xs text-zinc-500">{formatEventDateTime(guest.appliedAt)}</td>
            <td data-label="입금 상태" className="px-2 py-3.5 text-xs text-zinc-500">무료</td>
            <td data-label="추가 응답" className="px-2 py-3.5">
                {guest.question && guest.answer
                    ? <details className="max-w-60 text-xs">
                        <summary className="cursor-pointer font-semibold">추가 응답 보기</summary>
                        <p className="mt-1 break-words text-zinc-600">{guest.question}</p>
                        <p className="mt-1 whitespace-pre-wrap break-words">{guest.answer}</p>
                    </details>
                    : <span className="text-xs text-zinc-500">미입력</span>}
            </td>
            <td data-label="관리" className="px-2 py-3.5">
                <div className="flex flex-wrap justify-end gap-1.5">
                    {guest.canApprove && (
                        <Button variant="outline" type="button" disabled={pending} onClick={() => onStatusChange('JOINED')}
                            aria-label={`${guest.name || guest.receiptCode} 승인`}>승인</Button>
                    )}
                    {active && !guest.eventCancelled && guest.name && (
                        <Button variant="ghost" type="button" disabled={pending} onClick={() => onStatusChange('REMOVED')}
                            aria-label={`${guest.name} 제외`}>제외</Button>
                    )}
                </div>
            </td>
        </tr>
    );
}
