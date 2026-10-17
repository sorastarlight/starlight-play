# D70 — Species Mastery schema installation

**Verdict:** **D70 SCHEMA INSTALLED — MASTERY INACTIVE**  
**Status:** Schema-only install of the four approved files. Recording is inactive. Settlement is not hooked.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `76ac2a94`  
**Work commit:** `8adbd363`  
**Production APP:** `20261008-rc133` (unchanged).  
**Project:** `dtflmlbjhttoewqgkujf`  
**WIRE:** remains disabled (`enabled = false`).

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · QA account **none**.

No production Trainer catches, profiles, inventories, capture histories, mastery points, or Rankings rows were read or modified. Species Mastery the feature is not complete. Only the inactive schema is installed.

Do not start D71. Do not call `activate_species_mastery_events()`. Final release smoke stays paused.

## 1. Baseline

Working tree clean on `admin-hub-overhaul` at `76ac2a94`, which records the D69 packet (`25309d98`). The four files matched the approved SHA-256 values before any migration ran. They were not edited to make a hash pass, and they still match after installation.

| Order | Path | SHA-256 | Bytes |
|---|---|---|---|
| 1 | `supabase/unapplied/d64-mastery/001_species_mastery_events.sql` | `f343c9bf318d8cdd12fb3331f29fd3eb7990ad491b3c096af773e1e6d4e0a9ce` | 6637 |
| 2 | `supabase/unapplied/d65-mastery/002_species_mastery_hardening.sql` | `2d094864e6872f6c85e66d29c0c5f36fa662a588b34e8f540601efb64bfb9f76` | 14028 |
| 3 | `supabase/unapplied/d66-mastery/003_species_mastery_lifecycle.sql` | `1f488477de5e6c021ea74061dfcfede21b51057eb5e852e1f387269d1db41e3f` | 20838 |
| 4 | `supabase/unapplied/d67-mastery/004_species_mastery_catch_safety.sql` | `0f7f27a0acfb13fea0c1bfb0f9a43c322af02577dd43b7ff2aae586cf7aeaa3c` | 7906 |

None of these files was copied into `supabase/migrations`. `apply_migration` was not used.

## 2. Preflight

Class: **LIVE CATALOG**. PostgreSQL **17.6**. Stop was not required.

- Target project `dtflmlbjhttoewqgkujf`.
- `private.streamlink_wire_switch.enabled = false`.
- `species_mastery_events`, `species_mastery_progress`, `species_mastery_activation`, `species_mastery_outbox`, and `catch_insert_authority` were absent.
- `public.catches.server_inserted_at` was absent.
- `private.grant_mastery` source md5 `d5c11cc672f2cb16ae0210023a8dd91b`.
- `private.mastery_rank` source md5 `04fa122f1f4424cd6e63fa1f3ffa16a4`.
- `public.play_rankings` source md5 `b6526a939abdba0ef106e127925c43b0`.
- `private.stamp_catch_row` and `private.catches_before_write` matched the D69 catalog hashes.
- Activation and settlement hooks were not present and were not added.

A throwaway transaction probe used the same execution path before the mastery files:

- `BEGIN` / create `public.d70_tx_probe` / duplicate insert / `COMMIT` returned SQLSTATE `23505`. The table was absent afterward, so the failed script rolled back.
- A later `BEGIN` / create / insert / `COMMIT` left the table.
- `BEGIN` / `DROP TABLE public.d70_tx_probe` / `COMMIT` removed it. `to_regclass` was null before `001` and remained null after `004`.

That probe is the evidence that one `execute_sql` script honors `BEGIN`, `COMMIT`, and `ROLLBACK` across the whole text.

## 3. Execution method

Supabase `execute_sql` on project `dtflmlbjhttoewqgkujf`. One request per file. Each request is `BEGIN;` plus the exact file text plus `COMMIT;`. An empty result means the script finished with no row payload and no SQL error. The same empty result was returned by the successful probe commit.

No statement was retried. No recovery SQL ran. `activate_species_mastery_events()` was not called.

## 4. Transaction outcomes

| File | Outcome | Confirmation |
|---|---|---|
| `001_species_mastery_events.sql` | **COMMIT** | Catalog check `2026-10-17 08:13:08.61834+00`. Events table present. `event_rows = 0`. |
| `002_species_mastery_hardening.sql` | **COMMIT** | Catalog check `2026-10-17 08:13:48.128741+00`. `activated_at` null. Outbox present. `event_rows = 0`. |
| `003_species_mastery_lifecycle.sql` | **COMMIT** | Empty success payload. No SQLSTATE. |
| `004_species_mastery_catch_safety.sql` | **COMMIT** | Empty success payload. No SQLSTATE. Final catalog `2026-10-17 08:15:05.417834+00`. |

SQL errors on the four files: **none**.

`003` installs `catch_insert_authority` and `004` drops it first. Both committed. The final catalog does not have that trigger. No catch was attempted between those two commits.

## 5. Final schema verification

Class: **LIVE CATALOG**. Checked `2026-10-17 08:15:05.417834+00`. PostgreSQL 17.6.

| Check | Result |
|---|---|
| `public.species_mastery_events` | present |
| `public.species_mastery_progress` | present |
| `private.species_mastery_activation` | present |
| `private.species_mastery_outbox` | present |
| `public.catches.server_inserted_at` | present, nullable, no default |
| Trigger `catch_server_inserted_at` | present |
| Trigger `catch_server_inserted_at_freeze` | present |
| Trigger `catch_insert_authority` | absent |
| `activated_at IS NULL` | true |
| `lifecycle` | `inactive` |
| `species_mastery_events` row count | `0` |
| `public.species_mastery` columns | `user_id`, `dex`, `points`, `rank`, `updated_at` |
| `private.grant_mastery` md5 | `d5c11cc672f2cb16ae0210023a8dd91b` (unchanged) |
| `private.mastery_rank` md5 | `04fa122f1f4424cd6e63fa1f3ffa16a4` (unchanged) |
| `public.play_rankings` md5 | `b6526a939abdba0ef106e127925c43b0` (unchanged) |
| WIRE `enabled` | `false` |
| Probe table `public.d70_tx_probe` | absent |

`anon` and `authenticated` cannot execute `activate_species_mastery_events`, `note_species_mastery_catch`, `record_species_mastery_event`, `record_catch_insert_authority`, or `stamp_catch_server_inserted_at`. The stamp function source md5 is `b66ad1b961b3573a2c48947dfe0413ea`. It is the reviewed one-line assignment. It was not modified and has no exception handler.

BEFORE INSERT name order on `public.catches` is `catch_server_inserted_at`, then `catches_before_write`. `catches_after_present` and `catches_xp` remain. This catalog check did not insert a row, so production firing order was not measured.

## 6. What stayed unchanged

Catch odds, encounter settlement, Poké Ball spending, berries, Honey, inventory, PokéCoins, existing Species Mastery points, Rankings, specimens, and ownership were not modified. No Pokémon was generated. No encounter ran. No historical catch was backfilled. The new ledger is not connected to `settle_if_needed`. Frontend code was not deployed. APP was not stamped. The branch was not merged.

The owner-accepted residual remains: `private.stamp_catch_server_inserted_at()` is a `BEFORE INSERT` trigger. If that function raises, PostgreSQL can abort the catch insert. This install did not add a handler and did not change the function.

## 7. Trainer data

No production catch row, profile, inventory, capture history, mastery point value, or Rankings row was selected or written. The events count is on the new empty ledger. The activation read is the singleton configuration row.

## 8. Remaining blockers

- Cosmetic Species Mastery is inactive. `activate_species_mastery_events()` was not called.
- The ledger is not connected to settlement.
- Existing catches keep a null `server_inserted_at` and stay outside the new ledger.
- A production catch was not used to prove the stamp. That test needs a separate GO.
- Frontend and APP do not expose the new ledger.
- Final release smoke stays paused.

## 9. Recommended D71 scope

D71 should be a separate owner decision about activation. It should not call `activate_species_mastery_events()` unless that call is the explicit GO. It should not hook settlement, backfill catches, change points or Rankings, enable WIRE, deploy the frontend, or run a live encounter.

Do not start D71 from this report.

## 10. Verdict

**D70 SCHEMA INSTALLED — MASTERY INACTIVE**
