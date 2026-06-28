export const PARTY_ACTIVITY_OPTIONS = [
    { value: 'OTHER', label: '기타' },
    { value: 'MT', label: 'MT' },
    { value: 'SK8', label: 'Sk8' },
    { value: 'SURF', label: 'Surf' },
    { value: 'WAKE', label: 'Wake' },
    { value: 'PARTY', label: 'Party' },
    { value: 'SHOP', label: 'Shop' },
] as const;

const ACTIVITY_LABELS: Record<string, string> = {
    ...Object.fromEntries(PARTY_ACTIVITY_OPTIONS.map(option => [option.value, option.label])),
    SKATE: 'Sk8',
    SURFING: 'Surf',
    WAKEBOARDING: 'Wake',
    BEACH_PARTY: 'Party',
    SNOWBOARDING: '기타',
    CAMPING: '기타',
};

export type PartyActivityType = typeof PARTY_ACTIVITY_OPTIONS[number]['value'];

export const getPartyActivityLabel = (activityType?: string | null) => (
    activityType ? ACTIVITY_LABELS[activityType] || activityType : '기타'
);
