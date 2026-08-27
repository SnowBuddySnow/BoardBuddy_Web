const CAPTAIN_ONBOARDING_VERSION = 'v1';

const getKey = (userId: number | string) => `boardbuddy_captain_onboarding_${CAPTAIN_ONBOARDING_VERSION}:${userId}`;

export const shouldAutoShowCaptainOnboarding = (userId: number | string) => (
  localStorage.getItem(getKey(userId)) === null
);

export const completeCaptainOnboarding = (userId: number | string) => {
  localStorage.setItem(getKey(userId), 'completed');
};

export const dismissCaptainOnboarding = (userId: number | string) => {
  if (localStorage.getItem(getKey(userId)) !== 'completed') {
    localStorage.setItem(getKey(userId), 'dismissed');
  }
};
