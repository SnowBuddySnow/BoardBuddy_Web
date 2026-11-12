# Lower-friction onboarding proposal

Status: design proposal for review; no new public endpoints, membership policies or screen theme
are enabled by this document. Keep the existing navy `#162660`, cream `#FAF8F3`, yellow `#FCCA59`,
rounded surfaces and mobile-first member flow.

## What the current code actually requires

- `UserInfoInput` collects name, gender and verified phone. Student profiles also need their own
  school and student number. Email requirements depend on verification readiness; mandatory crew
  school verification is already globally paused. Do not promise a reduction by removing a gate
  that is already off.
- Crew creation is already a small name-based request, not a large season-house configuration
  form. `CrewAdminService.create` creates an INACTIVE/PENDING crew; developer approval creates the
  requester's captain membership automatically. The larger obstacle is discovery, waiting and
  understanding that automatic connection, not the number of crew-name fields.
- Members currently search the crew, ask someone for a separate four-digit PIN, submit and possibly
  await approval. Crew membership and host-group membership are different; ordinary members do not
  need to create a crew or host group.
- Starting a KUSBF-associated event additionally requires current eligible crew membership. A public
  event being visible is not the same as being eligible to join it.

## President journey

| Current hurdle | Proposed behavior | Security boundary |
| --- | --- | --- |
| Personal profile, crew and host groups are separate concepts | Ask the intent “Start operating my club” and keep a single guided task | Intent selection never grants a captain/admin role |
| It is unclear whether the club already exists | Offer discovery of approved, intentionally discoverable crews before creation | Do not expose pending/private crew requests or member identities |
| Approval looks like a dead end | Show a persistent progress state: request received → review → captain connected | Developer review is retained; the requester is linked only after approval |
| A PIN must be explained and distributed separately | After activation, issue a revocable, time-limited invitation/QR with a clear approval policy | Only authorized operators issue invites; links cannot grant manager roles |
| Creating the first event requires understanding host groups | Offer one “Create our first event” setup action with a suggested host group | The backend validates each crew/host permission; no client self-authorization |

Sample: login and one-time phone verification → find existing crew or request a new one → visible
review status → captain connected automatically → invite members → create the first event.
While pending, allow a private configuration preview, but do not issue usable membership invitations
or open crew operations before approval.

## Member journey

| Current hurdle | Proposed behavior | Security boundary |
| --- | --- | --- |
| Signup appears before the user knows which club invited them | A minimal invitation preview shows the intended club and next action | New public DTO exposes only explicitly approved intro fields, no roster/contact/chat/account details |
| Login/signup loses the original destination | Preserve the invitation and intended event across authentication | OAuth state/nonce binding; allowlisted internal destinations only; no open redirects |
| Search and a separate PIN are required after receiving an invitation | Use the scoped invitation to create the correct membership application | Default is still operator approval; invitation possession is not membership or identity proof |
| Profile questions feel unrelated | Explain each required field; reuse already verified data and collect optional details later | Existing server-required fields stay until a separate policy/data review approves changes |
| Waiting for approval blocks understanding of the service | Show request status and permitted public schedules; notify on approval and resume the original destination | Pending applicants cannot see private crew content or join restricted events |

Sample: invitation preview → Kakao + one-time phone verification if needed → confirm own profile →
one membership application → clear pending state → notification → original club/event destination.
Existing accounts skip completed profile/verification steps. Never infer a person's school or
verification from the inviting crew's school.

## Reference patterns and deliberate differences

- [BAND member guide](https://docs.band.us/d/promotion/memberguide_1) and
  [BAND guide](https://pages.band.us/band-guide-kr): invitations/QR, introduction before joining,
  and a concrete first activity reduce “find the right group” work.
- [Slack invitations](https://slack.com/help/articles/201330256-Invite-new-members-to-your-workspace):
  scoped invitation links and expiration reduce manual invitation steps. Slack warns that link
  possession can allow joining; BoardBuddy's proposed default intentionally retains approval.
- [Discord Community Onboarding](https://support.discord.com/hc/en-us/articles/11074987197975-Community-Onboarding-FAQ):
  useful defaults and short questions, with non-urgent customization available after joining.
  Self-selected interests must never map to BoardBuddy administrative privileges.
- WWIT's [Planfit archive (2023)](https://wwit.design/2023/07/24/planfit/) shows an explicit
  progress bar and explains why a question is asked. [Toss archive (2021)](https://wwit.design/2021/02/16/toss/)
  separates onboarding into focused screens. These are dated reference captures, not assertions
  about the services' current UI. Borrow the information order; preserve BoardBuddy's theme.

## Requirements before implementation

1. Invitations use cryptographically random high-entropy tokens stored as hashes, expiration,
   revocation and bounded uses. Acceptance atomically enforces limits, deduplicates the application,
   and rechecks account, crew and permission state.
2. No credentials or invitation proof enter analytics/logs. Preview pages need a restrictive referrer
   policy. OAuth continuation must bind the user's original invitation, not accept an arbitrary URL.
3. Public preview and authenticated actions use separate DTOs/authorization. Rejected/expired/revoked
   invitations give non-enumerating error states and never create membership.
4. Keep phone identity checks, consent evidence and operator/developer approval. Optional profile
   collection can move later; relaxing student-number/gender requirements needs an explicit policy
   decision and updated server validation, not a hidden UI bypass.
5. Measure invitation opened → authentication completed → application submitted → approved → first
   useful action using aggregate, privacy-conscious events. Establish a baseline before setting
   conversion/time targets; no improvement percentage is claimed without real measurements.

## Suggested delivery after design approval

Start with the member invitation/continuation and the president's progress state. Test new/existing
accounts, two invitations/tabs, interrupted signup, wrong school, pending/deactivated crews, revoked
links, expired links, duplicate requests, use-limit races and access to private fields before approval.
Then add first-event setup. Keep the existing PIN path as an explicitly supported fallback during
rollout, with the same approval and rate-limit rules.
