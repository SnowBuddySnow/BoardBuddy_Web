import apiClient from '../lib/axios';
import { ApiResponse, Party, PartyParticipant, OrganizerGroup, OrganizerGroupMembership, ParticipantStatus } from '../types/api';

// --- Helper for Developer Overrides ---
const getDevParties = (): Party[] => {
    const stored = localStorage.getItem('dev_parties_list');
    if (stored) {
        return JSON.parse(stored);
    }
    const defaultParties: Party[] = [
        {
            id: 1,
            title: '용평 리조트 주말 카풀 & 보딩 모임',
            description: '주말 동안 함께 용평에서 카풀하고 보드 타실 분들 모집합니다!',
            activityType: 'SNOWBOARDING',
            startsAt: '2026-07-01T09:00:00',
            endsAt: '2026-07-01T18:00:00',
            locationName: '용평리조트 핑크슬로프 하단',
            locationAddress: '강원특별자치도 평창군 대관령면 올림픽로 715',
            capacity: 8,
            joinedCount: 3,
            status: 'OPEN',
            visibilityType: 'PUBLIC',
            joinPolicy: 'PUBLIC',
            organizerGroupId: 1,
            organizerGroupName: 'Mock Dev Organizer Group',
            currentUserStatus: 'NONE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];
    localStorage.setItem('dev_parties_list', JSON.stringify(defaultParties));
    return defaultParties;
};

const saveDevParties = (parties: Party[]) => {
    localStorage.setItem('dev_parties_list', JSON.stringify(parties));
};

const isDevMode = (): boolean => {
    const crewOverride = localStorage.getItem('dev_crew_override');
    const roleOverride = localStorage.getItem('dev_role_override');
    return (crewOverride !== null && crewOverride !== 'server') || (roleOverride !== null && roleOverride !== 'server');
};

// --- User-facing APIs ---
export const listParties = async (): Promise<Party[]> => {
    if (isDevMode()) {
        return getDevParties();
    }
    const response = await apiClient.get<ApiResponse<Party[]>>('/parties');
    return response.data.data;
};

export const getParty = async (partyId: number): Promise<Party> => {
    if (isDevMode()) {
        const found = getDevParties().find(p => p.id === partyId);
        if (!found) throw new Error('Party not found');
        return found;
    }
    const response = await apiClient.get<ApiResponse<Party>>(`/parties/${partyId}`);
    return response.data.data;
};

export const joinParty = async (partyId: number): Promise<PartyParticipant> => {
    if (isDevMode()) {
        const list = getDevParties();
        const party = list.find(p => p.id === partyId);
        if (party) {
            party.currentUserStatus = 'JOINED';
            party.joinedCount = (party.joinedCount || 0) + 1;
            saveDevParties(list);
        }
        return {
            id: Math.floor(Math.random() * 1000) + 500,
            partyId,
            userId: 999,
            userName: 'Mock User (Dev Mode)',
            status: 'JOINED',
            createdAt: new Date().toISOString()
        };
    }
    const response = await apiClient.post<ApiResponse<PartyParticipant>>(`/parties/${partyId}/join`);
    return response.data.data;
};

export const cancelParty = async (partyId: number): Promise<PartyParticipant> => {
    if (isDevMode()) {
        const list = getDevParties();
        const party = list.find(p => p.id === partyId);
        if (party) {
            party.currentUserStatus = 'NONE';
            party.joinedCount = Math.max(0, (party.joinedCount || 1) - 1);
            saveDevParties(list);
        }
        return {
            id: Math.floor(Math.random() * 1000) + 500,
            partyId,
            userId: 999,
            userName: 'Mock User (Dev Mode)',
            status: 'CANCELLED',
            createdAt: new Date().toISOString()
        };
    }
    const response = await apiClient.post<ApiResponse<PartyParticipant>>(`/parties/${partyId}/cancel`);
    return response.data.data;
};

// --- Dashboard / Organizer APIs ---
export const listDashboardParties = async (): Promise<Party[]> => {
    if (isDevMode()) {
        return getDevParties();
    }
    const response = await apiClient.get<ApiResponse<Party[]>>('/dashboard/parties');
    return response.data.data;
};

export interface CreatePartyPayload {
    title: string;
    description?: string;
    activityType?: string;
    startsAt: string; // ISO string e.g. "2026-07-01T14:00:00"
    endsAt?: string;
    locationName?: string;
    locationAddress?: string;
    capacity: number;
    visibilityType: string;
    joinPolicy: string;
    organizerGroupId: number;
    allowedCrewIds?: number[];
}

export const createParty = async (payload: CreatePartyPayload): Promise<Party> => {
    if (isDevMode()) {
        const list = getDevParties();
        const newParty: Party = {
            id: Math.floor(Math.random() * 1000) + 10,
            title: payload.title,
            description: payload.description,
            activityType: payload.activityType || 'SNOWBOARDING',
            startsAt: payload.startsAt,
            endsAt: payload.endsAt,
            locationName: payload.locationName,
            locationAddress: payload.locationAddress,
            capacity: payload.capacity,
            joinedCount: 1,
            status: 'DRAFT',
            visibilityType: payload.visibilityType,
            joinPolicy: payload.joinPolicy,
            organizerGroupId: payload.organizerGroupId,
            organizerGroupName: 'Mock Dev Organizer Group',
            currentUserStatus: 'JOINED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        list.push(newParty);
        saveDevParties(list);
        return newParty;
    }
    const response = await apiClient.post<ApiResponse<Party>>('/dashboard/parties', payload);
    return response.data.data;
};

export const getPartyDashboard = async (partyId: number): Promise<Party> => {
    if (isDevMode()) {
        const found = getDevParties().find(p => p.id === partyId);
        if (!found) throw new Error('Party not found');
        return found;
    }
    const response = await apiClient.get<ApiResponse<Party>>(`/dashboard/parties/${partyId}`);
    return response.data.data;
};

export interface UpdatePartyPayload extends Partial<CreatePartyPayload> {
    status?: string;
}

export const updateParty = async (partyId: number, payload: UpdatePartyPayload): Promise<Party> => {
    if (isDevMode()) {
        const list = getDevParties();
        const index = list.findIndex(p => p.id === partyId);
        if (index === -1) throw new Error('Party not found');
        
        const updated = {
            ...list[index],
            ...payload,
            updatedAt: new Date().toISOString()
        } as Party;
        
        list[index] = updated;
        saveDevParties(list);
        return updated;
    }
    const response = await apiClient.patch<ApiResponse<Party>>(`/dashboard/parties/${partyId}`, payload);
    return response.data.data;
};

export const deleteParty = async (partyId: number): Promise<void> => {
    if (isDevMode()) {
        const list = getDevParties();
        const filtered = list.filter(p => p.id !== partyId);
        saveDevParties(filtered);
        return;
    }
    await apiClient.delete<ApiResponse<void>>(`/dashboard/parties/${partyId}`);
};

export const listParticipants = async (partyId: number): Promise<PartyParticipant[]> => {
    if (isDevMode()) {
        return [
            { id: 201, partyId, userId: 10, userName: 'Jake Kim (Simulated Owner)', status: 'JOINED', createdAt: new Date().toISOString() },
            { id: 202, partyId, userId: 11, userName: 'Jane Doe (Simulated Editor)', status: 'JOINED', createdAt: new Date().toISOString() }
        ];
    }
    const response = await apiClient.get<ApiResponse<PartyParticipant[]>>(`/dashboard/parties/${partyId}/participants`);
    return response.data.data;
};

export const updateParticipantStatus = async (partyId: number, userId: number, status: ParticipantStatus): Promise<PartyParticipant> => {
    if (isDevMode()) {
        return {
            id: Math.floor(Math.random() * 1000) + 300,
            partyId,
            userId,
            userName: `User ${userId}`,
            status,
            createdAt: new Date().toISOString()
        };
    }
    const response = await apiClient.patch<ApiResponse<PartyParticipant>>(`/dashboard/parties/${partyId}/participants/${userId}`, { status });
    return response.data.data;
};

// --- Organizer Group Management APIs ---
export const listOrganizerGroups = async (): Promise<OrganizerGroup[]> => {
    const roleOverride = localStorage.getItem('dev_role_override');

    if (isDevMode()) {
        if (roleOverride === 'organizer' || roleOverride === 'admin' || roleOverride === 'viewer') {
            return [{ id: 1, name: 'Mock Dev Organizer Group' }];
        } else if (roleOverride === 'member') {
            return [];
        }
        return [];
    }

    const response = await apiClient.get<ApiResponse<OrganizerGroup[]>>('/dashboard/organizer-groups');
    return response.data.data;
};

export const getOrganizerGroup = async (groupId: number): Promise<OrganizerGroup> => {
    if (isDevMode()) {
        return { id: groupId, name: 'Mock Dev Organizer Group' };
    }

    const response = await apiClient.get<ApiResponse<OrganizerGroup>>(`/dashboard/organizer-groups/${groupId}`);
    return response.data.data;
};

export const listGroupMembers = async (groupId: number): Promise<OrganizerGroupMembership[]> => {
    if (isDevMode()) {
        const stored = localStorage.getItem(`dev_group_members_${groupId}`);
        if (stored) {
            return JSON.parse(stored);
        }
        const defaultList: OrganizerGroupMembership[] = [
            { id: 101, groupId, userId: 10, role: 'OWNER', userName: 'Jake Kim (Simulated Owner)' },
            { id: 102, groupId, userId: 11, role: 'EDITOR', userName: 'Jane Doe (Simulated Editor)' },
            { id: 103, groupId, userId: 12, role: 'VIEWER', userName: 'Bob Smith (Simulated Viewer)' }
        ];
        localStorage.setItem(`dev_group_members_${groupId}`, JSON.stringify(defaultList));
        return defaultList;
    }

    const response = await apiClient.get<ApiResponse<OrganizerGroupMembership[]>>(`/dashboard/organizer-groups/${groupId}/members`);
    return response.data.data;
};

export const addGroupMember = async (groupId: number, userId: number, role: 'OWNER' | 'EDITOR' | 'VIEWER'): Promise<OrganizerGroupMembership> => {
    if (isDevMode()) {
        const stored = localStorage.getItem(`dev_group_members_${groupId}`);
        const list: OrganizerGroupMembership[] = stored ? JSON.parse(stored) : [];
        
        const newMember: OrganizerGroupMembership = {
            id: Math.floor(Math.random() * 1000) + 200,
            groupId,
            userId,
            role,
            userName: `User ${userId} (Simulated ${role})`
        };
        
        if (!list.some(m => m.userId === userId)) {
            list.push(newMember);
            localStorage.setItem(`dev_group_members_${groupId}`, JSON.stringify(list));
        }
        return newMember;
    }

    const response = await apiClient.post<ApiResponse<OrganizerGroupMembership>>(`/dashboard/organizer-groups/${groupId}/members`, { userId, role });
    return response.data.data;
};

export const deleteGroupMember = async (groupId: number, userId: number): Promise<void> => {
    if (isDevMode()) {
        const stored = localStorage.getItem(`dev_group_members_${groupId}`);
        if (stored) {
            let list: OrganizerGroupMembership[] = JSON.parse(stored);
            list = list.filter(m => m.userId !== userId);
            localStorage.setItem(`dev_group_members_${groupId}`, JSON.stringify(list));
        }
        return;
    }

    await apiClient.delete<ApiResponse<void>>(`/dashboard/organizer-groups/${groupId}/members/${userId}`);
};
