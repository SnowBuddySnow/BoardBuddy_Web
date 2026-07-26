export type CrewRole = 'CREW_MEMBER' | 'CREW_MANAGER' | 'CREW_CAPTAIN';

export const normalizeCrewRole = (role?: string | null): CrewRole => {
    switch (role) {
        case 'CREW_CAPTAIN':
        case 'PRESIDENT':
            return 'CREW_CAPTAIN';
        case 'CREW_MANAGER':
        case 'MANAGER':
        case 'ADMIN':
            return 'CREW_MANAGER';
        default:
            return 'CREW_MEMBER';
    }
};

export const isCrewCaptainRole = (role?: string | null) => normalizeCrewRole(role) === 'CREW_CAPTAIN';

export const isCrewManagerRole = (role?: string | null) => {
    const normalized = normalizeCrewRole(role);
    return normalized === 'CREW_MANAGER' || normalized === 'CREW_CAPTAIN';
};
