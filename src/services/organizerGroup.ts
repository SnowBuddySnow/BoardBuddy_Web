import apiClient from '../lib/axios';
import type {
    ApiResponse,
    OrganizerGroup,
    OrganizerGroupCrew,
    OrganizerGroupInvitation,
    OrganizerGroupInviteLink,
    OrganizerGroupInviteLinkAcceptance,
    OrganizerGroupInviteLinkPreview,
    OrganizerGroupMembership,
    OrganizerDirectAddCandidate,
    CreatedOrganizerGroupInviteLink,
} from '../types/api';
import {
    acceptDevGroupInvitation,
    addDevGroupMemberDirect,
    createDevOrganizerGroup,
    declineDevGroupInvitation,
    deleteDevGroupMember,
    getDevGroupCrews,
    getDevGroupInvitations,
    getDevGroupMembers,
    getDevMyInvitations,
    getDevOrganizerGroup,
    getDevOrganizerGroups,
    inviteDevCrewManager,
    isDevMode,
    revokeDevGroupInvitation,
    transferDevGroupOwnership,
} from './devMocks';

const DEV_INVITE_LINKS_KEY = 'dev_organizer_group_invite_links';

type DevInviteLink = OrganizerGroupInviteLink & { token: string };

const getDevInviteLinks = (): DevInviteLink[] => {
    const stored = localStorage.getItem(DEV_INVITE_LINKS_KEY);
    return stored ? JSON.parse(stored) : [];
};

const saveDevInviteLinks = (links: DevInviteLink[]) => {
    localStorage.setItem(DEV_INVITE_LINKS_KEY, JSON.stringify(links));
};

export const listOrganizerGroups = async (): Promise<OrganizerGroup[]> => {
    if (isDevMode()) return getDevOrganizerGroups();
    const response = await apiClient.get<ApiResponse<OrganizerGroup[]>>('/dashboard/organizer-groups');
    return response.data.data;
};

export const createOrganizerGroup = async (name: string): Promise<OrganizerGroup> => {
    if (isDevMode()) return createDevOrganizerGroup(name);
    const response = await apiClient.post<ApiResponse<OrganizerGroup>>('/dashboard/organizer-groups', { name });
    return response.data.data;
};

export const getOrganizerGroup = async (groupId: number): Promise<OrganizerGroup> => {
    if (isDevMode()) return getDevOrganizerGroup(groupId);
    const response = await apiClient.get<ApiResponse<OrganizerGroup>>(`/dashboard/organizer-groups/${groupId}`);
    return response.data.data;
};

export const listGroupMembers = async (groupId: number): Promise<OrganizerGroupMembership[]> => {
    if (isDevMode()) return getDevGroupMembers(groupId);
    const response = await apiClient.get<ApiResponse<OrganizerGroupMembership[]>>(`/dashboard/organizer-groups/${groupId}/members`);
    return response.data.data;
};

const devDirectAddCandidates: OrganizerDirectAddCandidate[] = [
    { accountId: 31, displayName: '김보드', crewId: 403, crewName: '한강 웨이크 크루', crewRole: 'CREW_MANAGER' },
    { accountId: 32, displayName: '이웨이크', crewId: 404, crewName: '서울 수상스포츠', crewRole: 'CREW_CAPTAIN' },
    { accountId: 33, displayName: '박버디', crewId: 405, crewName: '대학 연합 보드팀', crewRole: 'CREW_MEMBER' },
];

export const searchOrganizerDirectAddCandidates = async (
    groupId: number,
    query: string,
): Promise<OrganizerDirectAddCandidate[]> => {
    if (isDevMode()) {
        const normalized = query.trim().toLocaleLowerCase('ko-KR');
        if (normalized.length < 2) return [];
        const memberIds = new Set(getDevGroupMembers(groupId).map(member => member.userId));
        return devDirectAddCandidates.filter(candidate => !memberIds.has(candidate.accountId) && (
            candidate.displayName.toLocaleLowerCase('ko-KR').includes(normalized)
            || candidate.crewName.toLocaleLowerCase('ko-KR').includes(normalized)
        ));
    }
    const response = await apiClient.get<ApiResponse<OrganizerDirectAddCandidate[]>>(
        `/dashboard/organizer-groups/${groupId}/direct-add-candidates`,
        { params: { query } },
    );
    return response.data.data;
};

export const addOrganizerGroupMemberDirectly = async (
    groupId: number,
    candidate: OrganizerDirectAddCandidate,
    role: 'EVENT_GROUP_MANAGER' | 'EVENT_GROUP_VIEWER',
): Promise<OrganizerGroupMembership> => {
    if (isDevMode()) {
        return addDevGroupMemberDirect(
            groupId,
            candidate.accountId,
            candidate.displayName,
            candidate.crewId,
            candidate.crewName,
            role,
        );
    }
    const response = await apiClient.post<ApiResponse<OrganizerGroupMembership>>(
        `/dashboard/organizer-groups/${groupId}/members`,
        { accountId: candidate.accountId, role },
    );
    return response.data.data;
};

export const listOrganizerGroupCrews = async (groupId: number): Promise<OrganizerGroupCrew[]> => {
    if (isDevMode()) return getDevGroupCrews(groupId);
    const response = await apiClient.get<ApiResponse<OrganizerGroupCrew[]>>(`/dashboard/organizer-groups/${groupId}/crews`);
    return response.data.data;
};

export const inviteCrewManager = async (
    groupId: number,
    userCode: string,
    role: 'EVENT_GROUP_MANAGER' | 'EVENT_GROUP_VIEWER',
): Promise<OrganizerGroupInvitation> => {
    if (isDevMode()) return inviteDevCrewManager(groupId, userCode, role);
    const response = await apiClient.post<ApiResponse<OrganizerGroupInvitation>>(
        `/dashboard/organizer-groups/${groupId}/invitations`,
        { userCode, role },
    );
    return response.data.data;
};

export interface CreateOrganizerInviteLinkPayload {
    role: 'EVENT_GROUP_MANAGER' | 'EVENT_GROUP_VIEWER';
    expiresInHours: number;
    maxUses: number | null;
}

export const createOrganizerInviteLink = async (
    groupId: number,
    payload: CreateOrganizerInviteLinkPayload,
): Promise<CreatedOrganizerGroupInviteLink> => {
    if (isDevMode()) {
        const token = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
        const group = getDevOrganizerGroup(groupId);
        const now = new Date();
        const inviteLink: OrganizerGroupInviteLink = {
            id: Date.now(),
            inviteLinkCode: `OL-DEV${String(Date.now()).slice(-5)}`,
            groupId,
            groupName: group.name,
            proposedRole: payload.role,
            eligibilityPolicy: 'ASSIGNED_EVENT_MANAGER_ONLY',
            expiresAt: new Date(now.getTime() + payload.expiresInHours * 60 * 60 * 1000).toISOString(),
            maxUses: payload.maxUses,
            usedCount: 0,
            status: 'ACTIVE',
            createdAt: now.toISOString(),
        };
        saveDevInviteLinks([{ ...inviteLink, token }, ...getDevInviteLinks()]);
        return { inviteLink, token };
    }
    const response = await apiClient.post<ApiResponse<CreatedOrganizerGroupInviteLink>>(
        `/dashboard/organizer-groups/${groupId}/invite-links`,
        payload,
    );
    return response.data.data;
};

export const listOrganizerInviteLinks = async (groupId: number): Promise<OrganizerGroupInviteLink[]> => {
    if (isDevMode()) return getDevInviteLinks().filter(link => link.groupId === groupId);
    const response = await apiClient.get<ApiResponse<OrganizerGroupInviteLink[]>>(
        `/dashboard/organizer-groups/${groupId}/invite-links`,
    );
    return response.data.data;
};

export const revokeOrganizerInviteLink = async (groupId: number, inviteLinkId: number): Promise<void> => {
    if (isDevMode()) {
        saveDevInviteLinks(getDevInviteLinks().map(link => (
            link.id === inviteLinkId ? { ...link, status: 'REVOKED' } : link
        )));
        return;
    }
    await apiClient.delete<ApiResponse<void>>(
        `/dashboard/organizer-groups/${groupId}/invite-links/${inviteLinkId}`,
    );
};

export const previewOrganizerInviteLink = async (
    token: string,
): Promise<OrganizerGroupInviteLinkPreview> => {
    if (isDevMode()) {
        const link = getDevInviteLinks().find(candidate => candidate.token === token);
        if (!link) throw new Error('Invitation link not found');
        const role = localStorage.getItem('dev_role_override');
        const eligible = link.status === 'ACTIVE' && role !== 'member';
        return {
            ...link,
            eligible,
            eligibilityReason: eligible
                ? 'Eligible in simulated mode'
                : 'This simulated account does not meet the invitation policy',
        };
    }
    const response = await apiClient.post<ApiResponse<OrganizerGroupInviteLinkPreview>>(
        '/organizer-group-invite-links/preview',
        { token },
    );
    return response.data.data;
};

export const acceptOrganizerInviteLink = async (
    token: string,
): Promise<OrganizerGroupInviteLinkAcceptance> => {
    if (isDevMode()) {
        const links = getDevInviteLinks();
        const link = links.find(candidate => candidate.token === token);
        if (!link) throw new Error('Invitation link not found');
        link.usedCount += 1;
        if (link.maxUses != null && link.usedCount >= link.maxUses) link.status = 'EXHAUSTED';
        saveDevInviteLinks(links);
        return {
            membershipId: Date.now(),
            groupId: link.groupId,
            groupName: link.groupName,
            crewId: 1,
            crewName: 'Mock Crew 401',
            role: link.proposedRole,
        };
    }
    const response = await apiClient.post<ApiResponse<OrganizerGroupInviteLinkAcceptance>>(
        '/organizer-group-invite-links/accept',
        { token },
    );
    return response.data.data;
};

export const listGroupInvitations = async (groupId: number): Promise<OrganizerGroupInvitation[]> => {
    if (isDevMode()) return getDevGroupInvitations(groupId);
    const response = await apiClient.get<ApiResponse<OrganizerGroupInvitation[]>>(`/dashboard/organizer-groups/${groupId}/invitations`);
    return response.data.data;
};

export const revokeOrganizerGroupInvitation = async (groupId: number, invitationId: number): Promise<void> => {
    if (isDevMode()) {
        revokeDevGroupInvitation(invitationId);
        return;
    }
    await apiClient.delete<ApiResponse<void>>(`/dashboard/organizer-groups/${groupId}/invitations/${invitationId}`);
};

export const listMyOrganizerGroupInvitations = async (): Promise<OrganizerGroupInvitation[]> => {
    if (isDevMode()) return getDevMyInvitations();
    const response = await apiClient.get<ApiResponse<OrganizerGroupInvitation[]>>('/dashboard/organizer-group-invitations');
    return response.data.data;
};

export const acceptOrganizerGroupInvitation = async (invitationId: number): Promise<OrganizerGroupMembership> => {
    if (isDevMode()) return acceptDevGroupInvitation(invitationId);
    const response = await apiClient.post<ApiResponse<OrganizerGroupMembership>>(
        `/dashboard/organizer-group-invitations/${invitationId}/accept`,
    );
    return response.data.data;
};

export const declineOrganizerGroupInvitation = async (invitationId: number): Promise<void> => {
    if (isDevMode()) {
        declineDevGroupInvitation(invitationId);
        return;
    }
    await apiClient.post<ApiResponse<void>>(`/dashboard/organizer-group-invitations/${invitationId}/decline`);
};

export const deleteGroupMember = async (groupId: number, userId: number): Promise<void> => {
    if (isDevMode()) {
        deleteDevGroupMember(groupId, userId);
        return;
    }
    await apiClient.delete<ApiResponse<void>>(`/dashboard/organizer-groups/${groupId}/members/${userId}`);
};

export const transferOrganizerGroupOwnership = async (
    groupId: number,
    targetUserId: number,
): Promise<OrganizerGroupMembership> => {
    if (isDevMode()) return transferDevGroupOwnership(groupId, targetUserId);
    const response = await apiClient.post<ApiResponse<OrganizerGroupMembership>>(
        `/dashboard/organizer-groups/${groupId}/ownership/transfer`,
        { targetAccountId: targetUserId },
    );
    return response.data.data;
};
