# D72 — Species Familiarity settlement draft

**Verdict:** **D72 SETTLEMENT DRAFT READY — UNAPPLIED**  
**Status:** Branch-only SQL. Nothing was installed or activated.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `d7ee640c`  
**Work commit:** `ff346146`  
**Production APP:** `20261008-rc133` (unchanged).  
**Project:** `dtflmlbjhttoewqgkujf` was not written.  
**WIRE:** not changed. The hosted switch was not read or written in this batch.

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · QA account **none**.

No hosted SQL ran. No production catch, inventory, mastery point, or Rankings row was read. `activate_species_mastery_events()` was not called on the hosted project. No encounter ran.

Do not start D73. Do not install this draft. Final release smoke stays paused.

## 1. Source that was reviewed

Live catalog source, read only, from the D71 session and confirmed again for `settle_if_needed`:

| Function | Result | Source md5 | Notes |
|---|---|---|---|
| `private.settle_if_needed(encounter_rounds)` | `encounter_rounds` | `0c6bf2fb2ca740415fffc567c362192a` | Not security definer. `authenticated` can execute it. One advisory lock. One materialize call. No exception handler. |
| `private.materialize_streamlink_catch(...)` | `jsonb` | `e88c6cbec313a4cc0b81a5df1f5691b3` | Returns `catchId` on success. Unique violation returns `already-settled` and `replay`. |
| `private.persist_streamlink_catch(...)` | `jsonb` | `0d1724fb07b156d6124b2f0f556303a4` | Same `catchId` shape when WIRE is on. WIRE is off, so the stamp path is the live one. |
| `private.note_species_mastery_catch(uuid)` | `boolean` | `313944ac139f33465e57d86c0a1c5678` | Returns false on any internal error. |
| `private.enqueue_species_mastery_event(uuid)` | `uuid` | `7f602a9b3c6f7bf1cd17952f9f697897` | Did not read `lifecycle`. |

Callers of `settle_if_needed` on the hosted catalog: `private.play_snapshot`, `private.sync_latest_round`, `public.bridge_publish`, and `public.admin_advance_phase` are security definer. `private.settle_due_rounds` is not. A security-definer caller runs the invoker settle body as the function owner, who can execute `note`. A direct `authenticated` call cannot execute `note`; the nested handler swallows that permission error and the catch still commits.

The repository copy in `supabase/unapplied/a19-wire/003_settle_integration.sql` matches that live body except for one comment. The draft was taken from the live body, without that comment. The wire file was not edited.

## 2. Proposed SQL

These files are unapplied. They are not under `supabase/migrations`.

| File | Change |
|---|---|
| `supabase/unapplied/d72-mastery/005_enqueue_lifecycle.sql` | `enqueue` and a BEFORE INSERT trigger admit a new outbox row only when `lifecycle` is `active` or `paused`. They lock the activation row `FOR SHARE` first. |
| `supabase/unapplied/d72-mastery/006_settle_familiarity_note.sql` | After `materialize_streamlink_catch` returns `ok`, and only then, parse `catchId` and call `note` when lifecycle is `active` or `paused`. |
| `supabase/unapplied/d72-mastery/007_progress_view_grants.sql` | `REVOKE ALL` on `species_mastery_progress` from `authenticated`, then `GRANT SELECT`. |

The settle draft still has one `v_mat := private.materialize_streamlink_catch(...)` call. It does not change odds, `announce_throws`, `capture_log`, console copy, the advisory lock, the replay check, or the `encounter_rounds` return.

The exception block sits after the existing `wire-materialize-failed` raises. It does not wrap the loop, the odds roll, or the final round update. A materialize failure still aborts settlement. A note failure does not.

Lifecycle rules for a new outbox row:

| State | New work | Already queued work |
|---|---|---|
| `inactive` | Reject. The catch still commits. | None yet. |
| `active` | Note and reconcile may queue. | Deliver records events. |
| `paused` | Note and reconcile may still queue. This is the current recording-versus-delivery split. | `deliver` returns 0 until resume. |
| `draining` | Reject. | Deliver finishes rows queued at or before `drain_started_at`. |
| `closed` | Reject. A second activation raises `55000`. | Deliver returns 0. Events stay. |

`activated_at` is not updated by enqueue, the trigger, pause, drain, or close. The local drain test compared the cutoff before and after and it was unchanged.

The trigger is BEFORE INSERT only. Delivery updates an existing row, so a queued catch is not thrown away when the lifecycle moves.

## 3. Progress-view privileges

`007` does not alter `security_invoker` or the events RLS policy. It does not mention points or Rankings.

On the local cluster, `authenticated` was first given every privilege, which is the hosted leftover. After `007`:

- `has_table_privilege` SELECT is true.
- INSERT, UPDATE, DELETE, and TRUNCATE are false.
- An `authenticated` INSERT into the view failed with SQLSTATE `55000`. That is PostgreSQL refusing a non-updatable aggregate view. The privilege bit is already false.
- `anon` and `authenticated` cannot execute `note` or `enqueue` (`42501`).
- Trainer B's progress read returned 0 rows. Trainer A's read returned that trainer's tier.

## 4. Tests

`capture_chance`, `announce_throws`, reference lookups, and `persist_streamlink_catch` were local stubs. `persist` raises if called. WIRE's stub stays false, so the real `materialize_streamlink_catch` stamp path inserted the specimen. `settle_if_needed` was the unapplied draft of the live body. This is not production settlement and not a hosted RPC.

| Command | Class | Result |
|---|---|---|
| `node tools/d72-mastery-settlement-rehearsal.js` | REAL SQL | 18/18 on `127.0.0.1:55445`, PostgreSQL 17.5 |
| `node tools/d64-mastery-rehearsal.js` | REAL SQL | 19/19 on `127.0.0.1:55439`, PostgreSQL 17.5 |
| `node tools/d65-mastery-rehearsal.js` | REAL SQL | 19/19 on `127.0.0.1:55440`, PostgreSQL 17.5 |
| `node tools/d66-mastery-rehearsal.js` | REAL SQL | 14/14 on `127.0.0.1:55441`, PostgreSQL 17.5 |
| `node tools/d67-mastery-rehearsal.js` | REAL SQL | 20/20 on `127.0.0.1:55442`, PostgreSQL 17.5 |
| `node tools/d68-mastery-rehearsal.js` | REAL SQL | 14/14 on `127.0.0.1:55443`, PostgreSQL 17.5 |
| `node tools/d71-mastery-integration-rehearsal.js` | REAL SQL | 7/7 on `127.0.0.1:55444`, PostgreSQL 17.5 |

The D72 checks covered: an inactive catch with no outbox row, a pre-activation catch left ineligible, an escape with no catch, one active catch id queued, a repeated settle with one catch, concurrent settle with one catch, a malformed `catchId` and a missing `catchId` that still commit, a raising `note` whose catch is later reconciled without changing `server_inserted_at`, enqueue waiting on the activation lock, grant/import/reset/test-round rejection, pause-then-resume delivery, drain rejecting new work, close rejecting new work, no second activation, cross-trainer progress, and unchanged points `7`, rank `2`, Rankings score `7`, and synthetic item quantity `4`.

Hosted installation and a live encounter were **not run**.

## 5. Failure analysis

The nested block isolates optional mastery work. A replaced `note` that raised left the catch committed and the specimen clock unchanged. Reconcile queued that same id afterward.

A missing or non-uuid `catchId` never reaches `note`. Settlement still commits the catch that materialize inserted.

The `wire-materialize-failed` raises stay outside the block. They still abort settlement when materialize fails and no catch exists. The handler cannot hide those errors.

The advisory lock and the `NOT EXISTS` catch guard are unchanged. Two concurrent settle calls left one catch. A second call on the same round did not insert another catch or another outbox row. The note does not call materialize.

The extra statements run only after a successful materialize, and only for a well-formed id. They take a `FOR SHARE` lock on the single activation row. That can wait behind a lifecycle change. It does not lock a different trainer's catch, and it does not change the round lock.

`enqueue` now takes that same lock before insert, so a drain that commits first rejects the new row, and a note that locks first finishes while the state is still open. The local test held `FOR UPDATE` and the enqueue call waited until the lock was released.

## 6. Known limitations

- Production `capture_chance` and `announce_throws` were not executed. Bag spending and odds were not remeasured.
- The local cluster is PostgreSQL 17.5. The hosted database is 17.6.
- `settle_due_rounds` is not security definer. If `authenticated` calls it directly, `note` raises `42501`, the handler swallows it, and reconcile has to queue the catch later.
- The progress-view INSERT fails with `55000` because the view is an aggregate, even before the missing INSERT privilege matters.
- The stamp trigger can still abort an insert if it raises. This draft does not change that function.
- Historical catches stay ineligible because their server clock is before activation. This draft does not backfill them.

## 7. Remaining blockers

- The three files are not installed.
- Recording is still inactive on the hosted database.
- No schedule calls reconcile or deliver.
- Frontend and APP do not show Species Familiarity.
- Final release smoke stays paused.

## 8. Proposed D73 scope

D73 should be a separate owner decision about installing `005`, `006`, and `007` only. It should not call `activate_species_mastery_events()`, schedule delivery, change WIRE, or run an encounter.

Do not start D73 from this report.

## 9. Verdict

**D72 SETTLEMENT DRAFT READY — UNAPPLIED**
