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
import Notifications from './pages/Notifications';
import NotificationBell from './components/NotificationBell';
import DesktopShell, { type DesktopDestination } from './components/DesktopShell';
import DesktopRequired from './components/DesktopRequired';

// New Party Pages
import Parties from './pages/Parties';
import PartyDetail from './pages/PartyDetail';
import MyParties from './pages/MyParties';
import DashboardParties from './pages/DashboardParties';
import DashboardPartyNew from './pages/DashboardPartyNew';
import DashboardPartyDetail from './pages/DashboardPartyDetail';
import DashboardPartyEdit from './pages/DashboardPartyEdit';
import DashboardGroups from './pages/DashboardGroups';
import DashboardGroupDetail from './pages/DashboardGroupDetail';
import OperationsCenter from './pages/OperationsCenter';
import CrewPermissions from './pages/CrewPermissions';
import PartyConceptOptions from './pages/PartyConceptOptions';
import DevPanel from './components/DevPanel';
import { getAccessToken, hasDevOverride, isAutoLoginEnabled } from './lib/session';
import { getOperationsContext, type OperationPermission } from './services/operations';
import { useDesktopViewport } from './hooks/useDesktopViewport';
import { getOperatingSeason } from './constants/operatingSeason';

type Tab = 'home' | 'calendar' | 'edit' | 'heart' | 'user';
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
  | 'my_page'
  | 'account_info'
  | 'crew_admin'
  | 'crew_permissions'
  | 'notifications'
  | 'parties'
  | 'party_detail'
  | 'my_parties'
  | 'operations_center'
  | 'dashboard_parties'
  | 'dashboard_party_new'
  | 'dashboard_party_detail'
  | 'dashboard_party_edit'
  | 'dashboard_groups'
  | 'dashboard_group_detail'
  | 'party_concepts';

const viewTabs: Partial<Record<View, Tab>> = {
  home: 'home',
  parties: 'home',
  party_detail: 'home',
  my_parties: 'home',
  party_concepts: 'home',
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
  'reservation',
  'guest_reservation',
  'crew_admin',
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
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [signupUserType, setSignupUserType] = useState<SignupUserType>('GENERAL');
  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0);
  const [notificationReturnView, setNotificationReturnView] = useState<View>('home');
  const [canManage, setCanManage] = useState(false);
  const [operationPermissions, setOperationPermissions] = useState<OperationPermission[]>([]);
  const [managementAccessResolved, setManagementAccessResolved] = useState(false);
  const isDesktop = useDesktopViewport();
  const usedDesktopLanding = useRef(false);

  // Check for auto-login on app start
  useEffect(() => {
    setCurrentView(getInitialView());
  }, []);

  const shouldLoadPermissions = !['login', 'user_type', 'user_info'].includes(currentView);

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
    if (currentView === 'operations_center') return 'operations_center';
    if (currentView === 'parties' || currentView === 'party_detail') return 'parties';
    if (currentView === 'my_parties') return 'my_parties';
    if (currentView === 'my_reservations') return 'my_reservations';
    if (currentView === 'reservation' || currentView === 'guest_reservation') return 'reservation';
    if (['crew_detail', 'crew_settings', 'crew_member', 'stats', 'search_crew'].includes(currentView)) return 'crew_detail';
    if (currentView === 'my_page' || currentView === 'account_info') return 'my_page';
    return 'home';
  };

  const handleDesktopNavigate = (destination: DesktopDestination) => {
    setCurrentView(destination);
  };

  const openPartyDetail = (id: number, destination: View = 'party_detail') => {
    setSelectedPartyId(id);
    setCurrentView(destination);
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
        return <Reservation onBack={() => setCurrentView('home')} isGuest={true} />;
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
        return <CrewAdmin onBack={() => setCurrentView('home')} />;
      case 'crew_permissions':
        return <CrewPermissions onBack={() => setCurrentView('operations_center')} />;
      case 'notifications':
        return <Notifications onBack={() => setCurrentView(notificationReturnView)} onChanged={() => setNotificationRefreshKey(key => key + 1)} />;
      case 'parties':
        return (
          <Parties
            onBack={() => setCurrentView('home')}
            onPartyClick={(id) => openPartyDetail(id)}
            onCreateClick={() => setCurrentView('dashboard_party_new')}
            canCreate={canManage && isDesktop}
          />
        );
      case 'party_detail':
        return <PartyDetail partyId={selectedPartyId || 0} onBack={() => setCurrentView('parties')} />;
      case 'my_parties':
        return <MyParties onBack={() => setCurrentView('home')} onPartyClick={(id) => openPartyDetail(id)} />;
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
      case 'party_concepts':
        return <PartyConceptOptions onBack={() => setCurrentView('home')} onOpenParties={() => setCurrentView('parties')} />;
      case 'dashboard_parties':
        return (
          <DashboardParties
            onCreatePartyClick={() => setCurrentView('dashboard_party_new')}
            onEditPartyClick={(id) => openPartyDetail(id, 'dashboard_party_edit')}
            onViewDetailClick={(id) => openPartyDetail(id, 'dashboard_party_detail')}
            onBackToHomeClick={() => setCurrentView('home')}
            onGroupsClick={() => setCurrentView('dashboard_groups')}
            onConceptsClick={() => setCurrentView('party_concepts')}
          />
        );
      case 'dashboard_party_new':
        return (
          <DashboardPartyNew
            onBack={() => setCurrentView('dashboard_parties')}
            onSuccess={(id) => openPartyDetail(id, 'dashboard_party_detail')}
          />
        );
      case 'dashboard_party_detail':
        return (
          <DashboardPartyDetail
            partyId={selectedPartyId || 0}
            onBack={() => setCurrentView('dashboard_parties')}
            onEditClick={(id) => openPartyDetail(id, 'dashboard_party_edit')}
          />
        );
      case 'dashboard_party_edit':
        return (
          <DashboardPartyEdit
            partyId={selectedPartyId || 0}
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
            onGuestReservationClick={() => setCurrentView('guest_reservation')}
            onCalendarClick={() => setCurrentView('my_reservations')}
            onTeamClick={() => setCurrentView('crew_detail')}
            onSearchClick={() => setCurrentView('search_crew')}
            hasCrew={hasCrew}
            onJoinCrew={() => setHasCrew(true)}
            onPartyClick={(id) => openPartyDetail(id)}
            onSeeAllPartiesClick={() => setCurrentView('parties')}
            onMyPlansClick={() => setCurrentView('my_parties')}
            onDashboardClick={() => setCurrentView('operations_center')}
            onConceptsClick={() => setCurrentView('party_concepts')}
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
      <div className={isDashboardView || usesDesktopShell
        ? "w-full h-full bg-white dark:bg-zinc-950 relative overflow-hidden flex flex-col" 
        : "w-full h-full max-w-md bg-[#FAF8F3] relative shadow-2xl overflow-hidden flex flex-col"
      }>
        {usesDesktopShell ? (
          <DesktopShell
            activeDestination={getDesktopDestination()}
            canManage={canManage}
            onNavigate={handleDesktopNavigate}
          >
            {currentContent}
          </DesktopShell>
        ) : currentContent}

        {currentView !== 'login' && currentView !== 'user_info' && currentView !== 'user_type' && currentView !== 'notifications' && !isDashboardView && (
          <NotificationBell refreshKey={notificationRefreshKey} onClick={() => {
            setNotificationReturnView(currentView);
            setCurrentView('notifications');
          }} />
        )}

        {showBottomNav && !isDesktop && (
          <LowerMenuBar
            activeTab={activeTab}
            onTabChange={(tab) => {
              setCurrentView(tabViews[tab]);
            }}
          />
        )}
      </div>
      {import.meta.env.DEV && <DevPanel onOpenCrewAdmin={() => setCurrentView('crew_admin')} />}
    </div>
  );
}

export default App;
