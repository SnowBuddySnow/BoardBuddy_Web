import { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { getPartyDashboard, updateParty, listOrganizerGroups } from '../services/party';
import { JoinPolicy, OrganizerGroup, PartyStatus, VisibilityType } from '../types/api';
import { ChevronLeft, Save } from 'lucide-react';
import { getApiErrorMessage, getApiErrorStatus } from '../lib/apiError';

interface DashboardPartyEditProps {
    partyId: number;
    onBack: () => void;
    onSuccess: () => void;
}

export default function DashboardPartyEdit({ partyId, onBack, onSuccess }: DashboardPartyEditProps) {
    const [groups, setGroups] = useState<OrganizerGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);

    // Form states
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [activityType, setActivityType] = useState('SURFING');
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [locationName, setLocationName] = useState('');
    const [locationAddress, setLocationAddress] = useState('');
    const [capacity, setCapacity] = useState<number>(15);
    const [kusbfAssociated, setKusbfAssociated] = useState(true);
    const [visibilityType, setVisibilityType] = useState<VisibilityType>('PUBLIC');
    const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>('INSTANT');
    const [organizerGroupId, setOrganizerGroupId] = useState<number | ''>('');
    const [status, setStatus] = useState<PartyStatus>('DRAFT');

    // Allowed crews input
    const [allowedCrewIdsInput, setAllowedCrewIdsInput] = useState('');

    useEffect(() => {
        const loadInitData = async () => {
            try {
                setLoading(true);
                // 1. Load groups
                const groupsList = await listOrganizerGroups();
                setGroups(groupsList);

                // 2. Load party data
                const partyData = await getPartyDashboard(partyId);
                setTitle(partyData.title);
                setDescription(partyData.description || '');
                setActivityType(partyData.activityType || 'SURFING');

                // Convert ISO startsAt / endsAt to input datetime-local format (YYYY-MM-DDTHH:MM)
                const formatForInput = (isoStr?: string) => {
                    if (!isoStr) return '';
                    const date = new Date(isoStr);
                    const pad = (num: number) => String(num).padStart(2, '0');
                    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
                };

                setStartsAt(formatForInput(partyData.startsAt));
                setEndsAt(formatForInput(partyData.endsAt));
                setLocationName(partyData.locationName || '');
                setLocationAddress(partyData.locationAddress || '');
                setCapacity(partyData.capacity);
                setKusbfAssociated(partyData.kusbfAssociated ?? true);
                setVisibilityType(partyData.visibilityType);
                setJoinPolicy(partyData.joinPolicy);
                setOrganizerGroupId(partyData.organizerGroupId);
                setStatus(partyData.status);
                if (partyData.allowedCrewIds) {
                    setAllowedCrewIdsInput(partyData.allowedCrewIds.join(', '));
                }
            } catch (error) {
                console.error('Failed to load party edit data:', error);
                alert('소모임 정보를 불러오는 도중 오류가 발생했습니다.');
                onBack();
            } finally {
                setLoading(false);
            }
        };
        loadInitData();
    }, [partyId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) return alert('제목을 입력하세요.');
        if (!startsAt) return alert('시작 일시를 설정하세요.');
        if (capacity < 1) return alert('모집인원은 최소 1명 이상이어야 합니다.');
        if (!organizerGroupId) return alert('주최 그룹을 선택해 주세요.');

        // Format dates correctly (LocalDateTime format like YYYY-MM-DDTHH:MM:SS)
        const formattedStartsAt = startsAt.includes(':') && startsAt.split(':').length === 2 ? `${startsAt}:00` : startsAt;
        const formattedEndsAt = endsAt && endsAt.includes(':') && endsAt.split(':').length === 2 ? `${endsAt}:00` : endsAt;

        const allowedCrewIds = allowedCrewIdsInput
            .split(',')
            .map(id => parseInt(id.trim()))
            .filter(id => !isNaN(id));

        try {
            setSubmitLoading(true);
            const payload = {
                title,
                description: description || undefined,
                activityType,
                startsAt: formattedStartsAt,
                endsAt: formattedEndsAt || undefined,
                locationName,
                locationAddress,
                capacity,
                kusbfAssociated,
                visibilityType,
                joinPolicy,
                organizerGroupId: Number(organizerGroupId),
                status,
                allowedCrewIds: allowedCrewIds.length > 0 ? allowedCrewIds : undefined
            };

            await updateParty(partyId, payload);
            alert('소모임 정보가 성공적으로 수정되었습니다.');
            onSuccess();
        } catch (error: unknown) {
            console.error('Failed to update party:', error);
            const apiMessage = getApiErrorMessage(error);
            if (getApiErrorStatus(error) === 403) {
                alert('이 소모임을 관리할 권한이 없습니다.');
            } else if (apiMessage) {
                alert(apiMessage);
            } else {
                alert('소모임 정보 수정에 실패했습니다.');
            }
        } finally {
            setSubmitLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#FAF8F3] overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={onBack} className="-ml-2 gap-1 text-zinc-600 hover:bg-transparent">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-lg font-bold text-zinc-900">소모임 정보 수정</h1>
                </div>
                <div></div>
            </header>

            {/* Form */}
            <main className="flex-1 overflow-y-auto p-6 max-w-3xl w-full mx-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#162660] mb-3"></div>
                        <p className="text-sm">정보를 불러오는 중...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm space-y-6">
                        {/* Organizer Group Selection */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">주최 그룹 *</label>
                            <select
                                value={organizerGroupId}
                                onChange={e => setOrganizerGroupId(Number(e.target.value))}
                                className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                            >
                                {groups.map(group => (
                                    <option key={group.id} value={group.id}>
                                        {group.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Title */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">소모임 제목 *</label>
                            <input
                                type="text"
                                placeholder="예: Summer Beach Skate & Surf"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                                required
                            />
                        </div>

                        {/* Activity Type & Capacity & Status */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">활동 분류</label>
                                <select
                                    value={activityType}
                                    onChange={e => setActivityType(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                                >
                                    <option value="SURFING">SURFING</option>
                                    <option value="SKATE">SKATE</option>
                                    <option value="SNOWBOARDING">SNOWBOARDING</option>
                                    <option value="WAKEBOARDING">WAKEBOARDING</option>
                                    <option value="BEACH_PARTY">BEACH_PARTY</option>
                                    <option value="CAMPING">CAMPING</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">모집 인원 *</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={capacity}
                                    onChange={e => setCapacity(Number(e.target.value))}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">모집 상태</label>
                                <select
                                    value={status}
                                    onChange={e => setStatus(e.target.value as PartyStatus)}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                                >
                                    <option value="DRAFT">Draft (초안)</option>
                                    <option value="OPEN">Open (오픈)</option>
                                    <option value="CLOSED">Closed (마감)</option>
                                    <option value="CANCELLED">Cancelled (취소)</option>
                                </select>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">상세 설명</label>
                            <textarea
                                rows={4}
                                placeholder="모임의 상세 내용"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                            />
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">시작 일시 *</label>
                                <input
                                    type="datetime-local"
                                    value={startsAt}
                                    onChange={e => setStartsAt(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">종료 일시</label>
                                <input
                                    type="datetime-local"
                                    value={endsAt}
                                    onChange={e => setEndsAt(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">장소명 *</label>
                                <input
                                    type="text"
                                    placeholder="장소명"
                                    value={locationName}
                                    onChange={e => setLocationName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">장소 주소</label>
                                <input
                                    type="text"
                                    placeholder="상세 주소"
                                    value={locationAddress}
                                    onChange={e => setLocationAddress(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                                />
                            </div>
                        </div>

                        {/* Visibility and Policy */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">대상 유형</label>
                                <select
                                    value={kusbfAssociated ? 'KUSBF' : 'GENERAL'}
                                    onChange={e => setKusbfAssociated(e.target.value === 'KUSBF')}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                                >
                                    <option value="KUSBF">KUSBF 연계 소모임</option>
                                    <option value="GENERAL">일반 소모임</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">공개 설정</label>
                                <select
                                    value={visibilityType}
                                    onChange={e => setVisibilityType(e.target.value as VisibilityType)}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                                >
                                    <option value="PUBLIC">전체 공개 (PUBLIC)</option>
                                    <option value="CREW_LIMITED">크루 한정 (CREW_LIMITED)</option>
                                    <option value="INVITE_ONLY">초대 링크 전용 (INVITE_ONLY)</option>
                                    <option value="LINK_ONLY">링크 직접 공유 (LINK_ONLY)</option>
                                </select>
                            </div>

                            <div className="space-y-1.5 col-span-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">참가 신청 정책</label>
                                <select
                                    value={joinPolicy}
                                    onChange={e => setJoinPolicy(e.target.value as JoinPolicy)}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                                >
                                    <option value="INSTANT">즉시 가입 승인 (INSTANT)</option>
                                    <option value="APPROVAL_REQUIRED">호스트 승인 필요 (APPROVAL_REQUIRED)</option>
                                    <option value="INVITE_ONLY">초대장 필요 (INVITE_ONLY)</option>
                                </select>
                            </div>
                        </div>

                        {/* Allowed Crews Input */}
                        {visibilityType === 'CREW_LIMITED' && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                    허용 크루 ID 목록 (쉼표로 구분)
                                </label>
                                <input
                                    type="text"
                                    placeholder="예: 1, 2, 5"
                                    value={allowedCrewIdsInput}
                                    onChange={e => setAllowedCrewIdsInput(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 border-t border-zinc-50 pt-6">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onBack}
                                className="rounded-full px-5 text-zinc-500"
                            >
                                취소
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={submitLoading}
                                className="bg-[#162660] hover:bg-[#1e3a8a] text-white border-none rounded-full px-6 font-bold flex items-center gap-1.5 shadow-sm"
                            >
                                <Save className="w-4 h-4" />
                                {submitLoading ? '수정 중...' : '수정 사항 저장'}
                            </Button>
                        </div>
                    </form>
                )}
            </main>
        </div>
    );
}
