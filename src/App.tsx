import { useState, useEffect, useRef } from 'react';
import { LowerMenuBar } from './components/LowerMenuBar';
import Home from './pages/Home';
import Reservation from './pages/Reservation';
import ReservationStats from './pages/ReservationStats';
import MyReservations from './pages/MyReservations';
import LoginLanding from './pages/LoginLanding';
import CrewDetail from './pages/CrewDetail';
import UserInfoInput from './pages/UserInfoInput';
import ProfileTypeConfirmation from './pages/ProfileTypeConfirmation';
import StudentVerification from './pages/StudentVerification';
import CrewMember from './pages/CrewMember';
import SearchCrew from './pages/SearchCrew';
import CrewSettings from './pages/CrewSettings';
import MyPage from './pages/MyPage';
import AccountInfo from './pages/AccountInfo';
import CrewAdmin from './pages/CrewAdmin';
import SchoolAdmin from './pages/SchoolAdmin';
import UserAdmin from './pages/UserAdmin';
import SignupAudit from './pages/SignupAudit';
import Notifications from './pages/Notifications';
import DesktopShell, { type DesktopDestination } from './components/DesktopShell';
import DesktopRequired from './components/DesktopRequired';

// New Event Pages
import Parties from './pages/Parties';
import EventDetail from './pages/EventDetail';
import MyParties from './pages/MyParties';
import DashboardParties from './pages/DashboardParties';
import DashboardEventNew from './pages/DashboardEventNew';
import DashboardEventDetail from './pages/DashboardEventDetail';
import DashboardEventEdit from './pages/DashboardEventEdit';
import DashboardGroups from './pages/DashboardGroups';
import DashboardGroupDetail from './pages/DashboardGroupDetail';
import OperationsCenter from './pages/OperationsCenter';
import CrewPermissions from './pages/CrewPermissions';
import RoleGuide from './pages/RoleGuide';
import GuestAccess from './pages/GuestAccess';
import OrganizerInviteAccept from './pages/OrganizerInviteAccept';
import DevPanel from './components/DevPanel';
import CaptainOnboarding, { CaptainOnboardingReturnButton, type CaptainOnboardingDestination } from './components/CaptainOnboarding';
import { getAccessToken, getSignupToken, hasDevOverride, isAutoLoginEnabled } from './lib/session';
import { claimCaptainOnboarding, completeCaptainOnboarding, dismissCaptainOnboarding } from './lib/captainOnboarding';
import { getOperationsContext, type OperationPermission } from './services/operations';
import { getUserInfo } from './services/user';
import { getCrewInfo, getMyApplications } from './services/crew';
import { getCrewAdminData } from './services/crewAdmin';
import { useDesktopViewport } from './hooks/useDesktopViewport';
import { getOperatingFeatures, getOperatingMode } from './constants/operatingSeason';
import { listParties } from './services/event';
import type { CrewDetail as CrewDetailData } from './types/api';
import { isCrewCaptainRole } from './constants/crewRole';

type Tab = 'home' | 'events' | 'calendar' | 'edit' | 'heart' | 'user';
type View =
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

const publicEntryViews = new Set<View>(['login', 'guest_access']);
const signupViews = new Set<View>(['user_info', 'profile_type_confirmation', 'student_verification']);

const parseView = (value: string | null): View | null => {
  if (!value || !knownViews.has(value as View)) return null;
  return value as View;
};

const viewTabs: Partial<Record<View, Tab>> = {
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

const tabViews: Record<Tab, View> = {
  home: 'home',
  events: 'parties',
  calendar: 'my_reservations',
  edit: 'reservation',
  heart: 'crew_detail',
  user: 'my_page',
};

const viewsWithoutBottomNav: View[] = [
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

const getInitialView = (): View => {
  const params = new URLSearchParams(window.location.search);
  const requestedView = parseView(params.get('view'));
  const hasOrganizerInvite = params.has('organizerInvite');
  if (hasOrganizerInvite) return 'organizer_invite';
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

const seasonMemberViews: View[] = ['reservation', 'stats', 'my_reservations'];
const offSeasonViews: View[] = [
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

function FeatureUnavailable({ title, description, onBack }: { title: string; description: string; onBack: () => void }) {
  return (
    <div className="flex h-full items-center justify-center bg-[#FAF8F3] px-6">
      <div className="max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-black text-zinc-900">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
        <button type="button" onClick={onBack} className="mt-6 rounded-xl border-0 bg-[#162660] px-5 py-3 text-sm font-bold text-white cursor-pointer">
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}

function App() {
  const [currentView, setCurrentView] = useState<View>(() => getInitialView());
  const [hasCrew, setHasCrew] = useState(false);
  const [hasPendingCrewApplication, setHasPendingCrewApplication] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(() => {
    const raw = new URLSearchParams(window.location.search).get('eventId');
    return raw ? Number(raw) : null;
  });
  const [guestCrewId, setGuestCrewId] = useState<number | null>(null);
  const [isGuestEventApplication, setIsGuestEventApplication] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [organizerInviteToken, setOrganizerInviteToken] = useState(
    () => new URLSearchParams(window.location.search).get('organizerInvite') || '',
  );
  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0);
  const [notificationReturnView, setNotificationReturnView] = useState<View>('home');
  const [canManage, setCanManage] = useState(false);
  const [canReviewCrews, setCanReviewCrews] = useState(false);
  const [operationPermissions, setOperationPermissions] = useState<OperationPermission[]>([]);
  const [managementAccessResolved, setManagementAccessResolved] = useState(false);
  const [managementRefreshKey, setManagementRefreshKey] = useState(0);
  const [availableEventCount, setAvailableEventCount] = useState(0);
  const [crewDetail, setCrewDetail] = useState<CrewDetailData | null>(null);
  const [isCaptain, setIsCaptain] = useState(false);
  const [captainUserId, setCaptainUserId] = useState<number | null>(null);
  const [captainOnboardingOpen, setCaptainOnboardingOpen] = useState(false);
  const [captainOnboardingDismissed, setCaptainOnboardingDismissed] = useState(false);
  const [captainOnboardingStep, setCaptainOnboardingStep] = useState(0);
  const [captainGuideReturnVisible, setCaptainGuideReturnVisible] = useState(false);
  const isDesktop = useDesktopViewport();
  const usedDesktopLanding = useRef(false);
  const shouldLoadPermissions = !['login', 'user_info', 'profile_type_confirmation', 'student_verification'].includes(currentView);
  const operatingMode = getOperatingMode();
  const operatingFeatures = getOperatingFeatures(operatingMode);
  const seasonHouseAvailable = operatingFeatures.season
    && hasCrew
    && !hasPendingCrewApplication
    && crewDetail !== null
    && crewDetail.seasonHouseActive !== false;

  // Check for auto-login on app start
  useEffect(() => {
    setCurrentView(getInitialView());
  }, []);

  useEffect(() => {
    if (!shouldLoadPermissions) return;

    let cancelled = false;
    const loadCrewAccess = async () => {
      try {
        const user = await getUserInfo();
        if (cancelled) return;
        if (user.userType === 'GENERAL') {
          setCurrentView('profile_type_confirmation');
          return;
        }
        setIsCaptain(isCrewCaptainRole(user.role));
        setCaptainUserId(user.userId);
        setHasCrew(Boolean(user.crew));
        if (user.crew) {
          setHasPendingCrewApplication(false);
          const detail = await getCrewInfo(user.crew.crewId);
          if (!cancelled) setCrewDetail(detail);
          return;
        }
        setCrewDetail(null);
        const applications = await getMyApplications();
        if (!cancelled) setHasPendingCrewApplication(applications.some(application => application.status === 'PENDING'));
      } catch {
        if (!cancelled) {
          setHasCrew(false);
          setHasPendingCrewApplication(false);
          setCrewDetail(null);
          setIsCaptain(false);
          setCaptainUserId(null);
        }
      }
    };

    void loadCrewAccess();
    return () => { cancelled = true; };
  }, [shouldLoadPermissions]);

  useEffect(() => {
    if (!shouldLoadPermissions || !managementAccessResolved || !isCaptain || captainUserId == null) return;
    if (captainOnboardingDismissed || captainOnboardingOpen) return;
    if (claimCaptainOnboarding(captainUserId)) {
      setCaptainOnboardingStep(0);
      setCaptainOnboardingOpen(true);
    }
  }, [
    captainOnboardingDismissed,
    captainOnboardingOpen,
    captainUserId,
    isCaptain,
    managementAccessResolved,
    shouldLoadPermissions,
  ]);

  useEffect(() => {
    if (!shouldLoadPermissions) {
      setCanReviewCrews(false);
      return;
    }

    let cancelled = false;
    getCrewAdminData()
      .then(data => {
        if (!cancelled) setCanReviewCrews(data.developerAccess);
      })
      .catch(() => {
        if (!cancelled) setCanReviewCrews(false);
      });
    return () => { cancelled = true; };
  }, [shouldLoadPermissions]);

  useEffect(() => {
    if (!shouldLoadPermissions || !operatingFeatures.offSeason) {
      setAvailableEventCount(0);
      return;
    }

    let cancelled = false;
    listParties()
      .then((events) => {
        if (cancelled) return;
        const currentTime = Date.now();
        setAvailableEventCount(events.filter((event) => (
          event.status === 'OPEN'
          && new Date(event.startsAt).getTime() > currentTime
          && (!event.applicationStartsAt || new Date(event.applicationStartsAt).getTime() <= currentTime)
          && (event.joinedCount || 0) < event.capacity
        )).length);
      })
      .catch(() => {
        if (!cancelled) setAvailableEventCount(0);
      });

    return () => { cancelled = true; };
  }, [currentView, operatingFeatures.offSeason, shouldLoadPermissions]);

  useEffect(() => {
    if (!shouldLoadPermissions) {
      setCanManage(false);
      setManagementAccessResolved(false);
      return;
    }

    let cancelled = false;
    getOperationsContext()
      .then((context) => {
        if (!cancelled) {
          setOperationPermissions(context.permissions);
          setCanManage(context.permissions.length > 0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOperationPermissions([]);
          setCanManage(false);
        }
      })
      .finally(() => {
        if (!cancelled) setManagementAccessResolved(true);
      });

    return () => {
      cancelled = true;
    };
  }, [shouldLoadPermissions, managementRefreshKey]);

  useEffect(() => {
    if (!isDesktop) {
      usedDesktopLanding.current = false;
      if (currentView.startsWith('dashboard_') || currentView === 'operations_center') {
        setCurrentView('home');
      }
      return;
    }

    if (
      managementAccessResolved
      && canManage
      && currentView === 'home'
      && !usedDesktopLanding.current
    ) {
      usedDesktopLanding.current = true;
      setCurrentView('operations_center');
    }
  }, [canManage, currentView, isDesktop, managementAccessResolved]);

  const isDashboardView = currentView.startsWith('dashboard_');
  const isManagementView = isDashboardView || currentView === 'operations_center';
  const isPublicGuestFlow = !getAccessToken() && (
    currentView === 'guest_access'
    || currentView === 'guest_reservation'
    || (currentView === 'event_detail' && isGuestEventApplication)
  );
  const activeTab = viewTabs[currentView] || 'home';
  const showBottomNav = !viewsWithoutBottomNav.includes(currentView) && !isDashboardView && !isPublicGuestFlow;

  const getDesktopDestination = (): DesktopDestination => {
    if (currentView === 'crew_admin') return 'crew_admin';
    if (currentView === 'school_admin') return 'school_admin';
    if (currentView === 'user_admin') return 'user_admin';
    if (currentView === 'signup_audit') return 'signup_audit';
    if (currentView === 'operations_center') return 'operations_center';
    if (currentView === 'parties' || currentView === 'event_detail') return 'parties';
    if (currentView === 'my_parties') return 'my_parties';
    if (currentView === 'my_reservations') return 'my_reservations';
    if (currentView === 'reservation' || currentView === 'guest_reservation') return 'reservation';
    if (currentView === 'guest_access') return 'reservation';
    if (['crew_detail', 'crew_settings', 'crew_member', 'stats', 'search_crew'].includes(currentView)) return 'crew_detail';
    if (currentView === 'my_page' || currentView === 'account_info' || currentView === 'role_guide') return 'my_page';
    return 'home';
  };

  const handleDesktopNavigate = (destination: DesktopDestination) => {
    setCurrentView(destination);
  };

  const handleCaptainOnboardingClose = () => {
    if (captainUserId != null) dismissCaptainOnboarding(captainUserId);
    setCaptainOnboardingOpen(false);
    setCaptainOnboardingDismissed(true);
    setCaptainGuideReturnVisible(false);
  };

  const handleCaptainOnboardingComplete = () => {
    if (captainUserId != null) completeCaptainOnboarding(captainUserId);
    setCaptainOnboardingOpen(false);
    setCaptainOnboardingDismissed(true);
    setCaptainGuideReturnVisible(false);
  };

  const handleCaptainOnboardingNavigate = (destination: CaptainOnboardingDestination, stepIndex: number) => {
    setCaptainOnboardingStep(stepIndex);
    setCaptainOnboardingOpen(false);
    setCaptainOnboardingDismissed(true);
    setCaptainGuideReturnVisible(true);
    setCurrentView(destination);
  };

  const openCaptainOnboarding = () => {
    setCaptainOnboardingStep(0);
    setCaptainGuideReturnVisible(false);
    setCaptainOnboardingOpen(true);
  };

  const openEventDetail = (id: number, destination: View = 'event_detail') => {
    setIsGuestEventApplication(false);
    setSelectedEventId(id);
    setCurrentView(destination);
  };

  const openGuestEventApplication = (id: number) => {
    setIsGuestEventApplication(true);
    setSelectedEventId(id);
    setCurrentView('event_detail');
  };

  const renderCurrentView = () => {
    if (seasonMemberViews.includes(currentView) && !seasonHouseAvailable) {
      return (
        <FeatureUnavailable
          title="시즌방 예약을 이용할 수 없습니다"
          description={operatingFeatures.season
            ? '소속 크루의 시즌방이 아직 오픈되지 않았습니다.'
            : '현재는 오프시즌 운영 중입니다. 시즌 운영이 시작되면 예약 기능이 열립니다.'}
          onBack={() => setCurrentView('home')}
        />
      );
    }

    if (currentView === 'guest_reservation' && !operatingFeatures.season) {
      return (
        <FeatureUnavailable
          title="시즌방 예약을 이용할 수 없습니다"
          description="현재는 오프시즌 운영 중입니다. 이벤트 초대 코드는 게스트 이용 화면에서 계속 사용할 수 있습니다."
          onBack={() => setCurrentView('guest_access')}
        />
      );
    }

    if (offSeasonViews.includes(currentView) && !operatingFeatures.offSeason) {
      return (
        <FeatureUnavailable
          title="오프시즌 기능을 이용할 수 없습니다"
          description="현재는 시즌 운영 중입니다. 오프시즌 또는 동시 운영 모드에서 이벤트 기능이 열립니다."
          onBack={() => setCurrentView('home')}
        />
      );
    }

    if (isManagementView && !isDesktop) {
      return <DesktopRequired onBack={() => setCurrentView('home')} />;
    }

    if (isManagementView && !managementAccessResolved) {
      return (
        <div className="flex h-full items-center justify-center bg-[#FAF8F3]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-[#162660]" aria-label="관리 권한 확인 중" />
        </div>
      );
    }

    if (isManagementView && managementAccessResolved && !canManage) {
      return (
        <div className="flex h-full items-center justify-center bg-[#FAF8F3] px-6">
          <div className="max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-black text-zinc-900">관리 권한이 없습니다</h1>
            <p className="mt-2 text-sm text-zinc-500">호스트 그룹에 속한 계정으로 다시 시도해 주세요.</p>
            <button onClick={() => setCurrentView('home')} className="mt-6 rounded-xl border-0 bg-[#162660] px-5 py-3 text-sm font-bold text-white cursor-pointer">
              홈으로 돌아가기
            </button>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'login':
        return (
          <LoginLanding
            onLogin={() => setCurrentView(organizerInviteToken ? 'organizer_invite' : 'home')}
            onSignupNeeded={() => setCurrentView('user_info')}
            onProfileTypeNeeded={() => setCurrentView('profile_type_confirmation')}
            onDebugUserInfo={() => setCurrentView('user_info')}
          />
        );
      case 'reservation':
        return <Reservation onBack={() => setCurrentView('home')} />;
      case 'guest_reservation':
        return <Reservation onBack={() => setCurrentView('guest_access')} isGuest={true} guestCrewId={guestCrewId ?? undefined} />;
      case 'guest_access':
        return <GuestAccess
          onBack={() => setCurrentView(getAccessToken() ? 'home' : 'login')}
          onSeasonHouseAccess={(crewId) => { setGuestCrewId(crewId); setCurrentView('guest_reservation'); }}
          onEventAccess={openGuestEventApplication}
          seasonAvailable={operatingFeatures.season}
          offSeasonAvailable={operatingFeatures.offSeason}
        />;
      case 'stats':
        return (
          <ReservationStats
            onBack={() => setCurrentView('home')}
            onMyCalendarClick={() => setCurrentView('my_reservations')}
            onReservationClick={() => setCurrentView('reservation')}
          />
        );
      case 'my_reservations':
        return <MyReservations onBack={() => setCurrentView('home')} onCrewClick={() => setCurrentView('stats')} />;
      case 'crew_detail':
        return (
          <CrewDetail
            onBack={() => setCurrentView('home')}
            onCalendarClick={() => setCurrentView('stats')}
            onMemberClick={() => setCurrentView('crew_member')}
            onSettingsClick={() => setCurrentView('crew_settings')}
            seasonAvailable={seasonHouseAvailable}
          />
        );
      case 'crew_settings':
        return (
          <CrewSettings
            onBack={() => setCurrentView('crew_detail')}
            onCaptainGuideClick={isCaptain ? openCaptainOnboarding : undefined}
          />
        );
      case 'crew_member':
        return <CrewMember onBack={() => setCurrentView('crew_detail')} />;
      case 'search_crew':
        return <SearchCrew onBack={() => setCurrentView('home')} />;
      case 'user_info':
        return (
          <UserInfoInput
            onBack={() => setCurrentView('login')}
            onSuccess={(requiresStudentVerification) => setCurrentView(
              requiresStudentVerification ? 'student_verification' : organizerInviteToken ? 'organizer_invite' : 'home'
            )}
          />
        );
      case 'profile_type_confirmation':
        return (
          <ProfileTypeConfirmation
            onSuccess={(requiresStudentVerification) => setCurrentView(
              requiresStudentVerification ? 'student_verification' : organizerInviteToken ? 'organizer_invite' : 'home'
            )}
          />
        );
      case 'student_verification':
        return (
          <StudentVerification
            onDone={() => {
              window.history.replaceState({}, '', window.location.pathname);
              setCurrentView(getAccessToken() ? (organizerInviteToken ? 'organizer_invite' : 'home') : 'login');
            }}
          />
        );
      case 'organizer_invite':
        return (
          <OrganizerInviteAccept
            token={organizerInviteToken}
            onDone={() => {
              setOrganizerInviteToken('');
              setManagementRefreshKey(key => key + 1);
              setCurrentView('home');
            }}
            onCancel={() => {
              window.history.replaceState({}, '', window.location.pathname);
              setOrganizerInviteToken('');
              setCurrentView('home');
            }}
          />
        );
      case 'my_page':
        return (
          <MyPage
            onBack={() => setCurrentView('home')}
            onAccountInfoClick={() => setCurrentView('account_info')}
            onRoleGuideClick={() => setCurrentView('role_guide')}
            onCaptainOnboardingClick={isCaptain ? openCaptainOnboarding : undefined}
          />
        );
      case 'account_info':
        return (
          <AccountInfo
            onBack={() => setCurrentView('my_page')}
            onStudentVerificationClick={() => setCurrentView('student_verification')}
          />
        );
      case 'role_guide':
        return <RoleGuide onBack={() => setCurrentView('my_page')} />;
      case 'crew_admin':
        return <CrewAdmin mode="review" onBack={() => setCurrentView('home')} />;
      case 'crew_create':
        return <CrewAdmin mode="create" onBack={() => setCurrentView('home')} />;
      case 'school_admin':
        return <SchoolAdmin onBack={() => setCurrentView('home')} />;
      case 'user_admin':
        return <UserAdmin onBack={() => setCurrentView('home')} />;
      case 'signup_audit':
        return <SignupAudit onBack={() => setCurrentView('home')} />;
      case 'crew_permissions':
        return <CrewPermissions onBack={() => setCurrentView('operations_center')} />;
      case 'notifications':
        return <Notifications onBack={() => setCurrentView(notificationReturnView)} onChanged={() => setNotificationRefreshKey(key => key + 1)} />;
      case 'parties':
        return (
          <Parties
            onBack={() => setCurrentView('home')}
            onEventClick={(id) => openEventDetail(id)}
            onCreateClick={() => setCurrentView('dashboard_event_new')}
            canCreate={canManage && isDesktop}
          />
        );
      case 'event_detail':
        return <EventDetail eventId={selectedEventId || 0} onBack={() => setCurrentView(isGuestEventApplication ? 'guest_access' : 'parties')} isGuestApplication={isGuestEventApplication} />;
      case 'my_parties':
        return <MyParties onBack={() => setCurrentView('home')} onEventClick={(id) => openEventDetail(id)} />;
      case 'operations_center':
        return (
          <OperationsCenter
            permissions={operationPermissions}
            operatingMode={operatingMode}
            seasonAvailable={seasonHouseAvailable}
            onReservationsClick={() => setCurrentView('stats')}
            onPartiesClick={() => setCurrentView('dashboard_parties')}
            onGroupsClick={() => setCurrentView('dashboard_groups')}
            onCrewClick={() => setCurrentView('crew_permissions')}
          />
        );
      case 'dashboard_parties':
        return (
          <DashboardParties
            onCreateEventClick={() => setCurrentView('dashboard_event_new')}
            onEditEventClick={(id) => openEventDetail(id, 'dashboard_event_edit')}
            onViewDetailClick={(id) => openEventDetail(id, 'dashboard_event_detail')}
            onBackToHomeClick={() => setCurrentView('home')}
            onGroupsClick={() => setCurrentView('dashboard_groups')}
          />
        );
      case 'dashboard_event_new':
        return (
          <DashboardEventNew
            onBack={() => setCurrentView('dashboard_parties')}
            onSuccess={(id) => openEventDetail(id, 'dashboard_event_detail')}
          />
        );
      case 'dashboard_event_detail':
        return (
          <DashboardEventDetail
            eventId={selectedEventId || 0}
            onBack={() => setCurrentView('dashboard_parties')}
            onEditClick={(id) => openEventDetail(id, 'dashboard_event_edit')}
          />
        );
      case 'dashboard_event_edit':
        return (
          <DashboardEventEdit
            eventId={selectedEventId || 0}
            onBack={() => setCurrentView('dashboard_parties')}
            onSuccess={() => setCurrentView('dashboard_parties')}
          />
        );
      case 'dashboard_groups':
        return (
          <DashboardGroups
            onBackToHomeClick={() => setCurrentView('home')}
            onPartiesClick={() => setCurrentView('dashboard_parties')}
            onViewGroupDetailClick={(id) => {
              setSelectedGroupId(id);
              setCurrentView('dashboard_group_detail');
            }}
          />
        );
      case 'dashboard_group_detail':
        return (
          <DashboardGroupDetail
            groupId={selectedGroupId || 0}
            developerAccess={canReviewCrews}
            onBack={() => setCurrentView('dashboard_groups')}
          />
        );
      case 'home':
      default:
        return (
          <Home
            onMakeReservationClick={() => setCurrentView('reservation')}
            onGuestReservationClick={() => setCurrentView('guest_access')}
            onCalendarClick={() => setCurrentView('my_reservations')}
            onTeamClick={() => setCurrentView('crew_detail')}
            onSearchClick={() => setCurrentView('search_crew')}
            onCreateCrewClick={() => setCurrentView('crew_create')}
            hasCrew={hasCrew}
            onJoinCrew={() => setHasCrew(true)}
            onEventClick={(id) => openEventDetail(id)}
            onSeeAllPartiesClick={() => setCurrentView('parties')}
            onMyPlansClick={() => setCurrentView('my_parties')}
            onDashboardClick={() => setCurrentView('operations_center')}
            operatingMode={operatingMode}
            crewDetail={crewDetail}
          />
        );
    }
  };

  const usesDesktopShell = isDesktop
    && !isDashboardView
    && !isPublicGuestFlow
    && !['login', 'user_info', 'profile_type_confirmation', 'student_verification', 'organizer_invite'].includes(currentView);

  const currentContent = renderCurrentView();

  return (
    <div className="w-full h-screen bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
      <div className={isDesktop || isDashboardView || usesDesktopShell || (['crew_admin', 'school_admin', 'user_admin', 'signup_audit'].includes(currentView) && canReviewCrews)
        ? "w-full h-full bg-white dark:bg-zinc-950 relative overflow-hidden flex flex-col" 
        : "w-full h-full max-w-md bg-[#FAF8F3] relative shadow-2xl overflow-hidden flex flex-col"
      }>
        {usesDesktopShell ? (
          <DesktopShell
            activeDestination={getDesktopDestination()}
            canManage={canManage}
            canReviewCrews={canReviewCrews}
            hasCrew={hasCrew && !hasPendingCrewApplication}
            seasonAvailable={seasonHouseAvailable}
            offSeasonAvailable={operatingFeatures.offSeason}
            availableEventCount={availableEventCount}
            onNavigate={handleDesktopNavigate}
            notificationRefreshKey={notificationRefreshKey}
            onNotificationsClick={() => {
              setNotificationReturnView(currentView);
              setCurrentView('notifications');
            }}
          >
            {currentContent}
          </DesktopShell>
        ) : currentContent}

        {showBottomNav && !isDesktop && (
          <LowerMenuBar
            activeTab={activeTab}
            availableEventCount={availableEventCount}
            hasCrew={hasCrew && !hasPendingCrewApplication}
            seasonAvailable={seasonHouseAvailable}
            offSeasonAvailable={operatingFeatures.offSeason}
            onTabChange={(tab) => {
              setCurrentView(tabViews[tab]);
            }}
            notificationRefreshKey={notificationRefreshKey}
            onNotificationsClick={() => {
              setNotificationReturnView(currentView);
              setCurrentView('notifications');
            }}
          />
        )}

        <CaptainOnboarding
          open={captainOnboardingOpen}
          isDesktop={isDesktop}
          initialStep={captainOnboardingStep}
          onClose={handleCaptainOnboardingClose}
          onComplete={handleCaptainOnboardingComplete}
          onNavigate={handleCaptainOnboardingNavigate}
        />

        {isCaptain && captainGuideReturnVisible && !captainOnboardingOpen && (
          <CaptainOnboardingReturnButton
            onReturn={() => {
              setCaptainGuideReturnVisible(false);
              setCaptainOnboardingOpen(true);
            }}
            onDismiss={() => setCaptainGuideReturnVisible(false)}
          />
        )}
      </div>
      {import.meta.env.DEV && (
        <DevPanel
          onOpenCrewAdmin={() => setCurrentView('crew_admin')}
          onOpenSchoolAdmin={() => setCurrentView('school_admin')}
          onOpenUserAdmin={() => setCurrentView('user_admin')}
          deployedDeveloperAccess={canReviewCrews}
        />
      )}
    </div>
  );
}

export default App;
