# CODEX-196 — Approved Operations local implementation

The owner approved Operations design and local implementation. Start/End controls are implemented locally using existing admin_live_snapshot and admin_director_command contracts. No production function,permission,schedule or player state changed. Publication and live commands remain held.

## Behavior

The dedicated adapter accepts only start_session/end_session with an empty payload;it checks the current staff identity before and after transport. The generic read gateway is unchanged. Snapshot polling remains observation-only and ignores responses from an obsolete polling/account generation.

Start requires fresh known LIVE status,an explicitly inactive RPG session and no current encounter. End requires a consistent active session row/ID and no current encounter;unknown/stale observations block both. Freshness uses a90-second observation age,30-second future-clock tolerance and the existing15-minute Twitch observation window. These are frontend usability guards,not new server authority or a race-free guarantee.

Each review explains effects:Start selects Normal mode,enables automatic encounters and may schedule the first encounter;End clears next-encounter/queued-special pointers and requires a later explicit Start while Twitch can remain live. Before sending,the client obtains a fresh snapshot and rechecks eligibility;End also matches the reviewed session ID. Commands are single-flight and sent once. Acknowledged and uncertain results require an explicit fresh status reload before another command;ordinary polling does not clear that lock. Lost receipts are not retried automatically. Account/access reset clears local state and closes review dialogs.

Force start,manual/test encounters,cancellation,Auto/mode editing,queued-special editing,ads/tokens/credentials and new permission behavior are excluded. Existing current-tool handoffs remain.

## Local evidence

-119/119regression suites and build31HTML/473stamped references pass;APP20261008-rc133 unchanged. Existing test fixtures now include the reviewed session adapter/reset dependency while preserving their restricted gateway assertions.
-New cases cover action allowlisting,identity changes,fresh/invalid/offline/stale observations,active encounters,preflight changes,different End session,single-flight,lost receipts/manual refresh,reset/late results and actual extracted polling generation rejection.
-Actual local full-shell rendering checks cancellation/Escape focus,no-command cancellation,one simulated Start/End command,acknowledgement lock/manual refresh,lost-receipt lock and offline/stale/encounter blocking. No real command ran.
-Eight settled viewport cases cover controls and confirmation at requested1280/768/390/320CSSpx. Actual iframe client widths were1280/768/375/305;scroll width did not exceed client width,dialog width fit,and tested visible session buttons were at least44px high. This is not physical-device acceptance.

Evidence:evidence/codex196-regressions.json,codex196-ui-states.json,codex196-layouts.json. Private screenshot:LOCALAPPDATA/PokemonStreamLink/security/codex196/start-dialog.png. Fictional transport and connect-src none isolate the browser fixture;it has no real Auth/client/backend. Temporary tabs/servers were stopped/closed.

## Exact publication and rollback proposal

Five runtime files only:admin-next.html,js/admin-next.js,js/admin-next-ops.js,js/admin-next-session.js,css/admin-session.css. Baseline/candidate normalized hashes are recorded in evidence/codex196-runtime-scope.json against current published main d62fe3c4. Rollback must refuse drift,restore the three existing files from that baseline and remove the two newly added files only if candidate hashes still match. It performs no database or player repair.

Publication requires a separate owner decision. Proposed acceptance is deployed-source verification only,with no authenticated navigation,notice acknowledgement,hosted snapshot/report or session command. Recheck existing command/snapshot source contracts before publication;stop on unexplained drift. Hosted Start/End or automatic-encounter QA would need a distinct bounded gameplay decision. No production SQL,spending,APP stamp or final launch is included.
