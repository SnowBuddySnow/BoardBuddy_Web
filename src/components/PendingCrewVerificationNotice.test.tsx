// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ discoverCrews: vi.fn(), getSchools: vi.fn(), getSchoolEmailVerificationStatus: vi.fn() }));
const gate = vi.hoisted(() => ({ SCHOOL_EMAIL_AUTH_AVAILABLE: true }));
vi.mock('../services/crew', () => ({ discoverCrews: api.discoverCrews }));
vi.mock('../services/schools', () => ({ getSchools: api.getSchools }));
vi.mock('../services/schoolEmailVerification', () => ({ getSchoolEmailVerificationStatus: api.getSchoolEmailVerificationStatus }));
vi.mock('../config/features', () => gate);
import { PendingCrewVerificationNotice } from './PendingCrewVerificationNotice';

describe('pending crew school verification offer', () => {
    let root: Root; let container: HTMLDivElement;
    const verify = vi.fn();
    const user = { crew: null, userType: 'KUSBF' as const, universityVerificationStatus: 'NOT_VERIFIED' as const };
    beforeEach(() => {
        vi.resetAllMocks(); gate.SCHOOL_EMAIL_AUTH_AVAILABLE = true;
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        api.discoverCrews.mockResolvedValue([{ crewId: 2, schoolId: 9, verifiedSchoolAutoJoinEnabled: true }]);
        api.getSchools.mockResolvedValue([{ id: 9, name: '예시대학교', emailDomains: ['school.ac.kr', 'mail.school.ac.kr'] }]);
        api.getSchoolEmailVerificationStatus.mockResolvedValue({ status: 'NOT_VERIFIED', schoolName: '예시대학교', configured: true, deliveryAvailable: true });
        container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    });
    afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
    const render = async () => act(async () => root.render(<PendingCrewVerificationNotice crewId={2} user={user} onVerify={verify} />));

    it('offers the actual crew school domains and opens verification', async () => {
        await render();
        expect(container.textContent).toContain('@school.ac.kr, @mail.school.ac.kr');
        await act(async () => container.querySelector('button')!.click());
        expect(verify).toHaveBeenCalledOnce();
        expect(api.getSchools).toHaveBeenCalledWith({ allowDevFallback: false });
    });

    it.each([
        ['automatic approval off', { crews: [{ crewId: 2, schoolId: 9, verifiedSchoolAutoJoinEnabled: false }] }],
        ['another crew enabled', { crews: [{ crewId: 3, schoolId: 9, verifiedSchoolAutoJoinEnabled: true }] }],
        ['school not linked', { crews: [{ crewId: 2, schoolId: null, verifiedSchoolAutoJoinEnabled: true }] }],
        ['another school', { verification: { schoolName: '다른대학교', configured: true, deliveryAvailable: true } }],
        ['email delivery unavailable', { verification: { schoolName: '예시대학교', configured: true, deliveryAvailable: false } }],
        ['school verification unavailable', { verification: { schoolName: '예시대학교', configured: false, deliveryAvailable: true } }],
        ['already verified', { verification: { status: 'VERIFIED', schoolName: '예시대학교', configured: true, deliveryAvailable: true } }],
        ['no registered domains', { schools: [{ id: 9, name: '예시대학교', emailDomains: [] }] }],
    ])('hides the offer for %s', async (_name, overrides) => {
        if ('crews' in overrides) api.discoverCrews.mockResolvedValue(overrides.crews);
        if ('schools' in overrides) api.getSchools.mockResolvedValue(overrides.schools);
        if ('verification' in overrides) api.getSchoolEmailVerificationStatus.mockResolvedValue(overrides.verification);
        await render(); expect(container.querySelector('button')).toBeNull();
    });

    it('keeps ordinary approval usable when eligibility loading fails', async () => {
        api.discoverCrews.mockRejectedValue(new Error('offline'));
        await render(); expect(container.textContent).toBe('');
    });

    it('does not load offers when verification is disabled or the account is not a student', async () => {
        gate.SCHOOL_EMAIL_AUTH_AVAILABLE = false;
        await render();
        gate.SCHOOL_EMAIL_AUTH_AVAILABLE = true;
        await act(async () => root.render(<PendingCrewVerificationNotice crewId={2} user={{ ...user, userType: 'REGULAR' }} onVerify={verify} />));
        expect(api.discoverCrews).not.toHaveBeenCalled();
        expect(container.textContent).toBe('');
    });
});
