export type OperatingSeason = 'WINTER' | 'OFF_SEASON' | 'TRANSITION';

const override = import.meta.env.VITE_OPERATING_SEASON_OVERRIDE as OperatingSeason | undefined;

export const getOperatingSeason = (date = new Date()): OperatingSeason => {
  if (override === 'WINTER' || override === 'OFF_SEASON' || override === 'TRANSITION') {
    return override;
  }

  const month = date.getMonth() + 1;
  return month === 12 || month <= 3 ? 'WINTER' : 'OFF_SEASON';
};

export const seasonCopy: Record<OperatingSeason, { label: string; description: string }> = {
  WINTER: {
    label: '겨울 시즌',
    description: '예약 관리가 우선 표시됩니다.',
  },
  OFF_SEASON: {
    label: '오프시즌',
    description: '소모임 관리가 우선 표시됩니다.',
  },
  TRANSITION: {
    label: '전환 시즌',
    description: '예약과 소모임을 함께 확인합니다.',
  },
};
