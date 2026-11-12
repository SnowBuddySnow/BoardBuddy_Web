// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ listCrewInvitations: vi.fn(), createCrewInvitation: vi.fn(), revokeCrewInvitation: vi.fn() }));
vi.mock('../../services/onboarding', () => api);
vi.mock('qrcode', () => ({ toDataURL: async () => 'data:image/png;base64,synthetic-only' }));
import { CrewInvitationPanel } from './CrewInvitationPanel';
let root: Root; let container: HTMLDivElement;
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); container = document.createElement('div'); document.body.append(container); root = createRoot(container); api.listCrewInvitations.mockResolvedValue([]); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
it('reveals the new link once and removes its QR and proof immediately after revocation', async () => {
    const invitation = { id: 'synthetic-id', expiresAt: new Date(Date.now() + 86_400_000).toISOString(), maxUses: 50, useCount: 0, revokedAt: null, createdAt: '2026-11-13T00:00:00' };
    api.createCrewInvitation.mockResolvedValue({ token: 'a'.repeat(43), invitation });
    await act(async () => root.render(<CrewInvitationPanel crewId={17} />));
    const click = async (text: string) => { const button = Array.from(container.querySelectorAll('button')).find(el => el.textContent === text)!; await act(async () => button.click()); };
    await click('새 초대 링크 만들기');
    expect(api.createCrewInvitation).toHaveBeenCalledWith(17, 72, 50);
    const url = new URL(container.querySelector('textarea')!.value);
    expect(url.hash).toContain('crewInvite='); expect(url.search).not.toContain('a'.repeat(43));
    expect(container.querySelector('img')).not.toBeNull();
    api.listCrewInvitations.mockResolvedValue([{ ...invitation, revokedAt: '2026-11-13T01:00:00' }]);
    await click('링크 회수');
    expect(api.revokeCrewInvitation).toHaveBeenCalledWith(17, 'synthetic-id');
    expect(container.querySelector('textarea')).toBeNull(); expect(container.querySelector('img')).toBeNull();
});
