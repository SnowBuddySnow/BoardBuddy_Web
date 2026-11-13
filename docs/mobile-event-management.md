# Mobile event management and member home

This develop-based feature includes the earlier PR #41 mobile history/local-preview commit. Merge
#41 first if it is still open. Maintainers review and merge; the agent does not merge develop PRs.

Authorized event managers can enter the same management routes on mobile and desktop. The previous
viewport gate is removed; permission resolution and unauthorized-route checks remain. Event creation
buttons use PARTIES_CREATE. Host/group and backend per-event authorization remain authoritative.
Event settings stack date fields on phones; participant status, payment and memo controls use one
DOM rendered as cards on phones and columns on wider screens. Privacy response reveal/export controls
and their reason/audit requirements are unchanged. Group planning logic and event enums are unchanged.

Planning badges/selection cards now say “호스트와 함께 진행” and “참가자가 함께 기획”, using rounded
navy/amber surfaces with the existing explanatory details. These are wording/design changes only.

Member home now shows the actual crew, participation and available-event summary, schedule access
and a visible season-calendar entry. Empty event lists remain honest empty states. The bottom menu
occupies its own flex row rather than overlaying every screen, so scrollable content and actions can
finish above it. Safe-area spacing remains in place.

Season reservations remain under their reviewed release hold. No creation/cancellation/management
is enabled by this change. The new season_calendar route is a read-only monthly occupancy view using
the existing crew calendar GET API, which authorizes approved membership/platform administrators.
It is available from home, the mobile “시즌방” tab, PC sidebar and crew details. Missing date rows mean
“현황 없음”, never a claim of vacancy or booking availability. Changing month discards stale responses;
errors do not show old data as current. It reuses the existing ReservationStats/Calendar layout, month navigation, congestion dots, own-schedule toggle and date details. Selecting a date reads the existing authorized reservation-day detail API; all booking and management writes stay hidden and guarded in read-only mode.

Verification includes existing unit/route denial/release-hold tests and synthetic browser journeys
at 320/390/768/1440px plus mobile WebKit: participant memo/payment save, approval, event edit, reload,
member home/bottom-menu geometry and read-only monthly calendar. All HTTP writes are intercepted local
fixtures, not actual member approvals or legal consent. This is not staging or real-device acceptance.

`pnpm dev:preview` keeps the actual React UI available at http://127.0.0.1:5175. “운영자 보기” enters a
synthetic manager fixture for editing/participant management; “가상 승인” applies only to the local mock;
“처음부터” resets local fixture state. These controls are in a separate localhost-only dev server,
never the hosted product, and grant no real permissions. The same shared fixture state serves local tabs.

Owner correction: retain the established crew-calendar screen and format rather than a separate tile calendar. SeasonCalendar now delegates to the shared screen in read-only mode. Unknown occupancy remains gray, and failed or superseded reads are not shown as current availability.
