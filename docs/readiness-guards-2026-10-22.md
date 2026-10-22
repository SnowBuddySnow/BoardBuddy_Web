# Readiness regression and viewport checks — 2026-10-22

Local verification snapshot. The owner subsequently authorized **“deploy to stg and audit.”** Staging publication/release is now being prepared; this snapshot is not evidence of a completed deployment. No production release is authorized.

## Coverage

The suite now contains 180 tests, including regressions for:

- An explicit season-house hold that cannot be overridden by winter dates, developer operating modes or either environment mode override.
- All four direct reservation views at 320/390/768/1023/1024px, absent personal booking/calendar requests, absent desktop reservation management, and rejected season guest codes/invalid numeric event codes.
- Catalogue/detail admission closing at the exact Korean event start without reload, invalid schedule rejection, and preserved existing-participant controls.
- Ordinary event editing with locked/unknown document capabilities, without consent/refund writes; new-draft sequential save/retry behavior retained.
- Response-preview focus entry, Tab/Shift-Tab containment, Escape and focus restoration.

All 180 tests passed in both UTC and America/Los_Angeles. Typecheck, lint and production build passed. Largest JS chunk: 396,722 / 500,000 bytes.

```sh
pnpm exec vitest run --pool=threads --maxWorkers=2
TZ=America/Los_Angeles pnpm exec vitest run --pool=threads --maxWorkers=2
pnpm typecheck
pnpm lint
VITE_API_BASE_URL=/api pnpm build
```

## Reusable local browser fixture

```sh
VITE_API_BASE_URL=/api pnpm build
node scripts/readiness-fixture.mjs
```

Open `http://127.0.0.1:4174/__fixture` and choose a synthetic member or host. This serves the actual built bundle with fake, read-only HTTP data. It binds only loopback, never proxies requests to another backend, uses no real tokens/accounts, and rejects API writes. Do not use production credentials. Stop with Ctrl-C when finished.

Browser matrix performed at 320, 390, 768, 1023 and 1024px, height 844:

| Scenario | Result |
| --- | --- |
| Catalogue with past/future events and long Korean titles | No horizontal page overflow; correct count; past event has no join action; filters remain horizontally scrollable. |
| Future detail | No header/back overlap; 48px action visible and unobscured at all five widths. |
| Narrow catalogue scrolling | Final 44px join action reachable above bottom navigation. |
| Reservation/statistics/personal/guest booking deep links | All 20 combinations visibly blocked. |
| Mobile profile and season guest code | No personal calendar/usage view; season code rejected. |
| Host manager boundary | Desktop-required explanation at 390/1023px; management works at 1024px; reservation module absent even with its legacy permission. |
| Historical editor at 1024px | Document/policy fields disabled; date fields named and contained; no save submitted in browser. |

Screenshots and measurements: `output/playwright/readiness-guards-20261022/` (Git-ignored). During browser checks the synthetic fixture recorded 209 reads, zero writes and zero calls to reservation/calendar/statistics/season-guest APIs.

Viewport checks are not physical-device, Safari, Kakao in-app browser, virtual-keyboard, camera or real OAuth acceptance. Those still require a small real-device pass. Manager workflows remain intentionally desktop-only. Browser verification did not join events, publish events, invite users, send messages or make payments.

The frontend hold is only one layer. Deploy the companion backend API guard before relying on the restriction for old clients/direct requests. Reopening reservations or rolling back to an unguarded backend requires a separate reviewed decision; hiding navigation alone is insufficient. Historical data is not deleted.
