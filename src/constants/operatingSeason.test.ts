// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getOperatingFeatures, getOperatingMode } from './operatingSeason';

describe('current release season-house hold', () => {
    afterEach(() => { localStorage.clear(); vi.unstubAllEnvs(); });
    it.each(['SEASON', 'BOTH', 'OFF_SEASON'])('cannot be reopened by the %s developer override or winter calendar', mode => {
        localStorage.setItem('dev_operating_mode', mode);
        expect(getOperatingMode(new Date('2026-12-15T12:00:00+09:00'))).toBe('OFF_SEASON');
        expect(getOperatingFeatures(mode as 'SEASON' | 'BOTH' | 'OFF_SEASON')).toEqual({ season: false, offSeason: true });
    });
    it.each(['VITE_OPERATING_MODE_OVERRIDE', 'VITE_OPERATING_SEASON_OVERRIDE'])('cannot be reopened by %s', async key => {
        vi.stubEnv(key, 'BOTH'); vi.resetModules();
        const configuration = await import('./operatingSeason');
        expect(configuration.getOperatingMode()).toBe('OFF_SEASON');
        expect(configuration.getOperatingFeatures('BOTH')).toEqual({ season: false, offSeason: true });
    });
});
