# A19-WIRE-APPLY report (D49)

**Verdict: APPLIED.** Catalog-only verification **LIVE CATALOG PASS**. Not REAL RPC. Not production gameplay smoke. Switch remains **false**.

Owner GO authorized hashed `001` → `002` → `003` as role `postgres` on project `dtflmlbjhttoewqgkujf` only. A19-WIRE-GO (switch on) is **not** authorized.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused. Catch rows were not read or written.

Production APP `20261008-rc133` unchanged. Final release smoke remains paused.

---

## Authorization

| Field | Value |
|---|---|
| Decision | Complete owner **A19-WIRE-APPLY GO** (not a template) |
| Role | `postgres` (`current_user` / `session_user` both `postgres`) |
| Project | `dtflmlbjhttoewqgkujf` / starlight-play / us-west-1 / PG **17.6.1.166** / ACTIVE_HEALTHY |
| Branch | `admin-hub-overhaul` at apply-time `2f60efda` |
| Backup acknowledged | Last Dashboard-confirmed COMPLETED snapshot predates D35; PITR disabled |
| Recovery | Failed apply = STOP; no automatic restore or rollback script |

---

## Artifacts and hashes (disk re-checked immediately before apply)

| File | SHA-256 | Remote migration |
|---|---|---|
| `supabase/unapplied/a19-wire/001_wire_switch_and_persist.sql` | `efca33ea6757e308262d0f3aec781fa0cb71e1ac907bb90fa2d142beb32d8d4e` | `20261015025732` `a19_wire_001_switch_and_persist` |
| `supabase/unapplied/a19-wire/002_materialize_hook.sql` | `1e21ba666bce44c24567d9e9b8404d8e39a683005432b419a3b1bcfe9afd8ce4` | `20261015025754` `a19_wire_002_materialize_hook` |
| `supabase/unapplied/a19-wire/003_settle_integration.sql` | `1bc62eb24f27204e52f01fe66a871c320da459df7d933c9054f7d67e57edfe68` | `20261015025816` `a19_wire_003_settle_integration` |

Each source file was one MCP `apply_migration` transaction (`BEGIN`/`COMMIT` stripped only). Not split. Not copied into `supabase/migrations/`. Local `040` / fixtures were **not** installed.

---

## Preflight (read-only)

| Check | Result |
|---|---|
| Disk hashes vs GO | **PASS** |
| Project / role | **PASS** — `dtflmlbjhttoewqgkujf`, `postgres` |
| D43 GENVAL (17 functions) + `ref_*` + pin `sl-ref-20261013-227b573` | **PASS** |
| Live `settle_if_needed` vs D47 baseline | **PASS** — still form-aware `INSERT … ON CONFLICT DO NOTHING`; `src_md5=4af9fc067935acc7bb9a0dc5bd0f3783` |
| `stamp_catch_row` | **PASS** — `src_md5=716d8b76519ced3d05e3584c7869dd93` (D43 fingerprint) |
| Unique indexes `catches_round_user_uidx` / `catches_source_key_uidx` | **PASS** |
| Unexpected WIRE objects / `a19_wire_*` migrations | **PASS** — none before apply |

---

## LIVE CATALOG verification (no gameplay calls)

| Check | Result |
|---|---|
| WIRE helpers exist, owner `postgres`, `SECURITY DEFINER` | **PASS** — `wire_is_enabled`, `wire_set_enabled`, `protected_trainer`, `next_public_id`, `complete_and_bind`, `complete_specimen_bound`, `persist_streamlink_catch`, `materialize_streamlink_catch` |
| EXECUTE anon / authenticated / service_role / public on those helpers | **false** |
| `private.streamlink_wire_switch` | **PASS** |
| Switch `enabled` | **false** |
| RLS / FORCE RLS | **true** / **true** |
| Table SELECT/INSERT/UPDATE anon / authenticated / service_role | **false** |
| Policy | `streamlink_wire_switch_owner` |
| `settle_if_needed` | calls `materialize_streamlink_catch`; has `already-settled-without-catch`; no test hook; `src_md5=0c6bf2fb2ca740415fffc567c362192a` |
| `stamp_catch_row` | **unchanged** `716d8b76519ced3d05e3584c7869dd93` |
| `play_throw` / `play_prepare` | **unchanged** `a0f7f0884416c3caacda751f4bcaaef7` / `90c8243558f1a92597e2be1730cb18a0` |
| Test hook / inject / rehearsal opener | **absent** |
| Public wrappers for persist/materialize/switch | **none** |

`settle_if_needed` and `stamp_catch_row` retain their **pre-existing** EXECUTE grants (they were not new WIRE helpers; 003 did not REVOKE them). No new public wrappers were added.

Honesty: **LIVE CATALOG PASS**. Not REAL RPC. Not PRODUCTION smoke.

---

## Still UNAPPROVED

- **A19-WIRE-GO** (flip `private.streamlink_wire_switch.enabled`)
- Hosted generate / persist / materialize execution
- Catch-row reads, Sora/Twinkle tests, staff grants
- A19-RESET-GO, rollback scripts, restore
- Merge to `main`, deploy, APP stamp

**STOP for a separate explicit A19-WIRE-GO.**
