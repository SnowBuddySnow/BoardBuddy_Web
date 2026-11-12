import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, ShieldCheck, UsersRound } from 'lucide-react';
import { Button } from '../components/Button';
import { acceptCrewInvitation, previewCrewInvitation, type InvitationPreview } from '../services/onboarding';
import { getUserInfo } from '../services/user';
import { getMyApplications } from '../services/crew';
import { getAccessToken, getAccountId, getSignupToken } from '../lib/session';
import { clearCrewInvitationIntent, getCrewInvitationIntent, rememberCrewApplication } from '../lib/onboardingIntent';
import { getApiErrorMessage, getApiErrorStatus } from '../lib/apiError';

interface Props { onLogin: () => void; onSignup: () => void; onDone: (eventId?: number) => void; onExit: () => void; onEvents: () => void; }
export default function CrewInvite({ onLogin, onSignup, onDone, onExit, onEvents }: Props) {
    const loadRevision = useRef(0);
    const accepting = useRef(false);
    const [preview, setPreview] = useState<InvitationPreview | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<'PREVIEW' | 'PENDING' | 'JOINED' | 'REJECTED' | 'CANCELED'>('PREVIEW');
    const [crewName, setCrewName] = useState('');
    const [error, setError] = useState('');
    const [unavailable, setUnavailable] = useState(false);
    const load = useCallback(async () => {
        if (accepting.current) return;
        const revision = ++loadRevision.current;
        const intent = getCrewInvitationIntent();
        setLoading(true); setError(''); setUnavailable(false);
        if (!intent) { setUnavailable(true); setLoading(false); return; }
        try {
            if (getAccessToken() && intent.receipt?.accountId === getAccountId()) {
                const user = await getUserInfo();
                if (revision !== loadRevision.current) return;
                if (user.crew?.crewId === intent.receipt.crewId) { setStatus('JOINED'); setCrewName(user.crew.crewName); return; }
                const application = (await getMyApplications()).find(item => item.crew_id === intent.receipt!.crewId);
                if (revision !== loadRevision.current) return;
                if (application && ['PENDING', 'REJECTED', 'CANCELED'].includes(application.status)) {
                    setStatus(application.status as 'PENDING' | 'REJECTED' | 'CANCELED'); setCrewName(application.crew_name); return;
                }
            }
            const introduction = await previewCrewInvitation(intent.token);
            if (revision !== loadRevision.current) return;
            setPreview(introduction); setCrewName(introduction.crewName); setStatus('PREVIEW');
        } catch (requestError) {
            if (revision !== loadRevision.current) return;
            if ([400, 404].includes(getApiErrorStatus(requestError) || 0)) setUnavailable(true);
            else setError('초대 정보를 불러오지 못했습니다. 다시 시도해 주세요.');
        } finally { if (revision === loadRevision.current) setLoading(false); }
    }, []);
    useEffect(() => { void load(); const refresh = () => { void load(); }; window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh); }, [load]);
    const accept = async () => {
        const intent = getCrewInvitationIntent();
        if (!intent || busy || accepting.current) return;
        if (!getAccessToken()) { if (getSignupToken()) onSignup(); else onLogin(); return; }
        if (!getAccountId()) { onLogin(); return; }
        accepting.current = true; loadRevision.current++;
        const applyingAccountId = getAccountId() || '';
        setBusy(true); setLoading(false); setError('');
        try {
            const result = await acceptCrewInvitation(intent.token);
            const currentIntent = getCrewInvitationIntent();
            if (currentIntent?.token !== intent.token || currentIntent?.eventId !== intent.eventId || getAccountId() !== applyingAccountId) return;
            rememberCrewApplication(result.crewId, applyingAccountId);
            setStatus(result.status);
        } catch (requestError) {
            const code = getApiErrorStatus(requestError);
            if (code === 404) setUnavailable(true);
            else if (code === 429) setError('요청이 많습니다. 잠시 후 다시 시도해 주세요.');
            else if (getApiErrorMessage(requestError) === 'Account already belongs to another crew') setError('이미 다른 크루에 가입되어 있어요. 현재 소속을 확인해 주세요.');
            else setError(getApiErrorMessage(requestError) || '가입 신청을 보내지 못했습니다. 다시 시도해 주세요.');
        }
        finally { accepting.current = false; setBusy(false); }
    };
    const finish = () => { const target = getCrewInvitationIntent()?.eventId; clearCrewInvitationIntent(); onDone(target); };
    return <main className="min-h-0 flex-1 overflow-y-auto bg-[#FAF8F3] px-4 py-6 text-[#162660] sm:px-8 lg:py-12">
        <div className="mx-auto max-w-3xl">
            <button type="button" onClick={() => { clearCrewInvitationIntent(); onExit(); }} className="mb-6 flex min-h-11 items-center gap-2 text-sm font-bold"><ArrowLeft className="h-4 w-4" />초대 나가기</button>
            <p className="text-sm font-black">BoardBuddy · 크루 초대</p>
            <section className="mt-5 rounded-3xl bg-white p-6 shadow-sm sm:p-9">
                {loading ? <p role="status" className="py-8 text-sm text-zinc-600">초대를 확인하고 있어요.</p> : unavailable ? <>
                    <h1 className="text-2xl font-black">이 초대를 사용할 수 없어요.</h1><p className="mt-4 text-sm leading-7 text-zinc-600">만료되었거나 회수된 링크일 수 있어요. 크루 운영진에게 새 초대를 요청해 주세요.</p>
                </> : error && !preview && status === 'PREVIEW' ? <><p role="alert" className="text-sm text-red-700">{error}</p><Button onClick={() => void load()} className="mt-5">다시 시도</Button></> : <>
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FCCA59]">{status === 'JOINED' ? <CheckCircle2 /> : status === 'PENDING' ? <Clock3 /> : <UsersRound />}</div>
                    <p className="text-sm font-bold text-zinc-600">{crewName}</p>
                    <h1 className="mt-2 text-2xl font-black leading-snug sm:text-3xl">{status === 'PENDING' ? '가입 신청을 보냈어요.' : status === 'JOINED' ? '이제 함께할 수 있어요.' : status === 'REJECTED' ? '신청 결과를 확인해 주세요.' : status === 'CANCELED' ? '취소한 가입 신청이에요.' : '함께할 크루가 기다리고 있어요.'}</h1>
                    {status === 'PREVIEW' ? <>
                        {preview?.schoolName && <p className="mt-3 text-sm text-zinc-600">{preview.schoolName}</p>}
                        <ol className="my-7 space-y-4 text-sm leading-6"><li><strong>1. 내 계정 확인</strong><p className="text-zinc-600">기존 회원은 로그인만, 처음이라면 본인 확인과 가입을 진행해요.</p></li><li><strong>2. 크루 가입 신청</strong><p className="text-zinc-600">다시 검색하거나 PIN을 입력할 필요가 없어요.</p></li><li><strong>3. 운영진 승인</strong><p className="text-zinc-600">승인 후 크루의 멤버 기능을 이용할 수 있어요.</p></li></ol>
                        <p className="mb-5 flex items-start gap-2 rounded-2xl bg-[#FAF8F3] p-4 text-xs leading-6 text-zinc-600"><ShieldCheck className="mt-1 h-4 w-4 shrink-0" />초대 링크를 받는 것만으로 멤버가 되지는 않아요. 내 프로필과 운영진 승인을 확인해요.</p>
                        <Button onClick={accept} disabled={busy} className="min-h-14 w-full rounded-2xl border-[#162660] bg-[#162660] hover:bg-[#243878]">{busy ? '신청 중...' : getAccessToken() ? '이 크루에 가입 신청' : getSignupToken() ? '회원가입 이어서 하기' : '로그인하고 계속하기'}</Button>
                    </> : status === 'JOINED' ? <><p className="my-5 text-sm leading-7 text-zinc-600">운영진이 가입을 승인했어요. 원래 보려던 크루나 행사로 이어갈게요.</p><Button onClick={finish} className="mt-2 min-h-14 w-full rounded-2xl border-[#162660] bg-[#162660] hover:bg-[#243878]">크루로 계속하기</Button></> : <>
                        <p className="my-5 text-sm leading-7 text-zinc-600">{status === 'PENDING' ? '크루 운영진이 확인하면 알림으로 알려드려요. 기다리는 동안 공개 행사를 살펴볼 수 있어요.' : '자세한 내용은 크루 운영진에게 문의해 주세요. 다시 신청하려면 새 초대가 필요해요.'}</p>
                        <Button onClick={() => void load()} disabled={busy} className="min-h-12 w-full rounded-2xl border-[#162660] bg-[#162660] hover:bg-[#243878]">승인 상태 새로고침</Button>
                        <button type="button" onClick={onEvents} className="mt-3 min-h-12 w-full text-sm font-bold underline">행사 둘러보기</button>
                    </>}
                    {error && <p role="alert" className="mt-4 text-sm leading-6 text-red-700">{error}</p>}
                </>}
            </section>
        </div>
    </main>;
}
