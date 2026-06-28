import { CalendarCheck, Users } from 'lucide-react';
import type { PartyPlanningMode } from '../../types/api';

interface PlanningModeSelectorProps {
    value: PartyPlanningMode;
    onChange: (value: PartyPlanningMode) => void;
}

const options: Array<{
    value: PartyPlanningMode;
    label: string;
    description: string;
    icon: typeof CalendarCheck;
}> = [
    {
        value: 'MANAGER_PLANNED',
        label: '운영진 기획형',
        description: '운영진이 활동과 장소를 정해서 여는 정모 또는 행사',
        icon: CalendarCheck,
    },
    {
        value: 'MEMBER_PLANNED',
        label: '멤버 협의형',
        description: '운영진은 날짜와 자리를 열고 참가자가 활동과 장소를 협의',
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
        </fieldset>
    );
}
