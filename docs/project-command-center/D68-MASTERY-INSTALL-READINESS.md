# D68 — Species Mastery install readiness

**Recommendation:** **READY FOR OWNER GO**  
**Status:** DESIGN REVIEW + DISPOSABLE LOCAL REHEARSAL. Not applied. Not activated. This review is not permission to execute the SQL.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `cd53abe4`  
**Work commit:** filled after the work commit  
**Production APP:** `20261008-rc133` (unchanged).  
**WIRE:** not switched. No hosted writes. No catch-row reads. No new hosted catalog query.

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · QA account **none**. PlayTester remains nonstaff and was not used.

## 1. Final schema

Applying `001` → `002` → `003` → `004` on a clean local database produces an inactive cosmetic ledger. `activated_at` stays null and `lifecycle` stays `inactive`. Installing the files does not call `activate_species_mastery_events()`.

`004` drops `catch_insert_authority` and replaces `record_catch_insert_authority()` with a no-op. The events guard and `reconcile_species_mastery_outbox` read `public.catches.server_inserted_at`. After installation, neither function body contains `catch_insert_authority`. A mastery event was recorded while that table was renamed away.

The authority table remains in the database from `003`. Recording does not depend on it. `caught_at` is still the display time.

File identities, first 12 hex characters of SHA-256:

| File | Hash |
|---|---|
| `001_species_mastery_events.sql` | `f343c9bf318d` |
| `002_species_mastery_hardening.sql` | `2d094864e687` |
| `003_species_mastery_lifecycle.sql` | `1f488477de5e` |
| `004_species_mastery_catch_safety.sql` | `0f7f27a0acfb` |

None of these files is under `supabase/migrations`.

## 2. Stamp trigger

`private.stamp_catch_server_inserted_at()` assigns `NEW.server_inserted_at := clock_timestamp()` and returns the row. It has no exception handler, no second insert, and it is not security definer. `search_path` is `pg_catalog`.

On PostgreSQL 17.5 the before-insert triggers fired in name order: `catch_server_inserted_at`, then a local stand-in of `catches_before_write`. That stand-in was created before the new column existed and does `NEW := stamp_catch_row(NEW)`, the same assignment shape as `private.catches_before_write()` in the repository. The returned composite kept the server clock. The hosted function was not executed.

Failure classes measured on that database:

| Class | What happened | Catch |
|---|---|---|
| Shipped stamp, play-shaped insert | Clock set, display `caught_at` left null, local present and XP triggers ran | Kept |
| Shipped stamp, bridge-shaped insert | Client `caught_at` of 1999 kept; client `server_inserted_at` of 2099 overwritten | Kept |
| Shipped stamp, grant-shaped insert | Row committed | Kept |
| Malformed input | `user_id` null failed the same way with the stamp trigger disabled | Absent for that insert |
| Existing trigger | A replaced `after_catch_xp` that raised aborted the insert. Rolling the replacement back restored later inserts | Absent only for the injected trigger |
| Optional mastery | `note_species_mastery_catch` returned false while the outbox insert raised. `settle_if_needed` was not called | Kept |
| Unavailable schema, inside one transaction | Four statements of `004`, through `ADD COLUMN`, then a raised exception. Rollback restored the authority trigger and removed the column | Historical row kept |
| Unavailable schema, statement by statement | The same four statements stayed committed. Re-running `004` stopped with `column "server_inserted_at" of relation "catches" already exists` | No catch was lost |
| Replaced stamp body | A one-statement function that raised aborted a valid insert. Rollback restored the shipped function, and the next insert committed | Absent only for the injected body |

A valid catch was not lost by the shipped stamp, by optional bookkeeping, or by the representative before-write assignment. A valid catch was lost when the stamp function was replaced with a raise. That is the residual of putting any trigger on the insert path. An exception handler was not added, because it would leave a client-supplied timestamp in place. The existing `catches_before_write` trigger can abort an insert for the same structural reason. The install checklist below forbids changing the stamp body.

## 3. Transaction boundaries

PostgreSQL rolled the failed transaction back completely.

- With `001`–`003` already committed, `004` ran through the authority-trigger drop, the no-op function, its comment, and `ADD COLUMN`. The next statement raised. After `ROLLBACK`, the authority trigger was present again, `server_inserted_at` was absent, and the stamp trigger was absent. A second `004`, in one transaction, completed without hand repair. Recording stayed inactive.
- With `001`–`004` in a single transaction, the same mid-`004` failure left no mastery table, no authority trigger, and no clock column. Applying the four files again in one transaction succeeded and a play-shaped insert received a server clock.
- Applied one statement at a time, the drop and the new column survived the later error. The drafted inactive rollback then removed the partial draft without deleting catch rows or changing points. A clean four-file install followed.

The drop of the D66 trigger does not survive a failed transaction. It does survive a crash between autocommit statements. Apply each file as one transaction.

## 4. Security and provenance

`server_inserted_at` is assigned by the server during insert. An explicit `2099` value in the insert list was overwritten. An ordinary `authenticated` update changed zero rows under a select-only catch policy. The table owner’s update of an existing value was rejected as immutable. A row inserted before the column existed stayed null and could not be stamped later. `record_species_mastery_event` rejected it as not server-authoritative.

Post-activation import and grant rows received a server clock and were rejected because the source key was not `play:<round uuid>:<trainer uuid>`. The success-log and test-round checks remain in the guard. Authenticated execution of the private mastery and stamp functions is false. Direct insert into `species_mastery_events` as `authenticated` returned `42501`.

Points stayed 7, rank stayed 2, the rankings board score stayed 7, and the local sum view stayed 7.

This clock proves when the specimen row was inserted while the stamp trigger was enabled. It does not prove that settlement succeeded. Settlement is not hooked. Eligibility still requires a play source key, a successful capture log, a non-test round, and a clock at or after the later activation. Imports and grants get the same insert clock and stay ineligible.

Privileged bypass: a superuser can disable `catch_server_inserted_at` and store a chosen clock on a new insert, and can disable `species_mastery_events_guard`. The table owner bypasses row-level security. Those paths are not available to `authenticated` or `anon`.

## 5. Local results

PostgreSQL **17.5**. Data directories removed. Not REAL DOM, not REAL RPC, not PRODUCTION.

| Suite | Class | Result |
|---|---|---|
| `node tools/d68-mastery-rehearsal.js` | REAL SQL | **14/14** on `127.0.0.1:55443` |
| `node tools/d67-mastery-rehearsal.js` | REAL SQL | **20/20** on `127.0.0.1:55442` |
| `node tools/d66-mastery-rehearsal.js` | REAL SQL | **14/14** on `127.0.0.1:55441` |
| `node tools/d65-mastery-rehearsal.js` | REAL SQL | **19/19** on `127.0.0.1:55440` |
| `node tools/d64-mastery-rehearsal.js` | REAL SQL | **19/19** on `127.0.0.1:55439` |
| `tests/d64` through `tests/d68` static checks | STATIC | passed |

The D68 activation call ran only on the disposable database, after the inactive-install assertion, to test bookkeeping. It is not part of the install.

## 6. Schema-only checklist

Use this only after a separate owner GO. Preparing this list does not authorize execution.

1. Confirm the GO names these four hashes and forbids activation, backfill, settlement changes, WIRE changes, and an APP bump.
2. Apply `001`, then `002`, then `003`, then `004`. Each file is one transaction. Do not split a file into autocommit statements.
3. If a transaction fails, roll it back and stop. Retry the uncommitted file, or the whole chain if nothing was committed. Do not continue past the failure.
4. If a file was split into autocommit statements and stopped, do not re-run it. While recording is still inactive and no mastery event exists, `supabase/unapplied/d67-mastery/rollback-before-activation.sql` removes the draft and does not delete catch rows. Then start again at `001`. Do not use that rollback after activation.
5. After `004` commits, confirm `lifecycle = inactive`, `activated_at` is null, and trigger `catch_insert_authority` is gone. Do not call `activate_species_mastery_events()`.
6. Confirm `species_mastery.points` and Rankings are unchanged. Do not backfill.
7. Do not edit `stamp_catch_server_inserted_at()`. Do not add an exception handler to it.
8. Leave recording inactive until a later activation decision.

## 7. Stop

Do not start D69 from this report. Do not install the draft from this report. Final release smoke stays paused.
