# A19-SCHEMA local PostgreSQL rehearsal (GitHub issue #23)

**Authorized:** D27 / #23 disposable **synthetic local Postgres** apply of existing A19-SCHEMA artifacts.  
**Not authorized:** A19-APPLY to live/connected Supabase, catch writes, GENVAL, WIRE, reset, merge, deploy.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.

Target printed at start: `127.0.0.1:55432/a19_rehearsal` (embedded local; **NOT** supabase; **NOT** `dtflmlbjhttoewqgkujf`).

| Honesty | Used |
|---|---|
| STATIC | Isolation guards, unapplied inventory, unique `evo_uid` |
| LOCAL HARNESS | `tests/a19-schema-rehearsal-tests.js` (5) + `tests/a19-schema-tests.js` (9) |
| REAL SQL | `node tools/a19-schema-rehearsal.js` — **17/17 PASS** on embedded Postgres 18 |
| NOT RUN | Connected Supabase, PostgREST schema exposure, catch-row SELECT on live, PRODUCTION |

---

## Isolation

- Host loopback only. Cluster flags `listen_addresses=127.0.0.1`.
- Harness refuses `SUPABASE_URL` / `DATABASE_URL` / host names matching `supabase.co` or `dtflmlbjhttoewqgkujf`.
- Newly created databases `a19_rehearsal` and `a19_rollback_clone`.
- Synthetic trainers only (`11111111-…`, `aaaaaaaa-…`). Comment names Oak/Leaf/Blue. Not Sora or Twinkle.
- Binaries in gitignored `tools/.cache/a23-pg-harness/`. Cluster data deleted on stop.
- This is **Postgres RLS/REVOKE**, not a PostgREST exposure test. Live API schema config was not touched.

---

## Apply order

1. `rehearsal/000_synthetic_baseline.sql` — `private` schema, mock `anon`/`authenticated`, synthetic `public.catches` + `lgpe_species`
2. `001_private_ref_tables.sql`
3. `seed/00`–`10`
4. `002_catches_nullable_extensions.sql`
5. Repeat 001 + seed + 002 (idempotence)
6. `CREATE DATABASE a19_rollback_clone TEMPLATE a19_rehearsal` then `003_rollback.sql` on the clone only

---

## REAL SQL results (17/17)

| Check | Result |
|---|---|
| Isolation target | `127.0.0.1:55432/a19_rehearsal` |
| Synthetic baseline | 2 catches + 2 `lgpe_species` |
| `private.ref_*` | 11 tables |
| Seed counts | natures 25, species 151, forms 236, abilities 135, formAbilities 576, moves 556, learnsets 14048, evolutions 88, obtain 236, formPolicies 16 |
| F1 | Bulbasaur 70/50; Clefable 140/140 |
| G1/C1 | 12 + 4 rows; all `persist_as=base`, `wild_allowed=false`, `grant_allowed=false` |
| Catch extensions | 17 nullable columns |
| Legacy rows | IVs/moves/friendship kept; new columns NULL |
| CHECK / UNIQUE / FK | `source_kind`, friendship 256, hardy slug, `persist_as`, missing move FK, nature 99, ability slot `3`, EV 300, EV total 600, 5 move slots, HP 11/10 — all rejected |
| Indexes | 5 named `ref_*` indexes present |
| RLS | `relrowsecurity` true on all 11 tables |
| REVOKE | `anon` SELECT → `42501` permission denied |
| RLS vs REVOKE | test-only `GRANT SELECT` + `SET ROLE anon` → **0 rows** (Postgres RLS; no policy) |
| Idempotence | second 001+seed+002; counts unchanged |
| Rollback clone | `ref_*` gone; `nature_id` gone; synthetic IVs/friendship/`lgpe_species` remain |
| Primary DB after clone rollback | still 14048 learnsets |

---

## SQL fix on the working branch

First apply failed on `08_evolutions.sql`:

`ON CONFLICT DO UPDATE command cannot affect row a second time`

Cause: pin `evolutions.json` keeps regional-form copies of the same species edge (Rattata 19→20, Cubone 104→105, …). `evo_uid` was `from:to:trigger:level:item:held:trade`, so one INSERT proposed the same PK twice.

Fix: `tools/emit-a19-schema-seed.js` now appends the pin index to `evo_uid`. Pin JSON is unchanged (still 88 rows). Seeds re-emitted. `tests/a19-schema-tests.js` asserts 88 unique uids.

`001_private_ref_tables.sql` also gained a post-create layout guard so `CREATE TABLE IF NOT EXISTS` cannot hide a mismatched older `ref_meta` / `ref_species`.

---

## Still blocked

- **A19-APPLY** (live/connected Supabase)
- A19-GENVAL / WIRE / INSPECT / EDIT
- Any reset
- Merge / deploy / APP stamp

Owner review next. Do not copy these files into `supabase/migrations/`.
