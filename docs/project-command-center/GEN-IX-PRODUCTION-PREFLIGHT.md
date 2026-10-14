# A19-APPLY read-only production preflight (GitHub issue #24)

**Authorized:** D29 / #24 **metadata-only** catalog and security inspection of project `dtflmlbjhttoewqgkujf`.  
**Not authorized:** A19-APPLY, DDL/DML, catch-row SELECT, RPCs, grants/RLS edits, GENVAL, WIRE, reset, merge, deploy.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.

A19-APPLY remains **UNAPPROVED**.

| Honesty | Used |
|---|---|
| STATIC | Staged `001`/`002`/`003`/seeds, #23 rehearsal report, migrations inventory, `stamp_catch_row` source |
| LIVE CATALOG | information_schema / pg_catalog SELECTs on `starlight-play` (`dtflmlbjhttoewqgkujf`) |
| REAL SQL | **#23 only** (synthetic `127.0.0.1`). Not this preflight. |
| UNKNOWN | Hosted PostgREST exposed-schema list; backup/PITR availability |
| NOT RUN | Catch-row SELECT, `admin_overview`, function execution, PRODUCTION apply |

---

## Gate scores

| Gate | Score | Evidence |
|---|---|---|
| 1. Connection identity | **PASS** | Project `dtflmlbjhttoewqgkujf` / `starlight-play` / `us-west-1` / Postgres **17.6**. Session `current_user=postgres`. `search_path` is `"$user", public, extensions` — `private` is not on the path. |
| 2. `public.catches` vs `002` | **PASS** | 44 live columns. None of the 17 staged extension names exist. No constraint-name collision. `reltuples=110` / `relpages=9` (planner estimate, **not** `COUNT(*)`). |
| 3. `private.ref_*` collisions | **PASS** | `private` already exists and is in use. **No** `ref_*` tables in `public` or `private`. `lgpe_species` remains. |
| 4. Security / exposure | **PASS** with **UNKNOWN** | 001’s RLS+REVOKE still required. `authenticated` has schema `USAGE` on `private`; `anon` does not. Existing private tables have **no** anon/authenticated SELECT. PostgREST `pgrst.db_schemas` is **NULL** here → **UNKNOWN**. |
| 5. Migration / rollback | **PASS** with **UNKNOWN** | #23 evo_uid fix is in `08_evolutions.sql` (88 unique uids). Artifacts still outside `migrations/`. Backup/PITR **UNKNOWN**. `003` is destructive once any new values exist. |

**Apply recommendation:** **BLOCKED** until the owner (a) confirms API exposed schemas exclude `private`, (b) takes a restore point, and (c) issues a separate **A19-APPLY**. Catalog shape is compatible.

---

## 1. Connection identity (LIVE CATALOG)

| Field | Value |
|---|---|
| Project | `dtflmlbjhttoewqgkujf` (`starlight-play`) |
| Host (platform metadata) | `db.dtflmlbjhttoewqgkujf.supabase.co` |
| Database | `postgres` |
| Role | `postgres` / `postgres` |
| Server | 17.6 (platform `17.6.1.166`) |
| `search_path` | `"$user", public, extensions` |
| `transaction_read_only` | `off` (session *can* write; this batch did not) |

Queries were catalog `SELECT` only. No `apply_migration`. No `INSERT`/`UPDATE`/`DELETE`/`ALTER`. No RPC.

Latest applied migration metadata: `20261011024514_gate_2a_r_identity_inspect_true_read`. No `a19-schema` versions.

---

## 2. `public.catches` vs staged `002`

Live columns (names only):  
`id, user_id, dex, name, variant, gender, ball, caught_at, round_id, source_key, public_id, nickname, level, iv_*, av_*, moves, size_class, transferred_at, ot_*, met_*, height_m, weight_kg, friendship, is_alpha, favorite, locked, obtained_method, trade_*, reserved_trade_id, pokemon_form_id`.

Staged `002` columns **absent** (additive path is clear):  
`nature_id, ability_id, ability_slot, ev_hp, ev_atk, ev_def, ev_spa, ev_spd, ev_spe, move_slots, ruleset_id, content_build, hp_current, hp_max, status, held_item, gigantamax_factor`.

| Live object | Notes for apply |
|---|---|
| Constraints | `catches_pkey`, `catches_public_id_key`, `catches_dex_check` (1–1025), FKs to `profiles`, `encounter_rounds`, `pokemon_forms`. None of the `catches_*_range` names exist. |
| Indexes | user/form/rank/source/round unique indexes. No name clash with 002. |
| Triggers | `catches_before_write` → `private.stamp_catch_row`; `catches_after_present`; `catches_xp`. Trigger functions are not `SECURITY DEFINER`. 002 does not replace them. |
| RLS | **Enabled**, not FORCE. One policy: `users can read own catches` (`authenticated`, SELECT). |
| Grants | `anon` / `authenticated` / `service_role` show table privileges in `role_table_grants`; client writes still go through existing RPCs. New nullable columns inherit those grants. |
| Incoming FKs | `oak_transfers.catch_id`, `trade_listings.catch_id`, `trade_offers.catch_id`. ADD COLUMN does not touch `id`. |
| Publications | `supabase_realtime` is not `ALL TABLES`. `catches` is **not** in `pg_publication_tables`. |
| Size | `reltuples≈110`, 9 pages. CHECK validation after ADD COLUMN should be a short scan. |

STATIC: latest `stamp_catch_row` fills IVs/AVs/moves/friendship by **named fields** and returns the same row type. New NULL columns pass through. `catches_before_write` only assigns `id` / `is_alpha` then calls `stamp_catch_row`.

`002` CHECK constraints are NULL-tolerant, so existing rows stay valid without backfill.

---

## 3. `private` schema vs staged `001`

`private` already exists (owner `postgres`). Existing objects include stream/store/director/identity tables. **No `ref_*` relations.** `CREATE SCHEMA IF NOT EXISTS private` is a no-op.

`public.lgpe_species` and `public.pokemon_forms` exist. 001/003 leave them alone.

`search_path` does not include `private`, so unqualified `ref_meta` would not resolve — staged SQL correctly uses `private.ref_*`.

Default privileges (`pg_default_acl`) exist on **`public` only** (anon/authenticated/service_role get table/function/sequence defaults). **No default ACL on `private`.** New `private.ref_*` tables start owner-only; 001 still `ENABLE ROW LEVEL SECURITY` and `REVOKE ALL … FROM public, anon, authenticated`.

`CREATE TABLE IF NOT EXISTS` plus the #23 layout guard remains necessary so a mismatched leftover cannot hide.

---

## 4. Security

| Check | LIVE CATALOG |
|---|---|
| `anon` USAGE on `private` | **false** |
| `authenticated` USAGE on `private` | **true** (`private` ACL `{postgres=UC/postgres,authenticated=U/postgres}`) |
| `service_role` USAGE on `private` | **false** |
| anon/authenticated SELECT on existing private tables | **false** on all listed private tables (privilege flags only; rows not read) |
| PostgREST `pgrst.db_schemas` | **NULL** → **UNKNOWN** |
| Local `supabase/config.toml` | No `[api] schemas` list |

Postgres RLS/REVOKE ≠ API exposure. #23 proved that on a synthetic cluster. Hosted API schema config is **not** in `pg_settings` here.

The platform table-list advisor claimed private tables without RLS are “fully exposed” to anon. **Table-privilege flags contradict that** (no SELECT). Do not “fix” those preexisting tables in this batch. Do **not** add `private` to exposed schemas when applying 001.

`002` does not GRANT/REVOKE on `catches`. Authenticated users who can already SELECT their own rows would see the new columns (NULL until a later generator).

---

## 5. #23 rehearsal and migration readiness

[#23 REAL SQL 17/17](./GEN-IX-SCHEMA-REHEARSAL.md) on `127.0.0.1:55432` (synthetic only):

- Counts 25 / 151 / 236 / 135 / 576 / 556 / 14048 / 88 / 236 / 16
- F1 70→50, G1/C1 fail-closed
- Legacy IVs/moves/friendship kept
- Idempotent re-apply
- `003` on a **clone** only

SQL fix that must ship with any later apply: `evo_uid` includes the pin index so one `INSERT` cannot propose the same PK twice. Pin JSON still 88 rows. Manifest still `appliedToSupabase: false`.

**Rollback hazard:** `003` drops the 17 columns and all `private.ref_*`. Safe only before GENVAL writes values, and only with a restore point. After any new catch fields are populated, `003` is data-loss. Do not keep `003` as a casual live undo.

Backup/PITR: **UNKNOWN** from catalog metadata. Owner must confirm a snapshot before apply.

---

## Proposed production-apply checklist (not authorized to run)

1. Owner confirms Dashboard API settings: exposed schemas **do not** include `private`.
2. Owner confirms a PITR/backup restore point.
3. Separate **A19-APPLY** approval. Still no GENVAL/WIRE/reset.
4. Copy reviewed files into a **new** migration timestamp after `20261011024514` — do not reuse #20/#21 drafts. Order: `001` → seed `00`–`10` → `002`. Leave `003` unapplied.
5. Apply during a short idle window. Expect a brief `catches` CHECK scan (`reltuples≈110`) plus ~14k learnset inserts.
6. Post-apply **catalog** smoke only: `ref_*` counts, RLS/REVOKE flags, extension columns exist and are nullable. **No** catch-row SELECT. **No** RPCs.
7. Keep `stamp_catch_row` unchanged. New columns stay NULL on live Pokémon.
8. Do not add `private` to PostgREST schemas. Do not GRANT `ref_*` to `anon`/`authenticated`.

---

## Query shapes used (no secrets, no personal rows)

Exact SELECT shapes are in `supabase/unapplied/a19-schema/preflight/000_metadata_only.sql`.

---

## Unchanged hard stops

No live DDL. No catch writes. No Sora/Twinkle/PlayTester access. R1/R2/R18 remain OPEN. R21 CLOSED. Final release smoke **paused**.
