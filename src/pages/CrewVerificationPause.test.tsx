// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ getCrewInfo: vi.fn(), updateCrew: vi.fn(), resetCrewPin: vi.fn(),
    discoverCrews: vi.fn(), applyToCrew: vi.fn(), getCrewManagers: vi.fn(), getCrewMembers: vi.fn(),
    getApplicants: vi.fn(), manageApplicant: vi.fn() }));
vi.mock('../services/crew', () => api);
vi.mock('../services/user', () => ({ getUserInfo: async () => ({ userId: 1, role: 'CREW_CAPTAIN', crew: { crewId: 11 } }) }));
vi.mock('../services/schools', () => ({ getSchools: async () => [] }));
vi.mock('./Promote', () => ({ default: () => null }));
import SearchCrew from './SearchCrew';
import CrewSettings from './CrewSettings';
import CrewMember from './CrewMember';

describe('temporary school-verification requirement pause', () => {
    let root: Root; let container: HTMLDivElement;
    beforeEach(() => {
        vi.resetAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        vi.stubGlobal('confirm', () => true); vi.stubGlobal('alert', vi.fn());
        container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    });
    afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

    it.each([false, undefined])('does not advertise mandatory verification when enforcement is %s, even with a saved legacy requirement', async enforcement => {
        api.discoverCrews.mockResolvedValue([{ crewId: 11, crewName: 'Test Crew', crewCode: 'CR-TEST', schoolName: 'School',
            schoolVerificationRequired: true, schoolVerificationEnforcementEnabled: enforcement, verifiedSchoolAutoJoinEnabled: false, memberCount: 2 }]);
        await act(async () => root.render(<SearchCrew onBack={vi.fn()} />));
        expect(container.textContent).not.toContain('학교 인증 필수');
        const join = Array.from(container.querySelectorAll('button')).find(node => node.textContent === '가입')!;
        await act(async () => join.click());
        expect(container.textContent).not.toContain('학교 인증을 완료한 계정만');
        expect(container.querySelector('input[aria-label="4자리 가입 PIN"]')).not.toBeNull();
    });

    it('disables re-enabling the requirement and does not overwrite the saved crew preference', async () => {
        api.getCrewInfo.mockResolvedValue({ name: 'Test Crew', schoolVerificationRequired: false,
            configuredSchoolVerificationRequired: true, schoolVerificationEnforcementEnabled: false,
            verifiedSchoolAutoJoinEnabled: false, dailyCapacity: 10, isCapacityLimited: true });
        api.updateCrew.mockResolvedValue(undefined);
        await act(async () => root.render(<CrewSettings onBack={vi.fn()} />));
        const label = Array.from(container.querySelectorAll('label')).find(node => node.textContent?.includes('학교 인증 필수 가입'))!;
        expect(label.textContent).toContain('일시 중지');
        expect(label.textContent).toContain('모든 학교');
        const checkbox = label.querySelector('input')!;
        expect(checkbox.disabled).toBe(true); expect(checkbox.checked).toBe(false);
        const save = Array.from(container.querySelectorAll('button')).find(node => node.textContent?.trim() === '저장하기')!;
        await act(async () => save.click());
        expect(api.updateCrew).toHaveBeenCalledOnce();
        expect(api.updateCrew.mock.calls[0][1]).not.toHaveProperty('schoolVerificationRequired');
    });

    it('allows managers to approve unverified applicants during the pause', async () => {
        api.getCrewInfo.mockResolvedValue({ schoolVerificationRequired: true, schoolVerificationEnforcementEnabled: false });
        api.getCrewManagers.mockResolvedValue([{ user_id: 1, name: 'Captain' }]);
        api.getCrewMembers.mockResolvedValue([]);
        api.getApplicants.mockResolvedValue([{ applicationId: 22, userId: 2, userName: 'Applicant', status: 'PENDING',
            universityVerificationStatus: 'NOT_VERIFIED', userType: 'KUSBF', schoolName: 'School', studentId: '1234' }]);
        await act(async () => root.render(<CrewMember onBack={vi.fn()} />));
        const tab = Array.from(container.querySelectorAll('button')).find(node => node.textContent?.includes('승인 대기'))!;
        await act(async () => tab.click());
        const approve = Array.from(container.querySelectorAll('button')).find(node => node.textContent?.trim() === '수락')!;
        expect(approve.disabled).toBe(false);
        await act(async () => approve.click());
        expect(api.manageApplicant).toHaveBeenCalledOnce();
    });
});
