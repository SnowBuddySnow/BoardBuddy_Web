// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ManagerFeatureOnboarding from './ManagerFeatureOnboarding';
import CrewDetail from '../pages/CrewDetail';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../services/user', () => ({
  getUserInfo: vi.fn(),
}));

vi.mock('../services/crew', () => ({
  getCrewInfo: vi.fn(),
}));

vi.mock('../components/guest/GuestInviteShareCard', () => ({
  GuestInviteShareCard: () => null,
}));

import { getUserInfo } from '../services/user';
import { getCrewInfo } from '../services/crew';

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

describe('ManagerFeatureOnboarding & CrewDetail entry button', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
      });
    }
    container?.remove();
    root = null;
    container = null;
    vi.clearAllMocks();
  });

  it('walks through all 7 interactive demo features without backend calls', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    const onClose = vi.fn();
    const onOpenMatrix = vi.fn();

    await act(async () => {
      root?.render(
        <ManagerFeatureOnboarding
          open={true}
          crewName="보드버디 알파인"
          onClose={onClose}
          onOpenMatrix={onOpenMatrix}
        />,
      );
    });

    const dialog = container.querySelector('dialog');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('closedby')).toBe('any');
    expect(container.textContent).toContain('시즌방 매니저 기능 온보딩');
    expect(container.textContent).toContain('김민수');
    expect(container.textContent).toContain('1 / 7');

    const clickButtonByText = async (label: string) => {
      const btn = Array.from(container!.querySelectorAll('button')).find((b) =>
        b.textContent?.includes(label),
      );
      expect(btn, `Expected button containing "${label}"`).toBeDefined();
      await act(async () => {
        btn!.click();
      });
    };

    // Step 1 -> Step 2 (auto open)
    await clickButtonByText('다음');
    expect(container.textContent).toContain('자동 오픈 일정');
    expect(container.textContent).not.toContain('KST');

    // Step 2 -> Step 3 (cancel lock + override)
    await clickButtonByText('다음');
    expect(container.textContent).toContain('당일 04:00');
    expect(container.textContent).not.toContain('KST');
    await clickButtonByText('운영진 예외 취소 체험하기');
    expect(container.textContent).toContain('예외 취소 완료');

    // Step 3 -> Step 4 (dual charges)
    await clickButtonByText('다음');
    expect(container.textContent).toContain('이용권 예약금');
    expect(container.textContent).toContain('숙박 실제 이용금');
    expect(container.textContent).not.toContain('PASS_FEE');
    expect(container.textContent).not.toContain('STAY_USAGE_FEE');
    await clickButtonByText('입금 확인 처리 체험하기');
    expect(container.textContent).toContain('미입금으로 되돌리기');

    // Step 4 -> Step 5 (unified events)
    await clickButtonByText('다음');
    expect(container.textContent).toContain('시즌방 대청소');

    // Step 5 -> Step 6 (guest phone verification & approval)
    await clickButtonByText('다음');
    expect(container.textContent).toContain('휴대폰 본인인증 완료');
    await clickButtonByText('게스트 승인');
    expect(container.textContent).toContain('승인 확정');

    // Step 6 -> Step 7 (private notes with date + optional email + matrix CTA)
    await clickButtonByText('다음');
    expect(container.textContent).toContain('부원 본인 비공개');
    expect(container.textContent).toContain('2026-12-08');
    expect(container.querySelector('input[type="date"][aria-label="메모 날짜"]')).not.toBeNull();
    expect(container.textContent).toContain('이메일 비필수화 적용');
    expect(container.textContent).toContain('실제 매트릭스 열기');

    await clickButtonByText('실제 매트릭스 열기');
    expect(onOpenMatrix).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the demo trigger button on CrewDetail for managers and opens the onboarding dialog', async () => {
    vi.mocked(getUserInfo).mockResolvedValue({
      id: 1,
      name: '운영진',
      role: 'CREW_MANAGER',
      crew: { crewId: 10, crewName: '보드버디 크루', role: 'CREW_MANAGER' },
    } as never);
    vi.mocked(getCrewInfo).mockResolvedValue({
      crew_id: 10,
      name: '보드버디 크루',
      univ: '테스트대학교',
      president_name: '김크루장',
      member_count: 24,
      seasonHouseGuestEnabled: true,
    } as never);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <CrewDetail
          onBack={vi.fn()}
          onCalendarClick={vi.fn()}
          onMemberClick={vi.fn()}
          onSettingsClick={vi.fn()}
          onPassesClick={vi.fn()}
          onSeasonMatrixClick={vi.fn()}
          seasonAvailable={true}
        />,
      );
    });
    await flush();

    const triggerBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('운영진 기능 온보딩 체험하기'),
    );
    expect(triggerBtn).toBeDefined();

    await act(async () => {
      triggerBtn!.click();
    });

    const dialog = container.querySelector('dialog');
    expect(dialog?.hasAttribute('open')).toBe(true);
    expect(container.textContent).toContain('시즌방 매니저 기능 온보딩');
  });

  it('does not show the manager onboarding demo button to regular crew members', async () => {
    vi.mocked(getUserInfo).mockResolvedValue({
      id: 2,
      name: '일반부원',
      role: 'CREW_MEMBER',
      crew: { crewId: 10, crewName: '보드버디 크루', role: 'CREW_MEMBER' },
    } as never);
    vi.mocked(getCrewInfo).mockResolvedValue({
      crew_id: 10,
      name: '보드버디 크루',
      univ: '테스트대학교',
      president_name: '김크루장',
      member_count: 24,
      seasonHouseGuestEnabled: true,
    } as never);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <CrewDetail
          onBack={vi.fn()}
          onCalendarClick={vi.fn()}
          onMemberClick={vi.fn()}
          onSettingsClick={vi.fn()}
          seasonAvailable={true}
        />,
      );
    });
    await flush();

    expect(container.textContent).not.toContain('운영진 기능 온보딩 체험하기');
    expect(container.querySelector('dialog')).toBeNull();
  });
});
