export type OperatingMode = 'SEASON' | 'OFF_SEASON' | 'BOTH';

const DEV_OPERATING_MODE_KEY = 'dev_operating_mode';

const envOverride = (
  import.meta.env.VITE_OPERATING_MODE_OVERRIDE
  || import.meta.env.VITE_OPERATING_SEASON_OVERRIDE
) as string | undefined;

const normalizeMode = (value?: string | null): OperatingMode | null => {
  if (value === 'SEASON' || value === 'OFF_SEASON' || value === 'BOTH') return value;

  // Keep the previous environment override values working during rollout.
  if (value === 'WINTER') return 'SEASON';
  if (value === 'TRANSITION') return 'BOTH';
  return null;
};

export const getOperatingMode = (date = new Date()): OperatingMode => {
  if (import.meta.env.DEV) {
    const devOverride = normalizeMode(localStorage.getItem(DEV_OPERATING_MODE_KEY));
    if (devOverride) return devOverride;
  }

  const configuredMode = normalizeMode(envOverride);
  if (configuredMode) return configuredMode;

  const month = date.getMonth() + 1;
  return month === 12 || month <= 3 ? 'SEASON' : 'OFF_SEASON';
};

export const getOperatingFeatures = (mode: OperatingMode) => ({
  season: mode === 'SEASON' || mode === 'BOTH',
  offSeason: mode === 'OFF_SEASON' || mode === 'BOTH',
});

export const operatingModeCopy: Record<OperatingMode, { label: string; description: string }> = {
  SEASON: {
    label: '시즌 운영',
    description: '시즌방과 예약 기능만 운영 중입니다.',
  },
  OFF_SEASON: {
    label: '오프시즌 운영',
    description: '이벤트와 소모임 기능만 운영 중입니다.',
  },
  BOTH: {
    label: '시즌 · 오프시즌 동시 운영',
    description: '시즌방 예약과 이벤트를 함께 운영 중입니다.',
  },
};
