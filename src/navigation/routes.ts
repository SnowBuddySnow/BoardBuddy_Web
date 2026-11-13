import { getAccessToken, getSignupToken, hasDevOverride, isAutoLoginEnabled } from '../lib/session';
import { isSchoolEmailActivationEntry } from '../lib/schoolEmailActivation';
import { captureCrewInvitation } from '../lib/onboardingIntent';

export type Tab = 'home' | 'events' | 'calendar' | 'edit' | 'heart' | 'user';
export type View =
  | 'crew_invite'
  | 'onboarding'
  | 'login'
  | 'home'
  | 'reservation'
  | 'stats'
  | 'my_reservations'
  | 'crew_detail'
  | 'search_crew'
  | 'user_info'
  | 'profile_type_confirmation'
  | 'student_verification'
  | 'crew_member'
  | 'crew_settings'
  | 'guest_reservation'
  | 'guest_access'
  | 'my_page'
  | 'account_info'
  | 'crew_create'
  | 'crew_admin'
  | 'school_admin'
  | 'user_admin'
  | 'signup_audit'
  | 'crew_permissions'
  | 'role_guide'
  | 'notifications'
  | 'parties'
  | 'event_detail'
  | 'my_parties'
  | 'operations_center'
  | 'dashboard_parties'
  | 'dashboard_event_new'
  | 'dashboard_event_detail'
  | 'dashboard_event_edit'
  | 'dashboard_groups'
  | 'dashboard_group_detail'
  | 'organizer_invite';

const knownViews = new Set<View>([
  'crew_invite', 'onboarding',
  'login',
  'home',
  'reservation',
  'stats',
  'my_reservations',
  'crew_detail',
  'search_crew',
  'user_info',
  'profile_type_confirmation',
  'student_verification',
  'crew_member',
  'crew_settings',
  'guest_reservation',
  'guest_access',
  'my_page',
  'account_info',
  'crew_create',
  'crew_admin',
  'school_admin',
  'user_admin',
  'signup_audit',
  'crew_permissions',
  'role_guide',
  'notifications',
  'parties',
  'event_detail',
  'my_parties',
  'operations_center',
  'dashboard_parties',
  'dashboard_event_new',
  'dashboard_event_detail',
  'dashboard_event_edit',
  'dashboard_groups',
  'dashboard_group_detail',
  'organizer_invite',
]);

const publicEntryViews = new Set<View>(['login', 'guest_access', 'crew_invite']);
const signupViews = new Set<View>(['user_info', 'profile_type_confirmation', 'student_verification']);
export const eventGuideEntryViews = new Set<View>(['home', 'my_page', 'operations_center', 'dashboard_groups', 'dashboard_parties']);

const parseView = (value: string | null): View | null => {
  if (!value || !knownViews.has(value as View)) return null;
  return value as View;
};

export const viewTabs: Partial<Record<View, Tab>> = {
  home: 'home',
  parties: 'events',
  event_detail: 'events',
  my_parties: 'home',
  my_reservations: 'calendar',
  reservation: 'edit',
  guest_reservation: 'edit',
  crew_detail: 'heart',
  crew_settings: 'heart',
  crew_member: 'heart',
  stats: 'heart',
  my_page: 'user',
  account_info: 'user',
};

export const tabViews: Record<Tab, View> = {
  home: 'home',
  events: 'parties',
  calendar: 'my_reservations',
  edit: 'reservation',
  heart: 'crew_detail',
  user: 'my_page',
};

export const viewsWithoutBottomNav: View[] = [
  'crew_invite', 'onboarding',
  'event_detail',
  'login',
  'user_info',
  'profile_type_confirmation',
  'student_verification',
  'my_page',
  'account_info',
  'crew_create',
  'reservation',
  'guest_reservation',
  'crew_admin',
  'school_admin',
  'user_admin',
  'signup_audit',
  'crew_permissions',
  'role_guide',
  'notifications',
  'organizer_invite',
];

export const getInitialView = (): View => {
  captureCrewInvitation();
  const params = new URLSearchParams(window.location.search);
  const requestedView = parseView(params.get('view'));
  const hasOrganizerInvite = params.has('organizerInvite');
  if (hasOrganizerInvite) return 'organizer_invite';
  if (isSchoolEmailActivationEntry(requestedView, params.get('token'))) return 'student_verification';
  if (getAccessToken() && (requestedView === 'login' || requestedView === 'user_info')) return 'home';
  if (requestedView && publicEntryViews.has(requestedView)) return requestedView;
  if (requestedView && getAccessToken()) return requestedView;
  if (requestedView && signupViews.has(requestedView) && getSignupToken()) return requestedView;
  if (hasDevOverride()) {
    return requestedView || 'home';
  }
  if (getAccessToken() && isAutoLoginEnabled()) {
    return 'home';
  }
  return 'login';
};

export const seasonMemberViews: View[] = ['reservation', 'stats', 'my_reservations'];
export const offSeasonViews: View[] = [
  'parties',
  'event_detail',
  'my_parties',
  'dashboard_parties',
  'dashboard_event_new',
  'dashboard_event_detail',
  'dashboard_event_edit',
  'dashboard_groups',
  'dashboard_group_detail',
];
