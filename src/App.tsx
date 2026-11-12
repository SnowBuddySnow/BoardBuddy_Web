import { claimEventManagerOnboarding, completeEventManagerOnboarding, dismissEventManagerOnboarding, hasEventManagementAccess } from './lib/eventManagerOnboarding';
import EventManagerOnboarding, { EventManagerOnboardingReturnButton, type EventManagerOnboardingDestination } from './components/EventManagerOnboarding';
import { lazy, useState, useEffect, useRef } from 'react';
import { LowerMenuBar } from './components/LowerMenuBar';
import Home from './pages/Home';
import LoginLanding from './pages/LoginLanding';
import DesktopShell, { type DesktopDestination } from './components/DesktopShell';
import DesktopRequired from './components/DesktopRequired';

import PageBoundary from './components/PageBoundary';
import DevPanel from './components/DevPanel';
import CaptainOnboarding, { CaptainOnboardingReturnButton, type CaptainOnboardingDestination } from './components/CaptainOnboarding';
import { getAccessToken } from './lib/session';
import { getInitialView, viewTabs, tabViews, viewsWithoutBottomNav, seasonMemberViews, offSeasonViews, eventGuideEntryViews, type View } from './navigation/routes';
import { readNavigation, useBrowserNavigation } from './navigation/useBrowserNavigation';
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
import { isEventRegistrationAvailable } from './lib/eventDateTime';
import { captureCrewInvitation, CREW_INVITATION_CHANGED, getCrewInvitationIntent } from './lib/onboardingIntent';

// Keep login/home immediate; fetch heavier screens only when their existing route is entered.
const Reservation = lazy(() => import('./pages/Reservation'));
const ReservationStats = lazy(() => import('./pages/ReservationStats'));
const MyReservations = lazy(() => import('./pages/MyReservations'));
const CrewDetail = lazy(() => import('./pages/CrewDetail'));
const UserInfoInput = lazy(() => import('./pages/UserInfoInput'));
const ProfileTypeConfirmation = lazy(() => import('./pages/ProfileTypeConfirmation'));
const StudentVerification = lazy(() => import('./pages/StudentVerification'));
const CrewMember = lazy(() => import('./pages/CrewMember'));
const SearchCrew = lazy(() => import('./pages/SearchCrew'));
const CrewInvite = lazy(() => import('./pages/CrewInvite'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const CrewSettings = lazy(() => import('./pages/CrewSettings'));
const MyPage = lazy(() => import('./pages/MyPage'));
const AccountInfo = lazy(() => import('./pages/AccountInfo'));
const CrewAdmin = lazy(() => import('./pages/CrewAdmin'));
const SchoolAdmin = lazy(() => import('./pages/SchoolAdmin'));
const UserAdmin = lazy(() => import('./pages/UserAdmin'));
const SignupAudit = lazy(() => import('./pages/SignupAudit'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Parties = lazy(() => import('./pages/Parties'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const MyParties = lazy(() => import('./pages/MyParties'));
const DashboardParties = lazy(() => import('./pages/DashboardParties'));
const DashboardEventNew = lazy(() => import('./pages/DashboardEventNew'));
const DashboardEventDetail = lazy(() => import('./pages/DashboardEventDetail'));
const DashboardEventEdit = lazy(() => import('./pages/DashboardEventEdit'));
const DashboardGroups = lazy(() => import('./pages/DashboardGroups'));
const DashboardGroupDetail = lazy(() => import('./pages/DashboardGroupDetail'));
const OperationsCenter = lazy(() => import('./pages/OperationsCenter'));
const CrewPermissions = lazy(() => import('./pages/CrewPermissions'));
const RoleGuide = lazy(() => import('./pages/RoleGuide'));
const GuestAccess = lazy(() => import('./pages/GuestAccess'));
const OrganizerInviteAccept = lazy(() => import('./pages/OrganizerInviteAccept'));

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
  const [crewInviteRevision, setCrewInviteRevision] = useState(0);
  useEffect(() => {
    const capture = () => captureCrewInvitation();
    const changed = () => { setCrewInviteRevision(value => value + 1); setCurrentView('crew_invite'); };
    window.addEventListener('hashchange', capture);
    window.addEventListener(CREW_INVITATION_CHANGED, changed);
    return () => { window.removeEventListener('hashchange', capture); window.removeEventListener(CREW_INVITATION_CHANGED, changed); };
  }, []);
  const [hasCrew, setHasCrew] = useState(false);
  const [hasPendingCrewApplication, setHasPendingCrewApplication] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(() => {
    return readNavigation().eventId;
  });
  const [guestCrewId, setGuestCrewId] = useState<number | null>(null);
  const [isGuestEventApplication, setIsGuestEventApplication] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(() => readNavigation().groupId);
  const [organizerInviteToken, setOrganizerInviteToken] = useState(
    () => new URLSearchParams(window.location.search).get('organizerInvite') || '',
  );
  useBrowserNavigation({
    view: currentView, eventId: selectedEventId, groupId: selectedGroupId, organizerInviteToken,
  }, route => {
    setCurrentView(route.view);
    setSelectedEventId(route.eventId);
    setSelectedGroupId(route.groupId);
    setOrganizerInviteToken(route.organizerInviteToken);
  });
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
  const [crewAccessRevision, setCrewAccessRevision] = useState(0);
  const [onboardingUserId, setOnboardingUserId] = useState<number | null>(null);
  const [captainOnboardingOpen, setCaptainOnboardingOpen] = useState(false);
  const [captainOnboardingDismissed, setCaptainOnboardingDismissed] = useState(false);
  const [captainOnboardingStep, setCaptainOnboardingStep] = useState(0);
  const [captainGuideReturnVisible, setCaptainGuideReturnVisible] = useState(false);
  const [eventManagerOnboardingOpen, setEventManagerOnboardingOpen] = useState(false);
  const [eventManagerOnboardingDismissed, setEventManagerOnboardingDismissed] = useState(false);
  const [eventManagerOnboardingStep, setEventManagerOnboardingStep] = useState(0);
  const [eventManagerGuideReturnVisible, setEventManagerGuideReturnVisible] = useState(false);
  const isDesktop = useDesktopViewport();
  const usedDesktopLanding = useRef(false);
  const shouldLoadPermissions = !['login', 'user_info', 'profile_type_confirmation', 'student_verification', 'crew_invite'].includes(currentView);
  const operatingMode = getOperatingMode();
  const operatingFeatures = getOperatingFeatures(operatingMode);
  const seasonHouseAvailable = operatingFeatures.season
    && hasCrew
    && !hasPendingCrewApplication
    && crewDetail !== null
    && crewDetail.seasonHouseActive !== false;

  const canUseEventManagerGuide = shouldLoadPermissions
    && managementAccessResolved
    && onboardingUserId !== null
    && operatingFeatures.offSeason
    && hasEventManagementAccess(operationPermissions);

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
        setOnboardingUserId(user.userId);
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
          setOnboardingUserId(null);
        }
      }
    };

    void loadCrewAccess();
    return () => { cancelled = true; };
  }, [shouldLoadPermissions, crewAccessRevision]);

  useEffect(() => {
    if (currentView === 'onboarding' || currentView === 'crew_invite') return;
    if (!shouldLoadPermissions || !managementAccessResolved || !isCaptain || onboardingUserId == null) return;
    if (captainOnboardingDismissed || captainOnboardingOpen || eventManagerOnboardingOpen) return;
    if (claimCaptainOnboarding(onboardingUserId)) {
      setCaptainOnboardingStep(0);
      setCaptainOnboardingOpen(true);
    }
  }, [
    captainOnboardingDismissed,
    captainOnboardingOpen,
    eventManagerOnboardingOpen,
    onboardingUserId,
    isCaptain,
    managementAccessResolved,
    shouldLoadPermissions,
    currentView,
  ]);

  useEffect(() => {
    // Captains keep their existing first-run guide and can open the event guide
    // manually. Invitations and in-progress event edits must not be interrupted.
    if (!canUseEventManagerGuide || isCaptain || onboardingUserId === null) return;
    if (!eventGuideEntryViews.has(currentView) || captainOnboardingOpen || eventManagerOnboardingOpen || eventManagerOnboardingDismissed) return;
    if (claimEventManagerOnboarding(onboardingUserId)) {
      setEventManagerOnboardingStep(0);
      setEventManagerOnboardingOpen(true);
    }
  }, [canUseEventManagerGuide, isCaptain, onboardingUserId, currentView, captainOnboardingOpen, eventManagerOnboardingOpen, eventManagerOnboardingDismissed]);


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
        setAvailableEventCount(events.filter(event => isEventRegistrationAvailable(event, currentTime)).length);
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
      // Keep the requested destination so DesktopRequired can explain the restriction.
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
    if (onboardingUserId != null) dismissCaptainOnboarding(onboardingUserId);
    setCaptainOnboardingOpen(false);
    setCaptainOnboardingDismissed(true);
    setCaptainGuideReturnVisible(false);
  };

  const handleCaptainOnboardingComplete = () => {
    if (onboardingUserId != null) completeCaptainOnboarding(onboardingUserId);
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
    setEventManagerOnboardingOpen(false);
    setEventManagerGuideReturnVisible(false);
    setCaptainOnboardingStep(0);
    setCaptainGuideReturnVisible(false);
    setCaptainOnboardingOpen(true);
  };

  const handleEventManagerOnboardingClose = () => {
    if (onboardingUserId !== null) dismissEventManagerOnboarding(onboardingUserId);
    setEventManagerOnboardingOpen(false);
    setEventManagerOnboardingDismissed(true);
    setEventManagerGuideReturnVisible(false);
  };

  const handleEventManagerOnboardingComplete = () => {
    if (onboardingUserId !== null) completeEventManagerOnboarding(onboardingUserId);
    setEventManagerOnboardingOpen(false);
    setEventManagerOnboardingDismissed(true);
    setEventManagerGuideReturnVisible(false);
  };

  const handleEventManagerOnboardingNavigate = (destination: EventManagerOnboardingDestination, stepIndex: number) => {
    setEventManagerOnboardingStep(stepIndex);
    setEventManagerOnboardingOpen(false);
    setEventManagerOnboardingDismissed(true);
    setEventManagerGuideReturnVisible(true);
    setCurrentView(destination);
  };

  const openEventManagerOnboarding = () => {
    setCaptainOnboardingOpen(false);
    setCaptainGuideReturnVisible(false);
    setEventManagerOnboardingStep(0);
    setEventManagerGuideReturnVisible(false);
    setEventManagerOnboardingOpen(true);
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
            : '현재 시즌방 예약은 운영하지 않습니다.'}
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
            onLogin={() => setCurrentView(getCrewInvitationIntent() ? 'crew_invite' : organizerInviteToken ? 'organizer_invite' : 'home')}
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
        return <SearchCrew onBack={() => setCurrentView('onboarding')} onApplied={() => setCurrentView('onboarding')} onJoined={() => {
          setHasCrew(true);
          setHasPendingCrewApplication(false);
          setCrewAccessRevision(revision => revision + 1);
          setCurrentView('crew_detail');
        }} />;
      case 'user_info':
        return (
          <UserInfoInput
            onBack={() => setCurrentView('login')}
            onSuccess={(requiresStudentVerification) => setCurrentView(
              requiresStudentVerification ? 'student_verification' : getCrewInvitationIntent() ? 'crew_invite' : organizerInviteToken ? 'organizer_invite' : 'onboarding'
            )}
          />
        );
      case 'profile_type_confirmation':
        return (
          <ProfileTypeConfirmation
            onSuccess={(requiresStudentVerification) => setCurrentView(
              requiresStudentVerification ? 'student_verification' : getCrewInvitationIntent() ? 'crew_invite' : organizerInviteToken ? 'organizer_invite' : 'home'
            )}
          />
        );
      case 'student_verification':
        return (
          <StudentVerification
            onDone={() => {
              window.history.replaceState({}, '', window.location.pathname);
              setCurrentView(getAccessToken() ? (getCrewInvitationIntent() ? 'crew_invite' : organizerInviteToken ? 'organizer_invite' : 'home') : 'login');
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
            onEventManagerOnboardingClick={canUseEventManagerGuide ? openEventManagerOnboarding : undefined}
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
        return <CrewAdmin mode="create" onBack={() => setCurrentView('onboarding')} onSearch={() => setCurrentView('search_crew')} onRequested={() => setCurrentView('onboarding')} />;
      case 'crew_invite':
        return <CrewInvite key={crewInviteRevision} onLogin={() => setCurrentView('login')} onSignup={() => setCurrentView('user_info')}
          onExit={() => setCurrentView(getAccessToken() ? 'home' : 'login')} onEvents={() => setCurrentView('parties')}
          onDone={(eventId) => { setCrewAccessRevision(value => value + 1); setManagementRefreshKey(value => value + 1); if (eventId) openEventDetail(eventId); else setCurrentView('crew_detail'); }} />;
      case 'onboarding':
        return <Onboarding onBack={() => setCurrentView('home')} onSearch={() => setCurrentView('search_crew')} onCreate={() => setCurrentView('crew_create')}
          onEvents={() => setCurrentView('parties')} onFirstEvent={(hasGroup) => setCurrentView(hasGroup ? 'dashboard_event_new' : 'dashboard_groups')}
          onCrew={(eventId) => { setCrewAccessRevision(value => value + 1); setManagementRefreshKey(value => value + 1); if (eventId) openEventDetail(eventId); else setCurrentView('crew_detail'); }} />;
      case 'school_admin':
        return <SchoolAdmin onBack={() => setCurrentView('home')} />;
      case 'user_admin':
        return <UserAdmin onBack={() => setCurrentView('home')} />;
      case 'signup_audit':
        return <SignupAudit onBack={() => setCurrentView('home')} />;
      case 'crew_permissions':
        return (
          <CrewPermissions
            onBack={() => setCurrentView('operations_center')}
            onPermissionsChanged={() => setManagementRefreshKey(key => key + 1)}
          />
        );
      case 'notifications':
        return <Notifications onBack={() => setCurrentView(notificationReturnView)} onChanged={() => setNotificationRefreshKey(key => key + 1)} onOnboarding={() => setCurrentView('onboarding')} />;
      case 'parties':
        return (
          <Parties
            onBack={() => setCurrentView('home')}
            onEventClick={(id) => openEventDetail(id)}
            onCreateClick={() => setCurrentView('dashboard_event_new')}
            canCreate={operationPermissions.includes('PARTIES_CREATE') && isDesktop}
          />
        );
      case 'event_detail':
        return <EventDetail eventId={selectedEventId || 0} onBack={() => setCurrentView(isGuestEventApplication ? 'guest_access' : 'parties')} isGuestApplication={isGuestEventApplication} onOpenEvent={(id) => openEventDetail(id)} />;
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
            onEventManagerOnboardingClick={canUseEventManagerGuide ? openEventManagerOnboarding : undefined}
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
            onOpenEvent={(id) => openEventDetail(id, 'dashboard_event_detail')}
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
            canCreate={operationPermissions.includes('EVENT_GROUPS_CREATE')}
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
            onOnboardingClick={() => setCurrentView('onboarding')}
            hasCrew={hasCrew}
            onJoinCrew={() => setHasCrew(true)}
            onEventClick={(id) => openEventDetail(id)}
            onSeeAllPartiesClick={() => setCurrentView('parties')}
            onMyPlansClick={() => setCurrentView('my_parties')}
            onDashboardClick={() => setCurrentView('operations_center')}
            onStudentVerificationClick={() => setCurrentView('student_verification')}
            operatingMode={operatingMode}
            crewDetail={crewDetail}
          />
        );
    }
  };

  const usesDesktopShell = isDesktop
    && !isDashboardView
    && !isPublicGuestFlow
    && !['login', 'user_info', 'profile_type_confirmation', 'student_verification', 'organizer_invite', 'crew_invite', 'onboarding'].includes(currentView);

  const currentContent = renderCurrentView();

  return (
    <div className="w-full h-dvh bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
      <div className={isDesktop || isDashboardView || usesDesktopShell || ['user_info', 'crew_invite', 'onboarding'].includes(currentView) || (['crew_admin', 'school_admin', 'user_admin', 'signup_audit'].includes(currentView) && canReviewCrews)
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
            <PageBoundary key={currentView} onBack={() => setCurrentView('home')}>{currentContent}</PageBoundary>
          </DesktopShell>
        ) : <PageBoundary key={currentView} onBack={() => setCurrentView('home')}>{currentContent}</PageBoundary>}

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

        <EventManagerOnboarding
          open={canUseEventManagerGuide && eventManagerOnboardingOpen && !captainOnboardingOpen}
          isDesktop={isDesktop}
          canCreateEvents={operationPermissions.includes('PARTIES_CREATE')}
          initialStep={eventManagerOnboardingStep}
          onClose={handleEventManagerOnboardingClose}
          onComplete={handleEventManagerOnboardingComplete}
          onNavigate={handleEventManagerOnboardingNavigate}
        />

        {canUseEventManagerGuide && eventManagerGuideReturnVisible && !eventManagerOnboardingOpen && !captainOnboardingOpen && (
          <EventManagerOnboardingReturnButton
            onReturn={() => {
              setEventManagerGuideReturnVisible(false);
              setEventManagerOnboardingOpen(true);
            }}
            onDismiss={() => setEventManagerGuideReturnVisible(false)}
          />
        )}

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
