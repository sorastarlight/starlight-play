# CODEX-35 — One approved shared encounter, incomplete player smoke

Owner approved exactly one shared public QA encounter with one ordinary EmailQA throw, keeping its natural result, without cancellation/refunds/resets/scheduling/stamping. This encounter allowance is now consumed. **No replacement launch is authorized.** The throw was not performed.

## Preflight and launch

At01:32 UTC October21 (October20 EDT), the existing browser Play tab28 visibly showed EmailQA. Read-only hosted checks found no unresolved/paused encounters, QA inventory10 Poké Balls/5 Great Balls/3 Ultra Balls, WIRE enabled, active Familiarity with unchanged cutoff, and matching installed guard/settlement fingerprints.

The ordinary `admin_start_round` delegates to `director_start_now`, which always calls `director_schedule_next` for a non-test round. That would violate the no-scheduling boundary. Rather than change permissions/functions or fabricate an owner JWT, the authenticated database operator called the existing canonical `private.launch_community_round` directly for ordinary base-form Bulbasaur. The transaction pinned its full definition, checked guard/settlement fingerprints, locked launch state, required an offline/held/inactive director with no queue/next time and no ad, and asserted the full director row was identical afterward. No hand-built encounter/catch INSERT, schema change, test reward override or forced outcome was used. This method does not test the public admin launch wrapper's authenticated success path.

Executed packet: `evidence/shared-qa-encounter-launch.sql`.

One encounter committed: **a7fcaeae-896d-4376-a892-250cdd831744**, Bulbasaur, `ADMIN_SPECIFIC`, ordinary reward mode, started01:35:34.580426 UTC. Join window30 seconds.

## Why the player test stopped

During preparation the browser tabs/session changed. Original tab28 was gone; current tabs48/49 both visibly showed **Sora Starlight**, not EmailQA. No Join, Prepare, Throw, Radar or other player action was clicked. The operator should have rechecked live browser identity immediately before launching instead of relying on the earlier preflight. Owner's separate staff-readiness answer arrived during this interval; no additional manual start was requested or performed by Codex.

The browser later showed the owner Admin Hub; this was user navigation, not an agent navigation/click. Its normal background requests may update heartbeat/director metadata. Do not claim that every protected-account field was unchanged; no explicit protected gameplay mutation was executed, and no trainer participated in this round.

## Independently verified final result

At01:37:22 UTC:

- Round closed at01:36:06 with `No Trainers joined. The wild Bulbasaur wandered away!`.
- `resolved=true`, `cancelled=true` is the canonical automatic empty-join expiry; **no cancel/refund RPC was called**.
- Participants0, catches0, capture logs0; no throw and no inventory consumption.
- EmailQA inventory remained10/5/3.
- Director remained OFFLINE, manual hold=true, session inactive, no queue, `next_encounter_at=null`.
- WIRE remained enabled; Familiarity lifecycle/cutoff unchanged.
- No progress delivery, schedule, reset, spending, APP stamp or second launch.

Evidence: `shared-qa-preflight.json`, `shared-qa-final-verification.json`. Actual UI screenshot saved locally at `C:/Users/FET/.codex/visualizations/2026/10/19/01a15207-ca1f-7800-95d6-9fb36dc377d5/shared-qa-empty-encounter.png`; it shows the owner dashboard's empty completed encounter row, not an EmailQA gameplay pass.

## Verdict and next requirement

**PRODUCTION encounter creation/empty expiry observed; full player gameplay smoke INCOMPLETE.** No hosted spending/catch/WIRE specimen/stamp/delivery path was proved. No replay RPC was issued.

Before any replacement: owner signs the in-app browser back in as EmailQA and leaves its session unchanged; operator rebinds/verifies that exact visible identity immediately before launch; owner explicitly approves one replacement encounter/one throw. Owner staff sign-in is not needed for the already reviewed no-scheduling database-operator launch. Do not reuse the spent allowance. Broader D86/delivery/scheduling/reset/stamp remain held.
