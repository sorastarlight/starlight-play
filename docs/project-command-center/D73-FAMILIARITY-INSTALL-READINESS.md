# D73 — Species Familiarity install readiness

**Verdict:** **D73 GO PACKET READY — NOT AUTHORIZED TO INSTALL**  
**Status:** Read-only hosted preflight and local rehearsal. The drafts are not installed. Recording stays inactive.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `df803a82`  
**Work commit:** `99211cbd`  
**Production APP:** `20261008-rc133` (unchanged).  
**Project:** `dtflmlbjhttoewqgkujf`  
**WIRE:** `enabled = false` on the read-only catalog check. This batch did not change it.

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · QA account **none**.

No hosted SQL was written. `settle_if_needed` was not executed on the hosted database. No production catch, inventory, mastery point, or Rankings row was read. `activate_species_mastery_events()` was not called on the hosted project.

Do not start D74. This packet is not the owner GO. Final release smoke stays paused.

## 1. Repository

Working tree was clean at `df803a82`. The three D72 files are unchanged in git since that pointer. None of them is under `supabase/migrations`.

The hashes below are the git blobs. Those blobs use LF line endings. A Windows checkout may display CRLF; that display difference is not a content change in git.

| Order | File | SHA-256 |
|---|---|---|
| 1 | `supabase/unapplied/d72-mastery/005_enqueue_lifecycle.sql` | `2c6c245a5f825a6612283e0a912d6600cb32f2635d37ee02feaecfa6d606d63d` |
| 2 | `supabase/unapplied/d72-mastery/006_settle_familiarity_note.sql` | `400cc429162808422730cbc343449caabb81b6f9e5243110bf3a48f7384aebc1` |
| 3 | `supabase/unapplied/d72-mastery/007_progress_view_grants.sql` | `8603912808d1f23e2581ecef00976fc1c0e449ab109b5fc965b0756d93b484bf` |

`node tools/d73-settle-diff.js` removed the intended note and the two new variables from `006`. The remaining function body md5 is `0c6bf2fb2ca740415fffc567c362192a`, the same as the live `prosrc` read in this batch.

## 2. Hosted catalog

Class: **READ-ONLY LIVE CATALOG**. PostgreSQL 17.6. `settle_if_needed` was not called.

| Check | Result |
|---|---|
| `private.settle_if_needed(r encounter_rounds)` | returns `encounter_rounds` |
| Source md5 | `0c6bf2fb2ca740415fffc567c362192a` |
| Owner | `postgres` |
| Security | invoker (`prosecdef` false) |
| Volatility | volatile |
| Parallel | unsafe |
| Config | none |
| Execute | `public`, `anon`, and `authenticated` can execute, unchanged |
| Advisory lock | present once |
| `materialize_streamlink_catch` mentions | 1 |
| Mentions `note_species_mastery_catch` | no |
| Lifecycle | `inactive`. `activated_at` is null |
| Familiarity events | 0 |
| WIRE | `enabled = false` |
| `species_mastery_progress` grants for `authenticated` | SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER. `007` has not been applied |

`CREATE OR REPLACE FUNCTION` keeps the existing owner and privileges. The local replace kept invoker, volatile, the `encounter_rounds` return, and `authenticated` execute.

## 3. Semantic settlement diff

The only changes inside the function body are:

1. Two local variables, `v_catch_id uuid` and `v_life text`.
2. After the existing materialize result has been checked, and only when `ok` is true, a nested block parses `catchId` and calls `note_species_mastery_catch` when lifecycle is `active` or `paused`.

The function comment outside the body also changes to the D72 sentence. That comment is not part of `prosrc`.

These are unchanged, because the stripped body matches the live source byte for byte:

- Return type and the parameter `r encounter_rounds`.
- Invoker, volatile, and the lack of a function config.
- `pg_try_advisory_xact_lock`.
- Phase, deadline, and early-return logic.
- `announce_throws`.
- `capture_chance` and the roll.
- The `capture_log` insert.
- The one `v_mat := private.materialize_streamlink_catch(...)` call.
- The `already-settled` replay branch and both `wire-materialize-failed` raises.
- Caught and escaped console messages.
- The final `encounter_rounds` update and `RETURN r`.

The `wire-materialize-failed` raises stay before `EXCEPTION WHEN OTHERS`. The handler cannot hide them.

## 4. Catch preservation

Class: **REAL SQL** on disposable PostgreSQL 17.5, with stubbed `capture_chance` and `announce_throws`. Not production odds or spending.

| Evidence | Result |
|---|---|
| D72 rehearsal: a note that raises | Catch commits. Reconcile queues the same id. The specimen clock is unchanged. 18/18 |
| D73: `note_species_mastery_catch` dropped | Catch commits. No outbox row |
| D73: materialize returns `ok: false` and inserts nothing | `wire-materialize-failed` is raised. No catch row |
| D72: escape outcome | No catch and no outbox row |
| D72: second settle and two concurrent settles | One catch each |
| D73: session holds the activation row, then commits `draining` | The waiting settle finishes, the catch exists, and no new outbox row is written |

Lock order: settle and enqueue lock the catch before the activation row. Lifecycle changes lock only the activation row. Reconcile locks the activation row and then reads catches without `FOR UPDATE`. The local wait completed after the activation lock was released. It did not raise `40P01`. No lock-order cycle showed up.

`005` adds a BEFORE INSERT trigger on `private.species_mastery_outbox` only. A direct catch insert succeeded while that trigger was installed.

## 5. Lifecycle and privileges

From the D72 rehearsal, still unapplied on the host:

- Inactive rejects a new outbox row and keeps the catch.
- Active queues one eligible Play catch.
- Paused queues and does not deliver. Resume delivers.
- Draining rejects a new note and does not move `activated_at`.
- Closed rejects new work, does not deliver it, and cannot be activated again.
- A repeated settle does not add a second event row.
- Trainer B cannot read Trainer A's progress. Trainer A can.
- `authenticated` cannot execute `note` or `enqueue`.
- After `007`, SELECT remains and INSERT, UPDATE, DELETE, and TRUNCATE privilege bits are false.

## 6. Installation and recovery

Each file already has its own `BEGIN` and `COMMIT`. Do not wrap a file in a second transaction. Run them in this order:

1. `005_enqueue_lifecycle.sql`
2. `006_settle_familiarity_note.sql`
3. `007_progress_view_grants.sql`

Local rehearsal, class **REAL SQL**:

- A raise after `006` had created the function, and before its `COMMIT`, restored the previous `settle_if_needed` body.
- `005` was then committed. A later `006` rollback left that previous settle body in place and left the outbox trigger from `005`.
- A catch insert still succeeded in that partial state.

Recovery while recording is inactive, if a later install stops midway. Do not run this on the host unless a future GO says so. Do not delete catches, events, points, or Rankings.

| Stop point | What remains | What to do |
|---|---|---|
| `005` rolls back | No D72 object | Stop. Retry from `005` only under a new GO |
| `005` committed, `006` rolls back | Outbox insert gate only. Settle is unchanged | Leave `005`. Do not activate. Retry `006` under the same GO or stop |
| `006` committed, `007` rolls back | Settle has the note. Lifecycle is still inactive, so the note is not called | Leave the note. Do not activate. Retry `007` |
| All three commit | Schema only. `activated_at` must still be null | Stop. Do not call activate, reconcile, or deliver |

`005` does not attach a trigger to `public.catches`. Removing it later would be a new GO: drop `species_mastery_outbox_admit` and restore the previous `enqueue` body. This packet does not include that script and it was not run on the host.

## 7. Tests

| Command | Class | Result |
|---|---|---|
| Hosted catalog for settle attributes, lifecycle, WIRE, and view grants | READ-ONLY LIVE CATALOG | Matches section 2. Function was not executed |
| `node tools/d73-settle-diff.js` | STATIC | Stripped body md5 matches the live source |
| `node tools/d73-readiness-rehearsal.js` | REAL SQL | 8/8 on `127.0.0.1:55446`, PostgreSQL 17.5. Odds and spends stubbed |
| `node tools/d72-mastery-settlement-rehearsal.js` | REAL SQL / SIMULATED integration | 18/18 on `127.0.0.1:55445`. Odds and spends stubbed |
| `node tools/d64-mastery-rehearsal.js` | REAL SQL | 19/19 on `127.0.0.1:55439`, PostgreSQL 17.5 |
| `node tools/d65-mastery-rehearsal.js` | REAL SQL | 19/19 on `127.0.0.1:55440`, PostgreSQL 17.5 |
| `node tools/d66-mastery-rehearsal.js` | REAL SQL | 14/14 on `127.0.0.1:55441`, PostgreSQL 17.5 |
| `node tools/d67-mastery-rehearsal.js` | REAL SQL | 20/20 on `127.0.0.1:55442`, PostgreSQL 17.5 |
| `node tools/d68-mastery-rehearsal.js` | REAL SQL | 14/14 on `127.0.0.1:55443`, PostgreSQL 17.5 |
| `node tools/d71-mastery-integration-rehearsal.js` | REAL SQL | 7/7 on `127.0.0.1:55444`, PostgreSQL 17.5 |
| Hosted settlement, activation, or a live encounter | REAL RPC / browser | **not run** |

Production catch odds and Poké Ball spending were not tested. The stubs forced a catch or an escape so the settle control flow could be checked.

## 8. Residual risks

- The stamp trigger can still abort an insert if it raises. These drafts do not change it.
- `settle_due_rounds` is not security definer. A direct `authenticated` call gets `42501` from `note`, the handler swallows it, and the catch still commits. Reconcile would have to queue it later. The normal Play callers are security definer and run as the owner.
- `007` does not revoke `service_role` or other non-`authenticated` grants.
- The progress view remains a non-updatable aggregate. INSERT fails with `55000` even before the missing privilege matters.
- Local PostgreSQL is 17.5. The host is 17.6.
- No production catch has proved the stamp. That is outside this GO.

## 9. Proposed owner GO

This text is a proposal. It is not authorization.

```
OWNER GO — install Species Familiarity drafts, inactive only.

Install these three files on dtflmlbjhttoewqgkujf, in order, each in its own existing BEGIN/COMMIT. Stop on the first error. Do not activate.

1. supabase/unapplied/d72-mastery/005_enqueue_lifecycle.sql
   SHA-256 2c6c245a5f825a6612283e0a912d6600cb32f2635d37ee02feaecfa6d606d63d
2. supabase/unapplied/d72-mastery/006_settle_familiarity_note.sql
   SHA-256 400cc429162808422730cbc343449caabb81b6f9e5243110bf3a48f7384aebc1
3. supabase/unapplied/d72-mastery/007_progress_view_grants.sql
   SHA-256 8603912808d1f23e2581ecef00976fc1c0e449ab109b5fc965b0756d93b484bf

If a hash differs, stop. Do not edit the file.

After install, confirm lifecycle is still inactive, activated_at is null, and familiarity events are still zero. Do not call activate_species_mastery_events, reconcile_species_mastery_outbox, or deliver_species_mastery_outbox.

This GO does not authorize activation, scheduled delivery, backfill, a live or QA encounter, a WIRE change, an APP change, a frontend deploy, or a merge.
```

## 10. Prohibited now

- Installing `005`, `006`, or `007`.
- Calling `activate_species_mastery_events()`.
- Scheduling reconcile or deliver.
- Backfill, live encounters, and QA encounters.
- WIRE changes, APP changes, frontend deploy, and merge.
- Reading or changing production catches, inventories, points, or Rankings.
- Starting D74.

## 11. Verdict

**D73 GO PACKET READY — NOT AUTHORIZED TO INSTALL**
