# Twitch linking policy audit — issue #17

Research/design only, 2026-10-19. No OAuth, Auth configuration, RLS, RPC, account link, trainer or role changes. CODEX-19 implements this report, not the policy. Scope follows the owner's requested maximum of one Twitch account for ordinary trainers, with separately authorized staff exceptions.

## Verified current behavior

Hosted catalog evidence is in `evidence/issue17-current-functions.json` and `evidence/issue17-current-structure.json`. These contain code/index/policy definitions, not account records. Inspection did not execute any account RPC. In particular, `play_account_state` is not read-only: it deletes expired pending connections, so it was inspected via `pg_get_functiondef`, never called.

| Surface | Observed enforcement | Gap / implication |
|---|---|---|
| `twitch_connections_twitch_user_uidx` | Unique raw Twitch ID across connection rows | Does not limit connections per trainer; canonical numeric ID and legacy `miu:` aliases need one collision domain |
| `twitch_connections_one_primary_uidx` | At most one confirmed primary per trainer | Does not require a primary, or limit nonprimary links |
| `private.handle_new_identity` | Rejects raw Twitch ID owned by another trainer; first confirmed connection becomes primary; later identity is pending | No ordinary-trainer count limit, role exception check, per-trainer lock or OAuth-intent target validation in this trigger |
| `play_confirm_twitch_link` | Authenticated caller; locks caller-owned connection; confirms, syncs primary, audits | No one-link limit, recent authentication check, intent consumption or target match in inspected body; row lock does not serialize two distinct pending links |
| `play_start_oauth_intent` | Requires sign-in for link/reauthorize; records nonce, target and expiry | Does not enforce link count; client catches RPC failure and still proceeds to OAuth |
| `play_disconnect_twitch` | Caller-owned row; primary replacement guard; password/remaining-login guard; audit | Deletes application connection, not Auth provider identity in this function; no per-trainer serialization shown |
| `play_set_twitch_flags` | Caller-owned confirmed row; some last-login safeguards | Player can request login/gameplay/type flags on own links; bot/utility is a label rather than verified authorization |
| `private.profile_has_password` | Existing password hash plus nonempty email | Does not itself prove confirmed email, successful login, or current recoverability |
| `private.find_trainer` | Confirmed connection plus gameplay flag; supports legacy aliases | Falls back to legacy profile identity and then login/display name; this can bypass a connection-only policy and needs a separate caller audit |

RLS is enabled on connections. Anonymous SELECT is denied; authenticated SELECT is allowed under own-row policy. Authenticated INSERT/UPDATE/DELETE privileges are all denied. The catalog shows an AFTER INSERT Auth identity trigger and no application connection trigger enforcing a count cap. These checks support a source-level gap, not a demonstrated account takeover or a claim about every service-role writer.

`js/auth.js` uses Supabase `linkIdentity` for linking, `signInWithOAuth` for login, and sessionStorage for local intent/target. `js/settings.js` presents the pending identity and checks reauthorization mismatch in the browser. A client-only check cannot replace server enforcement. It offers advanced controls based on multiple rows or staffRole, and leaves Link Twitch available without a count guard. No `unlinkIdentity` call was found in the searched repository JS/SQL/TypeScript paths. Actual provider disconnect/relink behavior is therefore an integration unknown, not verified through this audit.

The current role helper resolves owner from configured broadcaster identity, otherwise assigned staff roles (`staff` maps to moderator). R18 remains open. A role label alone must not enable privileged actions or grant a new multi-link exception.

## Proposed policy and invariants

1. A trainer may have zero or one Twitch connection by default. Email/password login is a separate sign-in method and does not consume the Twitch slot. Pending links reserve that slot until they expire or are cancelled; a reauthorization of the same verified numeric Twitch ID does not consume a second slot.
2. Normalize provider identity to verified numeric Twitch ID. Treat known legacy aliases as the same identity during collision checks. Never transfer ownership from matching display name, Twitch login text, email text, or an unverified client assertion. Usernames can change; the numeric ID is authoritative.
3. An explicit, audited, owner-approved exception may permit multiple links for a named eligible owner/moderator trainer. Eligibility and exception both must hold when adding a link. No automatic exception for a role string. Exception creation is owner-only; it confers no gifts, inventory, Pass, recovery or moderation powers.
4. Exception links need a purpose, primary uniqueness, verified identity, login permission and gameplay permission. Utility bindings remain distinguishable from actual Auth identities. Proposed default for utility links is login off and gameplay off; staff explicitly enables permitted uses. Relabeling a player link as utility never evades the count policy.
5. Serialize every link, confirm, cancel, unlink and primary/flag mutation per trainer. Enforce count/ownership at identity ingress and confirmation, not only before redirect or in a unique-primary index. A denied second identity must not remain as an unintended Auth sign-in provider. Validate the platform's same-provider linking behavior locally/in a separately approved test environment before selecting the final mechanism.
6. Store a server-issued intent bound to caller, operation, exact reauthorization target, expiry and one-time consumption. Fail closed when intent creation fails. Use Supabase's supported OAuth state/PKCE mechanism; do not replace or confuse it with the application's nonce. A wrong returned target must not silently become a link, replace primary or earn gameplay rewards.
7. Unlink requires fresh authentication and proof that another usable, verified sign-in method will remain. A nonempty password hash is insufficient proof alone. Provider identity removal and application disconnection need an explicit staged workflow with idempotency, audit and reconciliation for partial failure. Never promise logout/session revocation from deleting a row.
8. Demotion or exception revocation blocks new links and opens staff review. Preserve existing links and progress; no silent forced unlink, provider deletion, primary switch or gameplay reassignment. Staff chooses a safe primary after review. Existing ordinary multi-link accounts follow the same non-destructive review process, with future-additions blocked.
9. A link never moves Pokémon, inventory, coins, XP or Pass entitlement between trainers. Subscription matching and gameplay attribution must use the verified permitted link, not incidental account name or a legacy fallback. Link policy work cannot silently change these downstream authorities.
10. Rate-limit start, callback/confirm, unlink and reauthorization by actor and target. Audit actor/target IDs, operation, purpose, reason, case reference and outcome; never OAuth tokens, auth codes, passwords or reset links. Retention for this new link audit workflow is a separate design choice, not inferred from the helpdesk's 90 days.

## Player/staff presentation

Player Connections shows either **Connect Twitch** or the single connection with **Reauthorize** and a safe **Disconnect** flow. Explain that Twitch enables chat/stream participation and email/password remains separate. Hide ordinary second-link entry points and advanced utility controls; server policy still enforces the limit.

For explicit staff exceptions, label each link **Primary Twitch**, **Can sign in**, **Gameplay rewards enabled**, **Connected on**, and its purpose. Do not show technical “Linked rows.” Missing values remain unavailable; never infer sign-in usability or entitlement from a label. Display a review notice for grandfathered conflicts without disrupting an existing usable login.

## Threat model and required verification

| Case | Required result in implementation tests |
|---|---|
| Two concurrent links on one ordinary trainer | At most one slot reserved/confirmed; loser leaves no Auth identity or gameplay binding |
| Same Twitch ID on two trainers, including aliases | One owner only; denial is non-enumerating and audited |
| Forged/expired/replayed intent; wrong reauthorization identity | No link, primary, permission or Auth-provider change |
| Browser bypass or direct RPC | Server gives same denial as UI; no client role or metadata authorization |
| Existing second link, staff demotion, exception revoked | New additions denied; existing data retained for staff review; no lockout |
| Utility link with player/gameplay flags requested | Explicit exception/purpose checks apply; no cap bypass |
| Sole Twitch sign-in disconnected; unconfirmed recovery email | Deny before losing access; recovery support remains available |
| Auth unlink succeeds but DB step fails, or reverse | Durable staged result, safe reconciliation; no success banner for incomplete state |
| Username change / revoked Twitch authorization | Numeric identity retained; accurate needs-reauthorization state; no name-based reassignment |
| Protected accounts | All automated fixtures exclude Sora/Twinkle/PlayTester/PlayerQA; no production impersonation |
| Account switches / stale responses / 200% zoom / mobile | Clear stale drafts/target, readable controls, no cross-account mutation |

These are required tests, **not PASS claims**. Current verification is catalog/source inspection and ACL/index checks only. No provider redirect, link/unlink, race or demotion was exercised.

## Safe implementation sequence and approval boundary

First prepare a disposable local fixture for current policy and target invariants; trace every writer/caller of Auth identities, connection rows and legacy identity fallbacks. Confirm current Supabase provider-link/unlink behavior without live protected trainers. Define a private exception/pending-operation contract and rollback/reconciliation design. No migration or production SQL is included in this audit.

Before implementation, obtain authorization for the concrete Auth/RPC/schema changes and the exception workflow. Before production rollout, run a separately authorized aggregate inventory of existing conflicting links (no automatic forced unlink), test rollback, verify grants/RLS and stale-session behavior, and plan dedicated QA identities. Keep owner/mod privileges separate from R18 remediation. Final activation and provider tests remain a separate consequential step. D86/gameplay/build-stamp authority does not change.

Official reference checked: [Supabase Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking). It distinguishes Auth identities and manual linking via `linkIdentity`, and documents `unlinkIdentity`'s signed-in/two-identity requirement. Those platform guarantees do not enforce this game's one-Twitch policy. Changelog checked 2026-10-19; upcoming legacy TLS cipher retirement does not resolve these application invariants.
