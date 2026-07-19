import { Info } from 'lucide-react';
import type { EventPlanningMode } from '../../types/api';
import { PLANNING_MODE_COPY } from './planningModeCopy';

interface PlanningModeBadgeProps {
    mode: EventPlanningMode;
}

export function PlanningModeBadge({ mode }: PlanningModeBadgeProps) {
    const memberPlanned = mode === 'MEMBER_PLANNED';
    const copy = PLANNING_MODE_COPY[mode];
    return (
        <span
            className={`inline-flex items-center gap-1 whitespace-nowrap px-2 py-1 text-[11px] font-bold border rounded ${memberPlanned
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-blue-200 bg-blue-50 text-blue-700'}`}
            title={copy.details}
            aria-label={`${copy.label}. ${copy.details}`}
        >
            {copy.label}
            <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
        </span>
    );
}
