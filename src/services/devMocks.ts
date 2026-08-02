import {
    OrganizerGroup,
    OrganizerGroupCrew,
    OrganizerGroupInvitation,
    OrganizerGroupMembership,
    ParticipantStatus,
    PaymentStatus,
    Event,
    EventChatAccess,
    EventPaymentPolicy,
    EventParticipant,
    ConsentItem,
    ConsentResponseInput,
    ParticipantConsentState,
    UserDetail,
} from '../types/api';
import { getDevCrewOverride, getDevEventDataMode, getDevRoleOverride, hasDevOverride } from '../lib/session';
import type { CreateEventPayload, UpdateEventPayload } from './event';

const now = () => new Date().toISOString();

const DEV_PARTIES_KEY = 'dev_parties_list';
const DEV_SAMPLE_EVENTS_KEY = 'dev_sample_events_list';
const DEV_ONBOARDING_EVENTS_KEY = 'dev_onboarding_events_list';
const DEV_GROUPS_KEY = 'dev_organizer_groups';
const DEV_GROUP_INVITATIONS_KEY = 'dev_group_invitations';
const devChatAccessKey = (eventId: number) => `dev_event_chat_access_${eventId}`;
const devConsentDueKey = (eventId: number) => `dev_event_consent_due_${eventId}`;
const devConsentResponsesKey = (eventId: number) => `dev_event_consent_responses_${eventId}`;

export const isDevMode = hasDevOverride;

export const getDevUser = (): UserDetail => {
    const crewOverride = getDevCrewOverride();
    const roleOverride = getDevRoleOverride();

    return {
        userId: 999,
        name: 'Mock User (Dev Mode)',
        email: 'dev@boardbuddy.com',
        role: roleOverride === 'admin' ? 'ADMIN' : 'MEMBER',
        userType: 'GENERAL',
        universityVerificationStatus: crewOverride === 'has_crew' ? 'VERIFIED' : 'NOT_VERIFIED',
        birthDate: '2000-01-01',
        school: crewOverride === 'has_crew' ? 'Mock University' : 'No University',
        studentId: '202012345',
        gender: 'MALE',
        phoneNumber: '010-1234-5678',
        profileImageUrl: '',
        socialId: 'mock_social',
        socialProvider: 'KAKAO',
        isRegistered: true,
        createdAt: now(),
        updatedAt: now(),
        crew: crewOverride === 'has_crew' ? { crewId: 1, crewName: 'Mock Crew 401' } : null,
    };
};

const normalizeDevEvents = (events: Event[]) => events.map(event => ({
    ...event,
    planningMode: event.planningMode || 'MANAGER_PLANNED',
}));

const sampleEvents = (): Event[] => [
    {
        id: 10001,
        title: '한강 웨이크보드 체험 데이',
        description: '장비 안내와 초보자 세션을 포함한 운영진 진행 행사입니다.',
        activityType: 'WAKE',
        planningMode: 'MANAGER_PLANNED',
        applicationStartsAt: '2026-07-16T18:00:00',
        startsAt: '2026-07-19T10:00:00',
        endsAt: '2026-07-19T16:00:00',
        locationName: '한강 잠원 수상레저',
        locationAddress: '서울 서초구 잠원동',
        capacity: 24,
        crewMemberLimit: 4,
        kusbfAssociated: true,
        joinedCount: 16,
        status: 'OPEN',
        visibilityType: 'CREW_LIMITED',
        joinPolicy: 'APPROVAL_REQUIRED',
        organizerGroupId: 1,
        organizerGroupName: '여름 수상 스포츠 운영진',
        currentUserStatus: 'JOINED',
        createdAt: '2026-07-01T10:00:00',
        updatedAt: '2026-07-01T10:00:00',
    },
    {
        id: 10002,
        title: '소모임#0427',
        description: '참가자가 함께 장소와 활동을 정하는 자율 소모임입니다.',
        activityType: 'OTHER',
        planningMode: 'MEMBER_PLANNED',
        applicationStartsAt: '2026-07-18T12:00:00',
        startsAt: '2026-07-20T14:00:00',
        locationName: '',
        locationAddress: '',
        capacity: 8,
        crewMemberLimit: null,
        kusbfAssociated: true,
        joinedCount: 5,
        status: 'OPEN',
        visibilityType: 'PUBLIC',
        joinPolicy: 'INSTANT',
        organizerGroupId: 1,
        organizerGroupName: '여름 수상 스포츠 운영진',
        currentUserStatus: 'NONE',
        createdAt: '2026-07-03T10:00:00',
        updatedAt: '2026-07-03T10:00:00',
    },
    {
        id: 10003,
        title: '여름 MT 사전 모임',
        description: 'MT 일정과 준비물을 확정하는 크루 공동 행사입니다.',
        activityType: 'MT',
        planningMode: 'MANAGER_PLANNED',
        applicationStartsAt: '2026-07-20T20:00:00',
        startsAt: '2026-07-26T18:30:00',
        endsAt: '2026-07-26T21:00:00',
        locationName: '건대입구 회의실',
        locationAddress: '서울 광진구 능동로',
        capacity: 18,
        crewMemberLimit: 2,
        kusbfAssociated: true,
        joinedCount: 12,
        status: 'OPEN',
        visibilityType: 'CREW_LIMITED',
        joinPolicy: 'INSTANT',
        organizerGroupId: 1,
        organizerGroupName: '여름 수상 스포츠 운영진',
        currentUserStatus: 'PENDING',
        createdAt: '2026-07-05T10:00:00',
        updatedAt: '2026-07-05T10:00:00',
    },
    {
        id: 10004,
        title: '서핑 원데이 클래스',
        description: '정원 마감된 운영진 진행 서핑 클래스입니다.',
        activityType: 'SURF',
        planningMode: 'MANAGER_PLANNED',
        applicationStartsAt: '2026-07-22T20:00:00',
        startsAt: '2026-08-02T09:00:00',
        endsAt: '2026-08-02T17:00:00',
        locationName: '양양 죽도해변',
        locationAddress: '강원특별자치도 양양군 현남면',
        capacity: 12,
        crewMemberLimit: 3,
        kusbfAssociated: true,
        joinedCount: 12,
        status: 'CLOSED',
        visibilityType: 'CREW_LIMITED',
        joinPolicy: 'APPROVAL_REQUIRED',
        organizerGroupId: 1,
        organizerGroupName: '여름 수상 스포츠 운영진',
        currentUserStatus: 'NONE',
        createdAt: '2026-07-06T10:00:00',
        updatedAt: '2026-07-06T10:00:00',
    },
];

const onboardingSimulationEvents = (): Event[] => {
    const startsAt = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
    startsAt.setHours(10, 0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + 6 * 60 * 60 * 1000);
    const paymentDeadlineAt = new Date(startsAt.getTime() - 2 * 24 * 60 * 60 * 1000);
    paymentDeadlineAt.setHours(18, 0, 0, 0);

    return [{
        id: 11001,
        title: '동의서 + 필수 입금 온보딩 체험',
        description: '참가 신청 후 제한시간 내 동의서를 작성하고, 확정 뒤 계좌이체 안내를 확인하는 개발용 시뮬레이션입니다.',
        activityType: 'WAKE',
        planningMode: 'MANAGER_PLANNED',
        applicationStartsAt: null,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        locationName: '가평 수상레저 베이스',
        locationAddress: '경기 가평군 설악면',
        capacity: 12,
        crewMemberLimit: null,
        consentWindowMinutes: 10,
        paymentRequired: true,
        participationFee: 45000,
        paymentCurrency: 'KRW',
        paymentDeadlineAt: paymentDeadlineAt.toISOString(),
        kusbfAssociated: false,
        joinedCount: 7,
        status: 'OPEN',
        visibilityType: 'PUBLIC',
        joinPolicy: 'INSTANT',
        organizerGroupId: 1,
        organizerGroupName: 'BoardBuddy Experience Lab',
        currentUserStatus: 'NONE',
        createdAt: now(),
        updatedAt: now(),
    }];
};

const getDevEventStorageKey = () => {
    const mode = getDevEventDataMode();
    if (mode === 'sample_events') return DEV_SAMPLE_EVENTS_KEY;
    if (mode === 'onboarding_simulation') return DEV_ONBOARDING_EVENTS_KEY;
    return DEV_PARTIES_KEY;
};

export const getDevParties = (): Event[] => {
    const storageKey = getDevEventStorageKey();
    const stored = localStorage.getItem(storageKey);
    if (stored) {
        return normalizeDevEvents(JSON.parse(stored) as Event[]);
    }

    const mode = getDevEventDataMode();
    const defaultParties: Event[] = mode === 'sample_events' ? sampleEvents()
        : mode === 'onboarding_simulation' ? onboardingSimulationEvents()
        : [
        {
            id: 1,
            title: '용평 리조트 주말 카풀 & 보딩 소모임',
            description: '주말 동안 함께 용평에서 카풀하고 보드 타실 분들을 모집합니다.',
            activityType: 'SURF',
            planningMode: 'MANAGER_PLANNED',
            startsAt: '2026-07-01T09:00:00',
            endsAt: '2026-07-01T18:00:00',
            locationName: '용평리조트 핑크슬로프 하단',
            locationAddress: '강원특별자치도 평창군 대관령면 올림픽로 715',
            capacity: 8,
            crewMemberLimit: 3,
            kusbfAssociated: true,
            joinedCount: 3,
            status: 'OPEN',
            visibilityType: 'PUBLIC',
            joinPolicy: 'INSTANT',
            organizerGroupId: 1,
            organizerGroupName: '소모임 운영 샘플 그룹',
            currentUserStatus: 'NONE',
            createdAt: now(),
            updatedAt: now(),
        },
    ];
    saveDevParties(defaultParties);
    return defaultParties;
};

export const saveDevParties = (parties: Event[]) => {
    const storageKey = getDevEventStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(parties));
};

export const getDevEvent = (eventId: number): Event => {
    const found = getDevParties().find((event) => event.id === eventId);
    if (!found) {
        throw new Error('Small gathering not found');
    }
    return found;
};

export const getDevEventChatAccess = (eventId: number): EventChatAccess => {
    const stored = localStorage.getItem(devChatAccessKey(eventId));
    if (stored) return JSON.parse(stored);
    return eventId === 1 || eventId === 10001
        ? {
            chatUrl: 'https://open.kakao.com/o/example',
            chatPasscode: '2468',
            chatInstructions: '프로필 이름을 실명으로 설정해 주세요.',
        }
        : { chatUrl: null, chatPasscode: null, chatInstructions: null };
};

export const updateDevEventChatAccess = (eventId: number, access: EventChatAccess): EventChatAccess => {
    const normalized = access.chatUrl?.trim()
        ? {
            chatUrl: access.chatUrl.trim(),
            chatPasscode: access.chatPasscode?.trim() || null,
            chatInstructions: access.chatInstructions?.trim() || null,
        }
        : { chatUrl: null, chatPasscode: null, chatInstructions: null };
    localStorage.setItem(devChatAccessKey(eventId), JSON.stringify(normalized));
    return normalized;
};

export const createDevEvent = (payload: CreateEventPayload): Event => {
    const list = getDevParties();
    const newEvent: Event = {
        id: Math.floor(Math.random() * 1000) + 10,
        title: payload.title,
        description: payload.description || '',
        activityType: payload.activityType || 'OTHER',
        planningMode: payload.planningMode,
        applicationStartsAt: payload.applicationStartsAt || null,
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
        locationName: payload.locationName || '',
        locationAddress: payload.locationAddress || '',
        capacity: payload.capacity,
        crewMemberLimit: payload.crewMemberLimit,
        kusbfAssociated: payload.kusbfAssociated ?? true,
        joinedCount: 1,
        status: 'DRAFT',
        visibilityType: payload.visibilityType,
        joinPolicy: payload.joinPolicy,
        organizerGroupId: payload.organizerGroupId,
        organizerGroupName: '소모임 운영 샘플 그룹',
        currentUserStatus: 'JOINED',
        createdAt: now(),
        updatedAt: now(),
    };

    list.push(newEvent);
    saveDevParties(list);
    return newEvent;
};

export const updateDevEvent = (eventId: number, payload: UpdateEventPayload): Event => {
    const list = getDevParties();
    const index = list.findIndex((event) => event.id === eventId);
    if (index === -1) {
        throw new Error('Small gathering not found');
    }

    const updated = {
        ...list[index],
        ...payload,
        updatedAt: now(),
    };

    list[index] = updated;
    saveDevParties(list);
    return updated;
};

export const deleteDevEvent = (eventId: number) => {
    saveDevParties(getDevParties().filter((event) => event.id !== eventId));
};

export const setDevEventParticipation = (eventId: number, status: ParticipantStatus): EventParticipant => {
    const list = getDevParties();
    const event = list.find((item) => item.id === eventId);
    let resolvedStatus = status;
    if (event) {
        const wasJoined = event.currentUserStatus === 'JOINED';
        if (status === 'JOINED' && event.consentWindowMinutes && event.currentUserStatus !== 'JOINED') {
            resolvedStatus = 'CONSENT_PENDING';
            const dueAt = new Date(Date.now() + event.consentWindowMinutes * 60 * 1000).toISOString();
            localStorage.setItem(devConsentDueKey(eventId), dueAt);
            localStorage.removeItem(devConsentResponsesKey(eventId));
        }
        const isJoined = resolvedStatus === 'JOINED';
        event.currentUserStatus = resolvedStatus;
        event.joinedCount = Math.max(0, (event.joinedCount || 0) + (isJoined && !wasJoined ? 1 : 0) - (!isJoined && wasJoined ? 1 : 0));
        if (status === 'NONE') {
            localStorage.removeItem(devConsentDueKey(eventId));
            localStorage.removeItem(devConsentResponsesKey(eventId));
        }
        saveDevParties(list);
    }

    return {
        id: Math.floor(Math.random() * 1000) + 500,
        eventId,
        userId: 999,
        userName: 'Mock User (Dev Mode)',
        status: resolvedStatus,
        paymentStatus: resolvedStatus === 'JOINED' && event?.paymentRequired ? 'UNPAID' : null,
        consentDueAt: localStorage.getItem(devConsentDueKey(eventId)),
        createdAt: now(),
    };
};

const onboardingConsentItems = (): ConsentItem[] => [
    {
        id: 21001,
        category: 'RISK_ACKNOWLEDGEMENT',
        title: '수상 레저 활동 위험 고지',
        content: '수상 레저 활동에는 낙상, 충돌, 익수 등의 위험이 있으며 안전요원의 지시와 보호장비 착용 기준을 준수해야 합니다.',
        contentHash: 'a'.repeat(64),
        required: true,
        displayOrder: 0,
        documentVersion: 1,
    },
    {
        id: 21002,
        category: 'PERSONAL_INFORMATION_COLLECTION_USE',
        title: '이벤트 운영 개인정보 수집·이용',
        content: '참가 확인과 안전 연락을 위해 이름과 연락처를 이벤트 종료 후 30일까지 이용합니다. 필수 동의를 거부하면 참가할 수 없습니다.',
        contentHash: 'b'.repeat(64),
        required: true,
        displayOrder: 1,
        documentVersion: 1,
    },
    {
        id: 21003,
        category: 'PHOTO_VIDEO_USE',
        title: '행사 사진·영상 활용',
        content: '행사 기록과 후기 게시를 위한 사진·영상 활용 동의입니다. 동의하지 않아도 참가할 수 있습니다.',
        contentHash: 'c'.repeat(64),
        required: false,
        displayOrder: 2,
        documentVersion: 1,
    },
];

export const getDevEventConsents = (eventId: number): ParticipantConsentState => {
    const event = getDevEvent(eventId);
    const storedResponses = localStorage.getItem(devConsentResponsesKey(eventId));
    return {
        participantStatus: event.currentUserStatus || 'NONE',
        consentDueAt: localStorage.getItem(devConsentDueKey(eventId)),
        consentCompletedAt: storedResponses ? now() : null,
        items: onboardingConsentItems(),
        responses: storedResponses ? JSON.parse(storedResponses) : [],
    };
};

export const submitDevEventConsents = (
    eventId: number,
    responses: ConsentResponseInput[],
): ParticipantConsentState => {
    const items = onboardingConsentItems();
    if (responses.length !== items.length) {
        throw new Error('모든 동의 항목에 응답해 주세요.');
    }
    for (const item of items) {
        const response = responses.find(candidate => candidate.consentItemId === item.id);
        if (!response || response.documentVersion !== item.documentVersion || response.contentHash !== item.contentHash) {
            throw new Error('동의서 버전이 변경되었습니다.');
        }
        if (item.required && !response.agreed) {
            throw new Error('필수 동의 항목에 동의해야 참가할 수 있습니다.');
        }
    }

    const respondedAt = now();
    const savedResponses = responses.map(response => ({ ...response, respondedAt }));
    localStorage.setItem(devConsentResponsesKey(eventId), JSON.stringify(savedResponses));
    localStorage.removeItem(devConsentDueKey(eventId));

    const events = getDevParties();
    const event = events.find(candidate => candidate.id === eventId);
    if (!event) throw new Error('Event not found');
    event.currentUserStatus = 'JOINED';
    event.joinedCount = Math.min(event.capacity, (event.joinedCount || 0) + 1);
    saveDevParties(events);

    return {
        participantStatus: 'JOINED',
        consentDueAt: null,
        consentCompletedAt: respondedAt,
        items,
        responses: savedResponses,
    };
};

export const getDevEventPaymentInfo = (eventId: number): EventPaymentPolicy => {
    const event = getDevEvent(eventId);
    if (event.currentUserStatus !== 'JOINED') {
        throw new Error('확정 참가자만 계좌 정보를 확인할 수 있습니다.');
    }
    return {
        paymentRequired: Boolean(event.paymentRequired),
        participationFee: event.participationFee ?? null,
        paymentCurrency: event.paymentCurrency ?? null,
        bankName: '신한은행',
        bankAccountNumber: '110-123-456789',
        bankAccountHolder: '보드버디 체험팀',
        paymentDeadlineAt: event.paymentDeadlineAt ?? null,
        paymentInstructions: '반드시 참가자 본인 이름으로 입금해 주세요. 입금 확인은 운영진이 수동으로 처리합니다.',
        refundPolicy: '행사 3일 전까지 취소하면 전액 환불되며, 이후에는 장비 예약 비용을 제외하고 환불됩니다.',
    };
};

export const getDevParticipants = (eventId: number): EventParticipant[] => [
    { id: 201, eventId, userId: 10, userName: 'Jake Kim (Simulated Owner)', status: 'JOINED', paymentStatus: 'PAID', managerMemo: '입금자명 확인 완료', createdAt: now() },
    { id: 202, eventId, userId: 11, userName: 'Jane Doe (Simulated Editor)', status: 'JOINED', paymentStatus: 'UNPAID', managerMemo: null, createdAt: now() },
];

export const updateDevParticipantStatus = (eventId: number, userId: number, status: ParticipantStatus): EventParticipant => ({
    id: Math.floor(Math.random() * 1000) + 300,
    eventId,
    userId,
    userName: `User ${userId}`,
    status,
    createdAt: now(),
});

export const updateDevParticipantManagement = (
    eventId: number,
    userId: number,
    paymentStatus: PaymentStatus | null,
    managerMemo: string | null,
): EventParticipant => {
    const participant = getDevParticipants(eventId).find(item => item.userId === userId);
    if (!participant) {
        throw new Error('Participant not found');
    }
    return { ...participant, paymentStatus, managerMemo };
};

export const getDevOrganizerGroups = (): OrganizerGroup[] => {
    const roleOverride = getDevRoleOverride();
    if (roleOverride === 'organizer' || roleOverride === 'admin' || roleOverride === 'viewer') {
        const stored = localStorage.getItem(DEV_GROUPS_KEY);
        if (stored) return JSON.parse(stored);
        const groups = [{ id: 1, name: '소모임 운영 샘플 그룹' }];
        localStorage.setItem(DEV_GROUPS_KEY, JSON.stringify(groups));
        return groups;
    }
    return [];
};

export const createDevOrganizerGroup = (name: string): OrganizerGroup => {
    const groups = getDevOrganizerGroups();
    const group = { id: Math.floor(Math.random() * 1000) + 10, name };
    groups.push(group);
    localStorage.setItem(DEV_GROUPS_KEY, JSON.stringify(groups));
    return group;
};

export const getDevOrganizerGroup = (groupId: number): OrganizerGroup => (
    getDevOrganizerGroups().find(group => group.id === groupId) || { id: groupId, name: '소모임 운영 샘플 그룹' }
);

export const getDevGroupMembers = (groupId: number): OrganizerGroupMembership[] => {
    const key = `dev_group_members_${groupId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
        return JSON.parse(stored);
    }

    const defaultList: OrganizerGroupMembership[] = [
        { id: 101, groupId, userId: 10, crewId: 401, crewName: 'Mock Crew 401', role: 'EVENT_GROUP_OWNER', userName: 'Jake Kim (Simulated Owner)' },
        { id: 102, groupId, userId: 11, crewId: 402, crewName: 'Mock Crew 402', role: 'EVENT_GROUP_MANAGER', userName: 'Jane Doe (Simulated Manager)' },
        { id: 103, groupId, userId: 12, crewId: 402, crewName: 'Mock Crew 402', role: 'EVENT_GROUP_VIEWER', userName: 'Bob Smith (Simulated Viewer)' },
    ];
    localStorage.setItem(key, JSON.stringify(defaultList));
    return defaultList;
};

const addDevGroupMember = (
    groupId: number,
    userId: number,
    role: OrganizerGroupMembership['role'],
): OrganizerGroupMembership => {
    const key = `dev_group_members_${groupId}`;
    const list = getDevGroupMembers(groupId);
    const newMember: OrganizerGroupMembership = {
        id: Math.floor(Math.random() * 1000) + 200,
        groupId,
        userId,
        crewId: userId + 1000,
        crewName: `Mock Crew ${userId + 1000}`,
        role,
        userName: `User ${userId} (Simulated ${role})`,
    };

    if (!list.some((member) => member.userId === userId)) {
        list.push(newMember);
        localStorage.setItem(key, JSON.stringify(list));
    }
    return newMember;
};

export const deleteDevGroupMember = (groupId: number, userId: number) => {
    const key = `dev_group_members_${groupId}`;
    localStorage.setItem(key, JSON.stringify(getDevGroupMembers(groupId).filter((member) => member.userId !== userId)));
};

const getAllDevInvitations = (): OrganizerGroupInvitation[] => {
    const stored = localStorage.getItem(DEV_GROUP_INVITATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
};

const saveDevInvitations = (invitations: OrganizerGroupInvitation[]) => {
    localStorage.setItem(DEV_GROUP_INVITATIONS_KEY, JSON.stringify(invitations));
};

export const getDevGroupCrews = (groupId: number): OrganizerGroupCrew[] => {
    const seen = new Set<number>();
    return getDevGroupMembers(groupId)
        .filter(member => member.crewId != null && !seen.has(member.crewId) && seen.add(member.crewId))
        .map(member => ({ id: member.crewId!, crewId: member.crewId!, crewName: member.crewName || `Crew ${member.crewId}` }));
};

export const inviteDevCrewManager = (
    groupId: number,
    userId: number,
    role: 'EVENT_GROUP_MANAGER' | 'EVENT_GROUP_VIEWER',
): OrganizerGroupInvitation => {
    const invitation: OrganizerGroupInvitation = {
        id: Math.floor(Math.random() * 1000) + 500,
        groupId,
        groupName: getDevOrganizerGroup(groupId).name,
        invitedAccountId: userId,
        invitedCrewId: userId + 1000,
        invitedCrewName: `Mock Crew ${userId + 1000}`,
        invitedByAccountId: 999,
        proposedRole: role,
        status: 'PENDING',
        createdAt: now(),
    };
    const invitations = getAllDevInvitations();
    invitations.push(invitation);
    saveDevInvitations(invitations);
    return invitation;
};

export const getDevGroupInvitations = (groupId: number): OrganizerGroupInvitation[] => (
    getAllDevInvitations().filter(invitation => invitation.groupId === groupId)
);

export const getDevMyInvitations = (): OrganizerGroupInvitation[] => (
    getAllDevInvitations().filter(invitation => invitation.invitedAccountId === 999 && invitation.status === 'PENDING')
);

export const acceptDevGroupInvitation = (invitationId: number): OrganizerGroupMembership => {
    const invitations = getAllDevInvitations();
    const invitation = invitations.find(item => item.id === invitationId);
    if (!invitation) throw new Error('Invitation not found');
    invitation.status = 'ACCEPTED';
    saveDevInvitations(invitations);
    return addDevGroupMember(invitation.groupId, invitation.invitedAccountId, invitation.proposedRole);
};

export const declineDevGroupInvitation = (invitationId: number) => {
    const invitations = getAllDevInvitations();
    const invitation = invitations.find(item => item.id === invitationId);
    if (invitation) invitation.status = 'DECLINED';
    saveDevInvitations(invitations);
};

export const revokeDevGroupInvitation = (invitationId: number) => {
    const invitations = getAllDevInvitations();
    const invitation = invitations.find(item => item.id === invitationId);
    if (invitation) invitation.status = 'REVOKED';
    saveDevInvitations(invitations);
};
