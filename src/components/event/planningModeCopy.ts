import type { EventPlanningMode } from '../../types/api';

interface PlanningModeCopy {
    label: string;
    description: string;
    details: string;
}

export const PLANNING_MODE_COPY: Record<EventPlanningMode, PlanningModeCopy> = {
    MANAGER_PLANNED: {
        label: '호스트 참여·운영형 이벤트',
        description: '호스트가 이벤트에 직접 참여해 일정, 장소, 활동과 현장 진행을 운영합니다.',
        details: '호스트가 참가자로 함께하며 일정, 장소와 활동을 정하고 신청부터 현장 진행까지 책임집니다. 변경 사항도 호스트가 안내합니다.',
    },
    MEMBER_PLANNED: {
        label: '호스트 개설형 이벤트',
        description: '호스트는 방과 기본 조건만 열고, 참가자들이 장소와 활동을 협의해 진행합니다.',
        details: '호스트는 이벤트 방, 기본 일정과 정원만 개설합니다. 참가자들이 장소와 활동을 협의해 진행하며, 필요한 변경은 참여자 합의 후 호스트에게 요청합니다.',
    },
};
