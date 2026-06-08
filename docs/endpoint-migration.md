# Endpoint Connection Document

This document maps the legacy API behaviors expected by the frontend (`BoardBuddy_Web`) to the new source-of-truth backend endpoints (`BoardBuddy_Backend`). It serves as a guide for resolving mismatches and highlights APIs that were removed or restructured during the backend normalization.

## Reservations

The reservation system underwent a major core remake, shifting to deterministic waitlists and batched day requests.

| Legacy Frontend Endpoint | New Backend Endpoint (Source of Truth) | Status / Notes |
| :--- | :--- | :--- |
| `GET /crews/{crewId}/reservations/detail?date={date}` | `GET /api/crews/{crewId}/reservations/days/{reservationDate}` | **Replaced**. The response shape changed from `ReservationDetail` to `ReservationDayResponse` (`confirmedCount`, `waitingCount`, `reservations`). |
| `POST /crews/{crewId}/reservations` | `POST /api/crews/{crewId}/reservations` | **Updated**. Request now accepts `dates: LocalDate[]` and `guestId: Long`. Returns batch results (`success`, `waitlistPosition`) instead of a single object. |
| `DELETE /crews/{crewId}/reservations` | `DELETE /api/crews/{crewId}/reservations/{reservationId}` | **Restructured**. The legacy API deleted a batch of dates; the new API deletes a single `reservationId`. |
| `GET /crews/{crewId}/reservations/{reservationId}`| *N/A* | **Removed**. Details are fetched via the `/days` inspection endpoints. |
| `POST /crews/{crewId}/reservations/{reservationId}/teaching` | *N/A* | **[MISSING/TBD]** |
| `DELETE /crews/{crewId}/reservations/{reservationId}/teaching`| *N/A* | **[MISSING/TBD]** |

## Calendars

Calendar functionality has been absorbed directly into the `days` endpoints under `ReservationApiController`.

| Legacy Frontend Endpoint | New Backend Endpoint (Source of Truth) | Status / Notes |
| :--- | :--- | :--- |
| `GET /crews/{crewId}/calendar` | `GET /api/crews/{crewId}/reservations/days?from={from}&to={to}` <br/> `POST /api/crews/{crewId}/reservations/days/prepare` | **Replaced**. Generic calendar endpoint is gone. Use the `/days` endpoints for availability block checking. |
| `GET /crews/{crewId}/calendar/my` | *N/A* | **[MISSING/TBD]** No equivalent currently exists on the backend. |

## Crews

The legacy `CrewController` was entirely removed in the backend. All endpoints below are missing in the current source-of-truth API.

| Legacy Frontend Endpoint | New Backend Endpoint (Source of Truth) | Status / Notes |
| :--- | :--- | :--- |
| `GET /crews/{crewId}` | *N/A* | **[MISSING/TBD]** |
| `GET /crews/{crewId}/members` | *N/A* | **[MISSING/TBD]** |
| `GET /crews/{crewId}/managers` | *N/A* | **[MISSING/TBD]** |
| `GET /crews/{crewId}/applications` | *N/A* | **[MISSING/TBD]** |
| `POST /crews/{crewId}/applications/{applicationId}/approve` | *N/A* | **[MISSING/TBD]** |
| `POST /crews/{crewId}/applications` | *N/A* | **[MISSING/TBD]** |
| `PATCH /crews/{crewId}/info` | *N/A* | **[MISSING/TBD]** |
| `POST /crews/{crewId}/managers/{userId}` | *N/A* | **[MISSING/TBD]** |
| `DELETE /crews/{crewId}/managers/{userId}` | *N/A* | **[MISSING/TBD]** |
| `GET /crews/{crewId}/usage-statistics` | *N/A* | **[MISSING/TBD]** |
| `GET /crews/my-applications` | *N/A* | **[MISSING/TBD]** |

## Domain Models (DTOs)

### `CoreCrew` (Crew Configuration)
The backend `CoreCrew` entity has updated fields for configuring reservations:
- `reservation_day` -> `reservationOpenDay` (DayOfWeek)
- `reservation_time` -> `reservationOpenTime` (LocalTime)
- `reservation_offset` -> `reservationOpenOffsetDays` (Integer)
- *(New)* `reservationPeriodLimitDays` (Integer)

### `Party` to `PartyEvent`
- The `Party` entity is now `PartyEvent`.
- Endpoints migrated from `/api/parties` to `/api/party-events`.
- Features `DRAFT`, `OPEN`, `CANCELED` statuses, and newly structured contact information (`contactType`, `contactValue`).
