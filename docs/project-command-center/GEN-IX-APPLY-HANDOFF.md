# A19-APPLY go/no-go handoff (GitHub issue #24 / D34)

**Verdict: BLOCKED.** A19-APPLY remains **UNAPPROVED**.

This handoff is **not** A19-APPLY authorization. No production SQL was run. No backup was created or restored. `003_rollback.sql` was not run. SQL was **not** copied into `supabase/migrations/`. GENVAL / WIRE / reset / merge / deploy were not started.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.

Owner GO/NO-GO recorded this batch: **none**.

---

## 1. Artifact pin (STATIC — this batch)

DDL, seed files, and pin JSON SHA-256 **match disk** and are **unchanged** since #23 `cc66946b`. `appliedToSupabase: false`. Not in `supabase/migrations/`.

| Artifact | Result |
|---|---|
| Pin | `sl-ref-20261013-227b573` (220 / 16) |
| `001_private_ref_tables.sql` | `61a86ed041a3c2e51788c9cf5e49cd4bfdf06e5932f906254ea94c14e0fe9a30` |
| `002_catches_nullable_extensions.sql` | `855b813a437ab41a890cadaabaf0c006ca194b37abfc272e7c3da1426e03d932` |
| `003_rollback.sql` | `54fd5c6f69239a9ef81aae7051c255a3c5f1e97b891f5045994752f5cc840208` |
| Seed counts | 25 / 151 / 236 / 135 / 576 / 556 / 14048 / 88 / 236 / 16 |
| Seed / pin file hashes | identical to [GEN-IX-APPLY-DECISION.md](./GEN-IX-APPLY-DECISION.md) |

---

## 2. Freshest COMPLETED backup — owner reply required

Last recorded (D33, OWNER REPORT): **2026-10-14 07:44:26 UTC**. **PITR disabled**.

That stamp is **hours old** at handoff time (~15:33 UTC). It is **not** reconfirmed as still the latest COMPLETED row.

Open [Scheduled backups](https://supabase.com/dashboard/project/dtflmlbjhttoewqgkujf/database/backups/scheduled) and paste:

`FRESHEST COMPLETED = <date time timezone>`

Use the newest **COMPLETED** row, even if it is still `2026-10-14 07:44:26 +0000`. A running, failed, or empty row is not a restore target. Do **not** click Restore.

Until that confirmation, recovery evidence for **this** handoff is **incomplete**.

---

## 3. Whole-database recovery data loss

PITR is **disabled**. The only undo is restoring the **entire Postgres database** to the named daily snapshot. There is no restore-to-a-second-before-apply.

If the restore target stays `2026-10-14 07:44:26 UTC`, everything committed **after T** is discarded:

- New and changed catches, trades, Oak transfers, GTS
- Inventory, PokéCoins, Pass claims
- Encounter / director / stream rows
- Trainer rows stored in Postgres, including protected accounts if they had activity after T
- Any schema applied after T (including a failed A19-APPLY)

**Not** in that backup: Storage objects. Snapshots older than Pro’s ~7-day window.

The loss window **grows** until restore (already ~8 hours at this handoff; up to about a day by the next daily). Restore takes the project **offline**. You cannot restore one table. `003` only drops `ref_*` and the 17 new catch columns; it does not rewind player activity. After GENVAL, `003` is data-loss.

Do not restore to “try” apply. Do not release Pokémon to compensate.

---

## 4. Apply order (prepared, not authorized)

Keep files under `supabase/unapplied/a19-schema/` until a **separate** A19-APPLY names them.

1. `001_private_ref_tables.sql`
2. `seed/00_meta.sql` … `seed/10_form_policies.sql` (00 through 10)
3. `002_catches_nullable_extensions.sql`

**Do not run:** `003_rollback.sql`, rehearsal baseline, preflight-as-migration, GENVAL, WIRE, catch UPDATEs, `NOTIFY pgrst` to expose `private`, GRANT of `ref_*`.

---

## 5. Maintenance window, stop conditions, post-apply checks

**Window (if a later go is given):** idle stream / no encounter settlement if practical. Confirm the freshest COMPLETED stamp first. Expect nullable `ADD COLUMN` on ~110 estimated catch rows, CHECK scan, 14,048 learnset inserts. Leave `stamp_catch_row` unchanged. New catch columns stay NULL.

**Stop and do not continue if:**

- The owner has not sent a separate message that says **A19-APPLY** for these named files
- The freshest COMPLETED backup is unknown or older than the owner will accept losing
- Apply fails mid-file (restore to the named snapshot; do not invent SQL undo)
- Any step would GRANT `ref_*`, add `private` to PostgREST, SELECT catch rows, call RPCs, or start GENVAL/WIRE/reset
- The work would merge, deploy, or stamp APP

**Post-apply (catalog only, after a future approved apply):**

1. `private.ref_*` counts for `sl-ref-20261013-227b573` = 25 / 151 / 236 / 135 / 576 / 556 / 14048 / 88 / 236 / 16
2. RLS on; no anon/authenticated SELECT on `ref_*`
3. 17 new `public.catches` columns exist and are nullable; `iv_*` / `moves` / `friendship` names unchanged
4. LIVE API `Accept-Profile: private` still **406 PGRST106**
5. **No** catch-row SELECT. **No** RPCs. **No** GENVAL

---

## 6. Owner GO / NO-GO

| Field | Recorded |
|---|---|
| Explicit A19-APPLY GO | **Not given** |
| Explicit NO-GO | **Not given** |
| This prompt | **Not authorization** |

Required reply format (separate message):

- `A19-APPLY GO: 001 → seed 00–10 → 002 only. Freshest COMPLETED = …`
- or `A19-APPLY NO-GO`

Anything else, including this handoff prompt, is **not** a go.

---

## Prior confirmed facts (not re-run this batch)

| Fact | Class |
|---|---|
| PostgREST `private` not exposed (`PGRST106`) | LIVE API (#24) |
| Catalog compatible; 17 catch columns absent; no `ref_*` | LIVE CATALOG (#24) |
| Local rehearsal 17/17 | REAL SQL (#23, localhost) |
| PITR disabled | OWNER REPORT (D33) |

---

A19-APPLY remains **UNAPPROVED**. Handoff **BLOCKED** on missing GO/NO-GO and an unreconfirmed freshest COMPLETED backup. STOP.

---

**Later (D35 snapshot pointer):** Owner GO applied the named sequence. See [GEN-IX-APPLY-REPORT.md](./GEN-IX-APPLY-REPORT.md). This file remains the D34 BLOCKED handoff.
