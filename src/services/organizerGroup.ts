import apiClient from '../lib/axios';
import type {
    ApiResponse,
    OrganizerGroup,
    OrganizerGroupCrew,
    OrganizerGroupInvitation,
    OrganizerGroupMembership,
} from '../types/api';
import {
    acceptDevGroupInvitation,
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
} from './devMocks';

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

export const listOrganizerGroupCrews = async (groupId: number): Promise<OrganizerGroupCrew[]> => {
    if (isDevMode()) return getDevGroupCrews(groupId);
    const response = await apiClient.get<ApiResponse<OrganizerGroupCrew[]>>(`/dashboard/organizer-groups/${groupId}/crews`);
    return response.data.data;
};

export const inviteCrewManager = async (
    groupId: number,
    userId: number,
    role: 'PARTY_GROUP_MANAGER' | 'PARTY_GROUP_VIEWER',
): Promise<OrganizerGroupInvitation> => {
    if (isDevMode()) return inviteDevCrewManager(groupId, userId, role);
    const response = await apiClient.post<ApiResponse<OrganizerGroupInvitation>>(
        `/dashboard/organizer-groups/${groupId}/invitations`,
        { userId, role },
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
