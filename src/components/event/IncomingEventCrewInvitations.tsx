import { useEffect, useState } from 'react';
import { Button } from '../Button';
import { getApiErrorStatus } from '../../lib/apiError';
import {
    listIncomingEventCrewInvitations,
    respondToEventCrewInvitation,
    type EventCrewInvitation,
} from '../../services/eventCrewInvitations';

export function IncomingEventCrewInvitations({ onAccept }: { onAccept: (eventId: number) => void }) {
    const [invitations, setInvitations] = useState<EventCrewInvitation[]>([]);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        listIncomingEventCrewInvitations()
            .then(list => { if (active) setInvitations(list); })
            .catch(error => {
                if (active && getApiErrorStatus(error) !== 404) setError('공동 운영 초대를 불러오지 못했어요.');
            });
        return () => { active = false; };
    }, []);

    async function respond(invitation: EventCrewInvitation, accept: boolean) {
        if (pending) return;
        setPending(true);
        setError('');
        try {
            await respondToEventCrewInvitation(invitation, accept);
            setInvitations(current => current.filter(item => item.id !== invitation.id));
            if (accept) onAccept(invitation.eventId);
        } catch {
            setError('초대 응답을 저장하지 못했어요. 목록을 새로고침해 상태를 확인해 주세요.');
        } finally {
            setPending(false);
        }
    }

    if (invitations.length === 0 && !error) return null;

    return (
        <section className="mb-5 space-y-3 rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm" aria-label="받은 공동 운영 초대">
            <h2 className="text-base font-bold text-zinc-900">받은 공동 운영 초대</h2>
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            <ul className="space-y-3">
                {invitations.map(invitation => (
                    <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
                        <div>
                            <p className="break-words font-semibold text-zinc-900">{invitation.eventTitle}</p>
                            <p className="text-sm text-zinc-600">{invitation.hostCrewName}에서 {invitation.crewName}에 초대했어요.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" disabled={pending} onClick={() => void respond(invitation, false)}>거절</Button>
                            <Button disabled={pending} onClick={() => void respond(invitation, true)}>수락하고 관리하기</Button>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
