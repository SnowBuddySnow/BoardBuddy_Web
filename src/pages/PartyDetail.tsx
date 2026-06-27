import { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { getParty, joinParty, cancelParty } from '../services/party';
import { Party } from '../types/api';
import { ChevronLeft, Calendar, MapPin, Users, Info, CheckCircle } from 'lucide-react';
import { getApiErrorMessage, getApiErrorStatus } from '../lib/apiError';

interface PartyDetailProps {
    partyId: number;
    onBack: () => void;
}

export default function PartyDetail({ partyId, onBack }: PartyDetailProps) {
    const [party, setParty] = useState<Party | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchPartyDetail = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);
            const data = await getParty(partyId);
            setParty(data);
        } catch (error: unknown) {
            console.error('Failed to fetch party detail:', error);
            if (getApiErrorStatus(error) === 403) {
                setErrorMsg('이 소모임을 볼 권한이 없습니다.');
            } else if (getApiErrorStatus(error) === 404) {
                setErrorMsg('소모임을 찾을 수 없거나 현재 이용할 수 없습니다.');
            } else {
                setErrorMsg('이벤트를 불러오는 도중 오류가 발생했습니다.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPartyDetail();
    }, [partyId]);

    const handleJoinAction = async () => {
        if (!party) return;
        try {
            setActionLoading(true);
            await joinParty(party.id);
            alert(party.joinPolicy === 'APPROVAL_REQUIRED' ? '참여 신청이 대기 상태로 접수되었습니다.' : '성공적으로 참가했습니다!');
            await fetchPartyDetail(); // Refresh
        } catch (error: unknown) {
            console.error('Failed to join:', error);
            const apiMessage = getApiErrorMessage(error);
            if (getApiErrorStatus(error) === 403) {
                alert('이 소모임에 참여할 권한이 없습니다.');
            } else if (apiMessage) {
                alert(apiMessage);
            } else {
                alert('참가 신청에 실패했습니다.');
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelAction = async () => {
        if (!party) return;
        const confirmCancel = window.confirm('정말 참여를 취소하시겠습니까?');
        if (!confirmCancel) return;

        try {
            setActionLoading(true);
            await cancelParty(party.id);
            alert('참여 신청이 취소되었습니다.');
            await fetchPartyDetail(); // Refresh
        } catch (error: unknown) {
            console.error('Failed to cancel:', error);
            const apiMessage = getApiErrorMessage(error);
            if (apiMessage) {
                alert(apiMessage);
            } else {
                alert('참여 취소에 실패했습니다.');
            }
        } finally {
            setActionLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const options: Intl.DateTimeFormatOptions = {
            month: 'long',
            day: 'numeric',
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };
        return d.toLocaleDateString('ko-KR', options);
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col h-full bg-[#FAF8F3] items-center justify-center text-zinc-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#162660] mb-3"></div>
                <p className="text-sm font-medium">로딩 중...</p>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="flex-1 flex flex-col h-full bg-[#FAF8F3] items-center justify-center p-6 text-center text-zinc-500">
                <Info className="w-12 h-12 stroke-[1.5] mb-3 text-red-400" />
                <p className="text-base font-bold text-zinc-900 mb-2">{errorMsg}</p>
                <Button variant="primary" onClick={onBack} className="rounded-full px-6">
                    돌아가기
                </Button>
            </div>
        );
    }

    if (!party) return null;

    const isClosed = party.status === 'CLOSED' || party.status === 'CANCELLED';
    const isFull = party.capacity <= (party.joinedCount || 0);
    const hasJoined = party.currentUserStatus === 'JOINED';
    const isPending = party.currentUserStatus === 'PENDING';

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FAF8F3] relative">
            {/* Header */}
            <header className="absolute top-0 left-0 right-0 h-14 z-20 px-4 flex items-center justify-between bg-transparent">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="p-2 bg-white/95 dark:bg-zinc-900/95 shadow-sm rounded-full text-zinc-800 shrink-0"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <div></div>
                <div></div>
            </header>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto pb-[130px]">
                {/* Hero / Cover Visual Panel */}
                <div className="w-full h-44 bg-gradient-to-br from-[#162660] via-[#1e3a8a] to-[#2563eb] relative flex items-end p-5">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="z-10 flex flex-col gap-1.5">
                        <span className="text-[10px] uppercase font-black text-blue-200 tracking-widest px-3 py-1 bg-white/10 backdrop-blur-md rounded-full w-max">
                            {party.activityType}
                        </span>
                        <h1 className="text-xl font-bold text-white leading-tight">
                            {party.title}
                        </h1>
                    </div>
                </div>

                {/* Details Section */}
                <div className="p-5 space-y-6">
                    {/* Location & Time Info */}
                    <div className="bg-white rounded-3xl p-5 border border-zinc-100 shadow-sm space-y-4">
                        <div className="flex items-start gap-3.5">
                            <Calendar className="w-5 h-5 text-[#162660] shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-xs text-zinc-400 font-bold uppercase tracking-wider">언제 하나요</h3>
                                <p className="text-sm font-bold text-zinc-800 mt-1">{formatDate(party.startsAt)}</p>
                                {party.endsAt && (
                                    <p className="text-xs text-zinc-500 mt-0.5">~ {formatDate(party.endsAt)}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-3.5 border-t border-zinc-50 pt-4">
                            <MapPin className="w-5 h-5 text-[#162660] shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-xs text-zinc-400 font-bold uppercase tracking-wider">어디서 만나나요</h3>
                                <p className="text-sm font-bold text-zinc-800 mt-1">{party.locationName}</p>
                                <p className="text-xs text-zinc-500 mt-0.5">{party.locationAddress}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3.5 border-t border-zinc-50 pt-4">
                            <Users className="w-5 h-5 text-[#162660] shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-xs text-zinc-400 font-bold uppercase tracking-wider">모집 인원</h3>
                                <p className="text-sm font-bold text-zinc-800 mt-1">
                                    {party.joinedCount || 0} / {party.capacity} 명 참여 중
                                </p>
                                <div className="w-full bg-zinc-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div
                                        className="bg-[#162660] h-full rounded-full transition-all duration-300"
                                        style={{ width: `${Math.min(100, ((party.joinedCount || 0) / party.capacity) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Organizer & Policies */}
                    <div className="bg-white rounded-3xl p-5 border border-zinc-100 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-50 pb-2">모임 정보</h3>

                        {party.organizerGroupName && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500 font-medium">주최 그룹</span>
                                <span className="font-bold text-zinc-800">{party.organizerGroupName}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500 font-medium">참가 승인 정책</span>
                            <span className="font-bold text-zinc-800">
                                {party.joinPolicy === 'INSTANT' ? '즉시 승인' : '운영진 승인 필요'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500 font-medium">공개 설정</span>
                            <span className="font-bold text-zinc-800">
                                {party.visibilityType === 'PUBLIC' ? '전체 공개' : '제한 공개'}
                            </span>
                        </div>

                        {party.crewMemberLimit != null && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500 font-medium">크루별 참가 제한</span>
                                <span className="font-bold text-zinc-800">크루당 최대 {party.crewMemberLimit}명</span>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    {party.description && (
                        <div className="bg-white rounded-3xl p-5 border border-zinc-100 shadow-sm space-y-3">
                            <h3 className="text-sm font-bold text-zinc-900">상세 설명</h3>
                            <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
                                {party.description}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-5 py-4 z-10 flex flex-col justify-center">
                {isClosed ? (
                    <Button disabled className="w-full h-12 bg-zinc-300 border-zinc-300 text-zinc-500 rounded-full font-bold">
                        {party.status === 'CANCELLED' ? '취소된 모임' : '마감된 모임'}
                    </Button>
                ) : hasJoined ? (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 py-2 border border-emerald-100 rounded-2xl">
                            <CheckCircle className="w-4 h-4 shrink-0" />
                            <span>이 소모임에 참여 중입니다.</span>
                        </div>
                        <Button
                            variant="danger"
                            onClick={handleCancelAction}
                            disabled={actionLoading}
                            className="w-full h-12 rounded-full font-bold"
                        >
                            참여 취소하기
                        </Button>
                    </div>
                ) : isPending ? (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600 font-bold bg-amber-50 py-2 border border-amber-100 rounded-2xl">
                            <Info className="w-4 h-4 shrink-0" />
                            <span>승인 대기 중입니다.</span>
                        </div>
                        <Button
                            variant="danger"
                            onClick={handleCancelAction}
                            disabled={actionLoading}
                            className="w-full h-12 rounded-full font-bold"
                        >
                            신청 취소하기
                        </Button>
                    </div>
                ) : isFull ? (
                    <Button disabled className="w-full h-12 bg-zinc-300 border-zinc-300 text-zinc-500 rounded-full font-bold">
                        정원이 모두 찼습니다
                    </Button>
                ) : (
                    <Button
                        variant="primary"
                        onClick={handleJoinAction}
                        disabled={actionLoading}
                        className="w-full h-12 bg-[#162660] hover:bg-[#1e3a8a] text-white border-none rounded-full font-bold shadow-md hover:scale-[1.01] transition-all"
                    >
                        {actionLoading ? '신청 중...' : '참여 신청하기'}
                    </Button>
                )}
            </div>
        </div>
    );
}
