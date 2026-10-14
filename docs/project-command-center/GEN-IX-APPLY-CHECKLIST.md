# Controlled A19-APPLY checklist (not authorized to run)

**Status:** A19-APPLY remains **UNAPPROVED**. Backup evidence **recorded** (`2026-10-14 07:44:26 +0000`, PITR disabled). O4 apply go is still required. See [GEN-IX-APPLY-DECISION.md](./GEN-IX-APPLY-DECISION.md).

Sora mutated **NO** · Twinkle mutated **NO**. Do not start GENVAL, WIRE, or any reset.

---

## Remaining owner checks (Dashboard)

This agent did **not** create a backup and could not list backup IDs (no Management API token).

| # | What to open | What to record | Why |
|---|---|---|---|
| O1 | [Data API / Exposed schemas](https://supabase.com/dashboard/project/dtflmlbjhttoewqgkujf/settings/api) | Screenshot or list of **Exposed schemas**. Must **not** include `private`. | LIVE API already rejects `private` (`PGRST106`). Dashboard is the control plane; keep it that way. |
| O2 | [Scheduled backups](https://supabase.com/dashboard/project/dtflmlbjhttoewqgkujf/database/backups/scheduled) | **Recorded (OWNER REPORT):** COMPLETED `2026-10-14 07:44:26 +0000`. Re-record if a newer daily completes before apply. | Restore target if apply misbehaves. Not independently listed. |
| O3 | [Point in Time](https://supabase.com/dashboard/project/dtflmlbjhttoewqgkujf/database/backups/pitr) | **Recorded (OWNER REPORT):** **PITR disabled**. | Restore is the daily snapshot only. |
| O4 | Explicit **A19-APPLY** message | Still required: approve apply of unapplied `001` → seed `00`–`10` → `002` only. | Backup evidence is not apply authorization. |

Do **not** click Restore unless a later apply has failed. Do **not** enable extra exposed schemas.

---

## Already verified (do not re-do as writes)

| Check | Class | Result |
|---|---|---|
| Project identity | LIVE CATALOG | `dtflmlbjhttoewqgkujf` / PG 17.6 |
| `public.catches` vs `002` | LIVE CATALOG | 17 extension columns absent; `reltuples≈110` |
| `private.ref_*` | LIVE CATALOG | none |
| PostgREST `private` | LIVE API | **not exposed** (`PGRST106`) |
| Org plan | LIVE PLATFORM | **Pro** → docs: automatic daily backups, 7-day retention |
| Isolated apply rehearsal | REAL SQL (#23) | 17/17 on synthetic localhost |
| COMPLETED daily backup | OWNER REPORT | `2026-10-14 07:44:26 +0000` |
| PITR | OWNER REPORT | **disabled** |

---

## If A19-APPLY is later approved — apply window

1. Confirm O1–O4 above. Idle stream / no encounter settlement if practical.
2. Keep files in `supabase/unapplied/a19-schema/` until copy-into-migrations is part of that same approval. Order: `001_private_ref_tables.sql` → `seed/00`–`10` → `002_catches_nullable_extensions.sql`.
3. Do **not** apply `003_rollback.sql` as part of go-live.
4. Do **not** `NOTIFY pgrst` to add `private`. Do **not** GRANT `ref_*` to `anon`/`authenticated`.
5. Expect: cheap nullable `ADD COLUMN` on ~110 estimated catch rows; CHECK scan; ~14,048 learnset inserts.
6. Leave `stamp_catch_row` unchanged. New catch columns stay NULL. No Pokémon writes.

## Post-apply verification (catalog only)

- `private.ref_*` counts match the seed manifest (25 / 151 / 236 / 135 / 576 / 556 / 14048 / 88 / 236 / 16).
- RLS enabled + no anon/authenticated SELECT on `ref_*`.
- `public.catches` has the 17 nullable columns; live IVs/moves/friendship columns unchanged.
- Repeat LIVE API: `Accept-Profile: private` still `PGRST106`.
- **No** `SELECT` of catch rows. **No** RPCs. **No** GENVAL.

## Rollback boundaries

| Situation | Action | Do not |
|---|---|---|
| Apply fails mid-DDL, no seed completed | Dashboard restore to COMPLETED **2026-10-14 07:44:26 +0000**. PITR is **disabled** — no finer point. | Invent a partial SQL undo |
| Apply succeeded, new catch columns still all NULL, `ref_*` only | Prefer Dashboard restore. `003` drops `ref_*` and the 17 columns; last resort, owner-approved | Run `003` casually |
| Any later GENVAL/WIRE has filled new catch fields | **Dashboard restore only**. `003` would drop columns that hold data | Use `003` as a data undo |
| Need to undo player Pokémon | That is **A19-RESET-GO**, not this checklist | Release/delete catches to “fix” schema |

Restoration takes the project offline. Plan downtime. Storage objects are not in DB backups.

---

A19-APPLY remains **UNAPPROVED** until O4.
