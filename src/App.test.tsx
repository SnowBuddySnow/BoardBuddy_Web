// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('./lib/axios', () => ({ default: http }));
vi.mock('./services/devMocks', async original => ({
    ...await original<typeof import('./services/devMocks')>(), isDevMode: () => false,
}));
vi.mock('./components/DevPanel', () => ({ default: () => null }));
import App from './App';

describe('real App management navigation with synthetic HTTP', () => {
    let root: Root;
    let container: HTMLDivElement;
    let width: number;
    let permissions: string[];
    let events: unknown[];
    let hasCrew: boolean;
    let crewOpen: boolean;
    let crewRole: string;
    const listeners = new Set<(event: { matches: boolean }) => void>();
    beforeEach(() => {
        vi.resetAllMocks();
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        localStorage.clear();
        // Synthetic jsdom storage only; no real account, credential or live auth bypass.
        localStorage.setItem('accessToken', 'synthetic-test-session');
        localStorage.setItem('autoLogin', 'true');
        localStorage.setItem('dev_operating_mode', 'OFF_SEASON');
        window.history.replaceState(null, '', '/?view=home');
        width = 390; permissions = ['PARTIES_MANAGE', 'EVENT_GROUPS_VIEW']; events = []; hasCrew = false; crewOpen = true; crewRole = 'CREW_MEMBER'; listeners.clear();
        vi.stubGlobal('matchMedia', () => ({
            matches: width >= 1024,
            addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => listeners.add(listener),
            removeEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => listeners.delete(listener),
        }));
        http.get.mockImplementation(async (path: string) => {
            let data: unknown;
            if (path === '/users/me') data = { userId: 7, userType: 'REGULAR', name: 'Synthetic host', role: crewRole, crew: hasCrew ? { crewId: 1, crewName:'Synthetic crew' } : null };
            else if (path === '/crews/1/season-stays/pass') data = {registered:true,name:'5박권',startsOn:'2026-10-01',endsOn:'2027-05-31',totalNights:5,usedNights:1,reservedNights:1,remainingNights:3};
            else if (path === '/crews/1') data = { crewId: 1, crew_id: 1, crewName: 'Synthetic crew', name: 'Synthetic crew', member_count: 2, seasonHouseActive: crewOpen };
            else if (path === '/schools' || path === '/crews/1/invitations' || path === '/crews/discover') data = [];
            else if (path.startsWith('/crews/1/calendar')) data = { calendar: [], my_reservations: [] };
            else if (path === '/operations/context') data = { permissions };
            else if (path === '/admin/crews') data = { developerAccess: false, crews: [], schools: [] };
            else if (path === '/users/me/reservations') data = [];
            else if (path === '/events') data = events;
            else if (path === '/crews/my-applications' || path === '/dashboard/events') data = [];
            else if (path === '/notifications') data = { items: [], unreadCount: 0 };
            else if (path === '/dashboard/organizer-groups') data = permissions.length ? [{ id: 2, name: 'Synthetic hosts' }] : [];
            else throw new Error(`Unexpected synthetic GET: ${path}`);
            return { data: { data } };
        });
        container = document.createElement('div'); document.body.append(container);
        root = createRoot(container);
    });
    afterEach(async () => {
        await act(async () => root.unmount()); container.remove();
        for (const write of [http.post, http.put, http.patch, http.delete]) expect(write).not.toHaveBeenCalled();
        localStorage.clear(); window.history.replaceState(null, '', '/'); vi.useRealTimers(); vi.unstubAllGlobals();
    });
    const render = async () => { await act(async () => { root.render(<App />); }); await settle(); };
    const settle = async () => { await act(async () => { await vi.dynamicImportSettled(); }); };
    const click = async (label: string) => {
        const button = Array.from(container.querySelectorAll('button')).find(node => node.textContent?.trim() === label || node.querySelector('h2')?.textContent === label);
        expect(button, label).toBeTruthy(); await act(async () => button!.click()); await settle();
    };
    const resize = async (nextWidth: number) => {
        width = nextWidth;
        await act(async () => listeners.forEach(listener => listener({ matches: width >= 1024 })));
        await settle();
    };

    it('keeps only core destinations below and opens profile from the top right', async () => {
        hasCrew = true; permissions = []; localStorage.setItem('dev_operating_mode', 'BOTH');
        await render();
        const nav = container.querySelector('nav[aria-label="하단 메뉴"]')!;
        expect(Array.from(nav.querySelectorAll('button')).map(button => button.textContent?.trim())).toEqual(['홈', '시즌방', '이벤트', '내 크루']);
        expect(nav.querySelector('[aria-label="내 정보"]')).toBeNull();
        const toolbar = container.querySelector('header[aria-label="계정 메뉴"]')!;
        expect(toolbar.querySelector('[aria-label="알림"]')).toBeTruthy();
        await act(async () => (toolbar.querySelector('[aria-label="내 정보"]') as HTMLButtonElement).click());
        await settle(); expect(container.textContent).toContain('내 정보');
    });

    it('lets a new member skip crew search and resume it from Home without applying', async () => {
        permissions=[];window.history.replaceState(null,'','/?view=search_crew');
        await render();await click('다음에 하기');
        expect(new URL(window.location.href).searchParams.get('view')).toBe('home');
        await click('크루 가입하기크루를 찾아 PIN으로 가입 신청하세요.');
        expect(container.querySelector('h1')?.textContent).toBe('크루 검색');
        expect(hasCrew).toBe(false);
    });

    it.each(['CREW_CAPTAIN', 'CREW_MANAGER'])('lets %s open settings directly from Home and My Crew without a manager-list request', async role => {
        hasCrew = true; crewRole = role; permissions = ['CREW_MEMBERS_MANAGE'];
        localStorage.setItem('boardbuddy_captain_onboarding_v1:7', 'completed');
        await render();
        expect(container.querySelector('h2')?.textContent).toBe('Synthetic crew와 함께하는 오늘');
        expect(Array.from(container.querySelectorAll('span')).some(node => node.textContent?.trim() === 'Synthetic crew')).toBe(false);
        await click('크루 설정');
        expect(container.querySelector('h1')?.textContent).toBe('크루 설정');
        await act(async () => (container.querySelector('[aria-label="뒤로 가기"]') as HTMLButtonElement).click()); await settle();
        expect(container.querySelector('h2')?.textContent).toBe('Synthetic crew와 함께하는 오늘');
        await click('내 크루');
        expect(container.querySelector('h1')?.textContent).toBe('내 크루');
        await click('크루 설정');
        expect(container.querySelector('h1')?.textContent).toBe('크루 설정');
        expect(http.get).not.toHaveBeenCalledWith('/crews/1/managers');
    });

    it.each(['CREW_CAPTAIN', 'CREW_MANAGER'])('offers desktop crew settings in Operations Center for %s', async role => {
        width = 1440; hasCrew = true; crewRole = role; permissions = ['CREW_MEMBERS_MANAGE'];
        localStorage.setItem('boardbuddy_captain_onboarding_v1:7', 'completed');
        window.history.replaceState(null, '', '/?view=operations_center');
        await render(); await click('크루 설정');
        expect(container.querySelector('h1')?.textContent).toBe('크루 설정');
        await act(async () => (container.querySelector('[aria-label="뒤로 가기"]') as HTMLButtonElement).click()); await settle();
        expect(container.querySelector('h1')?.textContent).toBe('운영 센터');
    });

    it('hides member settings and rejects direct settings entry before loading the form', async () => {
        hasCrew = true; permissions = [];
        await render();
        expect(Array.from(container.querySelectorAll('button')).some(node=>node.textContent?.trim()==='크루 설정')).toBe(false);
        await act(async () => root.unmount()); root = createRoot(container);
        window.history.replaceState(null, '', '/?view=crew_settings');
        await render();
        expect(container.querySelector('[role="alert"]')?.textContent).toContain('크루장과 임원진만');
        expect(http.get).not.toHaveBeenCalledWith('/schools');
        expect(container.querySelector('input')).toBeNull();
    });

    it.each([320, 390, 768, 1023, 1024])('blocks member reservation views for a closed crew at %spx', async viewport => {
        width = viewport; hasCrew = true; crewOpen = false;
        localStorage.setItem('dev_operating_mode', 'BOTH');
        for (const view of ['reservation', 'stats', 'my_reservations']) {
            window.history.replaceState(null, '', `/?view=${view}`);
            await render();
            expect(container.textContent).toContain('시즌방 예약을 이용할 수 없습니다');
            await act(async () => root.unmount());
            root = createRoot(container);
        }
        expect(http.get.mock.calls.some(([path]) => /reservations|calendar|usage-statistics/.test(path))).toBe(false);
    });

    it('uses authoritative pass balances and lazily opens the shared personal calendar', async () => {
        hasCrew = true; permissions = []; localStorage.setItem('dev_operating_mode','BOTH');
        window.history.replaceState(null, '', '/?view=my_page');
        await render();
        expect(container.textContent).toContain('내 정보');
        expect(container.textContent).toContain('나의 달력');
        expect(container.textContent).toContain('추가 예약 3박 가능');
        expect(http.get).not.toHaveBeenCalledWith('/users/me/reservations');
        expect(http.get.mock.calls.some(([path])=>path.includes('/calendar/my?'))).toBe(false);
        await click('나의 달력');
        expect(http.get.mock.calls.some(([path])=>path.includes('/calendar/my?'))).toBe(true);
    });

    it('shows reservation management to a permitted desktop host during the season', async () => {
        width = 1024; hasCrew = true; permissions.push('RESERVATIONS_MANAGE'); localStorage.setItem('dev_operating_mode', 'BOTH');
        window.history.replaceState(null, '', '/?view=operations_center');
        await render();
        expect(container.textContent).toContain('이벤트 관리');
        expect(container.textContent).toContain('예약 관리');

    });

    it('allows an authorized mobile host into Operations Center and event management', async () => {
        await render(); await click('운영 센터');
        expect(container.querySelector('h1')?.textContent).toBe('운영 센터');
        await click('이벤트 관리');
        expect(http.get).toHaveBeenCalledWith('/dashboard/events');
        expect(container.textContent).not.toContain('데스크톱에서 관리해 주세요');
    });

    it('allows direct dashboard entry on narrow screens', async () => {
        width = 320; window.history.replaceState(null, '', '/?view=dashboard_parties');
        await render();
        expect(http.get).toHaveBeenCalledWith('/dashboard/events');
        expect(container.textContent).toContain('관리 중인 이벤트가 없습니다');
    });

    it('keeps authorized management available across both breakpoint crossings', async () => {
        width = 1024; await render();
        expect(container.querySelector('h1')?.textContent).toBe('운영 센터');
        await resize(390);
        expect(container.querySelector('h1')?.textContent).toBe('운영 센터');
        await resize(1024);
        expect(container.querySelector('h1')?.textContent).toBe('운영 센터');
    });

    it('supports calendar-only access in explicit off-season mode', async () => {
        hasCrew = true; permissions = [];
        await render(); await click('시즌방');
        expect(container.querySelector('h1')?.textContent).toContain('시즌방 캘린더');
        expect(container.textContent).toContain('현재는 이용 현황만 조회');
        expect(http.get.mock.calls.some(([path]) => path.startsWith('/crews/1/calendar'))).toBe(true);
        expect(http.get.mock.calls.some(([path]) => /reservations|usage-statistics/.test(path))).toBe(false);
    });

    it.each([390, 1024])('does not grant a non-host dashboard access at %spx', async viewport => {
        width = viewport; permissions = []; window.history.replaceState(null, '', '/?view=operations_center');
        await render();
        expect(container.textContent).toContain('관리 권한이 없습니다');
        expect(http.get).not.toHaveBeenCalledWith('/dashboard/events');
    });

    it.each([
        ['2026-10-25T08:59:59Z', 0], ['2026-10-25T09:00:00Z', 1],
    ])('keeps real Home and event-list opening counts aligned at %s', async (now, count) => {
        vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(now)); hasCrew = true;
        events = [{ id: 11, title: 'Synthetic Korean opening', startsAt: '2026-10-25T20:00:00',
            applicationStartsAt: '2026-10-25T18:00:00', status: 'OPEN', joinedCount: 0, capacity: 2,
            joinPolicy: 'INSTANT', visibilityType: 'PUBLIC', planningMode: 'MANAGER_PLANNED', activityType: 'OTHER' }];
        await render();
        expect(container.textContent?.replace(/\s/g, '')).toContain(`참가가능${count}개`);
        expect(container.textContent?.includes('Synthetic Korean opening')).toBe(count === 1);
        const eventTab = Array.from(container.querySelectorAll('nav[aria-label="하단 메뉴"] button'))
            .find(button => button.textContent?.endsWith('이벤트'));
        expect(eventTab).toBeTruthy(); await act(async () => (eventTab as HTMLButtonElement).click()); await settle();
        expect(container.textContent?.replace(/\s/g, '')).toContain(`참가가능${count}개`);
        expect(container.textContent).toContain('20:00');
        expect(container.textContent).not.toMatch(/한국표준시|UTC|GMT/);
    });
});
