// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { getOperatingFeatures, getOperatingMode } from './operatingSeason';
describe('season reservations reopened', () => {
    afterEach(() => localStorage.clear());
    it('offers reservations and events during October through May', () => {
        for (const month of [0, 4, 9, 11]) expect(getOperatingMode(new Date(2026, month, 15))).toBe('BOTH');
        expect(getOperatingMode(new Date(2026, 6, 15))).toBe('OFF_SEASON');
    });
    it.each(['SEASON', 'BOTH', 'OFF_SEASON'] as const)('honors explicit %s mode', mode => {
        localStorage.setItem('dev_operating_mode', mode);
        expect(getOperatingMode()).toBe(mode);
        expect(getOperatingFeatures(mode).season).toBe(mode !== 'OFF_SEASON');
        expect(getOperatingFeatures(mode).offSeason).toBe(mode !== 'SEASON');
    });
});
