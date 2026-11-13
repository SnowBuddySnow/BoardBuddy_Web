import { useState } from 'react';
import { Info } from 'lucide-react';
import type { EventPlanningMode } from '../../types/api';
import { PLANNING_MODE_COPY } from './planningModeCopy';

interface PlanningModeBadgeProps {
    mode: EventPlanningMode;
}

export function PlanningModeBadge({ mode }: PlanningModeBadgeProps) {
    const [isOpen, setIsOpen] = useState(false);
    const memberPlanned = mode === 'MEMBER_PLANNED';
    const copy = PLANNING_MODE_COPY[mode];
    return (
        <button
            type="button"
            aria-label={`${copy.label} 설명 보기`}
            aria-expanded={isOpen}
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsOpen(current => !current);
            }}
            className={`relative inline-flex min-h-11 items-center gap-2 whitespace-normal px-3 py-2 text-xs font-bold border rounded-full focus:outline-none focus:ring-2 focus:ring-current/30 ${memberPlanned
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : 'border-[#162660]/10 bg-[#162660]/5 text-[#162660]'}`}
        >
            {copy.label}
            <Info className="h-3 w-3" aria-hidden="true" />
            {isOpen && (
                <span
                    role="tooltip"
                    className="absolute left-0 top-full z-30 mt-2 block w-40 max-w-[calc(100vw-2rem)] overflow-hidden whitespace-normal [overflow-wrap:anywhere] rounded-lg border border-zinc-200 bg-white p-3 text-left text-xs font-medium leading-5 text-zinc-600 shadow-lg"
                >
                    <span className="mb-1 block font-black text-zinc-900">{copy.label}</span>
                    {copy.details}
                </span>
            )}
        </button>
    );
}
