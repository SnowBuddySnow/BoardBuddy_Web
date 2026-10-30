# Local event browser scenarios

## Host configuration regressions — 2026-10-18

`pnpm test` also runs `DashboardEventSave.test.tsx` in jsdom with the real create/edit components,
editors, service orchestration and a synthetic HTTP boundary (no browser login or live API).
Eight cases cover sequential consent/refund writes, duplicate-submit suppression, partial failure
at either configuration stage, same-DRAFT retry, ambiguous POST reconciliation, ordinary validation
retry and edit-conflict input preservation. `eventSave.test.ts` adds seven transport-level cases.
jsdom is development-only. These checks do not replace deployed authenticated acceptance.

The save workflow is intentionally **not a single atomic server transaction**. It serializes three
commits, retains a returned DRAFT ID in the current page, and reports partial saves honestly.
After leaving/reloading, use the event list and edit the saved DRAFT; do not recreate it. When the
initial POST response is ambiguous, the form blocks blind recreation and asks for list inspection.
Backend optimistic locking remains enabled; separate editing sessions can receive HTTP 409.

## Participant browser fixtures

These CLI-driven checks render the actual app with a **synthetic HTTP boundary**. They are not
staging acceptance, real backend authorization/locking tests, OAuth login, email/SMS or payments.
Do not load real credentials into these sessions or point the fixture at a deployed API.

- `event-browser-fixture.js`: local API state, synthetic session, fixed starting clock and blocked
  external requests. Load once in a fresh browser session; closing that session discards its state.
- `event-browser-assert.js`: read-only assertions for the current scenario's expected outcome.
- `event-browser-la.json` / `event-browser-seoul.json`: independent 390×844 Chrome contexts/timezones.
- Generated snapshots/screenshots go under ignored `output/playwright/`, not tracked source.

## Start

From this frontend checkout, use the following in one terminal (no live backend required):

```bash
VITE_API_BASE_URL=http://127.0.0.1:5187/__scenario_api \
VITE_OPERATING_MODE_OVERRIDE=OFF_SEASON VITE_KAKAO_JAVASCRIPT_KEY= \
pnpm dev --host 127.0.0.1 --port 5187 --strictPort
```

In another terminal, select an installed `playwright-cli` executable or the Codex Playwright wrapper.
Example with the wrapper, from this checkout:

```bash
SCENARIO_WEB_DIR="$PWD"
PWCLI="$HOME/.codex/skills/playwright/scripts/playwright_cli.sh"
mkdir -p output/playwright/event-scenarios
cd output/playwright/event-scenarios
"$PWCLI" --session bb-event-local open about:blank --browser chrome \
  --config="$SCENARIO_WEB_DIR/scripts/test/event-browser-la.json"
"$PWCLI" --session bb-event-local --raw run-code \
  --filename="$SCENARIO_WEB_DIR/scripts/test/event-browser-fixture.js"
"$PWCLI" --session bb-event-local goto 'http://127.0.0.1:5187/?view=event_detail&eventId=9101'
"$PWCLI" --session bb-event-local snapshot
```

Use **fresh snapshot references** for `click`, `check` and `fill`; do not hardcode old `e123` refs,
force clicks through overlays or bypass the actual controls. Re-snapshot after meaningful changes.
The fixture accepts dialogs only within its synthetic session and records their messages.
The first join should exercise the phone-sharing modal; later cases may use that session's
“always agree” choice. Do not read/set localStorage while the page is still `about:blank`.

## Cases

Navigate with `?view=event_detail&eventId=<ID>`, interact normally, then run:

```bash
"$PWCLI" --session bb-event-local --raw run-code \
  --filename="$SCENARIO_WEB_DIR/scripts/test/event-browser-assert.js"
```

| ID | Actions before assertions | Expected result |
| --- | --- | --- |
| 9101 | Join; submit blank; check required consent; enter `invalid-phone`; submit; replace with `010-0000-0000`; allow autosave; reload and confirm both restored; submit valid answers. | Validation errors never submit final answers; one final POST, JOINED, synthetic bank/chat visible. No invented unpaid badge. |
| 9101 again | After the JOINED assertion, leave the event through its confirmation. | CANCELLED; bank/chat removed; reapplication enabled. |
| 9102 | Join, check consent, enter synthetic phone, submit. | Approval notice, no held-seat promise; PENDING, not a confirmed-participation dialog; no bank/chat fetch. |
| 9103 | Join, complete valid fields, submit. | Synthetic expiry returns HTTP 400 and commits cancellation; UI removes the form/held-seat claim and permits reapplication. |
| 9104 | Reset virtual time as below, navigate to this event, assert; advance five minutes, assert again. | Disabled before 09:05 Korean time, enabled afterward; displayed event time remains 18:00 Korean time. Repeat in a fresh Seoul-configured session. |
| 9105 | Navigate, assert. | Full-event signup disabled. |
| 9106 | Navigate, assert. | Closed-event signup disabled. |
| 9107 | Join, complete valid fields, submit. | Ordinary synthetic 400 leaves CONSENT_PENDING; checked consent and typed phone remain intact. |

Virtual time, not a five-minute real sleep:

```bash
"$PWCLI" --session bb-event-local --raw run-code \
  'async page => { await page.clock.setSystemTime(new Date("2026-10-15T00:00:00Z")); }'
# Navigate/reload event 9104 AFTER resetting time so its opening timer is scheduled correctly.
# Run the first assertion, then:
"$PWCLI" --session bb-event-local --raw run-code \
  'async page => { await page.clock.fastForward(301000); }'
# Run the assertion again without reloading: the timer must enable signup itself.
```

Expected console errors are blocked external Kakao SDK/font loads and deliberately simulated HTTP
400 responses. Investigate unknown synthetic routes, unexpected page exceptions or failed assertions;
do not dismiss all console errors as expected. Never open the synthetic external chat link.
Closing a session and reopening with the Seoul configuration creates independent fixture state.
Close only these named test sessions and stop only the local Vite process when finished.

## Last observed run: 2026-10-15, Asia/Seoul

All seven scenario IDs passed their CLI-driven checks; 9101 also passed its cancellation outcome.
9104 passed before/after assertions in both Los Angeles and Seoul contexts. Draft restoration and
the first phone-sharing modal were observed through normal browser controls. These checks exposed
and verified fixes for mobile navigation covering signup, false approval confirmation/seat-hold
messages, and stale consent UI after cancellation-on-expiry. Screenshots remain local artifacts.

`pnpm test`: 74 passing unit tests; `pnpm build` passed; `pnpm lint` passed with eight existing hook
warnings. Real staging mobile Safari, actual sessions/roles, scheduler behavior, delivery providers,
schema/deployment validation and production acceptance remain separate release gates.
