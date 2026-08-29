const CAPTAIN_ONBOARDING_VERSION = 'v1';

const getKey = (userId: number | string) => `boardbuddy_captain_onboarding_${CAPTAIN_ONBOARDING_VERSION}:${userId}`;

export const claimCaptainOnboarding = (userId: number | string) => {
  const key = getKey(userId);
  if (localStorage.getItem(key) !== null) return false;

  // Record the first display immediately so a refresh or interrupted session
  // cannot trigger the automatic guide a second time.
  localStorage.setItem(key, 'shown');
  return true;
};

export const completeCaptainOnboarding = (userId: number | string) => {
  localStorage.setItem(getKey(userId), 'completed');
};

export const dismissCaptainOnboarding = (userId: number | string) => {
  if (localStorage.getItem(getKey(userId)) !== 'completed') {
    localStorage.setItem(getKey(userId), 'dismissed');
  }
};
