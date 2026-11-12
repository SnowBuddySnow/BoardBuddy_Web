import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Link2 } from 'lucide-react';
import { Button } from '../Button';
import { createCrewInvitation, listCrewInvitations, revokeCrewInvitation, type CrewInvitation } from '../../services/onboarding';
import { crewInvitationUrl } from '../../lib/onboardingIntent';
import { parseEventDateTime } from '../../lib/eventDateTime';
import { getApiErrorMessage } from '../../lib/apiError';
const expiry = (value: string) => parseEventDateTime(value)?.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) || '만료 시간 확인 필요';
export function CrewInvitationPanel({ crewId }: { crewId: number }) {
    const loadRevision = useRef(0);
    const [invitations, setInvitations] = useState<CrewInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [hours, setHours] = useState(72);
    const [maxUses, setMaxUses] = useState('50');
    const [created, setCreated] = useState<{ id: string; url: string } | null>(null);
    const [qr, setQr] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const load = useCallback(async () => {
        const revision = ++loadRevision.current;
        setLoading(true); setError('');
        try { const values = await listCrewInvitations(crewId); if (revision === loadRevision.current) setInvitations(values); }
        catch { if (revision === loadRevision.current) setError('초대 목록을 불러오지 못했습니다.'); }
        finally { if (revision === loadRevision.current) setLoading(false); }
    }, [crewId]);
    useEffect(() => { setCreated(null); setQr(''); void load(); }, [load]);
    const create = async () => {
        const count = Number(maxUses);
        if (busy || !Number.isInteger(count) || count < 1 || count > 500) { setError('사용 횟수는 1~500 사이로 입력해 주세요.'); return; }
        setBusy(true); setError(''); setCopied(false); setQr(''); setCreated(null);
        try {
            const result = await createCrewInvitation(crewId, hours, count);
            const url = crewInvitationUrl(result.token);
            setCreated({ id: result.invitation.id, url });
            setInvitations(current => [result.invitation, ...current].slice(0, 50));
            try { const QRCode = await import('qrcode'); setQr(await QRCode.toDataURL(url, { width: 240, margin: 4, errorCorrectionLevel: 'M' })); }
            catch { setError('QR을 만들지 못했습니다. 아래 초대 링크는 사용할 수 있어요.'); }
        } catch (requestError) { setError(getApiErrorMessage(requestError) || '초대를 만들지 못했습니다.'); }
        finally { setBusy(false); }
    };
    const revoke = async (id: string) => {
        setBusy(true); setError('');
        try {
            await revokeCrewInvitation(crewId, id);
            if (created?.id === id) { setCreated(null); setQr(''); }
            await load();
        } catch { setError('초대를 회수하지 못했습니다. 다시 시도해 주세요.'); }
        finally { setBusy(false); }
    };
    return <section className="min-w-0 space-y-5 rounded-3xl border border-zinc-200 bg-white p-5 text-[#162660] sm:p-6" aria-label="부원 초대">
        <div className="flex items-center gap-2"><Link2 className="h-5 w-5" /><h2 className="text-lg font-black">부원 초대하기</h2></div>
        <p className="text-sm leading-6 text-zinc-600">링크나 QR을 전달하면 가입 신청까지 바로 이어져요. 멤버 권한은 운영진이 승인한 뒤 연결돼요.</p>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <label className="min-w-0 text-sm font-bold">유효 기간<select value={hours} disabled={busy} onChange={event => setHours(Number(event.target.value))} className="mt-2 h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 text-base">{[24, 72, 168].map(value => <option key={value} value={value}>{value / 24}일</option>)}</select></label>
            <label className="min-w-0 text-sm font-bold">최대 사용 횟수<input type="number" min={1} max={500} inputMode="numeric" value={maxUses} disabled={busy} onChange={event => setMaxUses(event.target.value)} className="mt-2 h-12 w-full min-w-0 rounded-xl border border-zinc-300 px-3 text-base" /></label>
        </div>
        <Button type="button" disabled={busy || loading} onClick={() => void create()} className="min-h-12 w-full rounded-2xl border-[#162660] bg-[#162660] hover:bg-[#243878]">{busy ? '처리 중...' : '새 초대 링크 만들기'}</Button>
        {created && <div className="min-w-0 space-y-3 rounded-2xl bg-[#FAF8F3] p-4">
            {qr && <img src={qr} alt="크루 가입 신청 초대 QR" width={240} height={240} className="mx-auto h-auto max-w-full" />}
            <label className="block text-sm font-bold">새 초대 링크<textarea readOnly value={created.url} rows={3} className="mt-2 w-full resize-none break-all rounded-xl border border-zinc-300 bg-white p-3 text-sm" /></label>
            <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(created.url); setCopied(true); } catch { setError('자동 복사를 사용할 수 없습니다. 링크를 직접 선택해 복사해 주세요.'); } }} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#162660] px-3 text-sm font-bold"><Copy className="h-4 w-4" />{copied ? '복사했어요' : '초대 링크 복사'}</button>
            <p className="text-xs leading-6 text-zinc-600">링크는 새로 만들었을 때만 표시돼요. 필요한 곳에 복사해 두세요. 언제든 아래 목록에서 회수할 수 있어요.</p>
        </div>}
        {error && <p role="alert" className="text-sm leading-6 text-red-700">{error}<button type="button" onClick={() => void load()} className="ml-2 min-h-11 underline">목록 새로고침</button></p>}
        <div className="space-y-3">{loading ? <p role="status" className="text-sm text-zinc-600">초대 목록 확인 중...</p> : invitations.map(invitation => {
            const expired = (parseEventDateTime(invitation.expiresAt)?.getTime() || 0) <= Date.now();
            const state = invitation.revokedAt ? '회수됨' : expired ? '만료됨' : invitation.useCount >= invitation.maxUses ? '사용 완료' : '사용 가능';
            return <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-4">
                <div className="min-w-0 text-xs leading-6 text-zinc-600"><p className="font-bold text-[#162660]">{state} · {invitation.useCount}/{invitation.maxUses}회 사용</p><p>만료: {expiry(invitation.expiresAt)} (한국 시간)</p></div>
                {!invitation.revokedAt && !expired && <button type="button" disabled={busy} onClick={() => void revoke(invitation.id)} className="min-h-11 rounded-xl border border-zinc-300 px-4 text-sm font-bold disabled:opacity-50">링크 회수</button>}
            </div>;
        })}</div>
    </section>;
}
