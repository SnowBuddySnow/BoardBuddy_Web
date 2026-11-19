# Endpoint Contract Status

Last reviewed: 2026-11-11 against the current controller mappings.

This document replaces the earlier migration note that incorrectly described current crew,
calendar, and teaching endpoints as missing. `BoardBuddy_Backend` is the source of truth. The
cross-repository security and behavior review is in its
`docs/api-audit-2026-08-25.md`.

The Axios client prefixes service paths with `/api`; paths below show their complete server form.

## Current Connected Areas

| Area | Backend contract | Frontend consumer |
| --- | --- | --- |
| OAuth | `POST /api/auth/social/{provider}`, `POST /api/auth/refresh` | `LoginLanding`, Axios interceptor |
| Signup | phone verification, profile completion, school email status/confirm/activate under `/api/accounts` | `UserInfoInput`, `StudentVerification` |
| Schools | `GET /api/schools` | `services/schools.ts` |
| Crew discovery/membership | `/api/crews`, detail, members/managers, applications, settings, PIN, usage | `services/crew.ts` and crew pages |
| Crew creation/review | `/api/admin/crews`, review, affiliation | `services/crewAdmin.ts`, `CrewAdmin` |
| Calendar | `GET /api/crews/{crewId}/calendar` and `/calendar/my` | `ReservationStats`, `MyReservations` |
| Reservations | day list/detail/prepare, create/cancel, management fields, teaching under `/api/crews/{crewId}/reservations` | `services/crew.ts` and reservation pages |
| Operations | context and crew event-manager assignments under `/api/operations` | operations pages/services |
| Events | `/api/events`, `/api/dashboard/events` and their participation, consent, payment-info, refund-policy and Groupize routes | event and dashboard services/pages |
| Organizer groups | `/api/dashboard/organizer-groups`, `/api/organizer-group-invite-links` | organizer dashboard/invite flows |
| Notifications | `/api/notifications` | notification services/pages |
| User/admin | `/api/users`, `/api/admin/users`, `/api/admin/schools/import` | account, user admin, school admin pages |

## Known Contract Cleanup

- Attendance, strikes and restrictions have stored domain models, but are not a complete active
  attendance workflow in the current event API. Do not infer working endpoints from old design docs.
- Season-house reservation routes remain blocked by the server feature gate. Mandatory crew
  school-email verification is paused by default.

- Removed the dead `getReservation(crewId, reservationId)` function. Reservation details come from
  the date-based `/reservations/days/{date}` route.
- The reservation manager “force delete” modal is currently unreachable. The ordinary cancel route
  allows the requester/participant, not an arbitrary manager. Design a separate audited manager
  cancellation contract before exposing that control.
- `services/schools.ts` now limits fallback schools to Vite development builds; keep production
  failures visible and retryable.
- Developer override branches must be gated by a development build, not only browser local-storage
  keys.

## Change Discipline

`contracts/backend-routes.json` is copied from the backend's `docs/contracts/http-routes.json`.
Backend HTTP integration tests compare that snapshot against the actual Spring mappings. Run
`pnpm check:contracts` to check literal client method/path calls against it. This is route-contract
validation, not automatic DTO schema validation. When routes change, export with
`python3 ops/contracts/export-http-routes.py` in the backend and update the web snapshot together.

The additive `/api/events/page` and `/api/dashboard/events/page` endpoints accept zero-based `page`
and `size` (1–100) and return `{items, page, size, hasNext}`. Existing array routes remain complete
and use the same SQL visibility filtering and batched aggregates; they do not silently truncate.
Create an event with its consent and refund settings atomically through
`POST /api/dashboard/events/configurations`; update through
`PUT /api/dashboard/events/{id}/configuration`. The body is `{event, consents, refundPolicy}`.
Legacy single-resource endpoints remain available. Deploy backend support before the web consumer.

When an endpoint changes:

1. Change backend controller, DTO, authorization, and integration tests together.
2. Update the typed frontend service and every consumer in the same release window.
3. Exercise both success and forbidden/error responses against MySQL Testcontainers.
4. Update this status document and the backend API audit if the security/privacy contract changes.
5. Deploy matching immutable web/backend commits only after the Atlas schema gate succeeds.
