import { useEffect, useState } from 'react';
import { getApiErrorMessage, getApiErrorStatus } from '../../lib/apiError';
import { participantStatusLabel } from '../../constants/displayLabels';
import { applyAllocation, configureGroupize, createSubevents, getGroupize, previewAllocation,
    type AllocationPlan, type GroupizeState, type Placement } from '../../services/groupize';

interface Props { eventId: number; onOpenEvent: (id: number) => void; onChanged?: () => void }

export function GroupizePanel({ eventId, onOpenEvent, onChanged }: Props) {
    const [state, setState] = useState<GroupizeState | null>(null);
    const [placements, setPlacements] = useState<Placement[]>([]);
    const [plan, setPlan] = useState<AllocationPlan | null>(null);
    const [maximum, setMaximum] = useState('');
    const [count, setCount] = useState(2);
    const [childCapacity, setChildCapacity] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const accept = (next: GroupizeState) => {
        setState(next); setPlacements(next.placements); setPlan(null);
        setMaximum(next.maximumApplicants == null ? '' : String(next.maximumApplicants));
    };

    useEffect(() => {
        let cancelled = false;
        getGroupize(eventId).then(next => { if (!cancelled) accept(next); })
            .catch(() => { if (!cancelled) setError('그룹 편성 정보를 불러오지 못했습니다. 관리 권한과 모임 시작 시간을 확인해 주세요.'); });
        return () => { cancelled = true; };
    }, [eventId]);

    const run = async (action: () => Promise<void>) => {
        setBusy(true); setError(''); setNotice('');
        try { await action(); }
        catch (reason) {
            if (getApiErrorStatus(reason) === 409) {
                setPlan(null);
                try { accept(await getGroupize(eventId)); } catch { /* Retain the stale view with an explicit error. */ }
                setError('신청자나 소모임 정보가 변경되었습니다. 최신 명단을 확인하고 다시 미리보기를 진행해 주세요.');
            } else setError(getApiErrorMessage(reason) || '처리하지 못했습니다. 정원, 크루별 인원 제한과 참가 상태를 확인해 주세요.');
        } finally { setBusy(false); }
    };

    const choose = (userId: number, childId: string) => {
        setPlacements(current => [...current.filter(item => item.userId !== userId),
            ...(childId ? [{ userId, childEventId: Number(childId), locked: true }] : [])]);
        setPlan(null); setNotice('');
    };

    const preview = (randomize: boolean) => run(async () => {
        if (!state) return;
        const next = await previewAllocation(eventId, state.revisionToken, placements, randomize);
        setPlacements(next.placements); setPlan(next);
        setNotice(`편성 미리보기입니다. 미배정 ${next.unassignedUserIds.length}명 · 확인 후 편성을 확정해 주세요.`);
    });

    const field = 'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm';
    const button = 'rounded-lg border border-[#162660] px-4 py-2 text-sm font-bold text-[#162660] disabled:opacity-40';

    if (!state) return <section className="rounded-2xl border border-zinc-200 bg-white p-5" aria-label="Groupize">
        <p role="status">{error || '그룹 편성 정보를 불러오는 중...'}</p>
        {error && <button className={`${button} mt-3`} onClick={() => void run(async () => accept(await getGroupize(eventId)))}>다시 불러오기</button>}
    </section>;

    const eligible = state.applicants.filter(item => item.eligible);
    return <section className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5" aria-label="Groupize">
        <div>
            <h2 className="text-lg font-black text-zinc-900">Groupize · 소모임 편성</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">신청자를 소모임으로 나누고 멤버를 직접 배정하거나 무작위로 편성하세요. 호스트 기획형과 멤버 자율형 모두 사용할 수 있습니다.</p>
        </div>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">{notice}</p>}
        <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-48 flex-1 text-sm font-bold">최대 신청 인원 (비워두면 제한 없음)
                <input className={`${field} mt-2`} type="number" min="1" aria-label="최대 신청 인원" value={maximum}
                    onChange={event => setMaximum(event.target.value)} disabled={busy} placeholder="제한 없음" />
            </label>
            <button className={button} disabled={busy} onClick={() => void run(async () => {
                const limit = maximum.trim() ? Number(maximum) : null;
                if (limit != null && (!Number.isSafeInteger(limit) || limit < 1)) throw new Error('Invalid maximum');
                accept(await configureGroupize(eventId, limit, state.revisionToken)); onChanged?.();
                setNotice('신청 인원 설정이 저장되었습니다.');
            })}>{state.enabled ? '신청 인원 설정 저장' : 'Groupize 시작'}</button>
        </div>
        {state.enabled && <>
            <div className="rounded-xl bg-zinc-50 p-4">
                <h3 className="text-sm font-bold">소모임 만들기</h3>
                <p className="mt-1 text-xs leading-5 text-zinc-500">설명, 날짜, 장소, 공개 범위, 동의서, 결제·취소 안내를 부모 모임에서 가져옵니다. 생성 후 각 소모임의 관리 화면에서 수정할 수 있습니다.</p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                    <label className="w-28 text-sm">추가할 개수<input className={`${field} mt-1`} aria-label="소모임 개수" type="number" min="1" max="50"
                        value={count} onChange={event => setCount(Number(event.target.value))} disabled={busy} /></label>
                    <label className="min-w-40 flex-1 text-sm">각 소모임 정원<input className={`${field} mt-1`} aria-label="소모임 정원" type="number" min="1"
                        value={childCapacity} onChange={event => setChildCapacity(event.target.value)} placeholder="제한 없음" disabled={busy} /></label>
                    <button className={button} disabled={busy || count < 1 || !Number.isInteger(count) || state.children.length + count > 50}
                        onClick={() => void run(async () => {
                            const capacity = childCapacity ? Number(childCapacity) : undefined;
                            if (capacity !== undefined && (!Number.isSafeInteger(capacity) || capacity < 1)) throw new Error('Invalid capacity');
                            accept(await createSubevents(eventId, state.revisionToken, Array.from({ length: count }, (_, index) => ({
                                title: `${state.parentTitle.slice(0, 88)} · ${state.children.length + index + 1}`,
                                capacity, capacityLimited: capacity !== undefined,
                            }))));
                            onChanged?.();
                        })}>소모임 생성</button>
                </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
                {state.children.map(child => <div key={child.id} className="rounded-xl border border-zinc-200 p-3">
                    <button className="text-left text-sm font-bold text-[#162660] underline" onClick={() => onOpenEvent(child.id)}>{child.title}</button>
                    <p className="mt-1 text-xs text-zinc-500">배정 {placements.filter(item => item.childEventId === child.id).length}명 / {child.capacity == null ? '제한 없음' : `정원 ${child.capacity}명`}</p>
                </div>)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <h3 className="mr-auto text-sm font-bold">신청자 {state.applicants.length}명 · 배정 가능 {eligible.length}명</h3>
                <button className={button} disabled={busy || state.children.length === 0} onClick={() => void preview(true)}>무작위 편성</button>
                <button className={button} disabled={busy || state.children.length === 0} onClick={() => void preview(false)}>편성 미리보기</button>
            </div>
            <p className="text-xs leading-5 text-zinc-500">직접 배정한 멤버는 기본적으로 고정됩니다. 고정을 해제하면 무작위 편성에 포함됩니다. 배정하지 않은 신청자는 부모 모임에 남습니다. 소모임 동의서는 별도로 작성하며, 같은 금액의 부모 모임 납부 내역은 중복 청구 없이 적용됩니다.</p>
            <div className="max-h-[32rem] space-y-2 overflow-y-auto">
                {state.applicants.length === 0 && <p className="py-4 text-sm text-zinc-500">아직 신청자가 없습니다.</p>}
                {state.applicants.map(applicant => {
                    const placement = placements.find(item => item.userId === applicant.userId);
                    return <div key={applicant.userId} className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 p-3">
                        <div className="min-w-32 flex-1"><p className="text-sm font-bold">{applicant.name}</p>
                            <p className="mt-1 text-xs text-zinc-500">{participantStatusLabel[applicant.status]}{applicant.childStatus && ` · 소모임 ${participantStatusLabel[applicant.childStatus]}`}{!applicant.eligible && ' · 배정 불가'}</p></div>
                        <select aria-label={`${applicant.name} 배정`} className={`${field} max-w-64`} value={placement?.childEventId ?? ''}
                            disabled={busy || !applicant.eligible} onChange={event => choose(applicant.userId, event.target.value)}>
                            <option value="">미배정</option>{state.children.map(child => <option key={child.id} value={child.id}>{child.title}</option>)}
                        </select>
                        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={placement?.locked ?? false}
                            disabled={busy || !placement || !applicant.eligible} onChange={event => {
                                setPlacements(current => current.map(item => item.userId === applicant.userId ? { ...item, locked: event.target.checked } : item)); setPlan(null);
                            }} />고정</label>
                        {!applicant.eligible && placement && <button className="text-xs text-red-700 underline" disabled={busy}
                            onClick={() => choose(applicant.userId, '')}>배정 해제</button>}
                    </div>;
                })}
            </div>
            <button className={`${button} w-full bg-[#162660] text-white`} disabled={busy || !plan} onClick={() => void run(async () => {
                if (!plan || !window.confirm('검토한 소모임 편성을 확정할까요?')) return;
                accept(await applyAllocation(eventId, plan)); onChanged?.(); setNotice('소모임 편성이 저장되었습니다.');
            })}>{busy ? '처리 중...' : '검토한 편성 확정'}</button>
        </>}
    </section>;
}
