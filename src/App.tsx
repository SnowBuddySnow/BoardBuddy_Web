import { useState, useEffect, useRef } from 'react';
import { LowerMenuBar } from './components/LowerMenuBar';
import Home from './pages/Home';
import Reservation from './pages/Reservation';
import ReservationStats from './pages/ReservationStats';
import MyReservations from './pages/MyReservations';
import LoginLanding from './pages/LoginLanding';
import CrewDetail from './pages/CrewDetail';
import UserInfoInput from './pages/UserInfoInput';
import UserTypeSelection, { type SignupUserType } from './pages/UserTypeSelection';
import CrewMember from './pages/CrewMember';
import SearchCrew from './pages/SearchCrew';
import CrewSettings from './pages/CrewSettings';
import MyPage from './pages/MyPage';
import AccountInfo from './pages/AccountInfo';
import CrewAdmin from './pages/CrewAdmin';
import SchoolAdmin from './pages/SchoolAdmin';
import Notifications from './pages/Notifications';
import NotificationBell from './components/NotificationBell';
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
import GuestAccess from './pages/GuestAccess';
import DevPanel from './components/DevPanel';
import { getAccessToken, hasDevOverride, isAutoLoginEnabled } from './lib/session';
import { getOperationsContext, type OperationPermission } from './services/operations';
import { getUserInfo } from './services/user';
import { getMyApplications } from './services/crew';
import { getCrewAdminData } from './services/crewAdmin';
import { useDesktopViewport } from './hooks/useDesktopViewport';
import { getOperatingSeason } from './constants/operatingSeason';
import { listParties } from './services/event';

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
  | 'user_type'
  | 'crew_member'
  | 'crew_settings'
  | 'guest_reservation'
  | 'guest_access'
  | 'my_page'
  | 'account_info'
  | 'crew_create'
  | 'crew_admin'
  | 'school_admin'
  | 'crew_permissions'
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
  | 'dashboard_group_detail';

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
  'user_type',
  'my_page',
  'account_info',
  'crew_create',
  'reservation',
  'guest_reservation',
  'crew_admin',
  'school_admin',
  'crew_permissions',
  'notifications',
];

const getInitialView = (): View => {
  if (hasDevOverride()) {
    return 'home';
  }
  return getAccessToken() && isAutoLoginEnabled() ? 'home' : 'login';
};

function App() {
  const [currentView, setCurrentView] = useState<View>('login');
  const [hasCrew, setHasCrew] = useState(false);
  const [hasPendingCrewApplication, setHasPendingCrewApplication] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [guestCrewId, setGuestCrewId] = useState<number | null>(null);
  const [isGuestEventApplication, setIsGuestEventApplication] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [signupUserType, setSignupUserType] = useState<SignupUserType>('GENERAL');
  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0);
  const [notificationReturnView, setNotificationReturnView] = useState<View>('home');
  const [canManage, setCanManage] = useState(false);
  const [canReviewCrews, setCanReviewCrews] = useState(false);
  const [operationPermissions, setOperationPermissions] = useState<OperationPermission[]>([]);
  const [managementAccessResolved, setManagementAccessResolved] = useState(false);
  const [availableEventCount, setAvailableEventCount] = useState(0);
  const isDesktop = useDesktopViewport();
  const usedDesktopLanding = useRef(false);
  const shouldLoadPermissions = !['login', 'user_type', 'user_info'].includes(currentView);

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
        setHasCrew(Boolean(user.crew));
        if (user.crew) {
          setHasPendingCrewApplication(false);
          return;
        }
        const applications = await getMyApplications();
        if (!cancelled) setHasPendingCrewApplication(applications.some(application => application.status === 'PENDING'));
      } catch {
        if (!cancelled) {
          setHasCrew(false);
          setHasPendingCrewApplication(false);
        }
      }
    };

    void loadCrewAccess();
    return () => { cancelled = true; };
  }, [shouldLoadPermissions]);

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
    if (!shouldLoadPermissions) {
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
  }, [currentView, shouldLoadPermissions]);

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
  }, [shouldLoadPermissions]);

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
  const activeTab = viewTabs[currentView] || 'home';
  const showBottomNav = !viewsWithoutBottomNav.includes(currentView) && !isDashboardView;

  const getDesktopDestination = (): DesktopDestination => {
    if (currentView === 'crew_admin') return 'crew_admin';
    if (currentView === 'school_admin') return 'school_admin';
    if (currentView === 'operations_center') return 'operations_center';
    if (currentView === 'parties' || currentView === 'event_detail') return 'parties';
    if (currentView === 'my_parties') return 'my_parties';
    if (currentView === 'my_reservations') return 'my_reservations';
    if (currentView === 'reservation' || currentView === 'guest_reservation') return 'reservation';
    if (currentView === 'guest_access') return 'reservation';
    if (['crew_detail', 'crew_settings', 'crew_member', 'stats', 'search_crew'].includes(currentView)) return 'crew_detail';
    if (currentView === 'my_page' || currentView === 'account_info') return 'my_page';
    return 'home';
  };

  const handleDesktopNavigate = (destination: DesktopDestination) => {
    setCurrentView(destination);
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
            <p className="mt-2 text-sm text-zinc-500">관리자 그룹에 속한 계정으로 다시 시도해 주세요.</p>
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
            onLogin={() => setCurrentView('home')}
            onSignupNeeded={() => setCurrentView('user_type')}
            onDebugUserInfo={() => setCurrentView('user_type')}
          />
        );
      case 'user_type':
        return (
          <UserTypeSelection
            onBack={() => setCurrentView('login')}
            onSelect={(userType) => {
              setSignupUserType(userType);
              setCurrentView('user_info');
            }}
          />
        );
      case 'reservation':
        return <Reservation onBack={() => setCurrentView('home')} />;
      case 'guest_reservation':
        return <Reservation onBack={() => setCurrentView('guest_access')} isGuest={true} guestCrewId={guestCrewId ?? undefined} />;
      case 'guest_access':
        return <GuestAccess
          onBack={() => setCurrentView('home')}
          onSeasonHouseAccess={(crewId) => { setGuestCrewId(crewId); setCurrentView('guest_reservation'); }}
          onEventAccess={openGuestEventApplication}
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
          />
        );
      case 'crew_settings':
        return <CrewSettings onBack={() => setCurrentView('crew_detail')} />;
      case 'crew_member':
        return <CrewMember onBack={() => setCurrentView('crew_detail')} />;
      case 'search_crew':
        return <SearchCrew onBack={() => setCurrentView('home')} />;
      case 'user_info':
        return (
          <UserInfoInput
            userType={signupUserType}
            onBack={() => setCurrentView('user_type')}
            onSuccess={() => setCurrentView('home')}
          />
        );
      case 'my_page':
        return <MyPage onBack={() => setCurrentView('home')} onAccountInfoClick={() => setCurrentView('account_info')} />;
      case 'account_info':
        return <AccountInfo onBack={() => setCurrentView('my_page')} />;
      case 'crew_admin':
        return <CrewAdmin mode="review" onBack={() => setCurrentView('home')} />;
      case 'crew_create':
        return <CrewAdmin mode="create" onBack={() => setCurrentView('home')} />;
      case 'school_admin':
        return <SchoolAdmin onBack={() => setCurrentView('home')} />;
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
            season={getOperatingSeason()}
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
        return <DashboardGroupDetail groupId={selectedGroupId || 0} onBack={() => setCurrentView('dashboard_groups')} />;
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
          />
        );
    }
  };

  const usesDesktopShell = isDesktop
    && !isDashboardView
    && !['login', 'user_info', 'user_type'].includes(currentView);

  const currentContent = renderCurrentView();

  return (
    <div className="w-full h-screen bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
      <div className={isDesktop || isDashboardView || usesDesktopShell || (['crew_admin', 'school_admin'].includes(currentView) && canReviewCrews)
        ? "w-full h-full bg-white dark:bg-zinc-950 relative overflow-hidden flex flex-col" 
        : "w-full h-full max-w-md bg-[#FAF8F3] relative shadow-2xl overflow-hidden flex flex-col"
      }>
        {usesDesktopShell ? (
          <DesktopShell
            activeDestination={getDesktopDestination()}
            canManage={canManage}
            canReviewCrews={canReviewCrews}
            hasCrew={hasCrew && !hasPendingCrewApplication}
            availableEventCount={availableEventCount}
            onNavigate={handleDesktopNavigate}
          >
            {currentContent}
          </DesktopShell>
        ) : currentContent}

        {currentView !== 'login' && currentView !== 'user_info' && currentView !== 'user_type' && currentView !== 'notifications' && currentView !== 'crew_create' && currentView !== 'crew_admin' && currentView !== 'school_admin' && !isDashboardView && (
          <NotificationBell refreshKey={notificationRefreshKey} onClick={() => {
            setNotificationReturnView(currentView);
            setCurrentView('notifications');
          }} />
        )}

        {showBottomNav && !isDesktop && (
          <LowerMenuBar
            activeTab={activeTab}
            availableEventCount={availableEventCount}
            hasCrew={hasCrew && !hasPendingCrewApplication}
            onTabChange={(tab) => {
              setCurrentView(tabViews[tab]);
            }}
          />
        )}
      </div>
      {import.meta.env.DEV && (
        <DevPanel
          onOpenCrewAdmin={() => setCurrentView('crew_admin')}
          onOpenSchoolAdmin={() => setCurrentView('school_admin')}
        />
      )}
    </div>
  );
}

export default App;
