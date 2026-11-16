# Season stay benefits

Branch: `feat/season-stay-benefits`, based on develop dee7ec0. Deployment is handled separately after review and merge.

- My calendar displays the pass's used, confirmed-reserved and additional available nights. It distinguishes loading, failure and an unregistered pass.
- All three reservation entry points require the overnight-date agreement and send policy version 1. A booking's consent is not silently inferred by the HTTP service.
- Crew calendar managers can register 5/10/custom/unlimited passes, mark past confirmed stays completed, and send selected-day announcements to confirmed stayers. Guest notices go to the requester.
- Announcement history displays snapshotted recipients and read receipts. A stable request key is retained after an ambiguous network failure so retrying does not duplicate the announcement.
- Promotion, stay reminder and manager announcements use the existing in-app bell/feed. Opening a stay notification navigates to my calendar. These are not Kakao or background device push alerts.

## Review locally

Run `node scripts/dev/onboarding-preview.mjs`, then visit http://127.0.0.1:5175.

- **시즌방 보기**: synthetic member with 5-night pass, completed stays, confirmed and waiting dates. Open my calendar to view the pass balance.
- **시즌방 운영**: synthetic crew manager; select a date, open member pass management, and send an announcement.
- All actions are synthetic and never call staging/production. The preview banner is development-only.

## Validation

`tsc -b`, ESLint, Vitest, Vite build, bundle budget and API contract validation. `scripts/test/run-season-stays.mjs` exercises pass balances, consent, manager pass edits, private announcements/read receipts and notification navigation on Chromium at 320/390/1440 px and WebKit at 390 px. `scripts/test/run-mobile-management.mjs` also covers the existing five viewport/engine combinations with the new consent requirement.

The backend's MySQL integration suite separately validates cross-date concurrent quota, FIFO eligible promotion, quota restoration, consent enforcement, durable notification delivery/retry, cancellation suppression, manager permissions and concurrent announcement idempotency. See the sibling backend `docs/season-stay-benefits.md` for accounting semantics and rollout order.

Backend now requires `stayPolicyVersion: 1`. Coordinate deployment so the frontend consent UI ships before that server contract; new pass/announcement routes become available after the backend schema/application release. Review locally first and publish PRs only after explicit user approval.
