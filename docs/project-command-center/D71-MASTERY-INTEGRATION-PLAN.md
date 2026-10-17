# D71 — Species Mastery integration plan

**Verdict:** **D71 INTEGRATION PLAN READY**  
**Status:** Read-only hosted verification and branch-only design. The ledger stayed inactive. Settlement was not changed.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `233a368e`  
**Work commit:** `eacf8a9d`  
**Production APP:** `20261008-rc133` (unchanged in `build.json`). This batch did not deploy.  
**Project:** `dtflmlbjhttoewqgkujf`  
**WIRE:** remains disabled (`enabled = false`).

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · QA account **none**.

No hosted SQL was written. No production catch rows, profiles, inventories, capture histories, mastery points, or Rankings rows were read. `activate_species_mastery_events()` was not called on the hosted project. `settle_if_needed` was not called.

Do not start D72. Do not activate Species Mastery. Final release smoke stays paused.

## 1. D70 verification

The working tree started clean at `233a368e`, the D70 pointer. The D70 report, the four unapplied SQL files, the D68 readiness report, and the D69 packet agree on the installed hashes. Those files were not edited.

Class: **LIVE CATALOG**. PostgreSQL 17.6. Read-only.

| Check | Result |
|---|---|
| `public.species_mastery_events` | table, RLS on and forced. Policy `species_mastery_events_own` is select-only |
| `public.species_mastery_progress` | view, `security_invoker=true`, not insertable and not updatable |
| `private.species_mastery_activation` | table, RLS on and forced. No anon or authenticated grants |
| `private.species_mastery_outbox` | table, RLS on and forced. No anon or authenticated grants |
| `public.catches.server_inserted_at` | `timestamptz`, nullable, no default |
| `catch_server_inserted_at` | BEFORE INSERT, calls `private.stamp_catch_server_inserted_at()` |
| `catch_server_inserted_at_freeze` | BEFORE UPDATE OF `server_inserted_at` |
| `catch_insert_authority` | absent |
| Activation | `activated_at` null, `disabled_at` null, `lifecycle = inactive` |
| Cosmetic events | `0` rows |
| `private.grant_mastery(uuid, integer, integer, text, text)` | md5 `d5c11cc672f2cb16ae0210023a8dd91b` |
| `private.mastery_rank(integer)` | md5 `04fa122f1f4424cd6e63fa1f3ffa16a4` |
| `public.play_rankings(text, integer, integer)` | md5 `b6526a939abdba0ef106e127925c43b0` |
| WIRE | `enabled = false` |
| Repository APP | `20261008-rc133` |

`settle_if_needed`, `persist_streamlink_catch`, `materialize_streamlink_catch`, `stamp_catch_row`, `after_catch_present`, and `after_catch_xp` do not mention Species Mastery and do not call `note_species_mastery_catch`.

`anon` and `authenticated` cannot execute the mastery recorder, outbox, activation, pause, drain, close, stamp, or freeze functions. `authenticated` can select `species_mastery_events`. The progress view also shows write privileges for `authenticated`. The view is an aggregate, so PostgreSQL reports it is not insertable and not updatable. That extra grant is a Supabase default-privilege leftover. The approved SQL revoked `PUBLIC` and `anon`, then granted select, and did not revoke `authenticated` first. It is recorded below as a prerequisite before activation. It was not changed in this batch.

## 2. Installed functions

These signatures are on the hosted catalog. Execution was not tested there.

| Function | Arguments | Security definer | anon / authenticated execute |
|---|---|---|---|
| `private.note_species_mastery_catch` | `p_catch_id uuid` | yes | no |
| `private.enqueue_species_mastery_event` | `p_catch_id uuid` | yes | no |
| `private.reconcile_species_mastery_outbox` | `p_limit integer` | yes | no |
| `private.deliver_species_mastery_outbox` | `p_limit integer` | yes | no |
| `private.record_species_mastery_event` | `p_catch_id uuid` | yes | no |
| `private.requeue_species_mastery_outbox` | `p_catch_id uuid` | yes | no |
| `private.activate_species_mastery_events` | none | yes | no |
| `private.pause_species_mastery_delivery` | none | yes | no |
| `private.resume_species_mastery_delivery` | none | yes | no |
| `private.begin_species_mastery_drain` | none | yes | no |
| `private.disable_species_mastery_recording` | none | yes | no |
| `private.close_species_mastery_activation` | none | yes | no |
| `private.persist_streamlink_catch` | 13 arguments, returns `jsonb` | yes | no |
| `private.materialize_streamlink_catch` | same 13 arguments, returns `jsonb` | yes | no |
| `private.settle_if_needed` | `r encounter_rounds` | no | yes, unchanged |

## 3. Proposed server integration point

Do not add the call in this batch. The narrowest later point is inside `private.settle_if_needed`, immediately after `private.materialize_streamlink_catch` returns `ok = true`.

How the catch id reaches the outbox:

1. `settle_if_needed` already calls `materialize_streamlink_catch` only when the round caught the Pokémon and no catch exists for that round and trainer.
2. WIRE is off, so materialize uses its stamp `INSERT` and returns `jsonb` with `catchId`. If WIRE were on, `persist_streamlink_catch` would return the same `catchId` from `INSERT ... RETURNING id`. Both paths already produce the id. WIRE stays off.
3. The proposed statement reads `(v_mat->>'catchId')::uuid`. It does not look up a production catch by scanning the table.
4. It calls `private.note_species_mastery_catch(catch_id)` only when `private.species_mastery_activation.lifecycle = 'active'`.
5. `note` calls `enqueue`, which inserts that uuid into `private.species_mastery_outbox` with `ON CONFLICT (catch_id) DO NOTHING`.
6. A later `deliver_species_mastery_outbox` calls `record_species_mastery_event` for pending rows. The event guard accepts only a play source key, a successful `capture_log`, a non-test round, and a `server_inserted_at` at or after activation.

`after_catch_present` and `after_catch_xp` are the existing catch notifications. They do not know about this ledger. They are the wrong hook: they run in the insert statement, so a raise there can abort the catch.

The preservation-safe fallback needs no settlement edit. `reconcile_species_mastery_outbox` selects `public.catches.id` for rows whose `server_inserted_at` is at or after activation, whose `source_key` is `play:<round>:<trainer>`, and whose `capture_log` succeeded. It inserts those ids into the outbox. That is the recovery path when the note never ran.

## 4. Catch preservation

**A cosmetic mastery failure must never cause a legitimate Pokémon capture to fail.**

The future call site has to be a nested block around `note`, not a direct call to `enqueue`:

```sql
BEGIN
  PERFORM private.note_species_mastery_catch(catch_id);
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
```

`note` already returns false on any internal error. The nested block also covers a missing function or a future edit that lets an error escape. The catch `INSERT` has already happened in the same transaction. Swallowing the note error lets settlement commit the specimen.

| Case | Designed behavior |
|---|---|
| Outbox insert fails | `note` returns false. The nested block does not raise. The catch commits. No outbox row. |
| Mastery function missing | The nested block swallows the error. The catch commits. |
| Duplicate settlement | The existing unique catch path returns `already-settled` and does not insert a second specimen. A second note hits `ON CONFLICT DO NOTHING`. Delivery records one event because `catch_id` is the event primary key. |
| Concurrent delivery | `deliver` locks pending rows with `FOR UPDATE SKIP LOCKED`. |
| Interrupted processing | A pending row stays pending. `attempts` increases on a transient error. At 8 attempts the status becomes `exhausted`. |
| Mastery unavailable at settle time | The catch still commits. `reconcile` can queue the same id later. |
| Later reconciliation | Inserts outbox rows only. It does not insert, update, or delete `public.catches`. |
| Ineligible catches | Grant, import, test-round, and unsuccessful logs never become events. Reconcile does not queue a non-play source key. |
| Historical catches | `server_inserted_at` is null, or it is before activation. Reconcile skips them. Delivery rejects a noted pre-activation catch and does not change the specimen. |

Recovery does not repeat the encounter and does not modify the specimen. `requeue_species_mastery_outbox` only resets an `exhausted` outbox row to `pending`. A `rejected` row means the event guard refused it. Reconcile will not pick it up again, because an outbox row already exists. The future hook must not call `note` for catches inserted before activation.

`enqueue` itself does not read `lifecycle`. A note during `draining` can leave a pending row that delivery will skip. The future hook must read `lifecycle` and call `note` only while it is `active`.

The accepted D70 residual remains: if `stamp_catch_server_inserted_at()` raises, that insert can still abort. This plan does not change that function.

## 5. Activation and operations

Activation is separate from the settlement hook. Neither is authorized here. No job was scheduled.

Prerequisites before the first activation:

1. A new owner GO that names the activation command and nothing else.
2. Settlement still must not call `note` unless that same GO, or a later one, authorizes the nested block above.
3. Decide whether to revoke the extra `authenticated` write grants on `public.species_mastery_progress` first. The view cannot be written today. The revoke is still the intended privilege shape.
4. WIRE stays false. APP stays `20261008-rc133`. No backfill.
5. Operator queries for lifecycle and outbox status counts are written down before the command runs.
6. Pause, drain, close, and requeue are understood. Players are not promised a tier until delivery has been observed on synthetic data.

Activation command, database owner only:

`SELECT private.activate_species_mastery_events();`

It sets `activated_at` to `clock_timestamp()` and `lifecycle` to `active`. It takes no client timestamp. A second call raises `55000`. Catches whose server clock is earlier are ineligible. Historical rows stay null and stay out.

Recording begins only for eligible play catches after that clock. Delivery begins only when a database owner calls `deliver_species_mastery_outbox(p_limit)`. This plan does not enable a schedule.

Monitoring, counts only:

- `lifecycle`, `activated_at`, `paused_at`, `drain_started_at`, `closed_at` from the one activation row.
- Outbox counts grouped by `status`: `pending`, `delivered`, `rejected`, `exhausted`.
- `count(*)` on `species_mastery_events`.
- Oldest `enqueued_at` among `pending`, without selecting catch ids for a public report.

Transient errors stay `pending` while `attempts < 8`. The next deliver retries them. `rejected` rows need a human reading `last_error`; they are ineligible, not retryable. `exhausted` rows wait for `requeue_species_mastery_outbox(catch_id)` after the cause is fixed.

`pause_species_mastery_delivery()` sets `lifecycle` to `paused`. Deliver returns 0. Reconcile can still queue. Resume returns to `active` and does not move the cutoff.

`begin_species_mastery_drain()`, also exposed as `disable_species_mastery_recording()`, stops reconcile and stops new event recording. Deliver finishes only rows queued at or before `drain_started_at`. `close_species_mastery_activation()` stops delivery and leaves existing events in place. There is no second activation period.

If the progress view is unavailable, the event rows remain and the points Rankings board is untouched. Repair the view. Do not ask players to catch the species again.

## 6. Player-facing proposal

No UI was added. Join, Prepare, and Throw stay as they are.

The live points ladder remains `species_mastery.points` and `species_mastery.rank`. Pokédex already shows it as "Mastery" with points. Oak's Lab shows stars and points. Rankings has a Mastery board. Catch notices say "+N Species Mastery". Those stay the points system.

Call the new cosmetic track **Species Familiarity**. Do not reuse the points label. Tiers, from `species_mastery_progress`, are Familiar at 1 eligible catch, Acquainted at 3, Experienced at 6, Specialist at 12, and Expert at 20. Regional forms share one National Dex count. The view does not read `species_mastery.points`.

Later presentation, still not built:

- Pokédex species details: a second Progression line, "Species Familiarity", beside the existing Mastery points line.
- My PC Pokémon details: the same species tier, not a stat of that one specimen. `pc-presentation.js` has no mastery line today.
- A future Trainer profile showcase: a short list of Familiarity tiers. It is not a Rankings score.

## 7. Tests executed

Design statements in this file are not test results. These commands were run.

| Command | Class | Result |
|---|---|---|
| Hosted catalog reads for objects, triggers, privileges, hashes, WIRE, and the progress view | LIVE CATALOG | Matches the table in section 1. No catch-row read |
| `node tools/d71-mastery-integration-rehearsal.js` | REAL SQL | 7/7 on `127.0.0.1:55444`, PostgreSQL 17.5. `settle_if_needed` was not called |
| `node tools/d64-mastery-rehearsal.js` | REAL SQL | 19/19 on `127.0.0.1:55439`, PostgreSQL 17.5 |
| `node tools/d65-mastery-rehearsal.js` | REAL SQL | 19/19 on `127.0.0.1:55440`, PostgreSQL 17.5 |
| `node tools/d66-mastery-rehearsal.js` | REAL SQL | 14/14 on `127.0.0.1:55441`, PostgreSQL 17.5 |
| `node tools/d67-mastery-rehearsal.js` | REAL SQL | 20/20 on `127.0.0.1:55442`, PostgreSQL 17.5 |
| `node tools/d68-mastery-rehearsal.js` | REAL SQL | 14/14 on `127.0.0.1:55443`, PostgreSQL 17.5 |

The D71 local checks covered an inactive install, rejection of a pre-activation catch without changing the specimen, an idempotent post-commit note, Familiar from one eligible catch, unchanged points, a swallowed note failure followed by reconcile of the same id, a grant source left unqueued, and pause/resume delivery.

Hosted settlement, hosted activation, and a live encounter were **not run**.

## 8. Remaining blockers

- The ledger is inactive. No settlement function calls `note`.
- The progress view still has non-select grants for `authenticated`, even though it is not writable.
- `enqueue` does not check `lifecycle`.
- The stamp trigger can still abort an insert if it raises.
- No production catch has been used to prove the stamp. That needs its own GO.
- Frontend and APP do not show Species Familiarity.
- Final release smoke stays paused.

## 9. Proposed D72 scope

D72 should be a branch-only, unapplied draft of the nested `note` call and a reviewed revoke of the extra progress-view grants. It should be rehearsed on disposable Postgres. It should not be installed, should not activate recording, should not schedule delivery, and should not run an encounter.

Do not start D72 from this report.

## 10. Verdict

**D71 INTEGRATION PLAN READY**
