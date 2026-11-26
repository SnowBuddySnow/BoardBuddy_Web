// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { EventGuestVerificationSettings } from './EventGuestVerificationSettings';

const api = vi.hoisted(() => ({
    getEventGuestVerificationSettings: vi.fn(),
    issueEventGuestVerificationLink: vi.fn(),
    revokeEventGuestVerificationLink: vi.fn(),
}));
vi.mock('../../services/eventGuestVerification', () => api);

it('issues a fragment link for the selected event and removes it after revocation', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const code = 'x'.repeat(43);
    api.getEventGuestVerificationSettings.mockResolvedValue({ available: true, canIssue: true, linkActive: false, expiresAt: null });
    api.issueEventGuestVerificationLink.mockResolvedValue({ linkToken: code, expiresAt: '2027-02-20T14:00:00' });
    api.revokeEventGuestVerificationLink.mockResolvedValue(undefined);

    function button(label: string): HTMLButtonElement {
        return Array.from(container.querySelectorAll('button')).find(item => item.textContent === label)!;
    }

    try {
        await act(async () => root.render(<EventGuestVerificationSettings eventId={42} />));
        await act(async () => button('신청 링크 발급').click());
        const link = new URL(container.querySelector<HTMLInputElement>('input[readonly]')!.value);
        expect(api.issueEventGuestVerificationLink).toHaveBeenCalledWith(42, null);
        expect(link.search).toBe('?view=event_guest_verification');
        expect(link.hash).toBe(`#eventGuest=${code}`);
        await act(async () => button('링크 폐기').click());
        expect(api.revokeEventGuestVerificationLink).toHaveBeenCalledWith(42);
        expect(container.querySelector<HTMLInputElement>('input[readonly]')).toBeNull();
        expect(container.textContent).toContain('링크를 폐기했어요.');
    } finally {
        await act(async () => root.unmount());
        container.remove();
        confirm.mockRestore();
        vi.unstubAllGlobals();
    }
});
