import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeObservability, Sentry } from './lib/observability'

const observabilityEnabled = initializeObservability()
const application = observabilityEnabled ? (
  <Sentry.ErrorBoundary fallback={<main>BoardBuddy를 불러오지 못했습니다. 페이지를 새로고침해 주세요.</main>}>
    <App />
  </Sentry.ErrorBoundary>
) : <App />

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {application}
  </StrictMode>,
)
