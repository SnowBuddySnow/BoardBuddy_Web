import { describe, expect, it } from 'vitest';
import { isCrewSchoolVerificationRequired } from './crewSchoolVerification';

describe('isCrewSchoolVerificationRequired', () => {
    it('requires school verification only when enforcement and crew requirement are on and auto-join is off', () => {
        expect(isCrewSchoolVerificationRequired({
            schoolVerificationRequired: true,
            schoolVerificationEnforcementEnabled: true,
            verifiedSchoolAutoJoinEnabled: false,
        })).toBe(true);

        expect(isCrewSchoolVerificationRequired({
            schoolVerificationRequired: true,
            schoolVerificationEnforcementEnabled: false,
            verifiedSchoolAutoJoinEnabled: false,
        })).toBe(false);

        expect(isCrewSchoolVerificationRequired({
            schoolVerificationRequired: true,
            schoolVerificationEnforcementEnabled: true,
            verifiedSchoolAutoJoinEnabled: true,
        })).toBe(false);

        expect(isCrewSchoolVerificationRequired({
            schoolVerificationRequired: false,
            schoolVerificationEnforcementEnabled: true,
            verifiedSchoolAutoJoinEnabled: false,
        })).toBe(false);
    });
});
