import type { EventPlanningMode } from '../../types/api';

interface PlanningModeBadgeProps {
    mode: EventPlanningMode;
}

export function PlanningModeBadge({ mode }: PlanningModeBadgeProps) {
    const memberPlanned = mode === 'MEMBER_PLANNED';
    return (
        <span className={`inline-flex items-center px-2 py-1 text-[11px] font-bold border rounded ${memberPlanned
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-blue-200 bg-blue-50 text-blue-700'}`}
        >
            {memberPlanned ? '멤버 협의형' : '운영진 기획형'}
        </span>
    );
}
