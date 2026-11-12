# Responsive signup and crew onboarding

The owner approved the existing proposal and requested school/terms fixes, responsive web/mobile
screens, conventional `feat/...` branches, and maintainer-reviewed PRs into develop. Agent work ends
at checked PRs; the maintainer merges and develop pushes deploy staging.

## Shipped behavior in this branch

- Signup uses three steps: personal profile → phone identity → agreements. Navy/cream/yellow and
  rounded surfaces are retained. Data stays in the form while navigating steps or retrying a failed
  request; personal profile inputs are not persisted as browser drafts.
- School selection stores a school ID separately from search text. It supports Korean aliases,
  keyboard navigation/Enter/Escape/IME composition, pointer/touch choice, empty results and retry.
  Editing text invalidates the selected identity. A successful retry clears loading; no fabricated
  development school replaces a failed catalogue. Own school/student ID/gender remain required.
- The terms modal renders above application scroll boundaries, has a bounded scrollable body and
  reachable actions at small viewport heights, traps/restores focus and handles Escape. Reading or
  closing never checks consent. “이 약관에 동의” checks only that document. Required-all excludes
  the optional sharing preference, whose default remains confirmation each time. Existing legal
  text is preserved; this change does not introduce a new legal policy or claim a server consent ledger.
- The caller's server-verified phone may be reused after interrupted signup. Late recovery responses
  cannot overwrite an edited number or an account switch. Editing a number invalidates local
  verification, and backend profile completion remains authoritative.
- A minimal public crew invitation precedes login. Signup/login return to that invitation. Acceptance
  is explicit and creates an operator-reviewed application. Existing members skip signup. Status can
  be restored after reload even if the already-used invitation is no longer publicly available.
- New members choose joining an existing crew or requesting creation. Own creation/application
  progress is available after reload and from the home screen. Approval links the captain through
  the existing backend workflow. Intent selection does not grant any role.
- Approved captains can issue expiring, bounded-use invitations/QR and revoke them, then check a
  host group before their first event. Current event-management desktop requirements are retained.
  Pending operators see upcoming tasks but cannot issue usable invites or create live operations.
- Approval/rejection notifications link to onboarding. On resuming a completed membership, an
  account-bound, allowlisted original event can be opened. The event API still checks visibility.

## Proof handling

Invitation proof is in a fragment, stripped before telemetry and retained in sessionStorage for the
current tab for up to seven days (memory fallback if storage is unavailable). Public preview uses
an isolated Axios client without account interceptors. API proof is sent in POST bodies. QR generation
runs locally, with no external QR service. Explicit logout clears the pending invitation. Existing
JavaScript-accessible account token storage is unchanged.

See the sibling backend's `docs/member-onboarding.md` for lifecycle, locking, rate quotas and limits.
Deploy the backend PR before the web PR. Neither PR is an assertion of staging acceptance before merge.

## Verification

`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm check:contracts`, `pnpm build` and
`pnpm test:onboarding` cover the implementation. Browser tests use isolated localhost HTTP fixtures
and block external traffic. They exercise 320/390/768/1440px signup, school keyboard selection and
identity, phone verification, explicit consent/read/close, modal geometry/focus, new-member invite →
signup → pending → approval → original event, existing-member login and pending reload, same-tab invitation replacement, and president
approval → invitation QR → revoke → first host-group setup. Evidence is in ignored `output/playwright`.
These tests create no real account, agreement, SMS, membership or staging event.
