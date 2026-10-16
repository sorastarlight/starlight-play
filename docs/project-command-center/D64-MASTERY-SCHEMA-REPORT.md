# D64 — Species Mastery event ledger

**Status:** BRANCH DRAFT + DISPOSABLE LOCAL REHEARSAL. Not applied to hosted Supabase. Not connected to encounters.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `f9fee21e` (D63 work `fb211e9b`).  
**Production APP:** `20261008-rc133` (unchanged).  
**WIRE:** not switched. D63 catalog read was `enabled=false`. This batch did not query the switch.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none** · mutations **none** · cleanup **not applicable** (no account was changed).

## 1. D63 reconciliation

The repository still matches the D63 audit.

- `public.species_mastery` is still `(user_id, dex)` with `points`, `rank`, and `updated_at`. Rankings still sum those points. This draft does not write them.
- `public.mastery_ledger` remains the points ledger. `private.grant_mastery` is not called.
- `public.catches.id` is a uuid primary key. `source_key` is unique when present. `(round_id, user_id)` is unique when `round_id` is present. `obtained_method` defaults to `CAPTURE` and has no check constraint.
- `private.persist_streamlink_catch` still does not set `obtained_method`. A `grant:%` or `event:%` insert can therefore look like `CAPTURE`.
- `public.capture_log` has one row per `(round_id, user_id)`. An escape can have `success = false` and no catch row.
- `private.round_is_test` is true when `rules.rewardMode = 'test'` and `rules.testRewards` is not `'true'`.
- Normal release sets `catches.transferred_at` and keeps the row. Oak QA reset can `DELETE` catch rows. Profile delete cascades catches.
- D61 and D62 stay a proposal and an offline prototype. No page loads `species-mastery-model.js`.

No production catch rows were read.

## 2. Schema

Draft: `supabase/unapplied/d64-mastery/001_species_mastery_events.sql`  
Rollback: `supabase/unapplied/d64-mastery/rollback.sql`  
Notice: `supabase/unapplied/d64-mastery/DO-NOT-APPLY.md`

`public.species_mastery_events`

| Column | Role |
|---|---|
| `catch_id uuid` | Primary key. One specimen, one event, one trainer. |
| `trainer_id uuid` | Owner. Foreign key to `profiles(id)` `ON DELETE CASCADE`. |
| `dex integer` | National Pokédex number, 1–1025, copied from the specimen. |
| `round_id uuid` | Encounter round, copied from the specimen. |
| `source_key text` | Copied from the specimen. Unique. |
| `created_at timestamptz` | Insert time. |

`(trainer_id, catch_id)` is not sufficient. That key would still allow the same `catch_id` with a second trainer. The primary key is `catch_id` alone. A second unique key is `(round_id, trainer_id)`.

`catch_id` is not a foreign key. `ON DELETE RESTRICT` would block Oak QA deletes. `ON DELETE CASCADE` would erase a mastery event when a catch row is hard-deleted. Release does not need a foreign key: it only sets `transferred_at`. The insert guard reads the specimen and rejects a mismatch. After that, the event remains if the catch row is deleted.

There is no trigger on `public.catches`. Nothing in settlement calls this function.

### Eligibility guard

`private.species_mastery_events_guard` runs `BEFORE INSERT OR UPDATE` on the event table only. It rejects the row. It does not grant points.

An insert is accepted only when all of these are true:

- The catch row exists.
- `trainer_id`, `dex`, `round_id`, and `source_key` equal the specimen.
- `source_key` is `play:<round uuid>:<trainer uuid>` for that same round and trainer.
- `private.round_is_test(round_id)` is false.
- `capture_log` has `success IS TRUE` for that round and trainer, and a null or matching dex.

`play:%` by itself is rejected. `obtained_method = 'CAPTURE'` is ignored, because grants can carry that default. There is no `provenanceVerified` argument.

Rejected: escapes (`success` false), missing logs, missing specimens, `admin:%`, `grant:%`, `event:%`, `import:%`, `reset:%`, null keys, malformed `play:` keys, and test rounds.

`private.record_species_mastery_event(uuid)` copies those fields from the catch. A replay of the same `catch_id` returns the existing id and does not add a row. A different catch that collides on the round raises. Execute is revoked from `PUBLIC`, `anon`, and `authenticated`.

### Reads

`public.species_mastery_progress` is `security_invoker = true`. It counts events per `(trainer_id, dex)`:

| Captures | Tier |
|---:|---|
| 1 | Familiar |
| 3 | Acquainted |
| 6 | Experienced |
| 12 | Specialist |
| 20 | Expert |

The view does not read `species_mastery.points`. It is not a Rankings source. RLS is enabled and forced. The only policy is `SELECT` where `trainer_id = auth.uid()`. There is no insert, update, or delete policy. `anon` has no select grant.

## 3. What the schema cannot prove

- A well-formed `play:<round>:<trainer>` key plus a successful log is the strongest evidence this schema has. It does not prove who typed the original throw. The function must be called only by server code.
- A reset replacement that reused that exact key shape and a successful log would pass. Catches have no reset flag.
- Prospective-only is an operational rule. The function has no cutoff date, so a later caller could record an old eligible catch. This batch does not backfill.
- `after_catch_xp` can still grant points for a `grant:%` or `event:%` row that has a `round_id`. This draft does not change that function.
- Historical `source_key` values were not inspected. No production catch query was run.
- Shiny and regional form stay one national-dex track because the count is `dex`. The event does not store form or variant. The specimen row is not modified.
- An event whose catch row was hard-deleted cannot be joined back to that specimen. That is the retention choice.
- `postgres` and any `BYPASSRLS` role bypass RLS. The immutability trigger still rejects updates.

## 4. Local rehearsal

Environment: embedded Postgres from `tools/.cache/d54-pg-harness`, loopback `127.0.0.1:55439`, database `d64_mastery`, data directory removed after the run. PostgreSQL **17.5**. Not hosted Supabase. Synthetic trainers only.

`node tools/d64-mastery-rehearsal.js`: **19/19 REAL SQL**.  
`node tests/d64-mastery-static-tests.js`: **STATIC PASS**.

| Check | Result |
|---|---|
| 1 Valid first capture | Familiar, count 1 |
| 2 Three captures of one species | Acquainted |
| 3 Replay of the same catch | Still one event |
| 4 Conflicting trainer/catch | SQLSTATE 23514, no row |
| 5 Two trainers, same species | Counts stay separate |
| 6 Shiny and form | Same dex; specimen columns unchanged |
| 7 Evolution dex | Separate Familiar row |
| 8 Bad provenance | 10 rejected, including grant rows marked CAPTURE; dex 4 absent |
| 9 Client insert and function call | SQLSTATE 42501 |
| 10 Client update/delete | SQLSTATE 42501; owner update rejected as immutable |
| 11 Read isolation | Trainer B sees none of A; anon is 42501 |
| 12 Thresholds | Familiar, Acquainted, Experienced, Specialist, Expert |
| 13 Concurrent duplicate | One row |
| 14 Deletes | Release and catch delete keep the event; profile delete cascades only that trainer |
| 15 Points mastery | points 7, rank 2, ledger row unchanged |
| Interrupted transaction | Rolled-back event is absent; a rejected insert rolls points back to 7 |
| 16 Rollback | New objects dropped; catch count and points unchanged |

Class: **REAL SQL** on disposable loopback Postgres. Not REAL DOM, not REAL RPC, not PRODUCTION.

## 5. Migration safety

The draft creates one table, one index, two functions, one trigger, one policy, and one view. It does not alter `catches`, `species_mastery`, `mastery_ledger`, settlement, odds, inventories, or Rankings.

Dependencies already on the hosted database, and created only inside the local fixture: `public.profiles`, `public.catches`, `public.encounter_rounds`, `public.capture_log`, `private.round_is_test(uuid)`, `auth.uid()`, and the `anon` and `authenticated` roles. The draft does not create those roles.

Privileges: table owner is the migration role. `authenticated` receives `SELECT` on the table and the view. Insert, update, and delete are revoked from `anon` and `authenticated`. The recorder is not executable by those roles.

Indexes: primary key `catch_id`, unique `(round_id, trainer_id)`, unique `source_key`, and `(trainer_id, dex)` for the count. Volume is one row per future eligible catch, not a backfill.

Backup before any future hosted apply would be a schema dump of the new objects plus confirmation that `species_mastery` and `catches` were not rewritten. Rollback drops the view, the recorder, the trigger, the guard, and the table. It does not update existing rows.

A future integration would call `private.record_species_mastery_event` in the same transaction as the successful play catch insert, and only on that path. A rejected event aborts that transaction, so a partial event is not committed. Replay is safe if the statement is repeated. This batch does not add that call.

## 6. Review

The draft is ready for independent review. It is not ready to apply.

Do not start D65 from this report. The next authorized batch would be a review of this file, then a separate decision on a settlement call. That later batch is not approved here. No UI, no backfill, no points change, no Rankings change, and no WIRE change.
