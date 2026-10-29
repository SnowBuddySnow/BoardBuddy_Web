import { useEffect, useState } from 'react';
import type { Event } from '../../types/api';
import { getEventFamily, type EventFamily } from '../../services/groupize';
import { participantStatusLabel } from '../../constants/displayLabels';

export function EventFamilyLinks({ event, onOpen }: { event: Event; onOpen?: (id: number) => void }) {
    const [family, setFamily] = useState<EventFamily | null>(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        if (!event.parentEventId && !event.groupizeEnabled) return;
        let cancelled = false;
        setFamily(null); setFailed(false);
        getEventFamily(event.id).then(next => { if (!cancelled) setFamily(next); })
            .catch(() => { if (!cancelled) setFailed(true); });
        return () => { cancelled = true; };
    }, [event.id, event.parentEventId, event.groupizeEnabled]);
    if (!event.parentEventId && !event.groupizeEnabled) return null;
    return <nav aria-label="연결된 모임" className="my-4 space-y-2 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <h2 className="text-sm font-bold text-[#162660]">연결된 모임</h2>
        {failed && <p className="text-xs text-red-700">연결된 모임을 불러오지 못했습니다. 화면을 다시 열어 주세요.</p>}
        {family?.parent && <button className="block text-left text-sm font-semibold text-[#162660] underline" onClick={() => onOpen?.(family.parent!.id)}>부모 모임: {family.parent.title}</button>}
        {family?.children.filter(child => child.id !== event.id).map(child => <button key={child.id}
            className="block text-left text-sm text-[#162660] underline" onClick={() => onOpen?.(child.id)}>
            {child.title}{child.currentUserStatus && ` · ${participantStatusLabel[child.currentUserStatus]}`}
        </button>)}
        {family && family.children.length === 0 && <p className="text-xs text-zinc-500">호스트가 소모임을 편성하면 여기에 표시됩니다.</p>}
    </nav>;
}
