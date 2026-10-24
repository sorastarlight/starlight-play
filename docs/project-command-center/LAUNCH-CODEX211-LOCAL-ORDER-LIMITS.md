# CODEX-211 — local Mart ordering and Capture Limits

The owner approved both reviewed designs and local implementation on October24. Both are implemented locally; production remains main6d740c21. Publication, application reads and saves remain held.

## Implemented

Mart: explicitly load the complete existing floor list; move only non-system PokéCoin floors across eligible slots. System/other-currency floors retain their loaded positions; hidden floors remain included. Named Up/Down controls, boundary disabling, moved-row focus, position announcements, discard and complete before/after review are included. Complete unique UUID identities are required; a key matching another floor UUID is rejected because the existing endpoint accepts either identity form. This is conservative client validation, not a new security boundary.

Capture: explicitly load minimum/maximum bounds, without substituting defaults. Preserve unchanged numeric precision and submit only edited minChance/maxChance keys. Validate 0<=minimum<maximum<1, display percentage previews, focus/mark invalid fields and review changed bounds only. Other multipliers, tiers, coin rewards, timing, XP and simulation are excluded.

Both use before/after session checks, existing staff permissions, generation/reset guards, single in-flight saves and reload-before-more-editing after every save attempt. Lost or mismatched receipts never auto-retry. Access/session denial clears the editor's data. Concurrent staff edits are not locked; no promise is made about insulation of already-running encounters.

## Source review

Catalog-only SELECT inspected 11 selected existing definitions and ACLs:store get/reorder,require_staff_edit/require_hub,is_play_admin/play_staff_role,capture overview/save,game_settings/capture_config/capture_base_chance. The source list is authoritative in evidence/codex211-contracts.json (some helper names have one definition). No application function was executed. Read/helper definitions inspected contain no writes. Ordering requires the existing owner/admin edit guard; capture retains its existing staff guard. No grant or SQL change is proposed. Definitions remain privately retained outside Git.

Current Supabase changelog and RPC docs were checked; no dependency, schema, Data API exposure or Auth setting is being changed.

## Validation

122 LOCAL HARNESS suites pass, including both models/adapters, precision/minimal-patch validation, complete/fixed identities, alias collision rejection, session changes before/after transport, denied/mismatched/lost receipts, no retry, single flight and stale load/save/reset completion. Existing shell reset fixtures include the new editors.

REAL LOCAL DOM uses actual mounted module plus fictional transport, CSP connect-src none and no SDK/Auth. Checks cover floor movement/focus/review/Escape, complete fictional ordering save, invalid maximum focus without save, zero/minimal capture save, reload locks, malformed reads, lost capture receipt, denied ordering save and session reset. Twelve measured/viewed responsive states:both editor layouts plus capture and ordering review at320/390/768/1024. Editor controls measured44px minimum; no horizontal overflow measured. Narrow dialogs were visually inspected. This is not real-device, screen-reader, hosted save or production permission acceptance.

Build passes31HTML/477references. APP20261008-rc133 unchanged. Temporary servers/tabs closed. Raw fixtures/screenshots/rollback packet stay in LOCALAPPDATA/PokemonStreamLink/security/codex211.

## Exact publication proposal

Only four runtime files:admin-next.html,js/admin-next.js,js/admin-next-limits-order.js,css/admin-limits-order.css. Candidate/baseline hashes and tested exact rollback/drift refusal are in evidence/codex211-runtime-scope.json. Recheck the reviewed source/ACL contracts and exact main baseline before publication;stop on drift. Publish only those files through existing Pages, then verify source only. No SQL,authenticated navigation,notice,live catalog/configuration call,save,simulation,grant,gameplay,provider action or APP stamp is included.

The owner local-work approval is fulfilled. New privileged-workflow publication needs its separate decision under streamlink-project.mdc/CODEX-RUNNER.md. Sora NO;Twinkle NO;PlayTester role unchanged.
