# Event admission follow-up — 2026-10-22

Authority: owner requested **“resolve the bugs”** after the staging audit. This follow-up fixes the confirmed DRAFT detail action and related admission presentation/handler defects. Staging develop only; no main/production release, recruitment, live applicant/provider action, schema or backend deployment is included.

## Fixes

- DRAFT direct links display a disabled **준비 중인 이벤트** action. CLOSED/CANCELLED and unrecognized event states cannot expose a new join action.
- Catalogue, detail, Home availability and navigation counts share one registration-state calculation. Invalid opening times, expired payment-required deadlines, full/invalid capacity, removed participants and missing invitations fail closed. The backend remains authoritative for permissions, crew quotas and concurrent capacity.
- An invite-only PENDING record is a received invitation, not an approval-waiting application. It exposes **초대 수락** / **초대 수락하기**, using the existing join endpoint. Invitation policy is labelled accurately.
- Existing JOINED, CONSENT_PENDING and ordinary approval-PENDING controls are preserved after event start. Cancelled applicants may reapply when otherwise eligible. Existing applications are not counted as new admission opportunities.
- Join handlers recheck actual current time before dispatch and after the phone-sharing dialog. Expired confirmation sends no join and does not persist an “always agree” preference. Per-event/detail in-flight guards prevent same-render double-click duplicate requests.
- Season-house reservation constants, navigation/security hold and stored data are unchanged.

## Verification before publication

- Added **33 regressions**, total **213/213 tests in 17 files**, passing separately in UTC and America/Los_Angeles. The initial targeted red run reproduced 13 failures, including DRAFT/unknown states, invalid opening, deadline, removed/invitation presentation and stale phone confirmation.
- Tests render real catalogue/detail components against a synthetic HTTP boundary. Positive cases prove an eligible confirmed join and received-invitation acceptance still issue exactly the normal request; rapid duplicate clicks issue one request. No real API, account, message or payment is used.
- TypeScript, zero-warning ESLint, Vite production build and bundle budget pass. Largest JS chunk **398,034 / 500,000 bytes**. Commands used the installed Node 24 runtime, existing locked dependencies and supported Vitest threads pool (two workers).
- Built-app read-only loopback browser fixture: seven admission states at actual **320/390/768/1023/1024 × 844** = **35 expected controls**, no horizontal page overflow. Past/DRAFT/removed/expired-payment/missing-invitation states disabled; eligible future and received invitation enabled. No join clicked in browser QA.
- Reservation deep-link regression: four views at those five widths = **20/20 blocked**. Synthetic request record: **390 GETs, zero writes, zero reservation/calendar/statistics/season-guest API calls**. Viewport override reset and local QA tab closed.
- Screenshots/measurements are ignored under `output/playwright/event-admission-fix-20261022/`. Physical devices, Safari/Kakao, real invitations and previously owner-skipped multi-account acceptance remain untested, not passed.

## Deployment findings and boundaries

- Existing regular-browser GitHub and Vercel sessions work; do not repeat the earlier broad CLI refresh or extract browser credentials. Publish reviewed files through normal feature/develop PR checks and verify source equality.
- Vercel diagnosis: Preview **Branch Tracking is disabled**. The UI explicitly says enabling it creates deployments for every branch not matched by another environment. The existing staging domain tracks develop. Owner explicitly chose **“Keep manual staging deployments for now.”** Tracking remains disabled; no provider settings, all-branch previews or deploy-hook credential changed/created.
- The backend restart 502 is a separate deployment-availability issue: the existing workflow replaces its single backend instance before its roughly 102-second cold boot. This frontend-only fix does not restart the backend. Zero-downtime routing/candidate rollout requires a reviewed backend deployment/resource design, not a frontend workaround or weaker health check. No schema, MySQL volume, proxy, firewall, access or provider setting changed by this patch.

Publication/CI/deployment identities and deployed browser verification must be recorded on the resulting PR after they actually complete. This preparation record is not proof of a deployed revision.
