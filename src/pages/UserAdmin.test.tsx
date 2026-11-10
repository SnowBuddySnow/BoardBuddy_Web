// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminCrewApplication, AdminUser } from '../services/userAdmin';

const api = vi.hoisted(() => ({
    approveAdminCrewApplication: vi.fn(), searchAdminUsers: vi.fn(), convertAdminUserToStudent: vi.fn(),
    updateAdminCrewManager: vi.fn(), updateAdminCrewRole: vi.fn(),
    updateAdminEventManager: vi.fn(), updatePlatformAdmin: vi.fn(),
}));
const schools = vi.hoisted(() => ({ getSchools: vi.fn() }));
const features = vi.hoisted(() => ({ SCHOOL_EMAIL_AUTH_AVAILABLE: false }));
vi.mock('../services/userAdmin', () => api);
vi.mock('../services/schools', () => schools);
vi.mock('../config/features', () => features);
vi.mock('../components/SignupPolicySettings', () => ({ default: () => null }));
import UserAdmin from './UserAdmin';

const regular: AdminUser = {
    accountId: 12, userCode: 'US-12', name: '닉네임', accountStatus: 'ACTIVE', userType: 'REGULAR',
    universityVerificationStatus: 'NOT_VERIFIED', platformAdmin: false,
    createdAt: '2026-10-01T00:00:00', crewMemberships: [], crewApplications: [],
};

describe('developer student conversion', () => {
    let root: Root;
    let container: HTMLDivElement;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.useFakeTimers();
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        api.searchAdminUsers.mockResolvedValue([
            regular,
            { ...regular, accountId: 13, name: '정지회원', accountStatus: 'SUSPENDED' },
            { ...regular, accountId: 14, name: '기존학생', userType: 'KUSBF' },
        ]);
        schools.getSchools.mockResolvedValue([{ id: 3, name: '대학교', schoolCode: 'SC-3', aliases: [], emailDomains: [] }]);
        container = document.createElement('div');
        document.body.append(container);
        root = createRoot(container);
        await act(async () => root.render(<UserAdmin onBack={vi.fn()} />));
        await act(async () => vi.advanceTimersByTimeAsync(300));
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    const open = async () => {
        const button = Array.from(container.querySelectorAll('button')).find(item => item.textContent === '학생으로 변경')!;
        button.focus();
        await act(async () => button.click());
        return container.querySelector<HTMLElement>('[role="dialog"]')!;
    };

    const fill = async (dialog: HTMLElement) => {
        const inputs = dialog.querySelectorAll('input');
        await act(async () => {
            const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
            setter.call(inputs[0], ' 김학생 ');
            inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
            setter.call(inputs[1], ' 001234 ');
            inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
            const select = dialog.querySelector('select')!;
            select.value = '3';
            select.dispatchEvent(new Event('change', { bubbles: true }));
        });
    };

    const submit = async (dialog: HTMLElement) => {
        await act(async () => dialog.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    };


    const pending: AdminCrewApplication = {
        applicationId: 71, crewId: 5, crewCode: 'CR-5', crewName: '승인대기크루', status: 'PENDING',
        createdAt: '2026-11-09T10:00:00', processedAt: null, crewJoinable: true,
    };
    const showPendingUser = async (overrides: Partial<AdminUser> = {}) => {
        api.searchAdminUsers.mockResolvedValue([{ ...regular, crewApplications: [pending], ...overrides }]);
        const refresh = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('새로고침'))!;
        await act(async () => refresh.click());
    };
    const openApproval = async () => {
        const button = Array.from(container.querySelectorAll('button')).find(item => item.textContent === '즉시 승인')!;
        await act(async () => button.click());
        return container.querySelector<HTMLElement>('[role="dialog"]')!;
    };

    it('shows pending crew and school status on desktop and mobile and requires confirmation', async () => {
        await showPendingUser();
        expect(container.textContent?.match(/승인대기크루 · 가입 승인 대기/g)).toHaveLength(2);
        expect(container.textContent).toContain('학교 미인증');
        const dialog = await openApproval();
        expect(dialog.textContent).toContain('크루장 승인과 학교 인증 조건을 건너뛰고');
        expect(api.approveAdminCrewApplication).not.toHaveBeenCalled();
        const cancel = Array.from(dialog.querySelectorAll('button')).find(button => button.textContent === '취소')!;
        await act(async () => cancel.click());
        expect(container.querySelector('[role="dialog"]')).toBeNull();
        expect(api.approveAdminCrewApplication).not.toHaveBeenCalled();
    });

    it('blocks duplicate approval while saving and replaces pending status with membership permissions', async () => {
        await showPendingUser();
        let finish!: (user: AdminUser) => void;
        api.approveAdminCrewApplication.mockImplementation(() => new Promise<AdminUser>(resolve => { finish = resolve; }));
        const dialog = await openApproval();
        const confirm = Array.from(dialog.querySelectorAll('button')).find(button => button.textContent === '즉시 승인')!;
        await act(async () => { confirm.click(); confirm.click(); });
        expect(api.approveAdminCrewApplication).toHaveBeenCalledExactlyOnceWith(12, 71);
        expect(Array.from(container.querySelectorAll('button')).filter(button => button.textContent === '즉시 승인').every(button => button.disabled)).toBe(true);
        await act(async () => finish({
            ...regular,
            crewApplications: [{ ...pending, status: 'APPROVED', processedAt: '2026-11-10T10:00:00' }],
            crewMemberships: [{ crewId: 5, crewName: pending.crewName, crewCode: pending.crewCode,
                role: 'CREW_MEMBER', crewManager: false, eventManager: false }],
        }));
        expect(container.textContent).toContain('가입을 승인했습니다.');
        expect(container.textContent).not.toContain('가입 승인 대기');
        expect(container.textContent).toContain('가입 승인 완료');
        expect(container.textContent).toContain('크루장');
        expect(Array.from(container.querySelectorAll('button')).filter(button => button.textContent === '즉시 승인')).toHaveLength(0);
    });

    it('retains the pending application and shows server errors when approval fails', async () => {
        await showPendingUser();
        api.approveAdminCrewApplication.mockRejectedValue({ isAxiosError: true,
            response: { data: { message: '이미 가입된 크루가 있는 회원입니다.' } } });
        const dialog = await openApproval();
        const confirm = Array.from(dialog.querySelectorAll('button')).find(button => button.textContent === '즉시 승인')!;
        await act(async () => confirm.click());
        expect(container.textContent).toContain('이미 가입된 크루가 있는 회원입니다.');
        expect(container.textContent).toContain('가입 승인 대기');
        expect(container.textContent).not.toContain('가입을 승인했습니다.');
        expect(Array.from(container.querySelectorAll('button')).filter(button => button.textContent === '즉시 승인').every(button => !button.disabled)).toBe(true);
    });

    it.each([
        { accountStatus: 'SUSPENDED' as const },
        { crewApplications: [{ ...pending, crewJoinable: false }] },
        { crewMemberships: [{ crewId: 6, crewName: '기존크루', crewCode: 'CR-6',
            role: 'CREW_MEMBER' as const, crewManager: false, eventManager: false }] },
    ])('disables approval for blocked users or crews: %j', async overrides => {
        await showPendingUser(overrides);
        expect(Array.from(container.querySelectorAll('button')).filter(button => button.textContent === '즉시 승인').every(button => button.disabled)).toBe(true);
        expect(api.approveAdminCrewApplication).not.toHaveBeenCalled();
    });

    it('offers conversion for active non-students on desktop and mobile only', () => {
        expect(Array.from(container.querySelectorAll('button')).filter(item => item.textContent === '학생으로 변경')).toHaveLength(2);
        expect(container.querySelectorAll('tr')[2].textContent).not.toContain('학생으로 변경');
        expect(container.querySelectorAll('tr')[3].textContent).not.toContain('학생으로 변경');
    });

    it('requires student identity and updates the visible user after a successful conversion', async () => {
        api.convertAdminUserToStudent.mockResolvedValue({ ...regular, name: '김학생', userType: 'KUSBF' });
        const dialog = await open();
        expect(schools.getSchools).toHaveBeenCalledWith({ allowDevFallback: false });
        expect(dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
        expect(dialog.textContent).toContain('학교 이메일 인증은 현재 준비 중');
        await fill(dialog);
        await submit(dialog);
        expect(api.convertAdminUserToStudent).toHaveBeenCalledWith(12, { displayName: '김학생', schoolId: 3, studentNumber: '001234' });
        expect(container.querySelector('[role="dialog"]')).toBeNull();
        expect(container.textContent).toContain('김학생 사용자를 학생으로 변경했습니다.');
        expect(Array.from(container.querySelectorAll('button')).filter(item => item.textContent === '학생으로 변경')).toHaveLength(0);
    });

    it('keeps the form and identity values when the API rejects a duplicate student', async () => {
        api.convertAdminUserToStudent.mockRejectedValue({ isAxiosError: true, response: { data: { message: '이미 등록된 학교와 학번입니다.' } } });
        const dialog = await open();
        await fill(dialog);
        await submit(dialog);
        expect(dialog.querySelector('[role="alert"]')!.textContent).toContain('이미 등록된');
        expect(dialog.querySelectorAll('input')[1].value).toBe(' 001234 ');
        expect(container.textContent).not.toContain('사용자를 학생으로 변경했습니다.');
    });

    it('blocks duplicate submissions and dismissal while the change is in flight', async () => {
        let finish!: (user: AdminUser) => void;
        api.convertAdminUserToStudent.mockImplementation(() => new Promise<AdminUser>(resolve => { finish = resolve; }));
        const dialog = await open();
        await fill(dialog);
        await submit(dialog);
        await submit(dialog);
        expect(api.convertAdminUserToStudent).toHaveBeenCalledOnce();
        expect(dialog.querySelector<HTMLButtonElement>('button[type="button"]')!.disabled).toBe(true);
        await act(async () => finish({ ...regular, userType: 'KUSBF' }));
    });

    it('fails closed on a school-list error and allows retry', async () => {
        schools.getSchools.mockRejectedValueOnce(new Error('offline'));
        const dialog = await open();
        expect(dialog.querySelector('[role="alert"]')!.textContent).toContain('학교 목록을 불러오지 못했습니다.');
        expect(dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
        const retry = Array.from(dialog.querySelectorAll('button')).find(item => item.textContent === '학교 목록 다시 불러오기')!;
        await act(async () => retry.click());
        expect(dialog.querySelectorAll('option')).toHaveLength(2);
        expect(dialog.querySelector('[role="alert"]')).toBeNull();
        expect(api.convertAdminUserToStudent).not.toHaveBeenCalled();
    });

    it('contains keyboard focus and restores the opener after cancelling with Escape', async () => {
        const dialog = await open();
        const first = dialog.querySelector('input')!;
        const cancel = Array.from(dialog.querySelectorAll('button')).find(item => item.textContent === '취소')!;
        expect(document.activeElement).toBe(first);
        await act(async () => first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
        expect(document.activeElement).toBe(cancel);
        await act(async () => cancel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
        expect(document.activeElement).toBe(first);
        await act(async () => first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
        expect(container.querySelector('[role="dialog"]')).toBeNull();
        expect(document.activeElement?.textContent).toBe('학생으로 변경');
        expect(api.convertAdminUserToStudent).not.toHaveBeenCalled();
    });
});
