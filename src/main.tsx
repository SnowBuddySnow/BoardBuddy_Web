import { StrictMode } from 'react'
import { LazyMotion, MotionConfig } from 'motion/react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { FeedbackProvider } from './components/feedback/Feedback'
import { initializeObservability, Sentry } from './lib/observability'
import { captureCrewInvitation } from './lib/onboardingIntent'
import { initializePhoneConsentPreference } from './lib/session'

const loadMotionFeatures = () => import('./lib/motionFeatures').then(module => module.default)

captureCrewInvitation()
initializePhoneConsentPreference()
const observabilityEnabled = initializeObservability()
const application = observabilityEnabled ? (
  <Sentry.ErrorBoundary fallback={<main>BoardBuddy를 불러오지 못했습니다. 페이지를 새로고침해 주세요.</main>}>
    <App />
  </Sentry.ErrorBoundary>
) : <App />

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* "user" follows prefers-reduced-motion: transforms are skipped, opacity still fades. */}
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadMotionFeatures}>
        <FeedbackProvider>
          {application}
        </FeedbackProvider>
      </LazyMotion>
    </MotionConfig>
  </StrictMode>,
)
