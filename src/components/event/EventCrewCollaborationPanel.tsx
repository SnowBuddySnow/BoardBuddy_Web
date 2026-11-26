import { useEffect, useState } from 'react';
import { Button } from '../Button';
import { discoverCrews, type DiscoverableCrew } from '../../services/crew';
import { inviteEventCrew, listEventCrewInvitations, type EventCrewInvitation } from '../../services/eventCrewInvitations';

const statusLabel = {
    PENDING: '수락 대기',
    ACCEPTED: '공동 운영 중',
    DECLINED: '초대 거절',
};

interface Props {
    eventId: number;
    hostCrewId: number;
    hostCrewName: string;
    cancelled: boolean;
}

export function EventCrewCollaborationPanel({ eventId, hostCrewId, hostCrewName, cancelled }: Props) {
    const [invitations, setInvitations] = useState<EventCrewInvitation[] | null>(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<DiscoverableCrew[]>([]);
    const [searched, setSearched] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        listEventCrewInvitations(eventId)
            .then(list => { if (active) setInvitations(list); })
            .catch(() => { if (active) setError('공동 운영 정보를 불러오지 못했어요.'); });
        return () => { active = false; };
    }, [eventId]);

    async function search() {
        const term = query.trim();
        if (!term || pending) return;
        setPending(true);
        setError('');
        setSearched(false);
        setResults([]);
        try {
            const crews = await discoverCrews(term);
            setResults(crews.filter(crew => crew.crewId !== hostCrewId &&
                !invitations?.some(invitation => invitation.crewId === crew.crewId)));
            setSearched(true);
        } catch {
            setError('크루를 검색하지 못했어요. 다시 시도해 주세요.');
        } finally {
            setPending(false);
        }
    }

    async function invite(crewId: number) {
        if (pending) return;
        setPending(true);
        setError('');
        try {
            const invitation = await inviteEventCrew(eventId, crewId);
            setInvitations(current => [invitation, ...(current ?? []).filter(item => item.id !== invitation.id)]);
            setResults([]);
        } catch {
            setError('초대를 보내지 못했어요. 기존 초대 상태를 확인한 뒤 다시 시도해 주세요.');
            try {
                setInvitations(await listEventCrewInvitations(eventId));
            } catch {
                // Keep the most recent confirmed invite list if refreshing also fails.
            }
        } finally {
            setPending(false);
        }
    }

    return (
        <section className="space-y-4 rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm sm:p-6" aria-label="크루 공동 운영">
            <h2 className="text-base font-bold text-zinc-900">공동 운영</h2>
            <p className="text-sm text-zinc-600">주최 크루 <strong>{hostCrewName}</strong></p>
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            {invitations && invitations.length > 0 && (
                <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
                    {invitations.map(invitation => (
                        <li key={invitation.id} className="flex flex-wrap justify-between gap-2 px-3 py-2 text-sm">
                            <span className="font-semibold">{invitation.crewName}</span>
                            <span className={invitation.status === 'ACCEPTED' ? 'text-emerald-700' : 'text-zinc-600'}>
                                {statusLabel[invitation.status]}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {invitations && !cancelled && !invitations.some(invitation => invitation.status !== 'DECLINED') && (
                <>
                    <p className="text-sm text-zinc-600">초대를 수락하면 두 크루의 현직 매니저가 함께 이벤트를 운영합니다.</p>
                    <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); void search(); }}>
                        <label className="sr-only" htmlFor="event-crew-search">초대할 크루 이름</label>
                        <input id="event-crew-search" value={query} maxLength={100} disabled={pending}
                            onChange={event => { setQuery(event.target.value); setResults([]); setSearched(false); }}
                            placeholder="크루 이름으로 검색"
                            className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900" />
                        <Button type="submit" variant="outline" disabled={!query.trim() || pending}>검색</Button>
                    </form>
                    {searched && results.length === 0 && <p className="text-sm text-zinc-600">초대할 수 있는 크루가 없어요.</p>}
                    {results.length > 0 && (
                        <ul className="divide-y divide-zinc-100">
                            {results.map(crew => (
                                <li key={crew.crewId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                                    <span>{crew.crewName}{crew.schoolName && <span className="ml-2 text-zinc-600">{crew.schoolName}</span>}</span>
                                    <Button type="button" variant="outline" disabled={pending} onClick={() => void invite(crew.crewId)}
                                        aria-label={`${crew.crewName}에 초대 보내기`}>초대 보내기</Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </section>
    );
}
