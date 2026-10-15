import type { JoinPolicy, ParticipantStatus } from '../types/api';

export const getConsentPendingCopy = (policy: JoinPolicy) => policy === 'APPROVAL_REQUIRED'
    ? {
        notice: '동의서 작성 대기 · 작성 후 호스트 승인이 필요합니다.',
        alert: '제한시간 내 동의서를 작성해 주세요. 호스트 승인 전에는 참가가 확정되지 않습니다.',
        submitLabel: '전체 응답 제출하고 승인 요청',
    }
    : {
        notice: '동의서 작성 대기 · 자리가 임시 확보되었습니다.',
        alert: '자리가 임시 확보되었습니다. 제한시간 내 동의서를 작성해 주세요.',
        submitLabel: '전체 응답 제출하고 참가 확정',
    };

export const getConsentSubmissionMessage = (status: ParticipantStatus): string => {
    if (status === 'JOINED') return '응답 시트가 한 번에 제출되어 참가가 확정되었습니다.';
    if (status === 'PENDING') return '응답 시트가 제출되었습니다. 호스트 승인 후 참가가 확정됩니다.';
    return '응답 시트가 제출되었습니다. 최신 참가 상태를 확인해 주세요.';
};
