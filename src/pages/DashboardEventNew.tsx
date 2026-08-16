import { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { configureEventConsents, createEvent } from '../services/event';
import { listOrganizerGroups } from '../services/organizerGroup';
import { ConsentConfigurationInput, JoinPolicy, OrganizerGroup, EventPlanningMode, VisibilityType } from '../types/api';
import { PlanningModeSelector } from '../components/event/PlanningModeSelector';
import { EventActivityType } from '../constants/eventActivity';
import { ActivityTypeSelector } from '../components/event/ActivityTypeSelector';
import { ChevronLeft, Save, HelpCircle } from 'lucide-react';
import { getApiErrorMessage, getApiErrorStatus } from '../lib/apiError';
import { EventConsentEditor } from '../components/event/EventConsentEditor';
import { joinPolicyLabel, visibilityTypeLabel } from '../constants/displayLabels';

interface DashboardEventNewProps {
    onBack: () => void;
    onSuccess: (eventId: number) => void;
}

const createAnonymousEventTitle = () => `이벤트#${String(Math.floor(Math.random() * 10_000)).padStart(4, '0')}`;

export default function DashboardEventNew({ onBack, onSuccess }: DashboardEventNewProps) {
    const [groups, setGroups] = useState<OrganizerGroup[]>([]);
    const [groupsLoading, setGroupsLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);

    // Form states
    const [title, setTitle] = useState('');
    const [anonymousEvent, setAnonymousEvent] = useState(false);
    const [description, setDescription] = useState('');
    const [activityType, setActivityType] = useState<EventActivityType>('OTHER');
    const [planningMode, setPlanningMode] = useState<EventPlanningMode>('MANAGER_PLANNED');
    const [applicationStartsAt, setApplicationStartsAt] = useState('');
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [locationName, setLocationName] = useState('');
    const [locationAddress, setLocationAddress] = useState('');
    const [capacity, setCapacity] = useState<number>(15);
    const [crewMemberLimitEnabled, setCrewMemberLimitEnabled] = useState(false);
    const [crewMemberLimit, setCrewMemberLimit] = useState<number>(3);
    const [kusbfAssociated, setKusbfAssociated] = useState(true);
    const [visibilityType, setVisibilityType] = useState<VisibilityType>('PUBLIC');
    const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>('INSTANT');
    const [organizerGroupId, setOrganizerGroupId] = useState<number | ''>('');
    const [consentConfiguration, setConsentConfiguration] = useState<ConsentConfigurationInput>({
        consentWindowMinutes: null,
        items: [],
    });

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                setGroupsLoading(true);
                const list = await listOrganizerGroups();
                setGroups(list);
                if (list.length > 0) {
                    setOrganizerGroupId(list[0].id);
                }
            } catch (error) {
                console.error('Failed to fetch organizer groups:', error);
            } finally {
                setGroupsLoading(false);
            }
        };
        fetchGroups();
    }, []);

    const handlePlanningModeChange = (mode: EventPlanningMode) => {
        setPlanningMode(mode);
        if (mode === 'MEMBER_PLANNED') {
            const anonymousTitle = createAnonymousEventTitle();
            setAnonymousEvent(true);
            setTitle(anonymousTitle);
        } else {
            if (anonymousEvent) {
                setTitle('');
            }
            setAnonymousEvent(false);
        }
    };

    const handleAnonymousEventChange = (enabled: boolean) => {
        setAnonymousEvent(enabled);
        if (enabled) {
            setTitle(createAnonymousEventTitle());
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) return alert('제목을 입력하세요.');
        if (!startsAt) return alert('시작 일시를 설정하세요.');
        if (applicationStartsAt && new Date(applicationStartsAt) >= new Date(startsAt)) {
            return alert('신청 시작 일시는 모임 시작 일시보다 빨라야 합니다.');
        }
        if (capacity < 1) return alert('모집인원은 최소 1명 이상이어야 합니다.');
        if ((visibilityType === 'PUBLIC' || visibilityType === 'CREW_LIMITED')
            && crewMemberLimitEnabled
            && (crewMemberLimit < 1 || crewMemberLimit > capacity)) {
            return alert('크루별 참가 인원은 1명 이상, 전체 정원 이하여야 합니다.');
        }
        if (!organizerGroupId) return alert('호스트 그룹을 선택해 주세요.');

        // Format dates correctly (backend requires LocalDateTime format like YYYY-MM-DDTHH:MM:SS)
        // input datetime-local returns YYYY-MM-DDTHH:MM. We need to add :00 seconds
        const formattedStartsAt = startsAt.includes(':') && startsAt.split(':').length === 2 ? `${startsAt}:00` : startsAt;
        const formattedEndsAt = endsAt && endsAt.includes(':') && endsAt.split(':').length === 2 ? `${endsAt}:00` : endsAt;
        const formattedApplicationStartsAt = applicationStartsAt && applicationStartsAt.includes(':') && applicationStartsAt.split(':').length === 2
            ? `${applicationStartsAt}:00`
            : applicationStartsAt;

        try {
            setSubmitLoading(true);
            const payload = {
                title,
                description: description || undefined,
                activityType,
                planningMode,
                applicationStartsAt: formattedApplicationStartsAt || null,
                startsAt: formattedStartsAt,
                endsAt: formattedEndsAt || undefined,
                locationName: locationName.trim() || undefined,
                locationAddress: locationAddress.trim() || undefined,
                capacity,
                crewMemberLimit: (visibilityType === 'PUBLIC' || visibilityType === 'CREW_LIMITED') && crewMemberLimitEnabled
                    ? crewMemberLimit
                    : null,
                kusbfAssociated,
                visibilityType,
                joinPolicy,
                organizerGroupId: Number(organizerGroupId)
            };

            const newEvent = await createEvent(payload);
            await configureEventConsents(newEvent.id, consentConfiguration);
            alert('이벤트가 DRAFT 상태로 정상 개설되었습니다. 등록을 진행하려면 목록이나 상세조회에서 "오픈"을 클릭하세요.');
            onSuccess(newEvent.id);
        } catch (error: unknown) {
            console.error('Failed to create event:', error);
            const apiMessage = getApiErrorMessage(error);
            if (getApiErrorStatus(error) === 403) {
                alert('이 이벤트를 관리할 권한이 없습니다.');
            } else if (apiMessage) {
                alert(apiMessage);
            } else {
                alert('이벤트 등록에 실패했습니다.');
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
                    <h1 className="text-lg font-bold text-zinc-900">새 이벤트 만들기</h1>
                </div>
                <div></div>
            </header>

            {/* Form */}
            <main className="flex-1 overflow-y-auto p-6 max-w-3xl w-full mx-auto">
                {groupsLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#162660] mb-3"></div>
                        <p className="text-sm">권한을 조회하는 중...</p>
                    </div>
                ) : groups.length === 0 ? (
                    <div className="bg-white rounded-3xl p-10 border border-zinc-100 text-center text-zinc-500 shadow-sm">
                        <HelpCircle className="w-12 h-12 stroke-[1.5] text-zinc-300 mx-auto mb-2" />
                        <h3 className="text-base font-bold text-zinc-900">호스트 권한이 없습니다</h3>
                        <p className="text-xs mt-1 leading-relaxed">
                            이벤트를 생성하려면 호스트 그룹에서 OWNER 또는 MANAGER 역할을 받아야 합니다.
                        </p>
                        <Button variant="primary" onClick={onBack} className="rounded-full mt-4">
                            돌아가기
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm space-y-6">
                        <PlanningModeSelector value={planningMode} onChange={handlePlanningModeChange} />
                        {/* Organizer Group Selection */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">호스트 그룹 *</label>
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
                            <div className="flex items-center justify-between gap-3">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">이벤트 제목 *</label>
                                {planningMode === 'MEMBER_PLANNED' && (
                                    <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-zinc-600">
                                        <input
                                            type="checkbox"
                                            checked={anonymousEvent}
                                            onChange={event => handleAnonymousEventChange(event.target.checked)}
                                            className="h-4 w-4 accent-[#162660]"
                                        />
                                        자동 제목 사용
                                    </label>
                                )}
                            </div>
                            <input
                                type="text"
                                placeholder={anonymousEvent ? '이벤트#0000' : '예: Summer Beach Skate & Surf'}
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                readOnly={anonymousEvent}
                                className={`w-full px-4 py-2.5 border rounded-2xl text-sm text-zinc-800 ${anonymousEvent
                                    ? 'cursor-default border-zinc-200 bg-zinc-50'
                                    : 'bg-white border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#162660]/20'}`}
                                required
                            />
                        </div>

                        {/* Activity Type */}
                        <div className="grid grid-cols-2 gap-4">
                            <ActivityTypeSelector value={activityType} onChange={setActivityType} />

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">모집 인원 (정원) *</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={capacity}
                                    onChange={e => setCapacity(Number(e.target.value))}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                                    required
                                />
                            </div>
                        </div>

                        {(visibilityType === 'PUBLIC' || visibilityType === 'CREW_LIMITED') && (
                            <div className="border border-zinc-200 rounded-2xl p-4 space-y-3">
                                <label className="flex items-center justify-between gap-4 cursor-pointer">
                                    <span>
                                        <span className="block text-sm font-bold text-zinc-800">크루별 참가 인원 제한</span>
                                        <span className="block text-xs text-zinc-500 mt-1">설정하지 않으면 전체 정원만 적용됩니다.</span>
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={crewMemberLimitEnabled}
                                        onChange={e => setCrewMemberLimitEnabled(e.target.checked)}
                                        className="h-5 w-5 accent-[#162660]"
                                    />
                                </label>
                                {crewMemberLimitEnabled && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">크루당 최대 인원</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={capacity}
                                            value={crewMemberLimit}
                                            onChange={e => setCrewMemberLimit(Number(e.target.value))}
                                            className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                                            required
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Description */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">상세 설명</label>
                            <textarea
                                rows={4}
                                placeholder="모임의 규칙, 세부 일정, 준비물 등을 설명해주세요."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                            />
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">신청 시작 일시</label>
                                <input
                                    type="datetime-local"
                                    value={applicationStartsAt}
                                    max={startsAt || undefined}
                                    onChange={e => setApplicationStartsAt(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                                />
                            </div>
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
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">모임 장소명 (선택)</label>
                                <input
                                    type="text"
                                    placeholder={planningMode === 'MEMBER_PLANNED' ? '참가자와 추후 협의 가능' : '예: Zushi Beach Surf Shack'}
                                    value={locationName}
                                    onChange={e => setLocationName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">장소 상세 주소</label>
                                <input
                                    type="text"
                                    placeholder="예: 100 Coastline Drive"
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
                                    <option value="KUSBF">KUSBF 연계 이벤트</option>
                                    <option value="GENERAL">일반 이벤트</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">공개 설정</label>
                                <select
                                    value={visibilityType}
                                    onChange={e => setVisibilityType(e.target.value as VisibilityType)}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                                >
                                    {(['PUBLIC', 'CREW_LIMITED', 'INVITE_ONLY', 'LINK_ONLY'] as const).map(value => (
                                        <option key={value} value={value}>{visibilityTypeLabel[value]}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5 col-span-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">참가 신청 정책</label>
                                <select
                                    value={joinPolicy}
                                    onChange={e => setJoinPolicy(e.target.value as JoinPolicy)}
                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20 text-zinc-800"
                                >
                                    {(['INSTANT', 'APPROVAL_REQUIRED', 'INVITE_ONLY'] as const).map(value => (
                                        <option key={value} value={value}>{joinPolicyLabel[value]}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Crew access is inherited from the organizer group. */}
                        {visibilityType === 'CREW_LIMITED' && (
                            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-sm text-blue-800">
                                선택한 호스트 그룹에 참여 중인 크루만 자동으로 참가할 수 있습니다.
                            </div>
                        )}

                        <EventConsentEditor value={consentConfiguration} onChange={setConsentConfiguration} />

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
                                {submitLoading ? '생성 중...' : 'DRAFT 저장하기'}
                            </Button>
                        </div>
                    </form>
                )}
            </main>
        </div>
    );
}
