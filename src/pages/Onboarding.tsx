import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, Flag, UsersRound } from 'lucide-react';
import { Button } from '../components/Button';
import { CrewInvitationPanel } from '../components/onboarding/CrewInvitationPanel';
import { getUserInfo } from '../services/user';
import { getMyApplications } from '../services/crew';
import { getCrewAdminData, type AdminCrew } from '../services/crewAdmin';
import { listOrganizerGroups } from '../services/organizerGroup';
import { getCrewInvitationIntent, clearCrewInvitationIntent } from '../lib/onboardingIntent';
import type { MyApplication, UserDetail } from '../types/api';
import { isCrewCaptainRole } from '../constants/crewRole';
interface Props { onBack: () => void; onSearch: () => void; onCreate: () => void; onCrew: (eventId?: number) => void; onEvents: () => void; onFirstEvent: (hasGroup: boolean) => void; }
export default function Onboarding({ onBack, onSearch, onCreate, onCrew, onEvents, onFirstEvent }: Props) {
    const loadRevision = useRef(0);
    const [user, setUser] = useState<UserDetail | null>(null);
    const [requests, setRequests] = useState<AdminCrew[]>([]);
    const [applications, setApplications] = useState<MyApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const load = useCallback(async () => {
        const revision = ++loadRevision.current;
        setLoading(true); setError('');
        try { const [person, mine, crewRequests] = await Promise.all([getUserInfo(), getMyApplications(), getCrewAdminData(true)]); if (revision !== loadRevision.current) return; setUser(person); setApplications(mine); setRequests(crewRequests.crews); }
        catch { if (revision === loadRevision.current) setError('진행 상태를 불러오지 못했습니다. 다시 시도해 주세요.'); }
        finally { if (revision === loadRevision.current) setLoading(false); }
    }, []);
    useEffect(() => { void load(); const refresh = () => { void load(); }; window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh); }, [load]);
    const continueToCrew = () => { const intent = getCrewInvitationIntent(); const eventId = intent?.receipt?.accountId === String(user?.userId) && intent?.receipt?.crewId === user?.crew?.crewId ? intent?.eventId : undefined; clearCrewInvitationIntent(); onCrew(eventId); };
    const firstEvent = async () => { setBusy(true); setError(''); try { onFirstEvent((await listOrganizerGroups()).length > 0); } catch { setError('행사 준비 상태를 확인하지 못했습니다. 다시 시도해 주세요.'); } finally { setBusy(false); } };
    const pendingRequest = requests.find(item => item.approvalStatus === 'PENDING');
    return <main className="min-h-0 flex-1 overflow-y-auto bg-[#FAF8F3] p-4 text-[#162660] sm:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
            <button type="button" onClick={onBack} className="flex min-h-11 items-center gap-2 text-sm font-bold"><ArrowLeft className="h-4 w-4" />홈으로</button>
            <div><p className="text-sm font-bold">BoardBuddy 시작하기</p><h1 className="mt-3 text-2xl font-black sm:text-3xl">{user?.crew ? `${user.crew.crewName}, 함께할 준비가 됐어요.` : '어떻게 함께할까요?'}</h1><p className="mt-3 text-sm leading-7 text-zinc-600">가입 정보는 한 번만 확인하고, 다음 할 일을 이어서 안내할게요.</p></div>
            {loading ? <p role="status" className="py-8 text-sm text-zinc-600">내 진행 상태를 확인하고 있어요.</p> : error && !user ? <p role="alert" className="text-sm text-red-700">{error}<button type="button" onClick={() => void load()} className="ml-2 min-h-11 underline">다시 시도</button></p> : user?.crew ? <>
                <section className="rounded-3xl bg-white p-6 shadow-sm"><CheckCircle2 className="mb-4 h-8 w-8" /><h2 className="text-xl font-black">크루 연결 완료</h2><p className="my-4 text-sm leading-6 text-zinc-600">별도로 크루를 만들거나 연결할 필요 없이 바로 시작할 수 있어요.</p><Button onClick={continueToCrew} className="min-h-12 rounded-2xl border-[#162660] bg-[#162660] hover:bg-[#243878]">크루로 계속하기</Button></section>
                {isCrewCaptainRole(user.role) && <>
                    <CrewInvitationPanel crewId={user.crew.crewId} />
                    <section className="rounded-3xl bg-white p-6 shadow-sm"><Flag className="mb-4 h-7 w-7" /><h2 className="text-xl font-black">첫 행사 준비하기</h2><p className="my-4 text-sm leading-7 text-zinc-600">행사 주최 그룹을 먼저 확인해요. 그룹이 없다면 만들기부터 안내할게요. 이후 행사와 필수 동의 항목을 설정할 수 있어요.</p><Button onClick={() => void firstEvent()} disabled={busy} className="min-h-12 rounded-2xl border-[#162660] bg-[#162660] hover:bg-[#243878]">{busy ? '확인 중...' : '첫 행사 준비하기'}</Button></section>
                </>}
            </> : <>
                {pendingRequest ? <section className="rounded-3xl bg-white p-6 shadow-sm"><Clock3 className="mb-4 h-8 w-8" /><h2 className="text-xl font-black">{pendingRequest.name} 생성 요청을 확인 중이에요.</h2><ol className="mt-5 space-y-3 text-sm leading-6"><li>✓ 생성 요청 접수</li><li className="font-bold">2. 관리자 검토 중</li><li className="text-zinc-500">3. 승인 후 회장 계정 자동 연결</li></ol><p className="mt-4 text-sm leading-7 text-zinc-600">승인되면 여기에서 부원을 초대하고 첫 행사를 준비할 수 있어요.</p><Button onClick={() => void load()} className="mt-5 min-h-12 rounded-2xl border-[#162660] bg-[#162660] hover:bg-[#243878]">승인 상태 새로고침</Button><details className="mt-5 rounded-2xl bg-[#FAF8F3] p-4 text-sm"><summary className="min-h-11 font-bold">승인 후 할 일 미리보기</summary><ol className="space-y-3 text-zinc-600"><li>만료 기간을 정해 부원 초대 링크·QR 만들기</li><li>가입 신청을 확인하고 부원 승인하기</li><li>주최 그룹을 만들고 첫 행사 구성하기</li></ol></details></section> : <div className="grid gap-4 sm:grid-cols-2">
                    <section className="rounded-3xl bg-white p-6 shadow-sm"><UsersRound className="mb-4 h-8 w-8" /><h2 className="text-lg font-black">동아리에 가입할게요</h2><p className="my-4 text-sm leading-7 text-zinc-600">초대 링크가 있다면 링크에서 바로 이어가세요. 링크가 없다면 크루를 검색할 수 있어요.</p><Button onClick={onSearch} className="min-h-12 w-full rounded-2xl border-[#162660] bg-[#162660] hover:bg-[#243878]">내 크루 찾기</Button></section>
                    <section className="rounded-3xl bg-white p-6 shadow-sm"><Flag className="mb-4 h-8 w-8" /><h2 className="text-lg font-black">우리 동아리를 운영할게요</h2><p className="my-4 text-sm leading-7 text-zinc-600">기존 크루가 있는지 먼저 확인해 주세요. 새 크루는 관리자 승인 후 운영을 시작할 수 있어요.</p><button type="button" onClick={onSearch} className="mb-3 min-h-11 text-sm font-bold underline">기존 크루 먼저 찾기</button><Button onClick={onCreate} className="min-h-12 w-full rounded-2xl border-[#162660] bg-[#162660] hover:bg-[#243878]">새 크루 생성 요청</Button></section>
                </div>}
                {applications.length > 0 && <section className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-lg font-black">내 가입 신청 · 3 / 3</h2><div className="mt-4 space-y-3">{applications.map(item => <div key={item.application_id} className="flex flex-wrap justify-between gap-2 border-b border-zinc-100 py-3 text-sm"><span className="font-bold">{item.crew_name}</span><span className="text-zinc-600">{item.status === 'PENDING' ? '운영진 승인 대기' : item.status === 'APPROVED' ? '승인 완료' : item.status === 'REJECTED' ? '반려됨' : '취소됨'}</span></div>)}</div><button type="button" onClick={() => void load()} className="mt-3 min-h-11 text-sm font-bold underline">가입 상태 새로고침</button></section>}
                <button type="button" onClick={onEvents} className="min-h-12 text-sm font-bold underline">기다리는 동안 행사 둘러보기</button>
            </>}
            {error && user && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </div>
    </main>;
}
