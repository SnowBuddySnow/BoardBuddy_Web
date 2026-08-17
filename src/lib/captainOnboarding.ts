const CAPTAIN_ONBOARDING_VERSION = 'v1';

const getKey = (userId: number | string) => `boardbuddy_captain_onboarding_${CAPTAIN_ONBOARDING_VERSION}:${userId}`;

export const hasCompletedCaptainOnboarding = (userId: number | string) => (
  localStorage.getItem(getKey(userId)) === 'completed'
);

export const completeCaptainOnboarding = (userId: number | string) => {
  localStorage.setItem(getKey(userId), 'completed');
};

