# A19-SCHEMA unapplied artifacts (GitHub issue #22)

**Authorized:** D25 / A19-SCHEMA **branch-only** design, files, and local tests.  
**Not authorized:** connected/live SQL, catch writes, generator, validator, wiring, reset, merge, deploy.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**.

Policies in force: **G1 / C1 / F1** (D24). Pin `sl-ref-20261013-227b573` unchanged (220/16).

| Honesty | Used |
|---|---|
| STATIC | Unapplied SQL, pin JSON, migrations inventory |
| LOCAL HARNESS | Emitter + `tests/a19-schema-tests.js` |
| REAL SQL | **not run** — no local Postgres/docker on this machine |
| NOT RUN | Connected Supabase, catch-row SELECT/UPDATE, PRODUCTION |

---

## What shipped

| Artifact | Role |
|---|---|
| `supabase/unapplied/a19-schema/001_private_ref_tables.sql` | Versioned `private.ref_*` + RLS/REVOKE + indexes |
| `002_catches_nullable_extensions.sql` | Additive nullable `public.catches` columns |
| `003_rollback.sql` | Inverse of 001+002 |
| `seed/00`–`10` + `manifest.json` | Complete pin load (151/236/14048/…) |
| `tools/emit-a19-schema-seed.js` | Deterministic offline emitter |
| `tests/a19-schema-tests.js` | Isolated validation |

Nothing in `supabase/migrations/`. Nothing applied to `dtflmlbjhttoewqgkujf`.

---

## Reference schema

- All tables in **`private`**. Do not add `private` to PostgREST exposed schemas.
- `content_build` on every child table (multi-pin coexistence).
- `source_kind` (`offline-pin` / `loaded-unwired`) replaces the #21 `applied_to_live = false` check. That check was not a deploy registry.
- RLS enabled; `REVOKE ALL` on the **new tables only**. No schema-wide `REVOKE USAGE ON private` (existing RPCs live there).
- No `SECURITY DEFINER`, no public RPC, no `EXECUTE` grant.
- F1: `pokeapi_base_friendship` + derived `streamlink_base_friendship` (70→50 at emit). Pin JSON untouched.
- G1/C1: `private.ref_form_policies` (16 rows) + obtain seed forced fail-closed for those form ids. `data/gen9-ref/obtain.json` untouched.
- `public.lgpe_species` left in place.

### Seed counts (emitter)

| Table | Rows |
|---|---|
| natures | 25 |
| species | 151 |
| forms | 236 |
| abilities | 135 |
| form_abilities | 576 |
| moves | 556 |
| learnsets | 14048 |
| evolutions | 88 |
| obtain | 236 |
| form_policies | 16 |

Reload: `node tools/emit-a19-schema-seed.js`. Idempotent `ON CONFLICT`.

---

## Catch extensions (legacy-safe)

New columns are **nullable**. No backfill `UPDATE`. No drop of `iv_*`, `av_*`, `moves text[]`, or existing `friendship`.

| Column | Purpose |
|---|---|
| `nature_id` | 1–25 when present |
| `ability_id`, `ability_slot` | slot `1` / `2` / `hidden` |
| `ev_*` | 0–252; total ≤ 510 when all six present |
| `move_slots` jsonb | ≤4 `{moveId,pp,ppMax,method,versionGroup}` |
| `ruleset_id`, `content_build` | provenance for **new** rows |
| `hp_current`, `hp_max`, `status` | D19 Q5; NULL on old rows |
| `held_item` | wild default later null |
| `gigantamax_factor` | G1 reserved; unused until a later phase |

Old rows remain valid with all new columns NULL. `private.stamp_catch_row` is **not** changed (A19-WIRE).

No FK from `catches` to `private.ref_*` (NULL legacy rows + apply-order safety).

---

## Operational apply sequence (future go/no-go only)

1. Backup. Confirm PostgREST does not expose `private`.
2. Apply `001_private_ref_tables.sql`.
3. Apply seed `00` → `10` in order.
4. Recount vs `seed/manifest.json`.
5. Apply `002_catches_nullable_extensions.sql`.
6. Confirm `stamp_catch_row` still writes legacy columns only.
7. Do **not** start GENVAL/WIRE in the same batch.

Rollback: `003_rollback.sql` (drops new columns/tables only). Restore from backup if seed load is partial.

---

## Tests

| Suite | Class | Result |
|---|---|---|
| `tests/a19-schema-tests.js` | LOCAL HARNESS / STATIC | 8 passed |
| `tests/gen9-ref-tests.js` | LOCAL HARNESS | pin still 12 |
| `tests/admin-hub-overhaul-tests.js` | STATIC | includes issue 22 |

No REAL SQL. No PRODUCTION.

---

## Blockers before live apply

1. Separate owner **apply** authorization (not granted by D25).
2. Confirm API exposed schemas still omit `private`.
3. Dual catalog: `lgpe_species` remains live until A19-WIRE.
4. Generator still missing — new columns stay NULL on new catches until A19-WIRE.

---

## Stop

A19-GENVAL, WIRE, INSPECT, EDIT, and any reset remain **blocked**. Do not apply this folder.
