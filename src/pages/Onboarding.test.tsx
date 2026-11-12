// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), applications: vi.fn(), requests: vi.fn(), groups: vi.fn(), preview: vi.fn(), accept: vi.fn() }));
vi.mock('../services/user', () => ({ getUserInfo: mocks.user }));
vi.mock('../services/crew', () => ({ getMyApplications: mocks.applications }));
vi.mock('../services/crewAdmin', () => ({ getCrewAdminData: mocks.requests }));
vi.mock('../services/organizerGroup', () => ({ listOrganizerGroups: mocks.groups }));
vi.mock('../services/onboarding', () => ({ previewCrewInvitation: mocks.preview, acceptCrewInvitation: mocks.accept }));
vi.mock('../components/onboarding/CrewInvitationPanel', () => ({ CrewInvitationPanel: () => <section aria-label="Operator invitation tools" /> }));
import Onboarding from './Onboarding';
import CrewInvite from './CrewInvite';
import { captureCrewInvitation, clearCrewInvitationIntent, getCrewInvitationIntent } from '../lib/onboardingIntent';

describe('member and president onboarding', () => {
    let root: Root; let container: HTMLDivElement;
    const crew = vi.fn(); const login = vi.fn(); const signup = vi.fn(); const firstEvent = vi.fn();
    beforeEach(() => {
        vi.resetAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); localStorage.clear(); sessionStorage.clear(); clearCrewInvitationIntent();
        localStorage.setItem('accountId', '99101'); localStorage.setItem('accessToken', 'synthetic-only');
        mocks.user.mockResolvedValue({ userId: 99101, role: 'CREW_MEMBER', crew: null });
        mocks.applications.mockResolvedValue([]); mocks.requests.mockResolvedValue({ crews: [], schools: [], developerAccess: false });
        mocks.groups.mockResolvedValue([]); mocks.preview.mockResolvedValue({ crewName: '가상 크루', schoolName: '한국대학교', approvalRequired: true, expiresAt: '2027-01-01T00:00:00' });
        mocks.accept.mockResolvedValue({ crewId: 17, status: 'PENDING' });
        window.history.replaceState(null, '', '/?view=crew_invite&eventId=7#crewInvite=' + 'a'.repeat(43)); captureCrewInvitation();
        container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    });
    afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
    const render = async (invite = false) => { await act(async () => root.render(invite ? <CrewInvite onLogin={login} onSignup={signup} onDone={crew} onExit={vi.fn()} onEvents={vi.fn()} /> : <Onboarding onBack={vi.fn()} onSearch={vi.fn()} onCreate={vi.fn()} onCrew={crew} onEvents={vi.fn()} onFirstEvent={firstEvent} />)); };
    const click = async (text: string) => { const button = Array.from(container.querySelectorAll('button')).find(el => el.textContent === text)!; expect(button).toBeTruthy(); await act(async () => button.click()); };
    it('invites require an explicit application and stay pending until the server reports membership', async () => {
        await render(true); expect(mocks.accept).not.toHaveBeenCalled();
        await click('이 크루에 가입 신청'); expect(container.textContent).toContain('가입 신청을 보냈어요'); expect(crew).not.toHaveBeenCalled();
        mocks.user.mockResolvedValue({ userId: 99101, role: 'CREW_MEMBER', crew: { crewId: 17, crewName: '가상 크루' } });
        await click('승인 상태 새로고침'); expect(container.textContent).toContain('이제 함께할 수 있어요');
        await click('크루로 계속하기'); expect(crew).toHaveBeenCalledWith(7);
    });
    it('continues a pending signup without spending a member invitation', async () => {
        localStorage.removeItem('accessToken'); localStorage.setItem('tempAccessToken', 'synthetic-pending');
        await render(true); await click('회원가입 이어서 하기'); expect(signup).toHaveBeenCalledOnce(); expect(mocks.accept).not.toHaveBeenCalled();
    });
    it('shows the introduction before asking an anonymous member to log in', async () => {
        localStorage.clear(); await render(true); expect(container.textContent).toContain('가상 크루');
        await click('로그인하고 계속하기'); expect(login).toHaveBeenCalledOnce(); expect(mocks.accept).not.toHaveBeenCalled();
    });
    it('handles an unavailable invitation without exposing private crew or inviter fields', async () => {
        mocks.preview.mockRejectedValue({ isAxiosError: true, response: { status: 404 } }); await render(true);
        expect(container.textContent).toContain('이 초대를 사용할 수 없어요'); expect(mocks.user).not.toHaveBeenCalled(); expect(mocks.accept).not.toHaveBeenCalled();
    });
    it('shows requester progress while leaving invitation and event tools unavailable', async () => {
        mocks.requests.mockResolvedValue({ crews: [{ id: 17, name: '가상 크루', approvalStatus: 'PENDING' }], developerAccess: false });
        await render(); expect(container.textContent).toContain('관리자 검토 중'); expect(container.textContent).toContain('회장 계정 자동 연결');
        expect(container.querySelector('[aria-label="Operator invitation tools"]')).toBeNull(); expect(mocks.groups).not.toHaveBeenCalled();
    });
    it('never grants operator tools just because a member chooses an intent', async () => {
        mocks.user.mockResolvedValue({ userId: 99101, role: 'CREW_MEMBER', crew: { crewId: 17, crewName: '가상 크루' } });
        await render(); expect(container.querySelector('[aria-label="Operator invitation tools"]')).toBeNull();
        expect(container.textContent).not.toContain('첫 행사 준비하기');
    });
    it('guides an approved captain through host-group setup before an event', async () => {
        mocks.user.mockResolvedValue({ userId: 99101, role: 'CREW_CAPTAIN', crew: { crewId: 17, crewName: '가상 크루' } });
        await render(); expect(container.querySelector('[aria-label="Operator invitation tools"]')).not.toBeNull();
        await click('첫 행사 준비하기'); expect(firstEvent).toHaveBeenLastCalledWith(false);
        mocks.groups.mockResolvedValue([{ id: 3 }]); await click('첫 행사 준비하기'); expect(firstEvent).toHaveBeenLastCalledWith(true);
    });
    it('does not replace a newly approved status with an older response after window focus', async () => {
        let finish!: (value: unknown) => void;
        mocks.user.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
        await render();
        mocks.user.mockResolvedValue({ userId: 99101, role: 'CREW_MEMBER', crew: { crewId: 17, crewName: '승인된 크루' } });
        await act(async () => window.dispatchEvent(new Event('focus')));
        await act(async () => finish({ userId: 99101, role: 'CREW_MEMBER', crew: null }));
        expect(container.textContent).toContain('승인된 크루');
        expect(container.textContent).toContain('크루 연결 완료');
    });
    it('does not attach a completed application to a replacement invitation', async () => {
        let finish!: (value: unknown) => void;
        mocks.accept.mockReturnValue(new Promise(resolve => { finish = resolve; }));
        await render(true); await click('이 크루에 가입 신청');
        window.history.replaceState(null, '', '/?view=crew_invite#crewInvite=' + 'b'.repeat(43)); captureCrewInvitation();
        await act(async () => finish({ crewId: 17, status: 'PENDING' }));
        expect(getCrewInvitationIntent()?.token).toBe('b'.repeat(43));
        expect(getCrewInvitationIntent()?.receipt).toBeUndefined();
    });
});
