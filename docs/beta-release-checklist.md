# Beta Release Checklist

Use this checklist for each `1.0.0-beta.x` release. Web and backend must use the same product version and point to tested commits.

## Scope And Data

- [ ] Freeze feature work; accept only beta-blocking fixes after the release candidate is selected.
- [ ] Review the changelog and identify migrations, configuration changes, and known limitations.
- [ ] Back up the target database and confirm the restore procedure before applying Flyway migrations.
- [ ] Verify production secrets and callback URLs without committing environment files.

## Automated Verification

- [ ] Web: `pnpm run typecheck`
- [ ] Web: `pnpm run lint` with no errors and reviewed warnings
- [ ] Web: `pnpm run build`
- [ ] Backend: `./gradlew test`
- [ ] Backend: `docker compose config`
- [ ] Confirm `/actuator/health` is healthy and `/actuator/info` reports the intended build version.

## Critical Journeys

- [ ] Sign in, phone verification, profile completion, token refresh, and sign out.
- [ ] Join/apply to a crew and verify member, manager, captain, and event-manager permissions.
- [ ] Create manager groups and enforce crew-limited event visibility.
- [ ] Create, edit, publish, join, approve, cancel, and fill an event to capacity.
- [ ] Verify application opening time, per-crew limits, anonymous self-organized naming, and event policies.
- [ ] Confirm external chat details are visible only to accepted participants.
- [ ] Exercise season-room active/inactive states, reservation capacity, payment status, and manager memo.
- [ ] Check the primary flows on current mobile Safari and Chrome-sized viewports.

## Release

- [ ] Record known issues and tester instructions.
- [ ] Deploy matching web/backend versions to the beta environment.
- [ ] Run smoke tests against the deployed environment.
- [ ] Create annotated `v1.0.0-beta.x` tags only on the exact deployed commits.
- [ ] Record deployment time, commit SHA, database migration version, and rollback owner.
