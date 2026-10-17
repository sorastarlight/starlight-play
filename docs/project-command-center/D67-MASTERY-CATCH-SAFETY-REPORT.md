# D67 — Species Mastery catch preservation and insert authority safety

**Status:** BRANCH DRAFT + DISPOSABLE LOCAL REHEARSAL. Not applied. Not activated.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `97943055`  
**Work commit:** filled after the work commit  
**Production APP:** `20261008-rc133` (unchanged).  
**WIRE:** not switched. No hosted writes. No catch-row reads. No new hosted catalog query.

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · QA account **none**. PlayTester remains nonstaff and was not used.

## 1. Root cause

D66’s `AFTER INSERT` trigger `catch_insert_authority` on `public.catches` calls `private.record_catch_insert_authority()`, which inserts a second row into `private.catch_insert_authority`. That insert is part of the catch statement. The authority guard then requires `c.xmin::text::bigint IS NOT DISTINCT FROM txid_current()`.

Anything that raises inside that second insert aborts the catch. On disposable PostgreSQL 17.5 this was observed twice before `004` was applied:

- A `BEFORE INSERT` trigger on the authority table raised `injected authority failure`. The catch id was absent afterward.
- A catch insert inside a PL/pgSQL block that has an `EXCEPTION` handler aborted with `insertion authority must be recorded with the specimen`. The catch id was absent afterward. The same measurement showed `txid_current() = 986` and `xmin = 987`.

D66’s own rehearsal passed the transaction-id check only because that cluster was new and the insert was not inside a subtransaction. That pass is not production proof.

D64, D65, and D66 SQL files were not edited. Their rehearsals were re-run unchanged.

## 2. Solution and trade-off

`supabase/unapplied/d67-mastery/004_species_mastery_catch_safety.sql` drops `catch_insert_authority` first and replaces `private.record_catch_insert_authority()` with a no-op. A later reattachment of that old trigger name cannot insert a second row.

The server clock moves onto the specimen:

- `public.catches.server_inserted_at` is nullable and has no default. Existing rows stay null. This does not rewrite `caught_at`.
- `BEFORE INSERT` trigger `catch_server_inserted_at` does one assignment: `NEW.server_inserted_at := clock_timestamp()`. It has no exception handler and no second insert.
- `BEFORE UPDATE OF server_inserted_at` rejects a changed value. `SET server_inserted_at = server_inserted_at` still passes. A null historical row cannot be stamped later.

The mastery guard and `reconcile_species_mastery_outbox` read `specimen.server_inserted_at`. They do not read `catch_insert_authority` and they do not fall back to `caught_at`. Null, infinity, or a value more than two minutes ahead of the server clock is rejected as not server-authoritative. A clock before activation is rejected as predating activation. The two-minute bound is a sanity check. The association is the column on the specimen, written by the trigger and then frozen.

Outbox notes, delivery, and reconciliation stay off the catch statement. `note_species_mastery_catch` still returns false on failure. Settlement is not called.

All three requested properties hold on the local rehearsal:

1. The clock is `clock_timestamp()` inside the insert trigger, not a client value. An explicit `2099` timestamp was overwritten.
2. The clock is a column of that specimen and cannot be updated onto an older row.
3. After `004`, a failing authority insert, a missing authority table, and a role without authority-table privileges all left the catch committed.

The residual trade-off: the stamp trigger is still on the insert path. A defect in that single assignment can still fail an insert. There is no second statement that can fail independently. Swallowing an exception was rejected, because a handler that returned `NEW` without assigning the clock would keep a client-supplied timestamp.

Deriving the clock only from settlement was not implemented. Settlement must not be modified in this batch. Imports, grants, and resets receive the same insert clock if this draft is later installed, and the existing play-source, success-log, and test-round checks still exclude them. That exclusion was tested.

If a review decides that any `BEFORE INSERT` trigger is still an unacceptable catch-loss risk, stop there. Do not weaken the stamp into an exception handler.

Apply the file in one transaction. The trigger drop is first, so a partial run removes the catch-loss path before the stamp exists. Mastery then fails closed because new rows have a null clock.

## 3. Revised unapplied SQL

- `supabase/unapplied/d67-mastery/004_species_mastery_catch_safety.sql`
- `supabase/unapplied/d67-mastery/rollback-before-activation.sql`
- `supabase/unapplied/d67-mastery/DO-NOT-APPLY.md`

Unchanged: `001_species_mastery_events.sql`, `002_species_mastery_hardening.sql`, `003_species_mastery_lifecycle.sql`, and the D64, D65, and D66 rehearsals.

The inactive rollback drops the stamp trigger and `server_inserted_at`. It does not delete catch rows and does not update `species_mastery`. It refuses once activation is set or any event exists. After activation, pause, drain, and close remain the way to stop delivery without dropping history.

## 4. Local results

PostgreSQL **17.5**. Data directories removed. Class is REAL SQL on `127.0.0.1:55442`. Simulated integration. `settle_if_needed` was not called. Not REAL DOM, not REAL RPC, not PRODUCTION.

| Suite | Class | Result |
|---|---|---|
| `node tools/d67-mastery-rehearsal.js` | REAL SQL | **20/20** on `127.0.0.1:55442` |
| `node tools/d66-mastery-rehearsal.js` | REAL SQL | **14/14** on `127.0.0.1:55441` |
| `node tools/d65-mastery-rehearsal.js` | REAL SQL | **19/19** on `127.0.0.1:55440` |
| `node tools/d64-mastery-rehearsal.js` | REAL SQL | **19/19** on `127.0.0.1:55439` |
| `node tests/d67-mastery-static-tests.js` | STATIC | passed |

D67 checks, in order:

| Check | Result |
|---|---|
| Inactive rollback drops the clock column and keeps catch rows and points | PASS. Points stayed 7. |
| Transaction-id comparison | PASS. Plain insert `same=true`, `txid=985`, `xmin=985`. Exception block `same=false`, `txid=986`, `xmin=987`. |
| D66 authority failure rolls the catch back | PASS. Pre-fix defect. Row absent. |
| Same authority failure after `004` | PASS. Catch present. Display year stayed 2001. No new authority row. |
| Authority table renamed away, and a role without that privilege | PASS. Both catches present. Client clock `2099` overwritten. |
| Duplicate authority registration | PASS. Specimen still present. |
| Null and unknown specimen identifiers | PASS. No catch removed. |
| Two concurrent catch inserts | PASS. Both committed with a server clock. |
| Late update of a historical null clock | PASS. Rejected. `caught_at` stayed in 2001. |
| Explicit `ROLLBACK` of an uncommitted catch | PASS. Only that insert disappeared. |
| Post-activation play catch | PASS. Recorded. The pre-`004` row was rejected as not server-authoritative. The pre-activation row was rejected as predating activation. Both rows remained. |
| `note_species_mastery_catch` while the outbox insert raises | PASS. Returned false. Commit kept the catch. |
| Reconcile after grants, imports, resets, a test round, and a failed log | PASS. Queued only the one eligible play catch. |
| Transient event-insert failure, then a second delivery | PASS. The event was recorded and the catch remained. |
| Replay and two overlapping deliveries | PASS. One event. |
| Pause, resume, drain, and close | PASS. Pending work survived pause. A note during drain returned false and kept the catch. Close left the unprocessed row pending. |
| Evolution-style update, release, catch delete, profile delete | PASS. `caught_at` and the server clock stayed. Deleting another catch left the event. Deleting trainer C removed only C’s events. |
| Points and specimen contents | PASS. Points 7, rank 2. Shiny, dex 1, display year 2001. |
| Rollback after activation | PASS. Refused. The catch remained. |

No fixed-path test lost a valid catch because mastery bookkeeping failed. The two losses above are the D66 behavior, measured before `004`.

## 5. Transaction identity

`xmin` is a 32-bit transaction id. `txid_current()` is a bigint whose high 32 bits are the epoch. Casting `xmin` through text keeps only the 32-bit value.

On this new cluster the epoch is 0, so a plain insert compared equal (`985 = 985`). That is the D66 result, and it does not survive the first epoch. After xid wraparound, `txid_current()` is `epoch * 2^32 + xid` while `xmin::text::bigint` is only `xid`. A legitimate same-statement insert would fail the D66 guard, and the catch would roll back. This rehearsal did not execute 2^32 transactions; the width difference is the documented PostgreSQL layout, confirmed by the equal values only while the epoch is 0.

A subtransaction breaks the check before any wrap. A PL/pgSQL `EXCEPTION` block runs its body in a subtransaction. The measured values were top-level `986` and tuple `987`. The authority guard aborted that catch.

A retry is a new transaction and a new `xmin`. It does not repair a comparison that failed inside the attempt. The explicit `ROLLBACK` test removed only the uncommitted insert.

A later privileged insert into the authority table cannot satisfy `xmin::text::bigint = txid_current()` for a row inserted in an earlier transaction, except while the epoch is still 0 and the 32-bit counter has returned to that exact value. Wraparound is what makes the 32-bit values collide, and by then the epoch is no longer 0, so the bigint comparison still fails. The practical bug is the opposite: legitimate inserts fail. A superuser can still disable triggers and write rows directly. That residual does not depend on the comparison.

A timestamp window is not used as proof that an authority row belongs to a catch. D67 stops consulting that table. The specimen column is the association. A superuser who disables `catch_server_inserted_at` can still store a chosen `server_inserted_at` on a new insert. They cannot update a historical null into eligibility, because the freeze trigger rejects the change.

## 6. Security and operations

Ordinary Play inserts omit `caught_at` and would omit `server_inserted_at`. The stamp fills only the new column. `persist_streamlink_catch`, `record_stream_catch`, and settlement were not changed. This was not installed, so production Play catches are unaffected today.

Bridge imports can still store a client `caughtAt` in the display column. The D66 catalog found that and was not repeated. If `004` were installed later, those inserts would also receive `server_inserted_at`, and the play-source check would still keep them out of the outbox. The local rehearsal queued none of the grant, import, or reset rows.

Administrative grants, test rounds, and failed logs were excluded the same way. Evolution-style `caught_at = caught_at` and a `transferred_at` release update succeeded without moving the server clock. Deleting a catch did not delete an unrelated mastery event. Deleting a profile cascaded that trainer’s events through the existing trainer foreign key and left the other trainer’s events.

`ADD COLUMN` of a nullable column with no default does not rewrite existing rows. The inactive rollback drops that column only for an empty inactive draft. It does not delete Pokémon. After activation the rollback refuses.

The new functions are revoked from `PUBLIC`. The rehearsal inserted as `catch_writer`, which can insert into `public.catches` and cannot insert into the authority table. The catch committed. No hosted user rows were read. No odds, inventory, currency, points, or Rankings objects were changed. Points stayed 7 and rank stayed 2.

## 7. Remaining blockers

- Nothing is applied or activated on hosted Supabase.
- The stamp trigger is still on the insert path. Install needs a separate decision.
- Eligible provenance is the insert clock plus the existing play-source and success-log checks. It is not a settlement receipt.
- `bridge_import_catches` can still store a client display time. This draft does not revoke it.
- A superuser can disable the stamp trigger on a new insert.
- There is no historical backfill. Rows from before `004` stay null and fail closed.
- Reconciliation still reads catch rows. It ran only on synthetic data.

## 8. Recommended D68

D68, if authorized later, should decide whether the `BEFORE INSERT` stamp is acceptable to install. It should not hook settlement, backfill history, activate recording, or revoke the bridge import. Do not start D68 from this report.

Final release smoke stays paused.
