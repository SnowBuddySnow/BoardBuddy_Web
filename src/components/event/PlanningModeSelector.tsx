import { CalendarCheck, Info, Users } from 'lucide-react';
import type { EventPlanningMode } from '../../types/api';
import { PLANNING_MODE_COPY } from './planningModeCopy';

interface PlanningModeSelectorProps {
    value: EventPlanningMode;
    onChange: (value: EventPlanningMode) => void;
}

const options: Array<{
    value: EventPlanningMode;
    label: string;
    description: string;
    icon: typeof CalendarCheck;
}> = [
    {
        value: 'MANAGER_PLANNED',
        label: PLANNING_MODE_COPY.MANAGER_PLANNED.label,
        description: PLANNING_MODE_COPY.MANAGER_PLANNED.description,
        icon: CalendarCheck,
    },
    {
        value: 'MEMBER_PLANNED',
        label: PLANNING_MODE_COPY.MEMBER_PLANNED.label,
        description: PLANNING_MODE_COPY.MEMBER_PLANNED.description,
        icon: Users,
    },
];

export function PlanningModeSelector({ value, onChange }: PlanningModeSelectorProps) {
    return (
        <fieldset className="space-y-2">
            <legend className="text-xs font-bold text-zinc-500">진행 방식 *</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {options.map(option => {
                    const Icon = option.icon;
                    const selected = value === option.value;
                    return (
                        <label
                            key={option.value}
                            className={`cursor-pointer border p-4 transition-colors ${selected
                                ? 'border-[#162660] bg-blue-50'
                                : 'border-zinc-200 bg-white hover:border-zinc-300'}`}
                        >
                            <input
                                type="radio"
                                name="planningMode"
                                value={option.value}
                                checked={selected}
                                onChange={() => onChange(option.value)}
                                className="sr-only"
                            />
                            <span className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                                <Icon className="w-4 h-4" />
                                {option.label}
                            </span>
                            <span className="block mt-1 text-xs leading-5 text-zinc-500">{option.description}</span>
                        </label>
                    );
                })}
            </div>
            <div className="flex items-start gap-2 border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs leading-5 text-zinc-600">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#162660]" aria-hidden="true" />
                <p>{PLANNING_MODE_COPY[value].details}</p>
            </div>
        </fieldset>
    );
}
