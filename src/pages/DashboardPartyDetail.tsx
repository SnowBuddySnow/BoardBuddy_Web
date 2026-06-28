import { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { getPartyDashboard, updateParty, listParticipants, updateParticipantManagement, updateParticipantStatus } from '../services/party';
import { Party, PartyParticipant, PaymentStatus } from '../types/api';
import { ChevronLeft, Play, Power, Clock, Check, Save, X } from 'lucide-react';
import { PlanningModeBadge } from '../components/party/PlanningModeBadge';

interface DashboardPartyDetailProps {
    partyId: number;
    onBack: () => void;
    onEditClick: (partyId: number) => void;
}

export default function DashboardPartyDetail({ partyId, onBack, onEditClick }: DashboardPartyDetailProps) {
    const [party, setParty] = useState<Party | null>(null);
    const [participants, setParticipants] = useState<PartyParticipant[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [participantActionId, setParticipantActionId] = useState<number | null>(null);
    const [participantManagementId, setParticipantManagementId] = useState<number | null>(null);

    const fetchDetailData = async () => {
        try {
            setLoading(true);
            const partyData = await getPartyDashboard(partyId);
            setParty(partyData);

            const partsData = await listParticipants(partyId);
            setParticipants(partsData);
        } catch (error) {
            console.error('Failed to fetch dashboard party detail data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetailData();
    }, [partyId]);

    const handleOpenRegistration = async () => {
        try {
            setActionLoading(true);
            await updateParty(partyId, { status: 'OPEN' });
            alert('소모임이 오픈되었습니다.');
            fetchDetailData();
        } catch (error) {
            console.error('Failed to open registration:', error);
            alert('소모임 오픈에 실패했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCloseRegistration = async () => {
        try {
            setActionLoading(true);
            await updateParty(partyId, { status: 'CLOSED' });
            alert('소모임이 마감되었습니다.');
            fetchDetailData();
        } catch (error) {
            console.error('Failed to close registration:', error);
            alert('소모임 마감에 실패했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleParticipantStatusChange = async (userId: number, targetStatus: 'JOINED' | 'REMOVED' | 'PENDING' | 'CANCELLED') => {
        try {
            setParticipantActionId(userId);
            await updateParticipantStatus(partyId, userId, targetStatus);
            alert('참가자 상태가 정상적으로 변경되었습니다.');
            const partsData = await listParticipants(partyId);
            setParticipants(partsData);
            // Refresh party count as well
            const partyData = await getPartyDashboard(partyId);
            setParty(partyData);
        } catch (error) {
            console.error('Failed to update participant status:', error);
            alert('참가자 상태 변경에 실패했습니다.');
        } finally {
            setParticipantActionId(null);
        }
    };

    const updateParticipantDraft = (participantId: number, updates: Partial<PartyParticipant>) => {
        setParticipants(current => current.map(participant => (
            participant.id === participantId ? { ...participant, ...updates } : participant
        )));
    };

    const handleParticipantManagementSave = async (participant: PartyParticipant) => {
        try {
            setParticipantManagementId(participant.id);
            const updated = await updateParticipantManagement(
                partyId,
                participant.userId,
                participant.paymentStatus ?? null,
                participant.managerMemo?.trim() || null,
            );
            setParticipants(current => current.map(item => item.id === participant.id ? updated : item));
            alert('참가자 관리 정보가 저장되었습니다.');
        } catch (error) {
            console.error('Failed to update participant management details:', error);
            alert('참가자 관리 정보 저장에 실패했습니다.');
        } finally {
            setParticipantManagementId(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const formatCompactDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const pad = (value: number) => String(value).padStart(2, '0');
        return `${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col h-full bg-[#FAF8F3] items-center justify-center text-zinc-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#162660] mb-3"></div>
                <p className="text-sm font-medium">관리 상세 정보를 불러오는 중...</p>
            </div>
        );
    }

    if (!party) return null;

    const isDraft = party.status === 'DRAFT';
    const isOpen = party.status === 'OPEN';

    return (
        <div className="flex-1 flex flex-col h-full bg-[#FAF8F3] overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={onBack} className="-ml-2 gap-1 text-zinc-600 hover:bg-transparent">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-lg font-bold text-zinc-900">{party.title} (관리)</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onEditClick(party.id)}
                        className="rounded-full px-5 font-semibold text-sm"
                    >
                        수정하기
                    </Button>
                    {isDraft && (
                        <Button
                            variant="primary"
                            onClick={handleOpenRegistration}
                            disabled={actionLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-5 font-bold text-sm border-none flex items-center gap-1"
                        >
                            <Play className="w-4 h-4" /> 모집 오픈
                        </Button>
                    )}
                    {isOpen && (
                        <Button
                            variant="secondary"
                            onClick={handleCloseRegistration}
                            disabled={actionLoading}
                            className="bg-zinc-800 text-white hover:bg-black rounded-full px-5 font-bold text-sm border-none flex items-center gap-1"
                        >
                            <Power className="w-4 h-4" /> 모집 마감
                        </Button>
                    )}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 max-w-6xl w-full mx-auto grid grid-cols-3 gap-6">
                {/* Column 1 & 2: Small gathering details & participants */}
                <div className="col-span-2 space-y-6">
                    {/* Basic Info panel */}
                    <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm space-y-4">
                        <h2 className="text-base font-bold text-zinc-900">모임 요약</h2>
                        <PlanningModeBadge mode={party.planningMode} />
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-zinc-400 font-bold block text-xs uppercase">일시</span>
                                <span className="font-bold text-zinc-800 mt-1 block">{formatDate(party.startsAt)}</span>
                            </div>
                            <div>
                                <span className="text-zinc-400 font-bold block text-xs uppercase">모임 장소</span>
                                <span className="font-bold text-zinc-800 mt-1 block">{party.locationName || '참가 멤버와 추후 협의'}</span>
                            </div>
                            <div>
                                <span className="text-zinc-400 font-bold block text-xs uppercase">상태</span>
                                <span className="font-bold mt-1 block">
                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                        party.status === 'DRAFT' ? 'bg-amber-100 text-amber-800' :
                                        party.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' :
                                        'bg-zinc-100 text-zinc-600'
                                    }`}>
                                        {party.status}
                                    </span>
                                </span>
                            </div>
                            <div>
                                <span className="text-zinc-400 font-bold block text-xs uppercase">가입 정책</span>
                                <span className="font-bold text-zinc-800 mt-1 block">{party.joinPolicy}</span>
                            </div>
                        </div>
                    </div>

                    {/* Participant Management panel */}
                    <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-bold text-zinc-900">참가자 목록 ({participants.length})</h2>
                        </div>

                        {participants.length === 0 ? (
                            <div className="text-center py-10 text-zinc-400 text-sm">
                                아직 등록을 원하거나 가입된 멤버가 없습니다.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[680px] text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-zinc-50 text-zinc-400 font-bold text-xs uppercase border-b border-zinc-100">
                                            <th className="px-2 py-3">참가자</th>
                                            <th className="px-2 py-3">Status</th>
                                            <th className="px-2 py-3">신청 일시</th>
                                            <th className="px-2 py-3">입금 상태</th>
                                            <th className="px-2 py-3">관리자 메모</th>
                                            <th className="px-2 py-3 text-right">관리</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-50">
                                        {participants.map(part => {
                                            const isPending = part.status === 'PENDING';
                                            const isJoined = part.status === 'JOINED';
                                            const isDisabled = participantActionId === part.userId;

                                            return (
                                                <tr key={part.id} className="hover:bg-zinc-50/50 transition-colors">
                                                    <td className="px-2 py-3.5 font-bold text-zinc-800 whitespace-nowrap">
                                                        User {part.userId}
                                                    </td>
                                                    <td className="px-2 py-3.5">
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                                                            part.status === 'JOINED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                            part.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse' :
                                                            part.status === 'REMOVED' ? 'bg-red-50 text-red-700 border border-red-100' :
                                                            'bg-zinc-50 text-zinc-500'
                                                        }`}>
                                                            {part.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-3.5 text-zinc-400 text-xs font-semibold whitespace-nowrap">
                                                        {formatCompactDate(part.joinedAt || part.createdAt || '')}
                                                    </td>
                                                    <td className="px-2 py-3.5">
                                                        <select
                                                            value={part.paymentStatus ?? ''}
                                                            onChange={event => updateParticipantDraft(part.id, {
                                                                paymentStatus: (event.target.value || null) as PaymentStatus | null,
                                                            })}
                                                            className="w-24 px-2 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#162660]/20"
                                                            aria-label={`User ${part.userId} 입금 상태`}
                                                        >
                                                            <option value="">미설정</option>
                                                            <option value="UNPAID">미입금</option>
                                                            <option value="PAID">입금 완료</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-2 py-3.5">
                                                        <input
                                                            type="text"
                                                            value={part.managerMemo ?? ''}
                                                            onChange={event => updateParticipantDraft(part.id, { managerMemo: event.target.value })}
                                                            placeholder="운영진만 보는 메모"
                                                            maxLength={1000}
                                                            className="w-36 px-2.5 py-2 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#162660]/20"
                                                            aria-label={`User ${part.userId} 관리자 메모`}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => handleParticipantManagementSave(part)}
                                                                disabled={participantManagementId === part.id}
                                                                className="p-1 text-[#162660] hover:bg-blue-50 rounded-full border border-zinc-200 transition-colors disabled:opacity-50"
                                                                title="입금 상태와 메모 저장"
                                                                aria-label={`User ${part.userId} 관리 정보 저장`}
                                                            >
                                                                <Save className="w-4 h-4" />
                                                            </button>
                                                            {isPending && (
                                                                <button
                                                                    onClick={() => handleParticipantStatusChange(part.userId, 'JOINED')}
                                                                    disabled={isDisabled}
                                                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-full border border-zinc-200 transition-colors"
                                                                    title="멤버 승인"
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {isJoined && (
                                                                <button
                                                                    onClick={() => handleParticipantStatusChange(part.userId, 'REMOVED')}
                                                                    disabled={isDisabled}
                                                                    className="p-1 text-red-500 hover:bg-red-50 rounded-full border border-zinc-200 transition-colors"
                                                                    title="멤버 제외"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {part.status === 'REMOVED' && (
                                                                <button
                                                                    onClick={() => handleParticipantStatusChange(part.userId, 'PENDING')}
                                                                    disabled={isDisabled}
                                                                    className="p-1 text-zinc-400 hover:bg-zinc-100 rounded-full border border-zinc-200 transition-colors"
                                                                    title="승인 대기로 되돌리기"
                                                                >
                                                                    <Clock className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 3: Stats & Setup Panel */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm space-y-4">
                        <h2 className="text-base font-bold text-zinc-900">모집 통계</h2>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500 font-medium">참여율</span>
                                <span className="font-bold text-zinc-800">
                                    {Math.round(((party.joinedCount || 0) / party.capacity) * 100)}%
                                </span>
                            </div>
                            <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-[#162660] h-full rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, ((party.joinedCount || 0) / party.capacity) * 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs text-zinc-400 pt-1">
                                <span>정원: {party.capacity}명</span>
                                <span>확정: {party.joinedCount || 0}명</span>
                            </div>
                            {party.crewMemberLimit != null && (
                                <p className="text-xs font-semibold text-zinc-600 pt-1">크루당 최대 {party.crewMemberLimit}명</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm space-y-4">
                        <h2 className="text-base font-bold text-zinc-900">도움말 / 팁</h2>
                        <ul className="text-xs text-zinc-500 space-y-2 list-disc pl-4 leading-relaxed">
                            <li>생성 직후에는 <strong>DRAFT (초안)</strong> 상태로 저장됩니다. 초안 상태에서는 일반 모바일 멤버가 모임을 볼 수 없습니다.</li>
                            <li><strong>"모집 오픈"</strong> 버튼을 누르면 일반 이용자가 보고 즉시 참가 또는 승인 대기가 가능해집니다.</li>
                            <li>모집 정책이 호스트 승인 필요인 경우, 멤버들이 참가 신청을 보내면 좌측 리스트에 <strong>PENDING</strong> 상태로 나타나게 됩니다. Check(승인) 버튼을 눌러 확정처리 하세요.</li>
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
}
