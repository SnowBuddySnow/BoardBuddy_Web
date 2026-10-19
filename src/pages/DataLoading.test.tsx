// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../lib/axios', () => ({ default: http }));
// Exercise page effects without conflating them with the unchanged calendar widget.
vi.mock('../components/Calendar', () => ({ Calendar: ({ onDayClick }: { onDayClick: (day: number) => void }) => (
    <button onClick={() => onDayClick(19)}>Synthetic day 19</button>
) }));
import MemberStats from './MemberStats';
import Promote from './Promote';
import Reservation from './Reservation';
import ReservationStats from './ReservationStats';
import MyReservations from './MyReservations';

describe('page fetch dependencies and reservation cache refresh (synthetic HTTP only)', () => {
    let root: Root;
    let container: HTMLDivElement;
    let dayData: unknown;
    const result = (data: unknown) => ({ data: { data } });
    beforeEach(() => {
        vi.resetAllMocks(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.stubGlobal('alert', vi.fn());
        vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-02-19T09:00:00Z'));
        localStorage.clear();
        dayData = { date: '2026-02-19', confirmedCount: 0, reservations: [] };
        http.get.mockImplementation(async (path: string) => {
            if (path === '/users/me') return result({ userId: 7, crew: { crewId: 1 } });
            if (path === '/users/me/reservations') return result([]);
            if (/^\/crews\/[12]$/.test(path)) return result({ dailyCapacity: 2 });
            if (/\/(usage-statistics|managers|members)$/.test(path)) return result([]);
            if (path.includes('/calendar/my?')) return result({ my_reservations: [], usage_count: 0 });
            if (path.includes('/calendar?')) return result({ calendar: [], my_reservations: [] });
            if (path.includes('/reservations/days/')) return result(dayData);
            throw new Error(`Unexpected synthetic GET: ${path}`);
        });
        http.post.mockResolvedValue(result({}));
        container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    });
    afterEach(async () => {
        await act(async () => root.unmount()); container.remove(); localStorage.clear();
        vi.useRealTimers(); vi.unstubAllGlobals();
    });
    const countGets = (fragment: string) => http.get.mock.calls.filter(([path]) => String(path).includes(fragment)).length;
    const click = async (text: string) => {
        const button = Array.from(container.querySelectorAll('button')).find(node => node.textContent?.trim() === text);
        expect(button, text).toBeTruthy(); await act(async () => button!.click());
    };

    it('refetches usage stats for a new crew/sort, not for unrelated parent renders', async () => {
        await act(async () => root.render(<MemberStats crewId={1} onBack={vi.fn()} />));
        await act(async () => root.render(<MemberStats crewId={1} onBack={vi.fn()} />));
        expect(countGets('/usage-statistics')).toBe(1);
        await act(async () => root.render(<MemberStats crewId={2} onBack={vi.fn()} />));
        expect(countGets('/usage-statistics')).toBe(2);
        await act(async () => {
            const select = container.querySelector('select')!;
            select.value = 'usageCount-desc'; select.dispatchEvent(new Event('change', { bubbles: true }));
        });
        expect(countGets('/usage-statistics')).toBe(3);
        expect(http.get).toHaveBeenLastCalledWith('/crews/2/usage-statistics', expect.objectContaining({ params: expect.objectContaining({ sortBy: 'usageCount', sortOrder: 'desc' }) }));
    });

    it('reloads manager/member lists only when the crew changes, without role writes', async () => {
        await act(async () => root.render(<Promote crewId={1} onBack={vi.fn()} />));
        await act(async () => root.render(<Promote crewId={1} onBack={vi.fn()} />));
        expect(countGets('/managers')).toBe(1);
        await act(async () => root.render(<Promote crewId={2} onBack={vi.fn()} />));
        expect(countGets('/managers')).toBe(2); expect(countGets('/members')).toBe(2);
        expect(http.post).not.toHaveBeenCalled();
    });

    it('reloads guest reservation settings for a new crew without fetching a member identity', async () => {
        await act(async () => root.render(<Reservation isGuest guestCrewId={1} onBack={vi.fn()} />));
        await act(async () => root.render(<Reservation isGuest guestCrewId={1} onBack={vi.fn()} />));
        expect(http.get).toHaveBeenCalledTimes(1);
        await act(async () => root.render(<Reservation isGuest guestCrewId={2} onBack={vi.fn()} />));
        expect(http.get).toHaveBeenCalledTimes(2); expect(http.get).toHaveBeenLastCalledWith('/crews/2');
    });

    it('fetches the initial personal calendar once after resolving the crew', async () => {
        await act(async () => root.render(<MyReservations onBack={vi.fn()} />));
        expect(countGets('/calendar/my?')).toBe(1);
        await act(async () => root.render(<MyReservations onBack={vi.fn()} />));
        expect(countGets('/calendar/my?')).toBe(1);
    });

    it('caches an empty day without starting a fetch loop on state updates', async () => {
        dayData = null;
        await act(async () => root.render(<ReservationStats onBack={vi.fn()} />));
        await act(async () => root.render(<ReservationStats onBack={vi.fn()} />));
        await click('Synthetic day 19');
        expect(countGets('/reservations/days/')).toBe(1);
        expect(http.post).not.toHaveBeenCalled();
    });

    it('refreshes cached day details after a successful reservation write', async () => {
        await act(async () => root.render(<ReservationStats onBack={vi.fn()} />));
        await click('Synthetic day 19');
        expect(countGets('/reservations/days/')).toBe(1);
        dayData = { date: '2026-02-19', confirmedCount: 1, reservations: [] };
        await click('예약하기');
        expect(http.post).toHaveBeenCalledOnce();
        expect(countGets('/reservations/days/')).toBe(2);
        expect(container.textContent).toContain('1명/2');
    });
});
