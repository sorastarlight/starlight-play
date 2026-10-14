# A19-APPLY schema-only report (GitHub issue #24 / D35)

**Verdict: APPLIED.** Owner GO authorized `001` → seed `00`–`10` → `002` only. Catalog-only verification **PASS**.

`003_rollback.sql` was **not** run. GENVAL / WIRE / reset / merge / deploy / APP stamp were **not** started. SQL was **not** copied into `supabase/migrations/` on the branch. No restore was initiated.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.

---

## 1. Owner GO (this batch)

| Field | Recorded |
|---|---|
| Decision | **GO** |
| Freshest COMPLETED backup | **14 Oct 2026 07:44:26 (+0000)** (OWNER REPORT; same stamp as D33) |
| PITR | **Disabled** |
| Restore understanding | Owner was told: restoring that daily backup rewinds the **entire** PostgreSQL database and discards every write after T |
| Authorized sequence | `001_private_ref_tables.sql` → seed `00` through `10` → `002_catches_nullable_extensions.sql` |
| Explicitly not authorized | `003`, GENVAL, WIRE, catch UPDATEs, Pokémon/account mutations, merge, deploy, APP stamp |

---

## 2. Immediate pre-execution confirmations

| Check | Result | Class |
|---|---|---|
| Project identity | `dtflmlbjhttoewqgkujf` / **starlight-play** / `us-west-1` / PG **17.6.1.166** / **ACTIVE_HEALTHY** / org `wobmfnafsgfluplonnso` | LIVE PLATFORM |
| Artifact checksums | Unchanged since #23 `cc66946b` (see §3) | STATIC |
| Backup availability | Owner-named COMPLETED `2026-10-14 07:44:26 +0000`; PITR off; Pro daily window | OWNER REPORT |
| Maintenance window | Owner issued GO now. `admin_overview` was **not** called (standing forbid). Idle-stream not independently proven. | OWNER GO |
| Latest remote migration before apply | `20261011024514_gate_2a_r_identity_inspect_true_read` | LIVE CATALOG |

---

## 3. Artifact pin (STATIC — unchanged)

| Artifact | SHA-256 |
|---|---|
| Pin | `sl-ref-20261013-227b573` |
| `001_private_ref_tables.sql` | `61a86ed041a3c2e51788c9cf5e49cd4bfdf06e5932f906254ea94c14e0fe9a30` |
| `002_catches_nullable_extensions.sql` | `855b813a437ab41a890cadaabaf0c006ca194b37abfc272e7c3da1426e03d932` |
| `003_rollback.sql` (not run) | `54fd5c6f69239a9ef81aae7051c255a3c5f1e97b891f5045994752f5cc840208` |

Source files remain under `supabase/unapplied/a19-schema/`. `seed/manifest.json` still has `appliedToSupabase: false` because those files were **not** copied into `supabase/migrations/`. Remote history used MCP `apply_migration` / `execute_sql` names `a19_apply_*`.

---

## 4. What ran on production

Remote `supabase_migrations` rows added:

| Version | Name |
|---|---|
| `20261014155507` | `a19_apply_001_private_ref_tables` |
| `20261014155521` | `a19_apply_seed_00_meta` |
| `20261014155536` | `a19_apply_seed_01_natures` |
| `20261014155717` | `a19_apply_seed_04_abilities` |
| `20261014165331` | `a19_apply_002_catches_nullable_extensions` |

DML seeds applied with `execute_sql` (ON CONFLICT upsert / do-nothing; empty `[]` = success):

- `02_species` (151)
- `03_forms` (second INSERT 10159–10281, then first INSERT 1–10158)
- `05_form_abilities`
- `06_moves` (3 INSERT blocks)
- `07_learnsets` parts `00`–`35` (14,048 rows)
- `08_evolutions`
- `09_obtain` (2 INSERT blocks)
- `10_form_policies`

`04` before `03` is safe (no FK from abilities to forms). `BEGIN`/`COMMIT` wrappers were stripped on DDL `apply_migration` calls.

**Not run:** `003_rollback.sql`, GENVAL, WIRE, catch-row SELECT, RPCs, restore, GRANT of `ref_*`, `NOTIFY pgrst` to expose `private`.

---

## 5. Catalog-only post-apply verification

Expected pin counts for `sl-ref-20261013-227b573`: 25 / 151 / 236 / 135 / 576 / 556 / 14048 / 88 / 236 / 16.

| Check | Result | Class |
|---|---|---|
| `ref_natures` / `ref_species` / `ref_forms` / `ref_abilities` | 25 / 151 / 236 / 135 | LIVE CATALOG |
| `ref_form_abilities` / `ref_moves` / `ref_learnsets` | 576 / 556 / **14048** | LIVE CATALOG |
| `ref_evolutions` / `ref_obtain` / `ref_form_policies` | 88 / 236 / 16 | LIVE CATALOG |
| `ref_meta` pin | `sl-ref-20261013-227b573` (1 row) | LIVE CATALOG |
| RLS on all 10 `private.ref_*` tables | **ON** | LIVE CATALOG |
| Policies on `private.ref_*` | **none** (fail-closed: RLS + no policy + REVOKE) | LIVE CATALOG |
| anon / authenticated SELECT INSERT UPDATE DELETE on `ref_*` | **all false** | LIVE CATALOG |
| 17 new `public.catches` columns | present, `is_nullable=YES` | LIVE CATALOG |
| New CHECK constraints | nature / ability_slot / 6 EV ranges / EV total / move_slots / hp_ok | LIVE CATALOG |
| FK from `catches` to `private.ref_*` | **none** (existing FKs to `pokemon_forms` / rounds / profiles unchanged) | LIVE CATALOG |
| `private.stamp_catch_row` | still present (not rewritten) | LIVE CATALOG |
| PostgREST `Accept-Profile: private` | **406 PGRST106** `Invalid schema: private` | LIVE API |

17 nullable columns: `nature_id`, `ability_id`, `ability_slot`, `ev_hp`, `ev_atk`, `ev_def`, `ev_spa`, `ev_spd`, `ev_spe`, `move_slots`, `ruleset_id`, `content_build`, `hp_current`, `hp_max`, `status`, `held_item`, `gigantamax_factor`.

**No** catch-row SELECT. **No** RPCs. New catch columns stay NULL on existing rows (not counted).

---

## 6. Still blocked (do not start)

- **A19-GENVAL** — generator / validator functions
- **A19-WIRE** — launch / settle / grant / evolve
- `003_rollback.sql` (would drop `ref_*` and the 17 columns)
- Restore of `2026-10-14 07:44:26 UTC` (whole-DB rewind; needs a **separate** restore authorization)
- Merge to `main`, deploy, APP stamp (`20261008-rc133`)
- Pokémon / account mutations, including Sora and Twinkle
- Adding `private` to PostgREST exposed schemas

---

## 7. Owner review

A19-APPLY schema-only is **done**. Existing Pokémon are unchanged. Play still uses the old generator path. STOP here.

Next gate, if wanted: **A19-GENVAL** (new authorization). Do not treat this report as GENVAL, WIRE, or restore approval.
