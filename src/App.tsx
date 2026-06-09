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

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'calendar' | 'edit' | 'heart' | 'user'>('home');
  const [currentView, setCurrentView] = useState<
    'login' | 'home' | 'reservation' | 'stats' | 'my_reservations' | 'crew_detail' | 'search_crew' | 'user_info' | 'crew_member' | 'create_crew' | 'access_pending' | 'crew_settings' | 'guest_reservation' | 'my_page' | 'account_info' |
    'parties' | 'party_detail' | 'my_parties' | 'dashboard_parties' | 'dashboard_party_new' | 'dashboard_party_detail' | 'dashboard_party_edit'
  >('login');
  const [hasCrew, setHasCrew] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);

  // Check for auto-login on app start
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const autoLogin = localStorage.getItem('autoLogin') === 'true';

    if (accessToken && autoLogin) {
      setCurrentView('home');
    } else if (!accessToken) {
      setCurrentView('login');
    } else {
      setCurrentView('login');
    }
  }, []);

  // Sync activeTab with currentView
  useEffect(() => {
    if (currentView === 'home' || currentView === 'parties' || currentView === 'party_detail' || currentView === 'my_parties') {
      setActiveTab('home');
    } else if (currentView === 'my_reservations') {
      setActiveTab('calendar');
    } else if (currentView === 'reservation' || currentView === 'guest_reservation') {
      setActiveTab('edit');
    } else if (currentView === 'crew_detail' || currentView === 'crew_settings' || currentView === 'crew_member' || currentView === 'stats') {
      setActiveTab('heart');
    } else if (currentView === 'my_page' || currentView === 'account_info') {
      setActiveTab('user');
    }
  }, [currentView]);

  const isDashboardView = currentView.startsWith('dashboard_');

  return (
    <div className="w-full h-screen bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
      <div className={isDashboardView 
        ? "w-full h-full bg-white dark:bg-zinc-950 relative overflow-hidden flex flex-col" 
        : "w-full h-full max-w-md bg-[#FAF8F3] relative shadow-2xl overflow-hidden flex flex-col"
      }>
        {currentView === 'login' ? (
          <LoginLanding
            onLogin={() => setCurrentView('home')}
            onSignupNeeded={() => setCurrentView('user_info')}
            onDebugUserInfo={() => setCurrentView('user_info')}
          />
        ) : currentView === 'reservation' ? (
          <Reservation onBack={() => setCurrentView('home')} />
        ) : currentView === 'guest_reservation' ? (
          <Reservation onBack={() => setCurrentView('home')} isGuest={true} />
        ) : currentView === 'stats' ? (
          <ReservationStats
            onBack={() => setCurrentView('home')}
            onMyCalendarClick={() => setCurrentView('my_reservations')}
            onReservationClick={() => setCurrentView('reservation')}
          />
        ) : currentView === 'my_reservations' ? (
          <MyReservations
            onBack={() => setCurrentView('home')}
            onCrewClick={() => {
              setCurrentView('stats');
            }}
          />
        ) : currentView === 'crew_detail' ? (
          <CrewDetail
            onBack={() => setCurrentView('home')}
            onCalendarClick={() => {
              setCurrentView('stats');
            }}
            onMemberClick={() => setCurrentView('crew_member')}
            onSettingsClick={() => setCurrentView('crew_settings')}
          />
        ) : currentView === 'crew_settings' ? (
          <CrewSettings onBack={() => setCurrentView('crew_detail')} />
        ) : currentView === 'crew_member' ? (
          <CrewMember onBack={() => setCurrentView('crew_detail')} />
        ) : currentView === 'search_crew' ? (
          <SearchCrew onBack={() => setCurrentView('home')} />
        ) : currentView === 'user_info' ? (
          <UserInfoInput onBack={() => setCurrentView('login')} />
        ) : currentView === 'my_page' ? (
          <MyPage
            onBack={() => setCurrentView('home')}
            onAccountInfoClick={() => setCurrentView('account_info')}
          />
        ) : currentView === 'account_info' ? (
          <AccountInfo onBack={() => setCurrentView('my_page')} />
        ) : currentView === 'parties' ? (
          <Parties
            onBack={() => setCurrentView('home')}
            onPartyClick={(id) => {
              setSelectedPartyId(id);
              setCurrentView('party_detail');
            }}
            onCreateClick={() => setCurrentView('dashboard_party_new')}
            canCreate={true}
          />
        ) : currentView === 'party_detail' ? (
          <PartyDetail
            partyId={selectedPartyId || 0}
            onBack={() => setCurrentView('parties')}
          />
        ) : currentView === 'my_parties' ? (
          <MyParties
            onBack={() => setCurrentView('home')}
            onPartyClick={(id) => {
              setSelectedPartyId(id);
              setCurrentView('party_detail');
            }}
          />
        ) : currentView === 'dashboard_parties' ? (
          <DashboardParties
            onCreatePartyClick={() => setCurrentView('dashboard_party_new')}
            onEditPartyClick={(id) => {
              setSelectedPartyId(id);
              setCurrentView('dashboard_party_edit');
            }}
            onViewDetailClick={(id) => {
              setSelectedPartyId(id);
              setCurrentView('dashboard_party_detail');
            }}
            onBackToHomeClick={() => setCurrentView('home')}
          />
        ) : currentView === 'dashboard_party_new' ? (
          <DashboardPartyNew
            onBack={() => setCurrentView('dashboard_parties')}
            onSuccess={(id) => {
              setSelectedPartyId(id);
              setCurrentView('dashboard_party_detail');
            }}
          />
        ) : currentView === 'dashboard_party_detail' ? (
          <DashboardPartyDetail
            partyId={selectedPartyId || 0}
            onBack={() => setCurrentView('dashboard_parties')}
            onEditClick={(id) => {
              setSelectedPartyId(id);
              setCurrentView('dashboard_party_edit');
            }}
          />
        ) : currentView === 'dashboard_party_edit' ? (
          <DashboardPartyEdit
            partyId={selectedPartyId || 0}
            onBack={() => setCurrentView('dashboard_parties')}
            onSuccess={() => setCurrentView('dashboard_parties')}
          />
        ) : (
          <Home
            onMakeReservationClick={() => setCurrentView('reservation')}
            onGuestReservationClick={() => setCurrentView('guest_reservation')}
            onCalendarClick={() => {
              setCurrentView('my_reservations');
            }}
            onTeamClick={() => setCurrentView('crew_detail')}
            onSearchClick={() => setCurrentView('search_crew')}
            hasCrew={hasCrew}
            onJoinCrew={() => setHasCrew(true)}
            onPartyClick={(id) => {
              setSelectedPartyId(id);
              setCurrentView('party_detail');
            }}
            onSeeAllPartiesClick={() => setCurrentView('parties')}
            onMyPlansClick={() => setCurrentView('my_parties')}
            onDashboardClick={() => setCurrentView('dashboard_parties')}
          />
        )}

        {(currentView !== 'login' && currentView !== 'user_info' && currentView !== 'my_page' && currentView !== 'account_info' && currentView !== 'reservation' && currentView !== 'guest_reservation' && !isDashboardView) && (
          <LowerMenuBar
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              if (tab === 'home') setCurrentView('home');
              if (tab === 'calendar') setCurrentView('my_reservations');
              if (tab === 'edit') setCurrentView('reservation');
              if (tab === 'heart') setCurrentView('crew_detail');
              if (tab === 'user') setCurrentView('my_page');
            }}
          />
        )}
      </div>
    </div>
  );
}

export default App;
