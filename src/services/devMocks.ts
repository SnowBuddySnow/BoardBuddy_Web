import {
    OrganizerGroup,
    OrganizerGroupMembership,
    ParticipantStatus,
    Party,
    PartyParticipant,
    UserDetail,
} from '../types/api';
import { getDevCrewOverride, getDevRoleOverride, hasDevOverride } from '../lib/session';
import type { CreatePartyPayload, UpdatePartyPayload } from './party';

const now = () => new Date().toISOString();

const DEV_PARTIES_KEY = 'dev_parties_list';

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

export const getDevParties = (): Party[] => {
    const stored = localStorage.getItem(DEV_PARTIES_KEY);
    if (stored) {
        return JSON.parse(stored);
    }

    const defaultParties: Party[] = [
        {
            id: 1,
            title: '용평 리조트 주말 카풀 & 보딩 소모임',
            description: '주말 동안 함께 용평에서 카풀하고 보드 타실 분들을 모집합니다.',
            activityType: 'SNOWBOARDING',
            startsAt: '2026-07-01T09:00:00',
            endsAt: '2026-07-01T18:00:00',
            locationName: '용평리조트 핑크슬로프 하단',
            locationAddress: '강원특별자치도 평창군 대관령면 올림픽로 715',
            capacity: 8,
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

export const saveDevParties = (parties: Party[]) => {
    localStorage.setItem(DEV_PARTIES_KEY, JSON.stringify(parties));
};

export const getDevParty = (partyId: number): Party => {
    const found = getDevParties().find((party) => party.id === partyId);
    if (!found) {
        throw new Error('Small gathering not found');
    }
    return found;
};

export const createDevParty = (payload: CreatePartyPayload): Party => {
    const list = getDevParties();
    const newParty: Party = {
        id: Math.floor(Math.random() * 1000) + 10,
        title: payload.title,
        description: payload.description || '',
        activityType: payload.activityType || 'SNOWBOARDING',
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
        locationName: payload.locationName || '',
        locationAddress: payload.locationAddress || '',
        capacity: payload.capacity,
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

    list.push(newParty);
    saveDevParties(list);
    return newParty;
};

export const updateDevParty = (partyId: number, payload: UpdatePartyPayload): Party => {
    const list = getDevParties();
    const index = list.findIndex((party) => party.id === partyId);
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

export const deleteDevParty = (partyId: number) => {
    saveDevParties(getDevParties().filter((party) => party.id !== partyId));
};

export const setDevPartyParticipation = (partyId: number, status: ParticipantStatus): PartyParticipant => {
    const list = getDevParties();
    const party = list.find((item) => item.id === partyId);
    if (party) {
        const wasJoined = party.currentUserStatus === 'JOINED';
        const isJoined = status === 'JOINED';
        party.currentUserStatus = status;
        party.joinedCount = Math.max(0, (party.joinedCount || 0) + (isJoined && !wasJoined ? 1 : 0) - (!isJoined && wasJoined ? 1 : 0));
        saveDevParties(list);
    }

    return {
        id: Math.floor(Math.random() * 1000) + 500,
        partyId,
        userId: 999,
        userName: 'Mock User (Dev Mode)',
        status,
        createdAt: now(),
    };
};

export const getDevParticipants = (partyId: number): PartyParticipant[] => [
    { id: 201, partyId, userId: 10, userName: 'Jake Kim (Simulated Owner)', status: 'JOINED', createdAt: now() },
    { id: 202, partyId, userId: 11, userName: 'Jane Doe (Simulated Editor)', status: 'JOINED', createdAt: now() },
];

export const updateDevParticipantStatus = (partyId: number, userId: number, status: ParticipantStatus): PartyParticipant => ({
    id: Math.floor(Math.random() * 1000) + 300,
    partyId,
    userId,
    userName: `User ${userId}`,
    status,
    createdAt: now(),
});

export const getDevOrganizerGroups = (): OrganizerGroup[] => {
    const roleOverride = getDevRoleOverride();
    if (roleOverride === 'organizer' || roleOverride === 'admin' || roleOverride === 'viewer') {
        return [{ id: 1, name: '소모임 운영 샘플 그룹' }];
    }
    return [];
};

export const getDevOrganizerGroup = (groupId: number): OrganizerGroup => ({
    id: groupId,
    name: '소모임 운영 샘플 그룹',
});

export const getDevGroupMembers = (groupId: number): OrganizerGroupMembership[] => {
    const key = `dev_group_members_${groupId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
        return JSON.parse(stored);
    }

    const defaultList: OrganizerGroupMembership[] = [
        { id: 101, groupId, userId: 10, role: 'OWNER', userName: 'Jake Kim (Simulated Owner)' },
        { id: 102, groupId, userId: 11, role: 'EDITOR', userName: 'Jane Doe (Simulated Editor)' },
        { id: 103, groupId, userId: 12, role: 'VIEWER', userName: 'Bob Smith (Simulated Viewer)' },
    ];
    localStorage.setItem(key, JSON.stringify(defaultList));
    return defaultList;
};

export const addDevGroupMember = (
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
