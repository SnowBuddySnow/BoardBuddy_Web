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

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'calendar' | 'edit' | 'heart' | 'user'>('home');
  const [currentView, setCurrentView] = useState<'login' | 'home' | 'reservation' | 'stats' | 'my_reservations' | 'crew_detail' | 'search_crew' | 'user_info' | 'crew_member' | 'create_crew' | 'access_pending' | 'crew_settings' | 'guest_reservation' | 'my_page' | 'account_info'>('login');
  const [hasCrew, setHasCrew] = useState(false);

  // Check for auto-login on app start
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const autoLogin = localStorage.getItem('autoLogin') === 'true';

    if (accessToken && autoLogin) {
      // Auto-login: go directly to home page
      setCurrentView('home');
    } else if (!accessToken) {
      // No token: show login page
      setCurrentView('login');
    } else {
      // Token exists but auto-login is disabled: show login page
      setCurrentView('login');
    }
  }, []);

  // Sync activeTab with currentView
  useEffect(() => {
    if (currentView === 'home') {
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


  return (
    <div className="w-full h-screen bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
      <div className="w-full h-full max-w-md bg-white dark:bg-black relative shadow-2xl overflow-hidden flex flex-col">
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
        ) : (
          <Home
            onMakeReservationClick={() => setCurrentView('reservation')}
            onGuestReservationClick={() => setCurrentView('guest_reservation')}
            onCheckScheduleClick={() => {
              setCurrentView('my_reservations');
            }}
            onCalendarClick={() => {
              setCurrentView('my_reservations');
            }}
            onTeamClick={() => setCurrentView('crew_detail')}
            onSearchClick={() => setCurrentView('search_crew')}
            hasCrew={hasCrew}
            onJoinCrew={() => setHasCrew(true)}
          />
        )}


        {(currentView !== 'login' && currentView !== 'user_info' && currentView !== 'my_page' && currentView !== 'account_info' && currentView !== 'reservation' && currentView !== 'guest_reservation') && (
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
