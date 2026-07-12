import { EVENT_ACTIVITY_OPTIONS, EventActivityType } from '../../constants/eventActivity';

interface ActivityTypeSelectorProps {
    value: EventActivityType;
    onChange: (value: EventActivityType) => void;
}

export function ActivityTypeSelector({ value, onChange }: ActivityTypeSelectorProps) {
    return (
        <fieldset className="space-y-1.5">
            <legend className="text-xs font-bold text-zinc-500">활동 분류</legend>
            <div className="flex flex-wrap gap-2">
                {EVENT_ACTIVITY_OPTIONS.map(option => (
                    <label
                        key={option.value}
                        className={`cursor-pointer border rounded px-3 py-2 text-sm font-semibold transition-colors ${value === option.value
                            ? 'border-[#162660] bg-[#162660] text-white'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400'}`}
                    >
                        <input
                            type="radio"
                            name="activityType"
                            value={option.value}
                            checked={value === option.value}
                            onChange={() => onChange(option.value)}
                            className="sr-only"
                        />
                        {option.label}
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
