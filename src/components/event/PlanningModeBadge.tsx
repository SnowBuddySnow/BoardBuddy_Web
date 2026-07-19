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
        <span
            className={`relative inline-flex items-center gap-1 whitespace-nowrap px-2 py-1 text-[11px] font-bold border rounded ${memberPlanned
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-blue-200 bg-blue-50 text-blue-700'}`}
        >
            {copy.label}
            <button
                type="button"
                aria-label={`${copy.label} 설명 보기`}
                aria-expanded={isOpen}
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsOpen(current => !current);
                }}
                className="-mr-1 flex h-6 w-6 items-center justify-center rounded-full text-current hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-current/30"
            >
                <Info className="h-3 w-3" aria-hidden="true" />
            </button>
            {isOpen && (
                <span
                    role="tooltip"
                    className="absolute left-0 top-full z-30 mt-2 w-52 max-w-[calc(100vw-2rem)] whitespace-normal rounded-lg border border-zinc-200 bg-white p-3 text-left text-xs font-medium leading-5 text-zinc-600 shadow-lg"
                >
                    <span className="mb-1 block font-black text-zinc-900">{copy.label}</span>
                    {copy.details}
                </span>
            )}
        </span>
    );
}
