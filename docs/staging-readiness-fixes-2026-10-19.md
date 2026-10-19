# Staging readiness fixes — October 19, 2026

Owner: Jake. Timezone: Asia/Seoul. Authority: **“fix all issues.”**
Status: **candidate preparation record; locally verified, staging publication/release approved**.
Branch: `fix/staging-readiness-issues`, based on staging `develop` `720d6af`.
Original dirty checkouts are unchanged. No dependency/lockfile, API, schema or server-policy changes.
Owner answered **“continue”** to the focused commit, checked develop PRs and frontend staging-release
proposal. Hosted CI, merge and deployment results must be recorded only after verification in the
[operations ledger](https://github.com/SnowBuddySnow/BoardBuddy_Backend/blob/develop/infra/digitalocean/operations-ledger.md).
This file preserves the candidate validation snapshot, not a claim that deployment already passed.

## Fixes

| Finding | Local correction | Evidence / limit |
| --- | --- | --- |
| F02: simulated group-role badge | Group cards use neutral “호스트 그룹” and direct users to the actual member list; remove unconditional management-permission wording and local role inference | Five component regressions cover absent/stale overrides; local Chrome group list verified. The API does not return a per-group current-user role; no extra member-data requests or privileges added. |
| F03: mobile management silently returns Home | Preserve the requested route so the existing persistent 1024px desktop-required screen can explain the restriction | Actual App tests cover mobile click, direct entry at 1023px, desktop at 1024px, both resize directions and non-host denial. Chrome 390×844: click → persistent explanation → Home → click succeeds again, document width 390px. |
| F04: inconsistent event timezone paths | Share Korean-time parsing, opening availability, display and editor formatting across Home, lists, dashboard and response-sheet timestamps. Label host inputs 한국 시간 | Full suite runs in LA and Seoul. Rendered Home/list opening-boundary and editor offset/UTC cases; midnight and DST-offset helper cases. UTC/offset editor input formerly shifted to device-local time in LA. No live Safari/device-zone acceptance claimed. |
| Eight hook-dependency warnings / fetch behavior | Stable dependency-aware callbacks; editor uses the latest back action without refetching on parent renders and ignores obsolete loads; remove duplicate initial personal-calendar fetch | Zero lint warnings without suppression. Regressions cover crew/sort changes, stable rerenders, guest isolation, duplicate calendar requests and delayed older draft loads. |
| Reservation day cache stays stale after writes | Explicitly refresh after create/cancel/delete; cache null day responses without refetch loops | Synthetic component tests cover empty-day caching and a create → refetch count/state change. No live reservations or role assignments. |
| ~794 KB monolithic JavaScript chunk | Lazy-load heavier existing screens; keep login/Home immediate; add loading and safe failure/Home recovery | Largest local production JS chunk **402,648 bytes**, gzip about 126.20 KB; no Vite size warning. Raw chunk budget is 500,000 bytes for every JS chunk, including lazy chunks. Three budget and two loading/error regressions. Not a real-device latency benchmark. |

Lint now fails on any warning; build fails above the chunk budget. Neither guard changes access,
providers, branch protection or deployment targets. Smaller chunks do not prove all loading paths
work in a deployed environment: repeat the affected routes after an approved staging release.

## Validation

Bundled Node **24.19.0**, installed dependencies, no dependency installation. Hosted Node 22 CI
has not run for these unpublished changes. Both complete timezone runs passed **128 tests in
12 files** (87 previous + 41 new); typecheck, warning-free lint, production build and budget passed.

```bash
TZ=America/Los_Angeles node node_modules/vitest/vitest.mjs run
TZ=Asia/Seoul node node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc -b
node node_modules/eslint/bin/eslint.js 'src/**/*.{ts,tsx}' --max-warnings=0
VITE_API_BASE_URL=https://api-stg.boardbuddy.kr/api VITE_BUILD_SHA=local-readiness-20261019 node node_modules/vite/bin/vite.js build
node scripts/check-bundle-size.mjs
git diff --check
```

The new UI tests reproduced F02/F03 before implementation. LA editor tests also reproduced the
offset/UTC conversion defect; the test's outgoing API assertion was corrected to the existing
seconds-bearing wire format, not changed to a new contract. Mocked HTTP is not live acceptance.

Chrome visual QA used `http://127.0.0.1:4173`, the existing development simulation controls and
**API target `http://127.0.0.1:9`**. No real sign-in or live API/data access. After QA, the temporary
local simulation was reset to its original login screen, viewport override reset, tab closed and
the agent's loopback server stopped. Ignored screenshots (local only):

- `output/playwright/staging-readiness-fixes-20261019/mobile-desktop-guidance-local.jpg`
- `output/playwright/staging-readiness-fixes-20261019/neutral-group-badge-local.jpg`

## Not closed by this patch

- At candidate preparation, staging has the previous release. Publication, Node 22 CI, merge,
  Vercel staging release and affected-route acceptance are the now-approved next steps, not yet
  verified results in this snapshot. Missing Vercel automatic
  triggering is not diagnosed/fixed by screen splitting.
- Owner-skipped multi-account/applicant/scheduler/role journeys remain SKIPPED-OWNER, not passed.
- Genuine session expiry/refresh, offline/throttled/background recovery, Safari/live two-zone
  host acceptance and measured mobile performance remain unverified.
- Private database restore, off-device recovery identity, registry rollback access, alert delivery,
  provider registration/delivery and staffed cohort/support ownership remain separate gates.
  No private backup decrypted, infrastructure/credential/policy change, real message/payment or
  production action was performed. Terraform-state recovery is not database recovery.

Production remains **NO-GO**. This request authorizes fixing code, not silently declaring operational
validation complete. The owner approved publication and a checked staging-only release; production
and operational/security-policy changes remain outside that approval. See the ledger for later results.
