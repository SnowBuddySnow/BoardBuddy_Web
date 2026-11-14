// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const http=vi.hoisted(()=>({get:vi.fn(),post:vi.fn(),delete:vi.fn()}));
vi.mock('../lib/axios',()=>({default:http}));
import MyReservations from './MyReservations';
import PersonalCalendarPreview from '../components/PersonalCalendarPreview';
let container:HTMLDivElement; let root:ReturnType<typeof createRoot>; let teaching=false;
beforeEach(()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true); vi.useFakeTimers({toFake:['Date']}); vi.setSystemTime(new Date('2026-11-13T03:00:00Z')); vi.clearAllMocks(); teaching=false;
 const result=(data:unknown)=>({data:{data}});
 http.get.mockImplementation(async(path:string)=>{
  if(path==='/users/me')return result({crew:{crewId:17}});
  if(path==='/crews/17')return result({teachingEnabled:true});
  if(path.includes('/reservations/days/'))return result({bookable:true});
  if(path.includes('/calendar/my?'))return result({usage_count:1,my_reservations:[{date:'2026-11-15',status:'CONFIRMED',reservation_id:81,teaching},{date:'2026-11-16',status:'WAITING',reservation_id:82,waiting_order:3},{date:'2026-11-17',status:'CANCELED',reservation_id:83}]});
  throw Error(path);
 });
 http.post.mockImplementation(async()=>{teaching=true;return result({});});
 container=document.createElement('div');document.body.append(container);root=createRoot(container);
});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.useRealTimers();vi.unstubAllGlobals();});
it('renders confirmed and waiting on their exact dates, excludes canceled, and persists teaching',async()=>{
 await act(async()=>root.render(<MyReservations onBack={vi.fn()}/>));
 const day=(n:number)=>container.querySelector(`[aria-label="2026년 11월 ${n}일"]`) as HTMLElement;
 expect(day(15).querySelector('.reservation-confirmed')).toBeTruthy();
 expect(day(16).querySelector('.reservation-pending')).toBeTruthy();
 expect(day(17).querySelector('.reservation-pending')).toBeNull();
 await act(async()=>day(16).click());expect(container.textContent).toContain('대기 3번');expect(container.querySelector('[aria-label="강습 신청"]')).toBeNull();
 await act(async()=>day(15).click());
 await act(async()=>(container.querySelector('[aria-label="강습 신청"]') as HTMLInputElement).click());
 expect(http.post).toHaveBeenCalledWith('/crews/17/reservations/81/teaching');
 expect((container.querySelector('[aria-label="강습 신청"]') as HTMLInputElement).checked).toBe(true);
});
it('loads only the two required months for a 14-day home preview crossing month end',async()=>{
 vi.setSystemTime(new Date('2026-11-28T03:00:00Z'));
 await act(async()=>root.render(<PersonalCalendarPreview crewId={17} onOpen={vi.fn()}/>));
 expect(http.get.mock.calls.map(([path])=>path)).toEqual(['/crews/17/calendar/my?date=2026-11-01','/crews/17/calendar/my?date=2026-12-01']);
 expect(container.querySelectorAll('button[aria-label]')).toHaveLength(14);
 expect(container.textContent).not.toContain('—');
 expect([...container.querySelectorAll('span')].filter(node=>node.textContent==='일')).toHaveLength(1);
});

it('does not present a failed account/calendar load as an empty reservation',async()=>{
 http.get.mockRejectedValue(new Error('offline'));
 await act(async()=>root.render(<MyReservations onBack={vi.fn()}/>));
 expect(container.textContent).toContain('예약 현황을 확인할 수 없습니다.');
 expect(container.textContent).not.toContain('예약 내역이 없습니다.');
});
