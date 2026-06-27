import { useState, useEffect } from 'react';
import { LowerMenuBar } from './components/LowerMenuBar';
import Home from './pages/Home';
import Reservation from './pages/Reservation';
import ReservationStats from './pages/ReservationStats';
import MyReservations from './pages/MyReservations';
import LoginLanding from './pages/LoginLanding';
import CrewDetail from './pages/CrewDetail';
import UserInfoInput from './pages/UserInfoInput';
import CrewMember from './pages/CrewMember';
import SearchCrew from './pages/SearchCrew';
import CrewSettings from './pages/CrewSettings';
import MyPage from './pages/MyPage';
import AccountInfo from './pages/AccountInfo';

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
import PartyConceptOptions from './pages/PartyConceptOptions';
import DevPanel from './components/DevPanel';
import { getAccessToken, hasDevOverride, isAutoLoginEnabled } from './lib/session';

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
  | 'crew_member'
  | 'crew_settings'
  | 'guest_reservation'
  | 'my_page'
  | 'account_info'
  | 'parties'
  | 'party_detail'
  | 'my_parties'
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
  'my_page',
  'account_info',
  'reservation',
  'guest_reservation',
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

  // Check for auto-login on app start
  useEffect(() => {
    setCurrentView(getInitialView());
  }, []);

  const isDashboardView = currentView.startsWith('dashboard_');
  const activeTab = viewTabs[currentView] || 'home';
  const showBottomNav = !viewsWithoutBottomNav.includes(currentView) && !isDashboardView;

  const openPartyDetail = (id: number, destination: View = 'party_detail') => {
    setSelectedPartyId(id);
    setCurrentView(destination);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'login':
        return (
          <LoginLanding
            onLogin={() => setCurrentView('home')}
            onSignupNeeded={() => setCurrentView('user_info')}
            onDebugUserInfo={() => setCurrentView('user_info')}
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
        return <UserInfoInput onBack={() => setCurrentView('login')} />;
      case 'my_page':
        return <MyPage onBack={() => setCurrentView('home')} onAccountInfoClick={() => setCurrentView('account_info')} />;
      case 'account_info':
        return <AccountInfo onBack={() => setCurrentView('my_page')} />;
      case 'parties':
        return (
          <Parties
            onBack={() => setCurrentView('home')}
            onPartyClick={(id) => openPartyDetail(id)}
            onCreateClick={() => setCurrentView('dashboard_party_new')}
            canCreate={true}
          />
        );
      case 'party_detail':
        return <PartyDetail partyId={selectedPartyId || 0} onBack={() => setCurrentView('parties')} />;
      case 'my_parties':
        return <MyParties onBack={() => setCurrentView('home')} onPartyClick={(id) => openPartyDetail(id)} />;
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
            onDashboardClick={() => setCurrentView('dashboard_parties')}
            onConceptsClick={() => setCurrentView('party_concepts')}
          />
        );
    }
  };

  return (
    <div className="w-full h-screen bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
      <div className={isDashboardView 
        ? "w-full h-full bg-white dark:bg-zinc-950 relative overflow-hidden flex flex-col" 
        : "w-full h-full max-w-md bg-[#FAF8F3] relative shadow-2xl overflow-hidden flex flex-col"
      }>
        {renderCurrentView()}

        {showBottomNav && (
          <LowerMenuBar
            activeTab={activeTab}
            onTabChange={(tab) => {
              setCurrentView(tabViews[tab]);
            }}
          />
        )}
      </div>
      {import.meta.env.DEV && <DevPanel />}
    </div>
  );
}

export default App;
