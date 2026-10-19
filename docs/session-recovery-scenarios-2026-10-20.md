# Session recovery scenarios — October 20, 2026

Owner: Jake. Timezone: Asia/Seoul. Scope: continue the approved code-fix/readiness work.
Branch: `fix/session-recovery-scenarios`, based on staging `develop`
`9f684d9de96f6a15fba1906e8473a48c9d7a503d`.

Status: **candidate validation snapshot; staging-only publication/release approved**. After the
focused commit/checked-develop-PR/staging-release proposal, owner said **“is it ready for deployment?
if yes, deploy”**. Hosted checks, merge and live release must still be verified, then recorded in the
[operations ledger](https://github.com/SnowBuddySnow/BoardBuddy_Backend/blob/develop/infra/digitalocean/operations-ledger.md).
This snapshot records local tests, not live OAuth/session-expiry acceptance. Production remains
**NO-GO**; the approval does not include production or operational/security-policy changes.

## Findings and changes

The first 18 synthetic HTTP-adapter tests reproduced 11 failures before implementation. Several
failures shared the same cause; this is not a claim of 11 independent defects.

- Every refresh waiter now shares one in-flight operation for its own session and gets at most
  one authentication replay. A renewed credential rejected with 401 invalidates that current
  session instead of starting another refresh for queued requests.
- Offline, timeout and server errors surface to callers without discarding otherwise unrevoked
  recovery credentials. A later explicit request may retry recovery. There is **no automatic
  replay of a write after an ambiguous transport failure**.
- Refresh has a 15-second Axios timeout. Tests assert the configured timeout and inject a synthetic
  timeout error; this is not a browser/network timing measurement.
- Login/logout revisions and credential comparisons prevent an old request or refresh completion
  from clearing, replacing or resurrecting a different/newer session. A new login can start its
  own refresh without waiting for an older session's operation. A replay is checked again before
  dispatch. The local revision also distinguishes repeated login with an identical token pair.
- Explicit provider credentials, including Kakao's bearer token, are not replaced or treated as
  BoardBuddy refresh candidates. Missing refresh credentials on an expired signup session still
  require sign-in. Signed-out and ordinary 403/500 requests are not refreshed.
- Refresh responses must contain both non-empty string tokens as required by the current backend
  controller. Incomplete responses fail without replacing stored credentials. Malformed error
  messages do not cause a secondary type error.
- Refresh credentials remain private to recovery logic; they are not copied into ordinary request
  metadata/error configs. This is **not** a full application logging/security audit.

Definitive refresh HTTP 400/401/403 responses clear only the session that initiated the operation.
Network/timeout/5xx or malformed-success responses retain credentials but do not claim the request
succeeded or extend server-side token validity. A late 401 from an obsolete session is rejected,
not replayed under a newer login; the user may need to reload/retry that view explicitly.

## Scenario coverage

All data and tokens are synthetic; Axios adapters and the refresh call are intercepted locally.
No Kakao request, live API request, real session token, new account or live event write is used.

| Scenario | Cases | Expected result |
| --- | ---: | --- |
| Concurrent expiry / rejected renewed credential | 2 | One refresh; each caller has at most one auth replay |
| Offline, timeout, 503 refresh; later explicit recovery | 4 | Preserve session; no automatic retry of the failed write |
| Refresh 400 / 401 / 403 | 3 | Reject and clear only the initiating current session |
| Logout while refresh pending; newer login success/failure; late old 401 | 4 | No session resurrection, overwrite or cross-session clearing |
| Explicit Kakao credential / expired signup / anonymous | 3 | Preserve provider header; no inappropriate refresh |
| Ordinary request 403 / 500 / transport failure | 3 | No refresh or blind write replay |
| Incomplete success / malformed error payload | 2 | Reject safely without losing recovery credentials |
| Identical-pair relogin / independent new-session refresh | 2 | Session revision and flight isolation hold |
| Ordinary request config metadata | 1 | No copied refresh credential |
| Interrupted queue / logout just before replay dispatch | 2 | All waiters settle; stale replay is cancelled |
| Case-insensitive current-session Authorization header | 1 | Refresh still works with a lowercase header name |
| **New tests** | **27** | **All pass locally** |

Test source: [axios.test.ts](../src/lib/axios.test.ts).
Implementation: [axios.ts](../src/lib/axios.ts), [session.ts](../src/lib/session.ts).

## Validation

Bundled Node **24.19.0**, installed dependencies only; no manifest, lockfile or dependency change.
Full suite: **155 tests in 13 files pass in both America/Los_Angeles and Asia/Seoul**.
Typecheck, lint with zero warnings, production build, every-JavaScript-chunk budget and whitespace
checks pass. Largest local JS chunk: **403,284 / 500,000 bytes**. Hosted Node 22 CI has not run for
this candidate. No browser QA or real-device performance result is claimed.

```sh
TZ=America/Los_Angeles node node_modules/vitest/vitest.mjs run
TZ=Asia/Seoul node node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc -b
node node_modules/eslint/bin/eslint.js 'src/**/*.{ts,tsx}' --max-warnings=0
VITE_API_BASE_URL=https://api-stg.boardbuddy.kr/api VITE_BUILD_SHA=local-session-recovery-20261020 node node_modules/vite/bin/vite.js build
node scripts/check-bundle-size.mjs
git diff --check
```

## Limits and handoff

- At candidate preparation, staging remains on frontend `9f684d9`; backend application remains on
  `306c1c7` as last verified. Local preparation did not deploy, modify live fixtures, read authentication storage, change infrastructure,
  send messages or access/decrypt/restore a private backup.
- Genuine browser expiry/refresh, interrupted/background response-draft recovery, Safari, live
  two-zone acceptance and mobile performance remain unverified. These local session tests do not
  close the complete event-process acceptance gate.
- Owner-skipped live applicant/multi-account/role journeys remain **SKIPPED-OWNER**, not passed.
- Actual isolated database recovery, off-device recovery identity, registry rollback access,
  alerts/provider delivery, support/cohort staffing and Vercel automatic-trigger diagnosis remain
  separate gates. No security policy, credential scope or production approval is implied.
- Any approved staging publication/release must record its exact commit, hosted checks, deployment
  identity, live revision and acceptance result after verification. A build alone proves none of
  those. The current staging frontend revision is the rollback reference; no database rollback is
  needed for this frontend-only candidate.
