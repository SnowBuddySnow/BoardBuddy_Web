import {
    OrganizerGroup,
    OrganizerGroupCrew,
    OrganizerGroupInvitation,
    OrganizerGroupMembership,
    ParticipantStatus,
    PaymentStatus,
    Event,
    EventChatAccess,
    EventParticipant,
    UserDetail,
} from '../types/api';
import { getDevCrewOverride, getDevEventDataMode, getDevRoleOverride, hasDevOverride } from '../lib/session';
import type { CreateEventPayload, UpdateEventPayload } from './event';

const now = () => new Date().toISOString();

const DEV_PARTIES_KEY = 'dev_parties_list';
const DEV_SAMPLE_EVENTS_KEY = 'dev_sample_events_list';
const DEV_GROUPS_KEY = 'dev_organizer_groups';
const DEV_GROUP_INVITATIONS_KEY = 'dev_group_invitations';
const devChatAccessKey = (eventId: number) => `dev_event_chat_access_${eventId}`;

export const isDevMode = hasDevOverride;

export const getDevUser = (): UserDetail => {
    const crewOverride = getDevCrewOverride();
    const roleOverride = getDevRoleOverride();

    return {
        userId: 999,
        name: 'Mock User (Dev Mode)',
        email: 'dev@boardbuddy.com',
        role: roleOverride === 'admin' ? 'ADMIN' : 'MEMBER',
        userType: crewOverride === 'has_crew' ? 'KUSBF' : 'GENERAL',
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

export const getDevParties = (): Event[] => {
    const storageKey = getDevEventDataMode() === 'sample_events' ? DEV_SAMPLE_EVENTS_KEY : DEV_PARTIES_KEY;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
        return normalizeDevEvents(JSON.parse(stored) as Event[]);
    }

    const defaultParties: Event[] = getDevEventDataMode() === 'sample_events' ? sampleEvents() : [
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
    const storageKey = getDevEventDataMode() === 'sample_events' ? DEV_SAMPLE_EVENTS_KEY : DEV_PARTIES_KEY;
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
    if (event) {
        const wasJoined = event.currentUserStatus === 'JOINED';
        const isJoined = status === 'JOINED';
        event.currentUserStatus = status;
        event.joinedCount = Math.max(0, (event.joinedCount || 0) + (isJoined && !wasJoined ? 1 : 0) - (!isJoined && wasJoined ? 1 : 0));
        saveDevParties(list);
    }

    return {
        id: Math.floor(Math.random() * 1000) + 500,
        eventId,
        userId: 999,
        userName: 'Mock User (Dev Mode)',
        status,
        createdAt: now(),
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
