import type {
  EventStatus,
  JoinPolicy,
  OrganizerGroupInviteLinkStatus,
  OrganizerGroupMembership,
  ParticipantStatus,
  VisibilityType,
} from '../types/api';
import type { CrewRole } from './crewRole';

export const crewRoleLabel: Record<CrewRole, string> = {
  CREW_CAPTAIN: 'Captain',
  CREW_MANAGER: '크루 매니저',
  CREW_MEMBER: '일반 멤버',
};

export const eventGroupRoleLabel: Record<OrganizerGroupMembership['role'], string> = {
  EVENT_GROUP_OWNER: '호스트 그룹 오너',
  EVENT_GROUP_MANAGER: '호스트 그룹 매니저',
  EVENT_GROUP_VIEWER: '호스트 그룹 뷰어',
};

export const eventStatusLabel: Record<EventStatus, string> = {
  DRAFT: '준비 중',
  OPEN: '모집 중',
  CLOSED: '모집 마감',
  CANCELLED: '취소됨',
};

export const visibilityTypeLabel: Record<VisibilityType, string> = {
  PUBLIC: '전체 공개',
  CREW_LIMITED: '크루 한정',
  INVITE_ONLY: '초대 전용',
  LINK_ONLY: '링크 공개',
};

export const joinPolicyLabel: Record<JoinPolicy, string> = {
  INSTANT: '즉시 승인',
  APPROVAL_REQUIRED: '승인 후 참가',
  INVITE_ONLY: '초대 전용',
  PUBLIC: '누구나 참가',
};

export const participantStatusLabel: Record<ParticipantStatus, string> = {
  JOINED: '참가 확정',
  PENDING: '승인 대기',
  CONSENT_PENDING: '동의 대기',
  CANCELLED: '참가 취소',
  REMOVED: '내보냄',
  NONE: '미참가',
};

export const inviteStatusLabel = {
  PENDING: '응답 대기',
  ACCEPTED: '수락됨',
  DECLINED: '거절됨',
  REVOKED: '철회됨',
} as const;

export const inviteLinkStatusLabel: Record<OrganizerGroupInviteLinkStatus, string> = {
  ACTIVE: '사용 가능',
  EXPIRED: '만료됨',
  EXHAUSTED: '사용 완료',
  REVOKED: '철회됨',
};
