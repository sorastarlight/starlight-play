# CODEX-182 — Operations migration review

Preparation only, October24,2026. Existing legacy Admin sources were read, not changed. Catalog SELECT inspected two public functions and three private helpers; no Director, encounter, session, report or other application function was invoked. No new workflow, SQL installation, live control or publication is included.

## Inspected contracts

| Contract | Observed behavior | Migration implication |
| --- | --- | --- |
| admin_live_snapshot() | Existing STABLE staff observation endpoint. Reads current status without the Director dashboard/tick path. | Keep this as the new Hub's observation path. A displayed snapshot does not authorize control. |
| admin_director_command(text,jsonb) | Staff-gated command dispatcher. Refreshes ad end state and resolves the active round before branching; returns director_dashboard after a command. | Do not expose arbitrary action strings or treat any call as a passive read. |
| start_session branch | Creates/reuses a session, sets RPG active, resets mode to NORMAL, enables Auto and may schedule the first encounter. No Twitch-LIVE condition appears in this branch. | Confirmation must disclose automatic encounters. An offline force-start capability exists in the old UI and must not be silently imported. |
| end_session branch | Rejects an active encounter, ends the session and clears session/next-encounter/queued pointers. | Show active-encounter blocking and queued-state consequences before confirmation; do not present this as a harmless display toggle. |
| private.director_dashboard() | Calls director_tick_if_due and director_active_round, then builds dashboard data. | Do not call it on page load, polling or preview merely to populate the new workspace. |
| private.director_active_round() | Calls sync_latest_round before checking activity. | Its name does not establish read-only behavior. Do not invoke it for acceptance without appropriate scope. |
| private.director_refresh_ad_end() | Can end an expired ad window, update post-ad cooldown and log the transition. | Even command preflight can perform operational writes. |

Helper definition MD5s observed: director_active_round 90fd3f9356c58575d2fb6b30dbc8ebb2; director_dashboard b3e545626282e410f8c4f4d298bdb71a; director_refresh_ad_end 576301486ae0443d5f6a4bed0a3416e4. Raw definitions are retained privately under LOCALAPPDATA/PokemonStreamLink/security/codex182. This is a focused dependency review, not a claim of full transitive security coverage.

## Proposed first slice for owner review

Keep the current observation cards and current-tool handoff. Propose only explicit Start RPG session and End RPG session controls using the existing dispatcher and existing server permission decision. A dedicated adapter must allow only those two actions; do not expand the generic read gateway. First-slice Start should be available only with a fresh LIVE observation and inactive RPG session. Offline/unknown/stale detection should explain the limitation and hand off to the current tool. That frontend condition is a usability guard, not a new server enforcement guarantee.

Start review should say that it starts the RPG Director, switches to Normal mode, enables automatic encounters and may schedule the first encounter. End review should disclose stopping RPG encounters, preserving Twitch broadcast state, clearing any queued special and requiring a later explicit start. Block End while the observation reports an active encounter; preserve the server's final rejection if state changes. Show the exact pending action once, with keyboard focus restoration and mobile containment.

Do not automatically retry commands after a timeout or lost receipt. Show an uncertain result, disable further commands and obtain a fresh observation; do not infer success from the button click. Ignore stale responses and clear state on account/permission changes. No claim of idempotent retries, revision locking or race-free frontend preflight is supported by this review.

Exclude force start, manual/test encounters, cancellation, Auto/mode controls, queued specials, ad controls/tokens and credentials from this slice. Keep their existing handoffs. No server permission, reward, schedule policy or encounter behavior changes are proposed. Review of credential-bearing dispatcher actions is a separate source-audit item; no defect or role-policy violation is claimed here.

## Evidence and decision boundaries

Before implementation, obtain a design/scope decision for this new privileged workflow. Then locally test fictional live/offline/unknown/stale/session/active-encounter states, exact action payload allowlisting, double-click prevention, lost receipts, late replies, denied access, keyboard/dialog focus and responsive layouts. Validate automatic-encounter and queued-special wording against the exact installed contract again before proposing publication.

Local implementation approval would not authorize publication, production SQL, session actions, automatic encounters, ad/provider calls, protected notices or hosted gameplay acceptance. Any live action requires its own bounded decision. Frontend rollback should restore the observation-only workspace and handoff; it must not attempt to undo sessions or repair player data.
