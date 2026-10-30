interface CrewVerificationPolicy {
    schoolVerificationRequired: boolean;
    schoolVerificationEnforcementEnabled?: boolean;
    verifiedSchoolAutoJoinEnabled?: boolean;
}

export const isCrewSchoolVerificationRequired = (policy: CrewVerificationPolicy): boolean =>
    policy.schoolVerificationEnforcementEnabled === true
    && policy.schoolVerificationRequired
    && policy.verifiedSchoolAutoJoinEnabled !== true;
