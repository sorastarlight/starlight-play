# Account recovery: source audit and proposed staff tools

Status: research/design complete for I13. Recovery APIs below are proposals, not installed features. The separately documented owner-disconnect authorization defect was repaired narrowly during this audit. No recovery email, password update, identity unlink, account merge, role change or impersonation was performed.

## Existing account flows and evidence

| Flow | Current source/behavior | Limit |
|---|---|---|
| Registration | js/auth.js playRegisterTrainer + js/register.js; email/password plus username; Supabase signUp | Verification depends on provider settings; no provider settings changed or user records read |
| Email login | playSignInWithPassword calls Supabase signInWithPassword | Public failures remain generic |
| Username login | trainer-session Edge Function v1; matches profiles.username, server admin lookup resolves email, password authentication returns caller's session | Live deployed source matches checkout; verify_jwt=false is required for pre-login entry. Do not turn it on blindly; endpoint rate protection remains a review item |
| Twitch sign-in/link | auth.js selects signInWithOAuth or linkIdentity with explicit login/link/reauthorize intent; Settings confirms pending identity | Application connection is distinct from Supabase Auth identity and Twitch provider authorization |
| Password eligibility | private.profile_has_password checks nonempty encrypted password and email | emailLogin is a boolean, not an address or verification assertion. Twitch-only does not prove a password exists |
| Reset request | playResetPassword calls resetPasswordForEmail to signin.html and returns enumeration-safe text | No PASSWORD_RECOVERY handler/new-password form on signin.js. A valid session can redirect to Play. End-to-end reset completion is unverified and should be repaired before staff-assisted sends |
| Signed-in password change | settings.js password-form calls updateUser({password}) | This is not a dedicated recovery landing; do not label it verified reset completion |
| Username reminder | current play_request_username_reminder writes USERNAME_REMINDER_REQUESTED audit then returns a sent-mail claim | No mail transport in this function. Correct the claim or implement a real flow separately; do not tell support staff delivery succeeded |
| Staff inspection | admin_user_account/admin_identity_inspect expose account and connections | Next hub receives password-present boolean; no email address or email verification field. Never infer either |
| Legacy owner disconnect | admin-tools.js -> admin_disconnect_twitch | Deletes application twitch_connections row, synchronizes primary, logs; does not itself remove auth.identities or revoke Twitch consent. Guard now null-safe, anonymous execute revoked |
| Player disconnect | Settings offers Disconnect for non-primary connections; RPC boundary enforces account scope | Actual provider unlink/last-login effects need isolated functional QA; UI visibility alone is not authorization |

Live audit read function definitions/ACLs and trainer-session deployment source only. No auth.users, auth.identities, profile, session or user email rows were fetched. Hosted email templates, SMTP health, redirect allowlist, MFA enrollment and real delivery were not verified.

## UX proposal

A dedicated Account Support panel links from Trainer Connections and Support & Recovery. Keep identity separate from gifts/Pass controls. Show trainer display name and stable account UUID, observed sign-in methods, app connection statuses and explicit Unknown states. Normal admins retain existing trainer tools; recovery diagnostics/actions are owner-only until separately approved. Moderators receive no recovery permissions; R18 stays open.

Owner view: masked verified email destination if backend safely supplies it, verification state, password presence, provider identities versus app connections, last-known connection flags, remaining sign-in routes, and a timestamp/revision for the snapshot. No raw email address reveal button by default. Neither emailLogin nor a display name qualifies as identity proof.

Buttons: Request recovery email; Investigate Twitch connection; Escalate identity recovery. Until backend is approved/available, show disabled controls with a plain explanation. No pretend ticket counts. Use an optional external case reference until I14 supplies genuine ticket IDs.

Confirmation binds action, target UUID/name, selected Twitch provider ID, server snapshot revision, staff reason and optional case reference. Reset destination is displayed masked and chosen by the server from the existing verified Auth address. No editable destination, password field, token/link clipboard, or staff sign-in-as-user action. Link/reassign disputes go to an owner-reviewed case; staff must not accept a username, screenshot or possession of inventory as sufficient proof.

Sanitized [static review](./design-reset/account-recovery-review.html) contains no SDK, network request, credentials or live controls.

## Proposed contracts (not installed)

| Endpoint | Request | Minimum response |
|---|---|---|
| owner_account_diagnostics | targetUuid | targetUuid, snapshotRevision, observedAt, capabilities, maskedEmail, emailVerified, passwordPresent, authProviders, appConnections, remainingRoutes; Unknown rather than guessed fields |
| owner_recovery_email | requestUuid, targetUuid, snapshotRevision, reason, optional caseRef | receiptId, state: accepted/denied/failed/uncertain, maskedDestination, retryAfter; never link/token/password/email secret |
| owner_identity_recovery_prepare | targetUuid, selectedProviderId, reason, caseRef | expiring action challenge + impact summary + observed revision + eligibility; no mutations |
| owner_identity_recovery_commit | requestUuid, challengeId, targetUuid, snapshotRevision, reason, caseRef | audit receipt; only approved app-connection disconnect in first stage, not provider reassignment or account merge |

These names are design placeholders; do not call them. New recovery endpoints must authenticate the current caller with the Auth server, require current owner authorization using server-owned role data and null-safe checks, and require recent reauthentication. Proposed freshness window: five minutes, backed by server verification/challenge rather than user-editable metadata. MFA can be required if actually configured; no claim of current enrollment. Fail closed if any prerequisite is unknown.

The Auth boundary belongs in a server Edge Function, never browser service keys or an SQL function exposing auth.users. Diagnostics should return only needed masked fields. Recovery email uses Supabase's send flow to the server-selected verified existing address. generateLink is not a mail sender and its raw bearer link must never be returned to staff. Redirect is a fixed approved HTTPS recovery page, never caller supplied. Recovery sessions must enter a dedicated password update flow and scrub secrets from URL/history; no Play RPC bootstrap on that page.

A request receipt store and durable email-outbox design need separate migration review. Bind UUID to actor, target, action, revision, reason and case reference; altered replay fails. Server rate limits/cooldown apply by actor and target (proposal: 60-second cooldown plus low hourly cap, configurable after abuse review). External mail dispatch cannot promise exactly-once delivery: record accepted/failed/uncertain, reconcile uncertain provider results before resending, and never claim delivery from an accepted request alone.

Disconnect must lock and recheck target/identity/revision, preserve stable trainer UUID and game ownership, block protected accounts by default, and prove a verified usable alternative login exists. App connection, Auth identity and provider consent are three distinct effects. Stage 1 must not silently unlink Auth identities, reassign Twitch ownership or revoke third-party consent. Those need a separate owner-approved design and confirmation. Never drop the last working login.

## Security review

| Threat | Required control/test |
|---|---|
| R18 / broad moderator authority | Recovery owner-only on server; explicit denials for anonymous/player/moderator/admin/unassigned/null-role callers |
| IDOR / target swapping | Bind challenge and receipt to stable target, chosen provider ID and current revision; verify all fields again at commit |
| Session/role changes | Validate current user/session and owner role at execution; reject stale or revoked sessions rather than trusting cached UI/JWT metadata |
| CSRF / confused deputy | Authenticated JSON POST with server-validated bearer token, explicit intent/challenge and fixed origin/redirect policy; no side effects on GET |
| Account takeover | Verified existing destination only; independent proof review for provider disputes; protected account escalation; no staff-set password or impersonation |
| Token leakage | No provider/access/refresh/recovery tokens or raw recovery URLs in staff responses, audit payloads, screenshots or browser logs |
| Last-login removal | Transactional eligibility recheck using actual providers and verified password route, not only twitch_connections count |
| Retry/race/double send | Actor/target-bound idempotency; snapshot concurrency check; outbox states and cooldown; uncertain is not success |
| HTML injection | Render case/reason/provider strings as text; no arbitrary HTML in recovery notices or public replies |
| Social engineering | Separate ownership evidence from account inventory; do not accept requester's preferred email for reset; identity merge/reassignment excluded |

Store append-only recovery receipts with actor/target/action/reason/case reference, timestamps, revision, outcome and sanitized codes. No secrets or full destination in ordinary audit JSON. Private tables with RLS and no direct client writes; server-only action boundary checks authorization explicitly. Account notifications go to the existing verified channel, without secret action links in staff UI. Retention/privacy policy is a separate owner decision before storage rollout; do not collect identity documents in tickets by default.

Password change cannot be rolled back by recovering the old password. An email already sent cannot be unsent; revoke sessions/links through a separately reviewed provider-supported response if compromise is suspected. Identity relinking requires a fresh ownership flow; never restore from a stale JSON snapshot or transfer inventories as an automatic rollback.

## Proposed rollout and acceptance

1. Complete self-service recovery landing and correct username-reminder delivery wording. Mock Auth responses and recovery events, including expired/reused link, invalid token, normal sign-in, sign-out and multiple tabs. No emails sent by automated tests.
2. Owner reviews recovery capability/role matrix and privacy policy. Add diagnostics first, with masked fields and no writes; inspect schema/RLS/grants and explicit caller-denial matrix.
3. Separately authorize server email action/receipts/outbox, provider redirect configuration and notification policy. Do not add a new email vendor or paid service implicitly.
4. Separately authorize prepared app-identity disconnect after login-route protection, fresh-owner check and idempotency tests. No account merges or reassignment.
5. Dedicated isolated QA account and inbox with explicit fresh approval; verify actual email completion and safe identity recovery, then owner functional acceptance. Never use Sora/Twinkle/PlayTester/PlayerQA as incidental fixtures. No role promotion for convenience.
6. Ticket integration depends on I14; no ticket API/count is invented here. Record real rollout evidence separately from source/static/mock/local-SQL evidence.

Readiness: design ready; implementation of new recovery capabilities remains unapproved. No SQL/RLS/API/Edge implementation for the proposed capability was added. Narrow existing disconnect authorization repair is recorded in OWNER-DISCONNECT-SECURITY-FIX.md. D85 blocked, D86 unauthorized; WIRE/Familiarity inactive; APP rc133 unchanged.

## Primary references

- [Password reset](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) and [password-based Auth](https://supabase.com/docs/guides/auth/passwords): request + recovery landing + authenticated password update are distinct stages.
- [Identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking): provider identities and self-service linking/unlinking need explicit signed-in flows; application rows are not the Auth identity store.
- [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits): provider limits do not replace app action/target throttles.
- [generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink): administrative link generation belongs server-side; no raw link returned to staff.

Static review validation: desktop rendering inspected; at 390px viewport the document width was 375px (no horizontal overflow), and every proposed action button was disabled. This is prototype evidence, not authenticated recovery verification. Standard 72 non-writing suites and build validation passed.

## Subsequent owner approval and implementation

Owner accepted this proposal and instructed proceeding. Phase 1 is implemented in CODEX-PASSWORD-RECOVERY.md, superseding the original snapshot above for reset completion and username-reminder wording. New staff diagnostics/send/identity-recovery controls are still not implemented; phased work continues under the accepted direction. Real provider email round-trip requires dedicated approved QA.

## Approved phase 2 — owner diagnostics

Owner confirmed proceeding. CODEX-ACCOUNT-DIAGNOSTICS.md records the installed read-only owner context/Edge Function and Connections control. This supersedes the original snapshot for diagnostics only. Staff sends and identity mutations remain unimplemented.

## Approved phase 3 — email boundary staged, template installed

Owner requested continuing and customized emails. CODEX-RECOVERY-EMAIL.md records the guarded sender, recipient token flow, saved branded recovery template and corrected hosted callbacks. Staff sending remains disabled: custom SMTP is absent, GoDaddy email entitlement could not be inspected due its browser check, and isolated real delivery QA/receipt retention remain prerequisites. No actual emails or account changes were tested.
