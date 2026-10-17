# D65 — Species Mastery ledger hardening

**Status:** BRANCH DRAFT + DISPOSABLE LOCAL REHEARSAL. Not applied. Not connected to encounters.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `ae042fa4`  
**Work commit:** `fbb09981`  
**Production APP:** `20261008-rc133` (unchanged).  
**WIRE:** not switched. No hosted SQL.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none** · mutations **none** · cleanup **not applicable**.

## 1. What changed

D64’s event table, primary key, eligibility guard, RLS, and uniqueness stay. D65 adds a second unapplied file. Installing it does not turn recording on.

| File | Role |
|---|---|
| `supabase/unapplied/d64-mastery/001_species_mastery_events.sql` | Unchanged D64 ledger |
| `supabase/unapplied/d65-mastery/002_species_mastery_hardening.sql` | Activation cutoff, timestamp freeze, outbox |
| `supabase/unapplied/d65-mastery/rollback-before-activation.sql` | Drops an inactive empty draft |
| `supabase/unapplied/d65-mastery/rollback-destructive.sql` | Drops the ledger only after an explicit backup confirmation |
| `supabase/unapplied/d65-mastery/DO-NOT-APPLY.md` | Apply warning |

`private.species_mastery_activation` is inserted with `activated_at` null. `private.activate_species_mastery_events()` takes no timestamp. It sets the cutoff to `clock_timestamp()` once. A trigger rejects a cutoff that is not the server clock, and rejects any later change. `private.disable_species_mastery_recording()` sets `disabled_at` the same way and does not delete events.

The guard still requires the D64 play-key shape, a live round, and `capture_log.success`. It does not read `obtained_method`. It now also requires recording to be active, a finite `caught_at`, and `caught_at >= activated_at`. Null, infinity, and a timestamp more than two minutes ahead are rejected. The catch row, the log row, and the activation row are locked `FOR SHARE` before the event insert.

A `BEFORE UPDATE OF caught_at` trigger rejects a change to that column. An assignment that stores the same value, including the evolution statement `caught_at = caught_at`, still passes. The trigger does not rewrite existing rows. Inserts can still supply a timestamp. That remaining hole is a blocker below.

## 2. Cutoff

The activation row is the boundary, not the moment the migration runs. A catch inserted before `activate_species_mastery_events()` is rejected afterward, including one whose `caught_at` is already in the past. A catch inserted after activation, with a server timestamp, is accepted. Replaying the old catch does not add a row.

`caught_at` is the specimen time. The current play insert, `private.persist_streamlink_catch`, does not set the column, so a database default of `now()` is the intended server clock. This batch did not re-read the hosted catalog. Older queries still treat `caught_at` as nullable, and legacy `private.record_stream_catch` accepts a caller-supplied `p_caught_at`. A round’s start time is the wrong boundary: a round can open before the switch and settle after it.

## 3. Recommended integration

A failed cosmetic write must not remove a successful catch. The three options are not equal.

| Approach | Catch survives a mastery error | Eventual mastery delivery | Fit |
|---|---|---|---|
| Same transaction, no savepoint | No. The catch rolls back with the error. | No | Unsafe |
| Savepoint or a function exception handler alone | Yes, for an error inside the savepoint | No. If the note is swallowed, nothing retries. | Not sufficient |
| Durable outbox, then idempotent delivery | Yes, when the note is isolated from the catch | Yes. Pending rows retry. Permanent rejects stay rejected. | Recommended |

The draft follows the third option and does not call it from settlement.

`private.note_species_mastery_catch(uuid)` enqueues the catch id and returns false on any error. The local test injected an enqueue failure, committed the catch, and saw no event and no outbox row. `private.reconcile_species_mastery_outbox` then queued only specimens at or after the cutoff. A historical catch stayed out. `private.deliver_species_mastery_outbox` hit an injected insert failure, left the row pending, left the catch in place, and recorded the event on the next call. A `grant:` row marked `CAPTURE` was queued by the scan and then rejected. It did not earn mastery.

The savepoint test is separate. It kept the catch and wrote no event. That proves isolation. It does not prove delivery.

## 4. Recovery

Before activation, with an empty event table, `rollback-before-activation.sql` drops the new objects. Catches and points stay. After activation, or once any event exists, that script refuses and the rows stay.

After activation, the routine stop is `private.disable_species_mastery_recording()`. New calls are rejected. Existing events stay. Points stay.

`rollback-destructive.sql` drops the ledger, including earned events. It refuses unless the session has set `starlight.confirm_mastery_destructive_rollback` to `BACKUP_VERIFIED`. The local test confirmed both the refusal and, after the setting, a drop that left catches and points in place. That setting is not a production backup. A hosted destructive drop still needs a separate authorization, a real backup, and a restore check. This batch did not do those.

## 5. Security

Authenticated `EXECUTE` is false on the recorder, activator, deliverer, and reconciler. Calls return SQLSTATE 42501. Direct backdating of `activated_at` is rejected. A client insert into the event table is 42501. Trainer B’s view and table read do not include trainer A.

One `catch_id` is still the primary key. Two concurrent recordings left one row. A mismatched trainer is rejected. Release and a catch delete leave the event. Deleting trainer C cascades only C’s events.

The recorder, activator, note, reconcile, and deliver functions are `SECURITY DEFINER` with `search_path` pinned to `pg_catalog, public, private`. PostgreSQL grants `EXECUTE` to `PUBLIC` on new functions; each new function is revoked from `PUBLIC`, `anon`, and `authenticated`. Default privileges were not changed. The activation and outbox tables are in `private`, with row security forced and no policies. The definer owner bypasses that, which is what lets the server functions read `catches` and `capture_log`. Authenticated does not receive that path.

`FOR SHARE` holds the specimen, its log row, and the activation row until the recording transaction ends, so those rows cannot commit a change between the check and the insert. A disable that commits first is visible, and the event is rejected.

## 6. Local results

PostgreSQL **17.5**, `127.0.0.1:55440`, database `d65_mastery`. The data directory was removed. Not hosted Supabase.

`node tools/d65-mastery-rehearsal.js`: **19/19 REAL SQL**.  
`node tools/d64-mastery-rehearsal.js`: **19/19 REAL SQL** on `127.0.0.1:55439`. The D64 file was not changed.  
`node tests/d65-mastery-static-tests.js`: **STATIC PASS**.

Class: **REAL SQL** on disposable loopback Postgres. Not REAL DOM, not REAL RPC, not PRODUCTION.

## 7. Blockers

- Inserts can still store a chosen `caught_at`. The freeze covers updates only. A privileged writer, including legacy `record_stream_catch(p_caught_at)`, could stamp a new time on a new row. Do not activate while that writer can invent timestamps.
- The hosted default and nullability of `caught_at` were not re-read. Confirm them from the catalog, without reading catch rows, before any apply.
- `reconcile_species_mastery_outbox` reads catch rows. Running it on the hosted database needs its own authorization. This batch ran it only on synthetic rows.
- There is still no settlement call. Applying the files would create inactive objects and record nothing until the separate activate function runs.
- The schema is ready for review. It is not ready to install or activate.

## 8. Proposed D66

D66, if authorized later, should be a read-only catalog check of `caught_at` and of who can execute `record_stream_catch`, plus an owner decision on the timestamp freeze. It should not add a settlement hook, backfill, or hosted apply. Do not start D66 from this report.
