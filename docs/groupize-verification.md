# Groupize and school verification

Groupize is available from a root event's host dashboard. Enable it, choose an optional applicant
maximum, create subevents, and use the roster selectors or randomizer to draft placements. Manual
selections are fixed by default. The preview does not write memberships; hosts review it and confirm
before applying. A conflict refreshes the pool and requires another preview.

Subevents retain ordinary event detail/editing, consent, payment, chat, and organizer permissions.
Parent/sibling links and the current member's child status appear on event pages. Unassigned members
are directed to the host instead of being offered independent signup into another subevent. Unlimited
capacity is explicit and is displayed as such throughout the event flow. Both planning modes use
the same Groupize controls.

Inactive child participation uses the backend's `groupizeAdmissionAllowed` flag. After reassignment,
the old child shows host-assignment guidance even if a historical CANCELLED participation exists.
A member who cancels their currently assigned child may rejoin while the assignment and parent
application remain eligible. Active participation and ordinary root-event reapplication keep their
existing presentation. Deploy the companion admission-flag backend before this web build.

The companion backend implements the HTTP contracts in `src/services/groupize.ts`; deploy it before
this web build. Groupize data and host mutations are always authorized and validated by that backend.

School verification entry points now default on and can be disabled through
`VITE_SCHOOL_EMAIL_AUTH_AVAILABLE=false`. The backend's readiness response controls whether email
can be requested. Unconfigured schools or delivery do not block completed onboarding. Existing
activation links are public proof-bearing routes and still work without login or when the UI gate
is off. Successful activation removes the proof from the visible URL. Cooldown status comes from
the server, and a failed/expired link provides a return action.

School-domain configuration and authorized staging delivery/code/link checks remain operational
prerequisites tracked in SnowBuddySnow/BoardBuddy_Backend#23. This PR does not provision secrets or
claim live delivery success.
