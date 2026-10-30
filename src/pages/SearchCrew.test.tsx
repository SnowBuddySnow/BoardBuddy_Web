// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ discoverCrews: vi.fn(), applyToCrew: vi.fn() }));
vi.mock('../services/crew', () => api);
import SearchCrew from './SearchCrew';

describe('crew admission outcomes', () => {
    let root: Root;
    let container: HTMLDivElement;
    const onJoined = vi.fn();

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        api.discoverCrews.mockResolvedValue([{
            crewId: 11, crewName: 'School Crew', crewCode: 'CR-TEST', schoolName: 'Crew school',
            memberCount: 5, profileImageUrl: null, schoolVerificationRequired: true, verifiedSchoolAutoJoinEnabled: true,
        }]);
        container = document.createElement('div');
        document.body.append(container);
        root = createRoot(container);
        await act(async () => root.render(<SearchCrew onBack={vi.fn()} onJoined={onJoined} />));
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
        vi.unstubAllGlobals();
    });

    const submit = async () => {
        const join = Array.from(container.querySelectorAll('button')).find(button => button.textContent === '가입')!;
        await act(async () => join.click());
        const input = container.querySelector<HTMLInputElement>('input[aria-label="4자리 가입 PIN"]')!;
        await act(async () => {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '0123');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    };

    it('shows the matching-school policy and review fallback when both settings are on', async () => {
        expect(container.textContent).toContain('소속 학교 인증 시 바로 가입');
        expect(container.textContent).not.toContain('학교 인증 필수');
        const join = Array.from(container.querySelectorAll('button')).find(button => button.textContent === '가입')!;
        await act(async () => join.click());
        expect(container.textContent).toContain('미인증 또는 다른 학교 멤버의 신청은 운영진이 검토합니다.');
    });

    it('refreshes membership through the callback only after immediate admission', async () => {
        api.applyToCrew.mockResolvedValue({ crewId: 11, status: 'JOINED' });
        await submit();
        expect(api.applyToCrew).toHaveBeenCalledWith(11, '0123');
        expect(onJoined).toHaveBeenCalledOnce();
        expect(container.textContent).toContain('크루에 가입했습니다.');
        expect(container.textContent).not.toContain('승인을 기다려');
    });

    it('keeps unverified applicants in the pending-review experience', async () => {
        api.applyToCrew.mockResolvedValue({ crewId: 11, status: 'PENDING' });
        await submit();
        expect(onJoined).not.toHaveBeenCalled();
        expect(container.textContent).toContain('크루 운영진의 승인을 기다려 주세요.');
    });

    it('keeps the PIN form open after rejection without claiming success', async () => {
        api.applyToCrew.mockRejectedValue({ isAxiosError: true, response: { data: { message: 'Invalid crew PIN' } } });
        await submit();
        expect(onJoined).not.toHaveBeenCalled();
        expect(container.querySelector('form')).not.toBeNull();
        expect(container.textContent).toContain('가입 PIN이 올바르지 않습니다.');
    });
});
