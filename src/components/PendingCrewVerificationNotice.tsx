import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { SCHOOL_EMAIL_AUTH_AVAILABLE } from '../config/features';
import { discoverCrews } from '../services/crew';
import { getSchools } from '../services/schools';
import { getSchoolEmailVerificationStatus } from '../services/schoolEmailVerification';
import type { UserDetail } from '../types/api';

interface Props {
    crewId: number;
    user: Pick<UserDetail, 'crew' | 'userType' | 'universityVerificationStatus'>;
    onVerify: () => void;
}

export function PendingCrewVerificationNotice({ crewId, user, onVerify }: Props) {
    const [domains, setDomains] = useState<string[]>([]);

    useEffect(() => {
        let cancelled = false;
        setDomains([]);
        if (!SCHOOL_EMAIL_AUTH_AVAILABLE || user.crew || user.userType !== 'KUSBF'
            || user.universityVerificationStatus === 'VERIFIED') return;

        Promise.all([discoverCrews(), getSchools({ allowDevFallback: false }), getSchoolEmailVerificationStatus()])
            .then(([crews, schools, verification]) => {
                if (cancelled || !verification.configured || !verification.deliveryAvailable
                    || verification.status === 'VERIFIED') return;
                const crew = crews.find(item => item.crewId === crewId);
                if (!crew?.verifiedSchoolAutoJoinEnabled || crew.schoolId == null) return;
                const school = schools.find(item => item.id === crew.schoolId);
                if (!school || school.name !== verification.schoolName) return;
                setDomains(school.emailDomains);
            })
            .catch(() => { /* Keep ordinary approval available when eligibility cannot be confirmed. */ });

        return () => { cancelled = true; };
    }, [crewId, user.crew, user.userType, user.universityVerificationStatus]);

    if (domains.length === 0) return null;

    return (
        <section aria-label="학교 인증으로 바로 가입" className="mx-5 mt-4 rounded-2xl bg-indigo-50 p-4">
            <div className="flex items-start gap-2">
                <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-[#162660]" />
                <p className="text-sm font-semibold leading-6 text-[#162660]">
                    학교 이메일 ({domains.map(domain => `@${domain}`).join(', ')})을 인증하면 대기 없이 바로 가입할 수 있어요.
                </p>
            </div>
            <button type="button" onClick={onVerify} className="mt-3 w-full rounded-xl bg-[#162660] px-4 py-3 text-sm font-black text-white">
                학교 이메일 인증하기
            </button>
        </section>
    );
}
