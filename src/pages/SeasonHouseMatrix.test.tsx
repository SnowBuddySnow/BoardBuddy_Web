// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as matrixApi from '../services/seasonHouseMatrix';
import SeasonHouseMatrix from './SeasonHouseMatrix';

vi.mock('../services/seasonHouseMatrix', async () => {
  const actual = await vi.importActual<typeof import('../services/seasonHouseMatrix')>('../services/seasonHouseMatrix');
  return {
    ...actual,
    getSeasonHouseMatrix: vi.fn(),
    listMemberManagerNotes: vi.fn(),
    addMemberManagerNote: vi.fn(),
    upsertStayCharge: vi.fn(),
    updateSeasonHousePolicy: vi.fn(),
  };
});

const sampleMatrix: matrixApi.SeasonHouseMatrixView = {
  crewId: 10,
  crewName: 'Alpine',
  from: '2026-12-01',
  to: '2026-12-14',
  serverNowKst: '2026-12-10T12:00:00',
  policy: {
    active: true,
    dailyCapacity: 12,
    capacityLimited: true,
    teachingEnabled: false,
    openDayOfWeek: 'WEDNESDAY',
    openTimeKst: '20:00:00',
    openOffsetDays: 7,
    bookingWindowDays: 7,
    cancelCutoffDayOffset: 0,
    cancelCutoffTimeKst: '04:00:00',
    guestEnabled: true,
    guestApprovalMode: 'INVITE_REQUIRED',
    guestDailyCapacity: 3,
    guestPerNightFeeKrw: 25000,
  },
  passPlans: [],
  days: Array.from({ length: 14 }, (_, idx) => {
    const day = String(idx + 1).padStart(2, '0');
    return {
      date: `2026-12-${day}`,
      pastCutoff: idx + 1 <= 10,
      cancelCutoffAtKst: `2026-12-${day}T04:00:00`,
      confirmedCount: idx === 11 ? 2 : 0,
      confirmedGuestCount: idx === 11 ? 1 : 0,
      waitingCount: 0,
      pendingApprovalCount: 0,
    };
  }),
  internalEvents: [
    {
      eventId: 90,
      publicCode: 'EV001',
      title: '대청소',
      activityType: 'CLEANING',
      startsAt: '2026-12-12T18:00:00',
      endsAt: '2026-12-12T20:00:00',
    },
  ],
  members: [
    {
      membershipId: 2,
      accountId: 20,
      name: '한지우',
      studentNumber: '24001',
      role: 'CREW_MEMBER',
      pass: {
        passId: 101,
        planId: null,
        name: '예약금형 10박권',
        startsOn: '2026-11-01',
        endsOn: '2027-04-30',
        totalNights: 10,
        usedNights: 1,
        reservedNights: 0,
        remainingNights: 9,
        perNightFeeKrw: 10000,
        passCharge: {
          id: 500,
          chargeKind: 'PASS_FEE',
          memberSeasonPassId: 101,
          reservationId: null,
          amountKrw: 100000,
          paymentStatus: 'PAID',
          depositorName: '한지우',
          paidAt: '2026-11-02T10:00:00',
          note: null,
        },
      },
      penaltyPoints: 1,
      noteCount: 1,
      latestNotePreview: '청소 미흡',
      cells: {
        '2026-12-12': {
          reservationId: 700,
          status: 'CONFIRMED',
          stayCompleted: true,
          waitlistPosition: null,
          teachingRequested: false,
          managerMemo: null,
          usageCharge: {
            id: 501,
            chargeKind: 'STAY_USAGE_FEE',
            memberSeasonPassId: null,
            reservationId: 700,
            amountKrw: 10000,
            paymentStatus: 'UNPAID',
            depositorName: null,
            paidAt: null,
            note: null,
          },
        },
      },
    },
    {
      membershipId: 1,
      accountId: 10,
      name: '강민준',
      studentNumber: '22001',
      role: 'CREW_CAPTAIN',
      pass: null,
      penaltyPoints: 0,
      noteCount: 0,
      latestNotePreview: null,
      cells: {},
    },
  ],
  guests: [
    {
      guestId: 300,
      guestCode: 'GU001',
      name: '서게스트',
      maskedPhone: '010-****-4821',
      phoneVerifiedAt: '2026-12-09T10:00:00',
      invitedByName: '강민준',
      cells: {
        '2026-12-12': {
          reservationId: 701,
          status: 'CONFIRMED',
          stayCompleted: false,
          waitlistPosition: null,
          teachingRequested: false,
          managerMemo: null,
          usageCharge: {
            id: 502,
            chargeKind: 'STAY_USAGE_FEE',
            memberSeasonPassId: null,
            reservationId: 701,
            amountKrw: 25000,
            paymentStatus: 'UNPAID',
            depositorName: null,
            paidAt: null,
            note: null,
          },
        },
      },
    },
  ],
};

describe('SeasonHouseMatrix', () => {
  let root: ReturnType<typeof createRoot>;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.mocked(matrixApi.getSeasonHouseMatrix).mockResolvedValue(sampleMatrix);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders Korean alphabetical member rows, weekly headers, internal events, and verified guests', async () => {
    await act(async () => {
      root.render(<SeasonHouseMatrix crewId={10} onBack={() => {}} />);
    });

    const rowHeaders = Array.from(container.querySelectorAll('tbody th[scope="row"]')).map((el) => el.textContent || '');
    const gangIdx = rowHeaders.findIndex((text) => text.includes('강민준'));
    const hanIdx = rowHeaders.findIndex((text) => text.includes('한지우'));
    expect(gangIdx).toBeGreaterThanOrEqual(0);
    expect(hanIdx).toBeGreaterThan(gangIdx);

    const text = container.textContent || '';
    expect(text).toContain('1주차');
    expect(text).toContain('2주차');
    expect(text).toContain('대청소');
    expect(text).toContain('서게스트');
    expect(text).toContain('초대: 강민준');
    expect(text).toContain('벌1');
    expect(text).toContain('잔여 9/10');
  });
});
