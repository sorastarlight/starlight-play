# Morning launch decisions — draft, not a launch authorization

Current October 22, 2026 EDT. Latest runtime main is a51bcbbf (Pages 39750745599); APP remains 20261008-rc133. Latest regression evidence is 95/95 STATIC/LOCAL suites in CODEX-91, with 56 hosted source matches and isolated SDK integrity loading/rejection checks. This packet consolidates the important decisions instead of interrupting for routine work.

## Recommended order

| Step | Concrete next action | Decision or evidence needed |
|---|---|---|
| 1 | Review the two prepared private SQL packets below; recommend correcting the confirmed purchase fault before public launch | Completed CODEX-96 after explicit approval and fresh fingerprint checks; no hosted purchase or other gameplay test follows automatically |
| 2 | Verify a completed database backup after CODEX-73's October 22 01:45 UTC installation | Completed in CODEX-94: dashboard lists October22 07:44:04UTC physical backup, after the migration. No contents/physical restore certification; new approved changes would require updating recovery evidence |
| 3 | Review the remaining acceptance limits below | Obtain actual evidence, or explicitly accept named deferrals. Local mocks and CSS-width fixtures cannot silently substitute for real devices/providers |
| 4 | Review final configuration and an exact release packet against the then-current main, backend and recovery state | Separate owner go/no-go; APP stamp only if explicitly approved. Historical D86 is not automatically authorized |

## Prepared SQL decisions — completed in CODEX-96

| Packet | Prepared evidence | Proposed scope |
|---|---|---|
| LOCALAPPDATA/PokemonStreamLink/security/codex87-cart/README.md | 17 REAL LOCAL SQL checks, including exact captured helper bodies, overlapping transactions, normal purchases, retry behavior, guarded rollback and drift refusal | Only the two reviewed purchase-function replacements in INSTALL-BOTH.sql; ROLLBACK-BOTH.sql is prepared. Earlier cart-only packets are superseded. No historical data cleanup, rewards, refund or hosted QA |
| LOCALAPPDATA/PokemonStreamLink/security/codex87/README.md | 11 REAL LOCAL SQL checks, exact rollback and source/permission drift refusal | One obsolete write-removal replacement; existing public response and permissions preserved. No email, account or staff action |

Both packets were explicitly approved and installed in CODEX-96 (20261022084110/20261022084115). Earlier preparation/decision wording is historical; see LAUNCH-CODEX96-CORRECTIONS.md. No further installation decision is pending for these exact candidates. Reproductions and unresolved details remain outside Git. Approval of one need not imply the other. Any approved new SQL must be added to the recovery-delta inventory; a snapshot predating that installation does not suddenly contain it. Verification can compare metadata/source without invoking write-risk RPCs.

## Remaining acceptance choices

- Physical iOS/Android, touch/virtual keyboard, real browser zoom and screen-reader behavior have not been certified. Rendered CSS-width, accessible-name and native keyboard checks are useful but narrower evidence.
- Real Twitch consent/token refresh/signed-provider event and post-fix Pass/uploader integration coverage remains incomplete. No new provider/account test is authorized. A separate ordinary Twitch test identity was unavailable.
- The new one-link restriction remains installed but disabled. Keep existing provider behavior unless the owner separately approves rollout; launch approval is not implicit activation. The current ordered checklist defers the new restriction pending provider QA and rollout decision.
- CODEX-71 passed an actual isolated logical restore. Supabase physical backup restore and full Auth service recovery are not certified. A newer backup proves a recovery point exists, not that a physical restore was tested.
- Broader nested authorization/search-path warnings remain bounded review items. They are not a count of confirmed exploits, and the latest RLS review does not certify every security-definer RPC or serializer.

## Already decided or completed

Daily-backup loss of roughly one day is accepted; free email capacity of 100/day and 3,000/month is accepted. Do not reopen those as purchase prompts. Existing retention decisions remain 90 days for completed staff recovery actions and closed Helpdesk records; unresolved recovery sends retain their investigation handling.

Recorded bounded catching, WIRE/Familiarity, purchase/evolution/Oak, gifts/Pass, recovery email, Helpdesk and two-account GTS evidence remains valid within its documented limits. Those hosted QA allowances are spent. No extra encounters, grants, transfers, email or identity changes follow from this packet.

Routine frontend maintenance has been published under CODEX-78 with exact scope and hosted evidence. Protected admin.html and js/admin-live.js remain unchanged. The legacy Admin floating SDK tag and Helpdesk's separate existing exact SDK pin are documented exceptions, not an inferred permission to edit or upgrade them.

## Final configuration and recovery preflight

Before recommending go, verify the then-current approved flags/jobs/provider configuration through allowlisted reads; do not call write-risk bootstrap/health RPCs. Preserve current WIRE/Familiarity cutoff/worker limits, staff overrides, paused rollout boundaries and existing email limits. No scheduling or settings change is authorized.

A restored environment needs the CODEX-73 access boundary and secure refresh-pass version 7/store-asset version 5 code with JWT verification retained. See RECOVERY-POST-DRILL-DELTAS.md. Do not execute rollback or restore as a readiness probe. Credentials and private archives stay outside Git.

No production release declaration, APP stamp, gameplay, SQL, spending, password reset, provider/DNS setting, protected-account mutation or new scheduler is authorized by this document.

CODEX-98: remaining real-device/provider launch-requirement choice is presented in FINAL-ACCEPTANCE-REVIEW.md. Owner answer pending;neither accepted deferrals nor final launch may be inferred.

CODEX-100 decision received:real mobile/assistive/Twitch-provider acceptance required;no beta deferrals accepted. Earlier pending-scope wording is historical. Follow REAL-ACCEPTANCE-CHECKLIST.md;device inventory pending. No new test-mutation/final-release authority.
