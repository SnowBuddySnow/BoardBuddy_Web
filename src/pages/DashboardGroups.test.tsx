// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../lib/axios', () => ({ default: http }));
vi.mock('../services/devMocks', async original => ({
    ...await original<typeof import('../services/devMocks')>(), isDevMode: () => false,
}));
import DashboardGroups from './DashboardGroups';

describe('group list does not invent membership roles', () => {
    let root: Root;
    let container: HTMLDivElement;
    beforeEach(() => {
        vi.resetAllMocks();
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        localStorage.clear();
        http.get.mockImplementation(async (path: string) => {
            if (path === '/dashboard/organizer-groups') return { data: { data: [{ id: 2, name: 'Synthetic hosts' }] } };
            if (path === '/dashboard/organizer-group-invitations') return { data: { data: [] } };
            throw new Error(`Unexpected synthetic GET: ${path}`);
        });
        container = document.createElement('div'); document.body.append(container);
        root = createRoot(container);
    });
    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove(); localStorage.clear(); vi.unstubAllGlobals();
    });

    it.each([null, 'admin', 'organizer', 'member', 'viewer'])(
        'uses a neutral badge when the API omits role, despite override %s', async override => {
            if (override) localStorage.setItem('dev_role_override', override);
            const openGroup = vi.fn();
            await act(async () => root.render(<DashboardGroups canCreate={false}
                onBackToHomeClick={vi.fn()} onPartiesClick={vi.fn()} onViewGroupDetailClick={openGroup} />));
            expect(container.textContent).toContain('Synthetic hosts');
            expect(container.textContent).toContain('멤버별 권한 확인');
            expect(container.textContent).not.toMatch(/호스트 그룹 (오너|매니저|뷰어)|플랫폼 관리자|일반 멤버|호스트 관리 가능/);
            const detail = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('그룹 상세'));
            expect(detail).toBeTruthy();
            await act(async () => detail!.click());
            expect(openGroup).toHaveBeenCalledWith(2);
            expect(http.get.mock.calls.map(([path]) => path).sort()).toEqual([
                '/dashboard/organizer-group-invitations', '/dashboard/organizer-groups',
            ]);
        },
    );
});
