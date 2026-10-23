# Event journey audit fixes — 2026-10-22

Authority: owner requested **“resolve the issues and deploy to stg”** after the second behavior audit. Base: staging `develop` at `b355405fdc6fa3f9079e69436564e9c1498a27e1`. Work branch: `fix/event-join-followups`. Production/main, recruitment, backend, data, credentials, provider settings and the season-house reservation hold are outside this patch.

## Resolved behavior

1. Catalogue actions now open the existing detail flow instead of issuing a separate join. This removes both the phone-confirmation bypass and the unconditional completion message for `CONSENT_PENDING` responses. Detail remains responsible for fresh eligibility checks, phone confirmation, single in-flight requests, returned participant status and required response forms. An existing “always” preference does not turn catalogue navigation into a join.
2. Detail messages use the actual returned participant status: required responses, pending host approval or confirmed participation. Ordinary members are no longer described as guests in those messages.
3. My Events distinguishes received INVITE_ONLY/PENDING invitations from approval waiting. It displays **초대 수락 필요** and supports keyboard entry to detail; the back control has an accessible name.
4. The phone-sharing modal has a name/description, dialog semantics, initial focus, Tab/Shift-Tab containment, Escape dismissal and opener restoration. Its content scrolls within a bounded viewport height. Existing cancellation and request-time eligibility checks remain in place.
5. Catalogue and My Events distinguish failed loads from empty results and expose **다시 시도**. Catalogue retries retain search/activity choices. Neither retry creates a participation request.

## Verification before publication

- Added 15 permanent synthetic regressions, including complete catalogue → detail → phone confirmation → required-response journeys for INSTANT, APPROVAL_REQUIRED and INVITE_ONLY. The new tests initially reproduced 12 failures and 3 passes before implementation; all now pass.
- Full suite **228/228 tests in 18 files**, separately in UTC and America/Los_Angeles. Two older catalogue tests were updated to assert navigation/no POST instead of the removed direct-write contract; detail duplicate-request and invitation acceptance checks remain positive controls.
- TypeScript, zero-warning ESLint, production Vite build (`VITE_API_BASE_URL=/api`), bundle budget and diff whitespace checks pass. Largest JS chunk **398,034 / 500,000 bytes**. Existing installed/locked dependencies were used; no dependency or workflow update is included.
- Actual built-app browser at 320/390/768/1023/1024 × 844: catalogue → detail → phone modal focus/Escape/restoration and My Events invitation labelling, **10/10 checks**, no horizontal page overflow. Invitation card keyboard entry worked; a 390 × 568 viewport contained the 347.5px-high modal.
- All four reservation deep links across the five widths remained blocked: **20/20**. Loopback fixture recorded **216 GETs, zero writes, zero booking/calendar/statistics/season-guest calls**. No join confirmation or response submission was clicked in browser QA; positive writes/outcomes are isolated synthetic component tests, not live acceptance.
- Evidence is Git-ignored under `output/playwright/event-journey-fix-20261022/`, including `fixed-phone-dialog-390.png`, `fixed-my-invitation-390.png` and `local-verification.json`. Viewport overrides reset and local browser tab closed after testing.

## Release boundary

Create a checked PR into `develop`, verify the published tree equals the tested tree, wait for PR and post-merge CI, and manually create a Vercel Preview from the exact develop merge SHA. Keep Preview Branch Tracking disabled as the owner requested. Do not deploy main/production or restart the backend.

The prior verified staging Preview `39fpHBYD5yxVicb6r9NWqzdNWkai` / `b355405` is the pre-release reference; no rollback is performed by preparing this record. Record actual PR, CI, deployment and live read-only verification on the resulting PR after completion. This preparation document is not proof of deployment.

Limits remain: real multi-account applicant/host acceptance, physical iPhone/Android, Safari/Kakao and real OAuth/provider/payment flows are not passed by synthetic tests. No server-side contact disclosure was tested or inferred from the prior frontend confirmation inconsistency. The separate backend cold-start/restart downtime is not fixed or exercised by this frontend release.
