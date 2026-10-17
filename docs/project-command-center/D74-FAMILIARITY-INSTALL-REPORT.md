# D74 — Species Familiarity integration installation

**Verdict:** **D74 INTEGRATION INSTALLED — SPECIES FAMILIARITY INACTIVE**  
**Status:** The three approved files are installed. Recording is inactive. No encounter ran.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `35bd889a`  
**Work commit:** filled by the pointer commit after this report lands.  
**Production APP:** `20261008-rc133` (unchanged).  
**Project:** `dtflmlbjhttoewqgkujf`  
**PostgreSQL:** 17.6  
**WIRE:** remains disabled (`enabled = false`).

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · QA account **none**.

`activate_species_mastery_events()` was not called. `reconcile_species_mastery_outbox()` was not called. `deliver_species_mastery_outbox()` was not called. `settle_if_needed` was not executed. No production catch, Trainer profile, inventory, capture history, or mastery-point row was read or written.

Do not start D75. Do not activate Species Familiarity. Final release smoke stays paused.

## 1. Baseline

Working tree clean on `admin-hub-overhaul` at `35bd889a`, which includes the D73 packet. The three git blobs matched the approved SHA-256 values before any statement ran. The files were not edited to make a hash pass.

| Order | Path | SHA-256 | Bytes |
|---|---|---|---|
| 1 | `supabase/unapplied/d72-mastery/005_enqueue_lifecycle.sql` | `2c6c245a5f825a6612283e0a912d6600cb32f2635d37ee02feaecfa6d606d63d` | 2673 |
| 2 | `supabase/unapplied/d72-mastery/006_settle_familiarity_note.sql` | `400cc429162808422730cbc343449caabb81b6f9e5243110bf3a48f7384aebc1` | 10283 |
| 3 | `supabase/unapplied/d72-mastery/007_progress_view_grants.sql` | `8603912808d1f23e2581ecef00976fc1c0e449ab109b5fc965b0756d93b484bf` | 584 |

None of these files is under `supabase/migrations`. `apply_migration` was not used.

## 2. Preflight

Class: **READ-ONLY LIVE CATALOG**. Checked `2026-10-17 17:48:54.643417+00`. Stop was not required.

- Target project `dtflmlbjhttoewqgkujf` (`starlight-play`, `ACTIVE_HEALTHY`).
- D70 objects present: events table, outbox, activation singleton, progress view, and `public.catches.server_inserted_at`.
- `activated_at IS NULL`. `lifecycle = inactive`. `drain_started_at` is null.
- `public.species_mastery_events` row count `0`.
- WIRE `enabled = false`.
- `private.settle_if_needed(r encounter_rounds)` source md5 `0c6bf2fb2ca740415fffc567c362192a`. Owner `postgres`. Invoker. Returns `encounter_rounds`. One `materialize_streamlink_catch` call. One advisory lock. It did not mention `note_species_mastery_catch`.
- `private.species_mastery_outbox_admit` was absent. No admission trigger existed. Enqueue source md5 was still `7f602a9b3c6f7bf1cd17952f9f697897` and did not mention the recording gate.
- `pg_cron` is not installed.
- `private.grant_mastery` md5 `d5c11cc672f2cb16ae0210023a8dd91b`.
- `private.mastery_rank` md5 `04fa122f1f4424cd6e63fa1f3ffa16a4`.
- `public.play_rankings` md5 `b6526a939abdba0ef106e127925c43b0`.
- `private.materialize_streamlink_catch` md5 `e88c6cbec313a4cc0b81a5df1f5691b3`.
- `private.persist_streamlink_catch` md5 `0d1724fb07b156d6124b2f0f556303a4`.
- `private.note_species_mastery_catch` md5 `313944ac139f33465e57d86c0a1c5678`.
- `private.stamp_catch_server_inserted_at` md5 `b66ad1b961b3573a2c48947dfe0413ea`.

The existing `species_mastery_caught_at_freeze` trigger on `public.catches` comes from the D70 schema. D74 did not add it.

## 3. Execution method

Supabase `execute_sql` on project `dtflmlbjhttoewqgkujf`. One request per file. Each request is the exact file text, including that file's own `BEGIN` and `COMMIT`. No second transaction was wrapped around a file. D70 showed that one `execute_sql` script honors `BEGIN` and `COMMIT` across the whole text. An empty result means the script finished with no row payload and no SQL error.

No statement was retried. No recovery SQL ran.

## 4. Transaction outcomes

| File | Outcome | Confirmation |
|---|---|---|
| `005_enqueue_lifecycle.sql` | **COMMIT** | Catalog `2026-10-17 17:49:59.760293+00`. Enqueue mentions the recording gate. Admission trigger is on `private.species_mastery_outbox` only. `settle_if_needed` md5 was still `0c6bf2fb2ca740415fffc567c362192a`. Lifecycle `inactive`. Event rows `0`. |
| `006_settle_familiarity_note.sql` | **COMMIT** | Catalog `2026-10-17 17:50:49.814872+00`. Stripped body md5 `0c6bf2fb2ca740415fffc567c362192a`. Lifecycle `inactive`. Event rows `0`. |
| `007_progress_view_grants.sql` | **COMMIT** | Catalog `2026-10-17 17:51:29.745677+00`. Authenticated keeps SELECT and loses INSERT, UPDATE, DELETE, and TRUNCATE. |

SQL errors on the three files: **none**.

## 5. Settlement compatibility

Class: **READ-ONLY LIVE CATALOG**. The function was not executed.

| Check | Result |
|---|---|
| Identity arguments | `r encounter_rounds` |
| Result | `encounter_rounds` |
| Owner | `postgres` |
| Security | invoker (`prosecdef` false) |
| Volatility | `v` |
| Parallel | unsafe |
| Configuration | null |
| EXECUTE | `public`, `anon`, and `authenticated` still true |
| Installed body md5 | `565c102d0a8c84a3dfd036653aca307c` |
| Body with the note and two variables removed | `0c6bf2fb2ca740415fffc567c362192a` |
| `materialize_streamlink_catch` calls | 1 |
| `pg_try_advisory_xact_lock` calls | 1 |
| `capture_chance` calls | 1 |
| `announce_throws` calls | 1 |
| `public.capture_log` writes | 1 |
| `wire-materialize-failed` raises | 2, both outside the note handler |
| `note_species_mastery_catch` calls | 1, inside the nested handler |
| `EXCEPTION WHEN OTHERS` | 1, covering only the note |

The note runs only after a successful materialize, and only when lifecycle is `active` or `paused`. Inactive recording therefore does not enqueue. The enqueue function also rejects any new outbox row unless lifecycle is `active` or `paused`.

## 6. Privileges

Class: **READ-ONLY LIVE CATALOG**. Checked `2026-10-17 17:51:29.745677+00`.

| Check | Result |
|---|---|
| `authenticated` SELECT on `public.species_mastery_progress` | true |
| INSERT | false |
| UPDATE | false |
| DELETE | false |
| TRUNCATE | false |
| REFERENCES | false |
| TRIGGER | false |
| View `relkind` | `v` |
| `security_invoker` | true |
| Events RLS | on and forced |
| Events policy | `species_mastery_events_own`, SELECT |
| `authenticated` EXECUTE on enqueue and the admission function | false |
| `service_role` SELECT on the progress view | still true |

`007` does not change `service_role` or `postgres` grants. It does not change the points table `public.species_mastery`.

## 7. Final state

| Check | Result |
|---|---|
| `activated_at IS NULL` | true |
| `lifecycle` | `inactive` |
| Familiarity event rows | `0` |
| `pg_cron` | absent |
| WIRE `enabled` | `false` |
| `grant_mastery` md5 | `d5c11cc672f2cb16ae0210023a8dd91b` |
| `mastery_rank` md5 | `04fa122f1f4424cd6e63fa1f3ffa16a4` |
| `play_rankings` md5 | `b6526a939abdba0ef106e127925c43b0` |
| `materialize_streamlink_catch` md5 | `e88c6cbec313a4cc0b81a5df1f5691b3` |
| `persist_streamlink_catch` md5 | `0d1724fb07b156d6124b2f0f556303a4` |
| `note_species_mastery_catch` md5 | `313944ac139f33465e57d86c0a1c5678` |
| `stamp_catch_server_inserted_at` md5 | `b66ad1b961b3573a2c48947dfe0413ea` |
| Points columns | `user_id`, `dex`, `points`, `rank`, `updated_at` |
| APP | `20261008-rc133` |
| Branch merge | no |
| Frontend deploy | no |

## 8. Gameplay and Trainer data

No live encounter, QA encounter, settlement RPC, catch-generation RPC, or production catch-row read ran. No Pokémon was generated. No historical catch was backfilled. Odds and Poké Ball spending were not exercised. Sora, Twinkle, and PlayTester were not selected or modified.

## 9. Residual risks

- `private.stamp_catch_server_inserted_at()` can still abort a catch insert if it raises. This install did not change that function.
- While lifecycle stays `inactive`, the new note does not call `note_species_mastery_catch`.
- `private.settle_due_rounds` is not security definer. After a future activation, a direct authenticated call can hit a privilege error inside the note. The nested handler keeps the catch, and reconcile would have to queue later. That path was not run.
- `007` leaves `service_role` grants in place.
- No production catch has proved the insert stamp.

## 10. Recommended D75 scope

D75, if the owner asks for it, should be a separate activation decision. It must not activate, schedule delivery, backfill, encounter, or change WIRE unless a new GO says so.

Do not start D75.

## 11. Prohibited follow-ups

This install does not authorize activation, reconciliation, delivery, a cutoff change, a live or QA encounter, settlement execution, catch-row reads, Sora, Twinkle, or PlayTester changes, backfill, mastery-point or Rankings edits, odds or spending changes, WIRE activation, an APP stamp, a frontend deploy, a merge, a database reset, or any SQL beyond the three files above.
