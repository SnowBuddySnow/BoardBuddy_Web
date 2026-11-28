// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../lib/axios';
import {
    addOrganizerGroupMemberDirectly,
    createOrganizerGroup,
    getOrganizerGroup,
    inviteCrewManager,
    listGroupMembers,
    listOrganizerGroupCrews,
    listOrganizerGroups,
    searchOrganizerDirectAddCandidates,
} from './organizerGroup';

vi.mock('../lib/axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

describe('organizerGroup service', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    it('lists, creates, and inspects organizer groups via dashboard API', async () => {
        vi.mocked(apiClient.get)
            .mockResolvedValueOnce({ data: { data: [{ id: 1, name: '연합 운영진' }] } })
            .mockResolvedValueOnce({ data: { data: { id: 1, name: '연합 운영진' } } })
            .mockResolvedValueOnce({ data: { data: [{ userId: 10, role: 'EVENT_GROUP_OWNER' }] } })
            .mockResolvedValueOnce({ data: { data: [{ crewId: 3, crewName: 'Alpha' }] } });
        vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { data: { id: 2, name: '신규 그룹' } } });

        expect(await listOrganizerGroups()).toHaveLength(1);
        expect((await createOrganizerGroup('신규 그룹')).id).toBe(2);
        expect((await getOrganizerGroup(1)).name).toBe('연합 운영진');
        expect(await listGroupMembers(1)).toHaveLength(1);
        expect(await listOrganizerGroupCrews(1)).toHaveLength(1);

        expect(apiClient.post).toHaveBeenCalledWith('/dashboard/organizer-groups', { name: '신규 그룹' });
    });

    it('searches direct-add candidates, adds member directly, and sends invitations', async () => {
        vi.mocked(apiClient.get).mockResolvedValueOnce({
            data: { data: [{ accountId: 31, displayName: '김보드', crewId: 403, crewName: '한강 크루', crewRole: 'CREW_MANAGER' }] },
        });
        vi.mocked(apiClient.post)
            .mockResolvedValueOnce({ data: { data: { userId: 31, role: 'EVENT_GROUP_MANAGER' } } })
            .mockResolvedValueOnce({ data: { data: { id: 90, status: 'PENDING' } } });

        const candidates = await searchOrganizerDirectAddCandidates(1, '김보드');
        expect(candidates).toHaveLength(1);
        expect(apiClient.get).toHaveBeenCalledWith('/dashboard/organizer-groups/1/direct-add-candidates', {
            params: { query: '김보드' },
        });

        await addOrganizerGroupMemberDirectly(1, candidates[0], 'EVENT_GROUP_MANAGER');
        expect(apiClient.post).toHaveBeenNthCalledWith(1, '/dashboard/organizer-groups/1/members', {
            accountId: 31,
            role: 'EVENT_GROUP_MANAGER',
        });

        await inviteCrewManager(1, 'AC1234', 'EVENT_GROUP_VIEWER');
        expect(apiClient.post).toHaveBeenNthCalledWith(2, '/dashboard/organizer-groups/1/invitations', {
            userCode: 'AC1234',
            role: 'EVENT_GROUP_VIEWER',
        });
    });
});
