export const EVENT_ACTIVITY_OPTIONS = [
    { value: 'OTHER', label: '기타' },
    { value: 'MT', label: 'MT' },
    { value: 'SK8', label: 'Sk8' },
    { value: 'SURF', label: 'Surf' },
    { value: 'WAKE', label: 'Wake' },
    { value: 'EVENT', label: 'Event' },
    { value: 'SHOP', label: 'Shop' },
] as const;

const ACTIVITY_LABELS: Record<string, string> = {
    ...Object.fromEntries(EVENT_ACTIVITY_OPTIONS.map(option => [option.value, option.label])),
    SKATE: 'Sk8',
    SURFING: 'Surf',
    WAKEBOARDING: 'Wake',
    BEACH_EVENT: 'Event',
    SNOWBOARDING: '기타',
    CAMPING: '기타',
};

export type EventActivityType = typeof EVENT_ACTIVITY_OPTIONS[number]['value'];

export const getEventActivityLabel = (activityType?: string | null) => (
    activityType ? ACTIVITY_LABELS[activityType] || activityType : '기타'
);
