import { useEffect, useState } from 'react';

export const DESKTOP_VIEWPORT_QUERY = '(min-width: 1024px)';

const getMatches = () =>
  typeof window !== 'undefined' && window.matchMedia(DESKTOP_VIEWPORT_QUERY).matches;

export const useDesktopViewport = () => {
  const [isDesktop, setIsDesktop] = useState(getMatches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_VIEWPORT_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);

    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isDesktop;
};
