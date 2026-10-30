import { describe, expect, it } from 'vitest';
import type { JoinPolicy, ParticipantStatus } from '../types/api';
import { getConsentPendingCopy, getConsentSubmissionMessage } from './eventRegistration';

describe('event registration messages reflect the actual approval gate', () => {
    it('never promises a held seat or confirmed place while host approval is still needed', () => {
        const copy = getConsentPendingCopy('APPROVAL_REQUIRED');
        expect(copy.notice).toContain('호스트 승인');
        expect(copy.alert).toContain('확정되지 않습니다');
        expect(copy.submitLabel).toBe('전체 응답 제출하고 승인 요청');
        expect(`${copy.notice} ${copy.alert}`).not.toContain('임시 확보');
    });

    it.each<JoinPolicy>(['INSTANT', 'INVITE_ONLY', 'PUBLIC'])(
        '%s retains the instant-consent held-seat message', policy => {
            expect(getConsentPendingCopy(policy).notice).toContain('자리가 임시 확보');
            expect(getConsentPendingCopy(policy).submitLabel).toBe('전체 응답 제출하고 참가 확정');
        },
    );

    it('confirms participation only for the returned JOINED state', () => {
        expect(getConsentSubmissionMessage('JOINED')).toContain('참가가 확정되었습니다');
    });

    it('reports pending host approval after a successful PENDING submission', () => {
        const message = getConsentSubmissionMessage('PENDING');
        expect(message).toContain('호스트 승인 후');
        expect(message).not.toContain('참가가 확정되었습니다');
    });

    it.each<ParticipantStatus>(['CONSENT_PENDING', 'CANCELLED', 'REMOVED', 'NONE'])(
        'does not claim confirmation for an unexpected returned state %s', status => {
            expect(getConsentSubmissionMessage(status)).toContain('최신 참가 상태');
            expect(getConsentSubmissionMessage(status)).not.toContain('참가가 확정되었습니다');
        },
    );
});
