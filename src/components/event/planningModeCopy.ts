import type { EventPlanningMode } from '../../types/api';

interface PlanningModeCopy {
    label: string;
    description: string;
    details: string;
}

export const PLANNING_MODE_COPY: Record<EventPlanningMode, PlanningModeCopy> = {
    MANAGER_PLANNED: {
        label: '운영진 관리형 이벤트',
        description: '운영진이 일정, 장소와 활동을 정하고 신청부터 진행까지 관리합니다.',
        details: '운영진 관리형 이벤트는 크루 운영진이 일정, 장소, 활동 내용과 운영 방식을 정하고 참가 신청과 현장 진행을 관리합니다. 변경 사항은 운영진이 확정해 참가자에게 안내합니다.',
    },
    MEMBER_PLANNED: {
        label: '참가자 자율형 소모임',
        description: '운영진은 기본 일정과 정원만 열고, 참가자가 장소와 활동을 협의합니다.',
        details: '참가자 자율형 소모임은 크루 운영진이 기본 일정과 참여 정원만 열어 두고, 참가자들이 활동 장소와 세부 내용을 자유롭게 협의해 진행합니다. 참가자 전원이 동의한 일정 변경이 필요한 경우에는 크루 운영진에게 이벤트 일정 수정을 요청해 주세요.',
    },
};
