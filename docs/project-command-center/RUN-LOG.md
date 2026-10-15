# Run log

## 2026-10-14 — A19-GENVAL recovery-runbook correction (D41, production apply UNAPPROVED)

- Branch: `admin-hub-overhaul`. Independent D40 review of `ec54d159` required the GENVAL-APPLY recovery runbook to stop automatic-restore language.
- Failed apply or catalog verification is now **STOP + owner notification**. Every restore needs a later named-timestamp authorization and data-loss assessment.
- Recorded backup `2026-10-14 07:44:26 UTC` **predates D35**; restoring it would undo A19-SCHEMA and all later database activity. `002_rollback.sql` is not an automatic fallback.
- SQL artifacts and SHA-256 values unchanged. No hosted catalog rerun. No local rehearsal rerun (D40 15/15 still the last REAL SQL).
- Did **not** apply SQL, restore, write catches, start WIRE, merge, deploy, or stamp APP.
- Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- Production GENVAL apply remains **UNAPPROVED**. STOP for a separate explicit GENVAL-APPLY decision.

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/a19-genval-spec-tests.js` | STATIC + LOCAL HARNESS | 6 passed |
| `tests/a19-genval-impl-tests.js` | STATIC | 6 passed |
| `tests/admin-hub-overhaul-tests.js` | STATIC | 27 passed |
| Hosted writes / restore / WIRE / PRODUCTION | — | **not run** |

---

## 2026-10-14 — A19-GENVAL production compatibility + apply checklist (D40, production apply UNAPPROVED)

- Branch: `admin-hub-overhaul` at `ec54d159`. Independent D39 review of `278d225c` asked for a read-only compatibility + deployment runbook. This is **not** GENVAL-APPLY.
- Production `001` remains additive (no DROP, no fixture generate). SHA-256 `6f7bca74c4fe57cc50cd65978d8b96c0936078c2b9bdca0ddc21d93e75e0d58a`.
- LIVE PLATFORM: `dtflmlbjhttoewqgkujf` ACTIVE_HEALTHY, Postgres 17.6.1.166. LIVE CATALOG: `pgcrypto` 1.3 in `extensions`; digest + `gen_random_uuid` present; no GENVAL functions/table; `stamp_catch_row` owner `postgres`; pin `sl-ref-20261013-227b573`. No catch-row SELECT.
- REAL SQL reconfirm: `node tools/a19-genval-rehearsal.js` — **15/15 PASS** on `127.0.0.1:55433/a19_genval` (exact `001`, fixtures installed separately).
- WIRE boundary documented: ticket authorization must bind a unique persisted catch/specimen identity; combat digest alone is not sufficient. WIRE not implemented.
- Did **not** apply SQL, create functions, run the generator on hosted Supabase, write catches, start WIRE, create/restore backups, merge, deploy, or stamp APP.
- Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused. `stamp_catch_row` still the live generator.
- Production GENVAL apply remains **UNAPPROVED**. STOP for a separate explicit GENVAL-APPLY decision.

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/a19-genval-spec-tests.js` | STATIC + LOCAL HARNESS | 6 passed |
| `tests/a19-genval-impl-tests.js` | STATIC | 6 passed |
| `tests/admin-hub-overhaul-tests.js` | STATIC | 26 passed |
| `tools/a19-genval-rehearsal.js` | REAL SQL (127.0.0.1) | 15/15 passed |
| Hosted writes / WIRE / PRODUCTION | — | **not run** |

---

## 2026-10-14 — A19-GENVAL specimen binding + additive install (D39, production apply UNAPPROVED)

- Branch: `admin-hub-overhaul` at `278d225c`. Independent review of `67141ec3` required digest-bound tickets, non-destructive `001`, and local-only fixtures.
- Tickets store `specimen_digest` at redeem. Assert matches digest; JSON markers ignored. Failed generate does not consume. Concurrent redeem is single-winner.
- Production `001` has no DROP TABLE/FUNCTION. Fixture generate is `local/010_fixture.sql` only.
- REAL SQL: `node tools/a19-genval-rehearsal.js` — **15/15 PASS** on `127.0.0.1:55433/a19_genval`.
- Did **not** apply to live Supabase. Did not write catches. Did not start WIRE, 003, restore, merge, deploy, or APP stamp.
- Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused. `stamp_catch_row` still the live generator.
- Production GENVAL apply remains **UNAPPROVED**. STOP for independent review.

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/a19-genval-spec-tests.js` | STATIC + LOCAL HARNESS | 6 passed |
| `tests/a19-genval-impl-tests.js` | STATIC | 5 passed |
| `tests/admin-hub-overhaul-tests.js` | STATIC | 25 passed |
| `tools/a19-genval-rehearsal.js` | REAL SQL (127.0.0.1) | 15/15 passed |
| Hosted Supabase / WIRE / PRODUCTION | — | **not run** |

---

## 2026-10-14 — A19-GENVAL security corrections (D38, production apply UNAPPROVED)

- Branch: `admin-hub-overhaul` at `67141ec3`. Independent review of `b4cf2cc0` required ticket/entropy/validator/move fixes. Still **branch-only**.
- Hidden: `issue_streamlink_hidden_ticket` + atomic redeem; JSON `hiddenGrant` ignored; replay/expiry/wrong-ctx fail.
- Entropy: production `generate_streamlink_mon` uses `gen_random_uuid` and ignores `p_seed` and session GUCs. Fixture generate is a separate REVOKE'd function.
- Validator: typed JSON ints; required IV/EV/HP fields; structured errors; move VG/method/level/PP/duplicates.
- REAL SQL: `node tools/a19-genval-rehearsal.js` — **13/13 PASS** on `127.0.0.1:55433/a19_genval`.
- Did **not** apply to live Supabase. Did not write catches. Did not start WIRE, 003, restore, merge, deploy, or APP stamp.
- Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused. `stamp_catch_row` still the live generator.
- Production GENVAL apply remains **UNAPPROVED**. STOP for independent review.

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/a19-genval-spec-tests.js` | STATIC + LOCAL HARNESS | 6 passed |
| `tests/a19-genval-impl-tests.js` | STATIC | 5 passed |
| `tests/admin-hub-overhaul-tests.js` | STATIC | 25 passed |
| `tools/a19-genval-rehearsal.js` | REAL SQL (127.0.0.1) | 13/13 passed |
| Hosted Supabase / WIRE / PRODUCTION | — | **not run** |

---

## 2026-10-14 — A19-GENVAL branch-only implementation (D37, production apply UNAPPROVED)

- Branch: `admin-hub-overhaul` at `b4cf2cc0`. Owner authorized **branch-only** functions + isolated local rehearsal. GV1–GV7 locked.
- Artifacts: `supabase/unapplied/a19-genval/` (`001`, `002`, `DO-NOT-APPLY.md`). Not copied into `migrations/`. Not applied to `dtflmlbjhttoewqgkujf`.
- Functions: `private.generate_streamlink_mon`, `private.assert_streamlink_legal`. Hidden tickets table RLS+REVOKE. `p_allow_hidden` ignored. `stamp_catch_row` not modified.
- REAL SQL: `node tools/a19-genval-rehearsal.js` — **12/12 PASS** on embedded Postgres `127.0.0.1:55433/a19_genval`. JS oracle match. G1/C1 fail-closed. Articuno grant friendship 35. Production nonce required; seed≠round_id.
- Corrections: PL/pgSQL name clashes; `array_append`; ticket **forces** hidden slot instead of rolling it.
- Did **not** apply to live Supabase. Did not INSERT/UPDATE/DELETE catches. Did not start WIRE, 003, restore, merge, deploy, or APP stamp.
- Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused. `stamp_catch_row` still the live generator.
- Production GENVAL apply remains **UNAPPROVED**. STOP for independent review.

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/a19-genval-spec-tests.js` | STATIC + LOCAL HARNESS | 6 passed |
| `tests/a19-genval-impl-tests.js` | STATIC | 5 passed |
| `tests/admin-hub-overhaul-tests.js` | STATIC | 25 passed |
| `tools/a19-genval-rehearsal.js` | REAL SQL (127.0.0.1) | 12/12 passed |
| Hosted Supabase / WIRE / PRODUCTION | — | **not run** |

---

## 2026-10-14 — A19-GENVAL specification (D36, implementation UNAPPROVED)

- Branch: `admin-hub-overhaul`. Planning and offline test design only.
- Reconciled LIVE CATALOG `list_migrations`: five `a19_apply_*` rows match D35; no generator/validator migration. Seeds `02`/`03`/`05`–`10` remain execute_sql-only.
- Spec: `GEN-IX-GENVAL-SPEC.md` at `34f3797d`. Fixtures: `tests/fixtures/a19-genval/matrix.json`.
- Did **not** CREATE `generate_streamlink_mon` / `assert_streamlink_legal`. Did not copy SQL into `migrations/`. Did not call stamp, settle, grant, evolve, or catch-row SELECT.
- Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused. `stamp_catch_row` still the live generator.
- A19-GENVAL remains **UNAPPROVED**. Open owner questions A19-GV1–GV7.

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/a19-genval-spec-tests.js` | STATIC + LOCAL HARNESS | 6 passed |
| `tests/a19-apply-report-tests.js` | STATIC | 4 passed |
| `tests/admin-hub-overhaul-tests.js` | STATIC | 25 passed |
| Function CREATE / catch-row / WIRE / PRODUCTION | — | **not run** |

---

## 2026-10-14 — GitHub issue #24 D35 owner GO schema-only A19-APPLY

- Branch: `admin-hub-overhaul`. Owner **GO** for `001_private_ref_tables.sql` → seed `00`–`10` → `002_catches_nullable_extensions.sql` only.
- Project `dtflmlbjhttoewqgkujf` / starlight-play / us-west-1 / PG 17.6.1.166 / ACTIVE_HEALTHY.
- Freshest COMPLETED backup **14 Oct 2026 07:44:26 (+0000)**. PITR **disabled**. Owner told: restore rewinds the entire PostgreSQL database and discards later writes. Restore was **not** initiated.
- `003_rollback.sql`, GENVAL, WIRE, catch-row SELECT, RPCs, merge, deploy, APP stamp: **not run**.
- Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- LIVE CATALOG: natures 25 / species 151 / forms 236 / abilities 135 / form_abilities 576 / moves 556 / learnsets 14048 / evolutions 88 / obtain 236 / form_policies 16 / meta pin `sl-ref-20261013-227b573`.
- 17 catch extension columns present, all nullable. No FK from `public.catches` to `private.ref_*`. RLS ON + zero policies (fail-closed). anon/authenticated DML all false.
- LIVE API: `Accept-Profile: private` → HTTP 406 `PGRST106`.
- Report: `GEN-IX-APPLY-REPORT.md`. D35 recorded at `7cc5a1f7`. R-I22-APPLY **CLOSED**. R-I24-BACKUP **CLOSED as apply blocker** (restore still needs separate auth).

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/a19-apply-report-tests.js` | STATIC | 4 passed |
| `tests/a19-apply-handoff-tests.js` | STATIC | 4 passed |
| `tests/a19-apply-decision-tests.js` | STATIC | 6 passed |
| `tests/a19-apply-preflight-tests.js` | STATIC | 5 passed |
| `tests/admin-hub-overhaul-tests.js` | STATIC | 24 passed |
| Catch-row / RPC / GENVAL / restore / PRODUCTION smoke | — | **not run** |

---

## 2026-10-14 — GitHub issue #24 D34 A19-APPLY go/no-go handoff (BLOCKED)

- Branch: `admin-hub-overhaul`. Documentation only. No DDL/DML, catch-row SELECT, RPC, backup create/restore, `003`, copy into `migrations/`, wipe, merge, deploy, or APP stamp.
- Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- STATIC: DDL/seed/pin checksums unchanged since `cc66946b`.
- Owner GO/NO-GO: **none**. Freshest COMPLETED backup: **not reconfirmed** (last known D33 `2026-10-14 07:44:26 UTC`; PITR disabled).
- This prompt is **not** A19-APPLY authorization. Verdict **BLOCKED**.
- Handoff: `GEN-IX-APPLY-HANDOFF.md`. D34 recorded.

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/a19-apply-handoff-tests.js` | STATIC | 4 passed |
| `tests/a19-apply-decision-tests.js` | STATIC | 6 passed |
| `tests/admin-hub-overhaul-tests.js` | STATIC | 23 passed |
| Catch-row / RPC / backup / PRODUCTION apply | — | **not run** |

## 2026-10-14 — GitHub issue #24 D33 owner backup evidence (apply still UNAPPROVED)

- Branch: `admin-hub-overhaul`. Documentation only. No DDL/DML, catch-row SELECT, RPC, backup create/restore, copy into `migrations/`, wipe, merge, deploy, or APP stamp.
- Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- OWNER REPORT: latest COMPLETED scheduled backup **2026-10-14 07:44:26 +0000**. **PITR disabled**.
- Restore rewinds all Postgres writes after T. Not independently listed via Management API.
- D33 recorded. A19-APPLY remains **UNAPPROVED** pending a separate explicit go.
- Packet: `GEN-IX-APPLY-DECISION.md`. R-I24-BACKUP **MITIGATED**.

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/a19-apply-decision-tests.js` | STATIC | 6 passed |
| `tests/a19-apply-preflight-tests.js` | STATIC | 5 passed |
| `tests/admin-hub-overhaul-tests.js` | STATIC | 23 passed |
| Catch-row / RPC / backup / PRODUCTION apply | — | **not run** |

## 2026-10-14 — GitHub issue #24 A19-APPLY decision packet (backup BLOCKED)

- Branch: `admin-hub-overhaul`. Documentation only. No DDL/DML, catch-row SELECT, RPC, backup create/restore, copy into `migrations/`, wipe, merge, deploy, or APP stamp.
- Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- D32: pin/seed/DDL checksums match disk and are unchanged since #23 `cc66946b`. Issue #24 has no owner COMPLETED backup timestamp or PITR confirmation.
- Verdict: backup gate **BLOCKED**. A19-APPLY remains **UNAPPROVED**.
- Packet: `GEN-IX-APPLY-DECISION.md`.

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/a19-apply-decision-tests.js` | STATIC | 6 passed |
| `tests/a19-apply-preflight-tests.js` | STATIC | 5 passed |
| `tests/a19-schema-tests.js` | STATIC / LOCAL HARNESS | 9 passed |
| `tests/admin-hub-overhaul-tests.js` | STATIC | 23 passed |
| Catch-row / RPC / backup / PRODUCTION apply | — | **not run** |

## 2026-10-14 — GitHub issue #24 follow-up: PostgREST + backup + apply checklist

- Branch: `admin-hub-overhaul`. Read-only. No DDL/DML, catch-row SELECT, RPC, backup create, restore, wipe, merge, deploy, or APP stamp.
- Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- D31: PostgREST `private` **not exposed**. LIVE API `Accept-Profile: private` → **406 PGRST106**. Default REST `PGRST205` for `public.stream_bridge`.
- Backup: org plan **Pro** (automatic 7-day daily backups per docs). PITR add-on and exact COMPLETED timestamps **UNKNOWN** (no Management API token). `archive_mode=on` is not PITR proof.
- A19-APPLY remains **UNAPPROVED**. Checklist: `GEN-IX-APPLY-CHECKLIST.md`.
- R-I24-PGRST **CLOSED**. R-I24-BACKUP **OPEN**.

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/a19-apply-preflight-tests.js` | STATIC | 5 passed |
| `tests/admin-hub-overhaul-tests.js` | STATIC | 23 passed |
| REST `Accept-Profile: private` | LIVE API | `PGRST106` (no row bodies) |
| Catch-row / RPC / backup create / PRODUCTION apply | — | **not run** |

## 2026-10-14 — GitHub issue #24 A19-APPLY read-only production preflight

- Branch: `admin-hub-overhaul`. Catalog metadata only on `dtflmlbjhttoewqgkujf`. No DDL/DML, catch-row SELECT, RPC, wipe, merge, deploy, or APP stamp.
- Sora mutated NO · Twinkle mutated NO · QA account none. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- D29 authorized the preflight. D30 records delivery. A19-APPLY / GENVAL+ remain blocked.
- Catalog compatible: no `ref_*` tables; 17 catch extensions absent; `reltuples≈110`.
- UNKNOWN: PostgREST exposed schemas; backup/PITR.
- Report: `GEN-IX-PRODUCTION-PREFLIGHT.md`.

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/a19-apply-preflight-tests.js` | STATIC | 3 passed |
| Production catalog SELECTs | LIVE CATALOG | inspected; not an apply |
| Catch-row / RPC / PRODUCTION apply | — | **not run** |

## 2026-10-13 — GitHub issue #23 A19-SCHEMA local PostgreSQL rehearsal

- Branch: `admin-hub-overhaul`. Disposable embedded Postgres on `127.0.0.1:55432` only. Pin 220/16 unchanged. No live SQL, RPC, wipe, merge, deploy, or APP stamp.
- Sora mutated NO · Twinkle mutated NO · QA account none. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- D27 authorized the rehearsal. D28 records delivery. A19-APPLY / GENVAL+ remain blocked.
- SQL fix: `evo_uid` now includes pin index so regional-form duplicate species edges do not collide in one INSERT.
- Report: `GEN-IX-SCHEMA-REHEARSAL.md`.

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/a19-schema-rehearsal-tests.js` | STATIC | 5 passed |
| `tests/a19-schema-tests.js` | STATIC / LOCAL HARNESS | 9 passed |
| `tools/a19-schema-rehearsal.js` | REAL SQL | 17 passed (embedded local) |
| Connected Supabase | PRODUCTION | **not run** |

## 2026-10-13 — GitHub issue #22 A19-SCHEMA unapplied artifacts

- Branch: `admin-hub-overhaul`. Schema files only. Pin 220/16 unchanged. No live SQL, RPC, wipe, merge, deploy, or APP stamp.
- Sora mutated NO · Twinkle mutated NO · QA account none. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- D26 recorded. A19-APPLY / GENVAL+ blocked. G1/C1/F1 encoded in seed/policies only.
- Artifacts: `supabase/unapplied/a19-schema/`. Not in `migrations/`.

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/a19-schema-tests.js` | STATIC / LOCAL HARNESS | 8 passed |
| `tests/gen9-ref-tests.js` | LOCAL HARNESS | 12 passed |
| `tests/admin-hub-overhaul-tests.js` | STATIC | 21 passed |
| Isolated Postgres | REAL SQL | **not run** — no local psql/docker |

## 2026-10-13 — GitHub issue #21 A19-REF readiness review

- Branch: `admin-hub-overhaul`. Review only. Pin checksums unchanged (220/16). `admin-next.html` unchanged. No live SQL, RPC, wipe, merge, deploy, or APP stamp.
- Sora mutated NO · Twinkle mutated NO · QA account none. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- D22 authorized the review. D23 records delivery. A19-SCHEMA still blocked. Proposed G1/C1/F1 not authorized.
- Review: `GEN-IX-REF-READINESS-REVIEW.md`. Proposed SQL: `supabase/unapplied/a19-ref-review/` (not applied).

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/gen9-ref-tests.js` | LOCAL HARNESS | 12 passed |
| `tests/gen9-ref-readiness-tests.js` | LOCAL HARNESS | 8 passed |
| `tests/admin-hub-overhaul-tests.js` | STATIC | 20 passed |

## 2026-10-13 — GitHub issue #20 A19-REF offline pin

- Branch: `admin-hub-overhaul`. Offline pin + unapplied SQL only. `admin-next.html` unchanged. No live SQL, RPC, wipe, replacement, merge, deploy, or APP stamp.
- Sora mutated NO · Twinkle mutated NO · QA account none. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- D21 recorded. A19-SCHEMA+ blocked. A1/A10 open. A9 not authorized.
- Pin: `data/gen9-ref/` `sl-ref-20261013-227b573`. SQL: `supabase/unapplied/a19-ref/` (not in `migrations/`).

### Deliverable

- `GEN-IX-REF-ISSUE-20.md` — counts, Mega/regional/Gmax gaps, resolver
- 220 resolved / 16 unresolved (12 Gmax + 4 Champions megas)
- Regional 36/36; Mega 15/19 ORAS; base 151/151

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/gen9-ref-tests.js` | LOCAL HARNESS | 12 passed |
| `tests/admin-hub-overhaul-tests.js` | STATIC | 19 passed |

## 2026-10-13 — GitHub issue #19 Gen IX rebuild plan

- Branch: `admin-hub-overhaul`. Plan commit `5f3dad6`. Planning only after D17 / A16e. `admin-next.html` unchanged. No SQL, RPC, wipe, replacement, merge, deploy, or APP stamp.
- Sora mutated NO · Twinkle mutated NO · QA account none. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- D18 recorded. A19-Q1–Q6 and A19-REF…RESET-GO need owner. A1/A10 open. A9 not authorized.
- LIVE CATALOG: FKs to `catches` are `oak_transfers`, `trade_listings`, `trade_offers`. No catch-row SELECT.

### Deliverable

- `GEN-IX-REBUILD-PLAN-ISSUE-19.md` — pin, generator, validator, inspector/editor, reset playbook, phased issues
- #16 errata: real LGPE has natures

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/admin-hub-overhaul-tests.js` | STATIC | 18 passed |

## 2026-10-13 — GitHub issue #16 Pokémon legality source audit

- Branch: `admin-hub-overhaul`. Audit commit `a3004d1`. Design/audit only. `admin-next.html` unchanged. No merge, deploy, SQL, staff-role, APP stamp, A9, Batch F, catch-row writes, #13, #14, #15, or #17.
- Sora mutated NO · Twinkle mutated NO · QA account none. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- D14 recorded. A16a–f need owner. A1 open. A8 direction stands. A9 not authorized.
- LIVE CATALOG: `public.catches` has IV/AV/moves columns; no nature/ability/EV. `lgpe_species` = 151. No `SELECT` of catch rows.

### Deliverable

- `POKEMON-LEGALITY-AUDIT-ISSUE-16.md` — pipeline, field matrix, LGPE ruleset, gaps, phased plan, audited editor design

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/admin-hub-overhaul-tests.js` | STATIC | 17 passed (after issue 16 assertion) |

## 2026-10-13 — GitHub issue #12 trainer record IA

- Branch: `admin-hub-overhaul`. Design commit `1048831`. Design only. `hub-a-visual-v4.html` kept for comparison. `admin-next.html` unchanged. No merge, deploy, SQL, staff-role, APP stamp, A9, Batch F, #13, or #14.
- Sora mutated NO · Twinkle mutated NO · QA account none. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- D13 recorded. A10 still needed. A1 open. A8 direction stands. A9 not authorized. Epic #11 children #13/#14 not started.

### Deliverables

- `design-reset/hub-a-visual-v5.html` — simplified header, Starlight Pass, Connections cards, Inventory/Unlockables managers, Tickets placement
- `TRAINER-RECORD-ISSUE-12.md` — field matrix (verified vs missing)

Preview: `http://127.0.0.1:4252/docs/project-command-center/design-reset/hub-a-visual-v5.html`  
Comparison: `http://127.0.0.1:4252/docs/project-command-center/design-reset/hub-a-visual-v4.html`

### REAL DOM (unsigned prototype)

Accessibility tree is the text source of truth. Browser-tool screenshots still garble Fredoka/Nunito.

| Frame | Notes |
|---|---|
| 1440 directory | Full-row hits. Column and chips say **Starlight Pass**. |
| 1440 Overview | Header: avatar initial, name, @login, role, Starlight Pass, last seen. No level/caught/coins facts. |
| 1440 Inventory | Category browser (Coins, Poké Balls, Consumables, Family candy). Bits unavailable. |
| 1440 PokéCoins detail | Quantity from bag.coins. Grant/Remove **disabled** storyboard. |
| 1440 Progression | Level/XP/ranking kept. Unlockables groups; Ribbons labeled future scope. |
| 1440 Connections | Per-link cards. Primary ≠ online. Confirmed ≠ Verified. Utility bot count explained. No unlink. |
| 1440 Tickets | Open/History placement. No ticket RPC. No invented cases. |
| 1440 collection | Official PNG, no dex overlay. Dex stays in detail (`#006`). Newest 40 ≠ PC. |
| 1024 Charizard detail | Same IA. Dex in text only. |
| 390 record / directory | Admin menu. Stacked Starlight Pass rows. Header without metric strip. |

Illustrative Oak / Leaf / Blue only.

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/admin-hub-overhaul-tests.js` | STATIC PASS | 16 |
| `tests/admin-hub-workspace-v2-tests.js` | STATIC PASS | 6 |
| `tests/admin-hub-gate-2a-trainer-tests.js` | STATIC PASS | 8 |
| `tests/admin-hub-next-tests.js` | STATIC PASS | 7 |
| `tests/admin-hub-gate-2a-r-identity-tests.js` | STATIC PASS | 12 |
| `tests/admin-hub-gate-17-s1-snapshot-tests.js` | STATIC PASS | 16 |
| `tests/admin-hub-gate-17-s1b-tests.js` | STATIC PASS | 5 |
| hub-a-visual-v5 1440 / 1024 / 390 | REAL DOM | unsigned static HTML |
| Live staff RPCs | **not run** | not authorized |
| Production | **not run** | smoke paused |

## 2026-10-13 — GitHub issue #10 trainer UX polish

- Branch: `admin-hub-overhaul`. Design commit `ed17c32`. Design only. `hub-a-visual-v3.html` kept for comparison. `admin-next.html` unchanged. No merge, deploy, SQL, staff-role, APP stamp, A9, or Batch F.
- Sora mutated NO · Twinkle mutated NO · QA account none. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- D12 recorded. A10 still needed. A1 open. A8 direction stands. A9 not authorized.

### Deliverables

- `design-reset/hub-a-visual-v4.html` — official PNG art, raised nav, full-row directory
- `TRAINER-UX-ISSUE-10.md` — artwork source, fallback, future A9 note

Preview: `http://127.0.0.1:4252/docs/project-command-center/design-reset/hub-a-visual-v4.html`  
Comparison: `http://127.0.0.1:4252/docs/project-command-center/design-reset/hub-a-visual-v3.html`

### REAL DOM (unsigned prototype)

Accessibility tree is the text source of truth. Browser-tool screenshots still garble Fredoka/Nunito.

| Frame | Notes |
|---|---|
| 1440 Operations | Raised hub nav. Admin menu hidden on desktop. |
| 1440 directory | Full-width `dir-hit` buttons. Avatar, name, last-seen, and empty space are one target. |
| 1440 Overview | Raised **All trainers**. |
| 1440 collection | Official PNG thumbs. Shiny Charizard is the black official art, not the normal form. |
| 1440 Charizard detail | 128px shiny PNG. Raised **Back to Pokémon**. Contract fields only. |
| 390 directory | Stacked labels. Full-row buttons. Admin menu. |

Art URLs are dex + shiny only. Illustrative Oak / Leaf / Blue only.

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/admin-hub-overhaul-tests.js` | STATIC PASS | 15 |
| `tests/admin-hub-workspace-v2-tests.js` | STATIC PASS | 6 |
| `tests/admin-hub-gate-2a-trainer-tests.js` | STATIC PASS | 8 |
| `tests/admin-hub-next-tests.js` | STATIC PASS | 7 |
| `tests/admin-hub-gate-2a-r-identity-tests.js` | STATIC PASS | 12 |
| `tests/admin-hub-gate-17-s1-snapshot-tests.js` | STATIC PASS | 16 |
| `tests/admin-hub-gate-17-s1b-tests.js` | STATIC PASS | 5 |
| hub-a-visual-v4 directory / collection / detail | REAL DOM | unsigned static HTML |
| Live staff RPCs | **not run** | not authorized |
| Production | **not run** | smoke paused |

## 2026-10-13 — GitHub issue #9 Pokémon collection UX

- Branch: `admin-hub-overhaul`. Design commit `f3d95ff`. Design only. `hub-a-visual-v2.html` kept for comparison. `admin-next.html` unchanged. No merge, deploy, SQL, staff-role, APP stamp, A9, or Batch F.
- Sora mutated NO · Twinkle mutated NO · QA account none. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- D11 recorded. A10 still needed for visual target. A1 open. A8 direction stands. A9 not authorized.

### Deliverables

- `design-reset/hub-a-visual-v3.html` — concise clickable collection + read-only detail
- `POKEMON-UX-ISSUE-9.md` — contract fields, before/after, progressive-disclosure notes

Preview: `http://127.0.0.1:4252/docs/project-command-center/design-reset/hub-a-visual-v3.html`  
Comparison: `http://127.0.0.1:4252/docs/project-command-center/design-reset/hub-a-visual-v2.html`

### REAL DOM (unsigned prototype)

Accessibility tree is the text source of truth. Browser-tool screenshots still garble Fredoka/Nunito.

| Frame | Notes |
|---|---|
| 1440 collection | Concise rows. No Lv./date column. Shiny chip. Sparky nickname. Long Rattata nickname. Chevron. Scrollable newest-40 list. |
| 1440 Charizard detail | Back to Pokémon. Species, #006, nickname unavailable, shiny, M, 40, Ultra Ball, 22 Sep 2026. |
| 1440 Magikarp missing | Nickname, gender, caught **unavailable**. Level and Poké Ball present. |
| 1440 / 390 Leaf empty | No live Pokémon. Full PC still unavailable. |
| 1024 collection / Sparky | Same IA. Nickname Sparky · species Pikachu. |
| 390 Sparky detail | Stacked kv. Back to Pokémon. |

Rows are native buttons. Back restores the collection. Illustrative Oak / Leaf only.

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/admin-hub-overhaul-tests.js` | STATIC PASS | 14 |
| `tests/admin-hub-workspace-v2-tests.js` | STATIC PASS | 6 |
| `tests/admin-hub-gate-2a-trainer-tests.js` | STATIC PASS | 8 |
| `tests/admin-hub-next-tests.js` | STATIC PASS | 7 |
| `tests/admin-hub-gate-2a-r-identity-tests.js` | STATIC PASS | 12 |
| `tests/admin-hub-gate-17-s1-snapshot-tests.js` | STATIC PASS | 16 |
| `tests/admin-hub-gate-17-s1b-tests.js` | STATIC PASS | 5 |
| hub-a-visual-v3 collection / detail | REAL DOM | unsigned static HTML |
| Live staff RPCs | **not run** | not authorized |
| Production | **not run** | smoke paused |

## 2026-10-13 — GitHub issue #8 Proposal A visual refinement

- Branch: `admin-hub-overhaul`. Design commit `fb85227`. Design only. `hub-a.html` kept for comparison. `admin-next.html` unchanged. No merge, deploy, SQL, staff-role, APP stamp, A9, or Batch F.
- Sora mutated NO · Twinkle mutated NO · QA account none. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- D10 recorded. A10 needed for visual target. A1 open. A8 direction stands. A9 not authorized.

### Deliverables

- `design-reset/hub-a-visual-v2.html` — Play-site tokens, same Proposal A IA
- `VISUAL-STYLE-GUIDE-ISSUE-8.md` — tokens, motion, before/after

Preview: `http://127.0.0.1:4252/docs/project-command-center/design-reset/hub-a-visual-v2.html`  
Comparison: `http://127.0.0.1:4252/docs/project-command-center/design-reset/hub-a.html`

### REAL DOM (unsigned prototype)

Accessibility tree is the text source of truth. Browser-tool screenshots still garble Fredoka/Nunito.

| Frame | Notes |
|---|---|
| 1440 Operations | LIVE Twitch chip + pulse. RPG INACTIVE stays separate. Settlement unavailable. |
| 1440 directory | Full-width table. Pass chips. Compact last-seen. Hover/focus rows. |
| 1440 Overview | Oak identity + fact tiles. Email not shown. |
| 1440 Inventory | Bag 14/20 bar. Grouped balls / consumables / candy. Bits unavailable. |
| 1440 Progression | Unlock pills. All / Unlocked / Locked. Catalog collapsed. |
| 1440 Connections | Twitch flags. Link/unlink stay on Support. |
| 1440 Support | Oak context carried. Doorway only. No grants. |
| 1024 directory / Pokémon | Nav + body. Dex tiles, not sprites. Shiny chip on Charizard. |
| 1024 / 720 Leaf sparse | Unavailable facts. No invented last seen, level, or link. |
| 390 directory / Overview / Pokémon / Support | Admin menu. Stacked rows. All trainers restores the directory. |

Demo Ready / Loading / Empty / Denied exist in the prototype. Illustrative Oak / Leaf / Blue names only.

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/admin-hub-overhaul-tests.js` | STATIC PASS | 13 |
| `tests/admin-hub-workspace-v2-tests.js` | STATIC PASS | 6 |
| `tests/admin-hub-gate-2a-trainer-tests.js` | STATIC PASS | 8 |
| `tests/admin-hub-next-tests.js` | STATIC PASS | 7 |
| `tests/admin-hub-gate-2a-r-identity-tests.js` | STATIC PASS | 12 |
| `tests/admin-hub-gate-17-s1-snapshot-tests.js` | STATIC PASS | 16 |
| `tests/admin-hub-gate-17-s1b-tests.js` | STATIC PASS | 5 |
| hub-a-visual-v2 Operations / directory / record / Support | REAL DOM | unsigned static HTML |
| Live staff RPCs | **not run** | not authorized |
| Production | **not run** | smoke paused |

## 2026-10-13 — GitHub issue #7 Proposal A integrated spec

- Branch: `admin-hub-overhaul`. Design commit `9947c97`. Design only. `admin-next.html`, Workspace 2.0, and card fixtures unchanged. No merge, deploy, SQL, staff-role, APP stamp, or Batch F.
- Sora mutated NO · Twinkle mutated NO · QA account none. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- A8 **APPROVED** as design direction. A9 needed before implementation. A1 open. A7 not approved.

### Deliverables

- `DESIGN-SPEC-ISSUE-7.md` — shell, IA, components, states, file hazards, A9 plan
- `design-reset/hub-a.html` — Operations / Trainers index / record / Support in one shell

Preview: `http://127.0.0.1:4252/docs/project-command-center/design-reset/hub-a.html`

### REAL DOM (unsigned prototype)

Operations, Trainers directory, Oak record, Support-with-context at 1440. 390: nav behind Admin menu; Support context; All trainers restores stacked directory. Accessibility tree is the text source of truth (browser-tool fonts garbled).

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/admin-hub-overhaul-tests.js` | STATIC PASS | 12 |
| `tests/admin-hub-workspace-v2-tests.js` | STATIC PASS | 6 |
| `tests/admin-hub-gate-2a-trainer-tests.js` | STATIC PASS | 8 |
| `tests/admin-hub-next-tests.js` | STATIC PASS | 7 |
| `tests/admin-hub-gate-2a-r-identity-tests.js` | STATIC PASS | 12 |
| `tests/admin-hub-gate-17-s1-snapshot-tests.js` | STATIC PASS | 16 |
| `tests/admin-hub-gate-17-s1b-tests.js` | STATIC PASS | 5 |
| hub-a Operations / directory / record / Support | REAL DOM | unsigned static HTML |
| Live staff RPCs | **not run** | not authorized |
| Production | **not run** | smoke paused |

## 2026-10-13 — GitHub issue #6 Admin Hub design reset

- Branch: `admin-hub-overhaul`. Implementation commit `af437e8`. Design artifacts only. `admin-next.html` Trainers tab, Workspace 2.0 fixture, and card fixture unchanged. No merge, deploy, SQL, staff-role, APP stamp, or Batch F.
- Sora mutated NO · Twinkle mutated NO · QA account none. PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- A1 remains **open**. A7 is **not approved**. A8 (Proposal A vs B) needs owner.

### Deliverables

- `DESIGN-RESET-ISSUE-6.md` — task inventory, global IA, field map, visual system, research links
- `DESIGN-RESET-DECISION.md` — side-by-side + preferred hypothesis A
- `design-reset/proposal-a.html` — record workspace wireframes (1440 / 390, busy / sparse)
- `design-reset/proposal-b.html` — inbox split wireframes (1440 / 390, list / record)

Preferred local preview: `http://127.0.0.1:4252/docs/project-command-center/design-reset/index.html`

### REAL DOM (unsigned wireframes)

| Frame | Notes |
|---|---|
| A 1440 directory | Persistent Admin Hub nav. Full-width table. Trainer rows are buttons. Compact dates. Leaf last seen unavailable. |
| A 1440 Overview | Directory gone. All trainers + facts + account fields. No email address. |
| A Pokémon | Newest-40 note; Venusaur / Charizard / Blastoise. Sparse Leaf: no live Pokémon. |
| A 390 | Nav behind Admin menu. Stacked directory or full-width record. |
| B 1440 | One-line scan rail + record. Not 300px cards. |
| B 390 | List or record. Sparse Leaf facts say unavailable. |

Browser-tool webfont/system capture is garbled. Accessibility tree is the text source of truth.

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/admin-hub-overhaul-tests.js` | STATIC PASS | 11 |
| `tests/admin-hub-workspace-v2-tests.js` | STATIC PASS | 6 |
| `tests/admin-hub-gate-2a-trainer-tests.js` | STATIC PASS | 8 |
| `tests/admin-hub-next-tests.js` | STATIC PASS | 7 |
| `tests/admin-hub-gate-2a-r-identity-tests.js` | STATIC PASS | 12 |
| `tests/admin-hub-gate-17-s1-snapshot-tests.js` | STATIC PASS | 16 |
| `tests/admin-hub-gate-17-s1b-tests.js` | STATIC PASS | 5 |
| Design-reset wireframes | REAL DOM | unsigned static HTML |
| Live staff RPCs | **not run** | not authorized |
| Production | **not run** | smoke paused |

No implementation. No A1 / A7 close.

## 2026-10-13 — GitHub issue #5 Trainer Workspace 2.0 prototype

- Branch: `admin-hub-overhaul`. Implementation commit `7fd7cbf`. Prototype only. `admin-next.html` Trainers tab unchanged. No merge, deploy, SQL, staff-role, APP stamp, or Batch F.
- Sora mutated NO · Twinkle mutated NO · QA account none (unsigned fixture). PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- A1 remains **open**. A7 (adopt 2.0 as the live tab) is a new owner decision.

### Implementation

New localhost fixture `admin-next-trainers-workspace-v2.html` + `js/admin-next-trainers-v2.js`. Reuses `presentDirectory` / `presentProfile` contracts. Directory is a full-width compact table (Trainer / Role / Pass / Pokémon / Last seen). Selecting a row hides the list and opens a full-width workspace. **All trainers** restores query, fixture page offset, and scroll. Progression has All / Unlocked / Locked filters. Fixture QA is a collapsed `<details>` outside the canvas. Current card fixture remains at `admin-next-trainers-fixture.html` for comparison.

Live RPC page size remains 50. This fixture pages at 5 only to demonstrate restore.

### REAL DOM (`http://127.0.0.1:4252/admin-next-trainers-workspace-v2.html`)

| Viewport | Overflow | Notes |
|---|---|---|
| 1920 / 1440 / 1280 / 1024 directory | no | full-width table, not 300px cards |
| 1440 profile | no | directory `display:none`; profile 1118px |
| 768 / 720 directory | no | thead hidden; stacked rows (`@container ws2` 720) |
| 390 directory / profile | no | stacked rows; All trainers; no sidebar |

Pager restore: page 2 (6–8 of 8) → Yellow → All trainers still 6–8 of 8. Locked filter shows Champion / Cascade / Alola only.

### Screenshots

Browser-tool webfont capture is garbled. Accessibility tree + bounding boxes are the source of truth.

- `docs/project-command-center/evidence/issue5-1440-directory.png`
- `docs/project-command-center/evidence/issue5-1440-overview.png`
- `docs/project-command-center/evidence/issue5-1440-pokemon.png`
- `docs/project-command-center/evidence/issue5-1440-inventory.png`
- `docs/project-command-center/evidence/issue5-1440-progression.png`
- `docs/project-command-center/evidence/issue5-1440-connections.png`
- `docs/project-command-center/evidence/issue5-390-directory.png`
- `docs/project-command-center/evidence/issue5-390-profile.png`

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/admin-hub-workspace-v2-tests.js` | STATIC PASS | 6 |
| `tests/admin-hub-overhaul-tests.js` | STATIC PASS | 10 |
| `tests/admin-hub-gate-2a-trainer-tests.js` | STATIC PASS | 8 |
| `tests/admin-hub-next-tests.js` | STATIC PASS | 7 |
| `tests/admin-hub-gate-2a-r-identity-tests.js` | STATIC PASS | 12 |
| `tests/admin-hub-gate-17-s1-snapshot-tests.js` | STATIC PASS | 16 |
| `tests/admin-hub-gate-17-s1b-tests.js` | STATIC PASS | 5 |
| Live staff trainer RPCs | **not run** | needs separate approval |
| Production | **not run** | smoke paused |

## 2026-10-12 — GitHub issue #4 directory sizing and dossier spacing

- Branch: `admin-hub-overhaul` from `8ff495f`. Implementation commit `bc24e74`. No merge, deploy, SQL, staff-role, APP stamp, or Batch F.
- Sora mutated NO · Twinkle mutated NO · QA account none (unsigned fixture). PlayTester unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- A1 visual acceptance remains **open**.

### Implementation

Directory list uses `repeat(auto-fill, minmax(min(100%, 260px), 300px))` so browse cards stay 300px instead of full-bleed strips. Selected sidebar is the same 300px card width (`--admin-next-dir-card`). Dossier panes wrap in `.admin-next-dossier-stack` with `--admin-next-section-gap: 16px`. Inventory is Currency and bag / Poké Balls / Consumables / Family candy. Zero counts use `is-empty`. Fixture added a long-name trainer for wrap/empty-state review.

No new RPCs. Legacy admin untouched.

### REAL DOM (unsigned fixture)

| Viewport | Directory / selected | Overflow | Overlap | Notes |
|---|---|---|---|---|
| 1920 selected | dir 300, cards 300 | no | no | stack gap 16 |
| 1440 directory | three 300px cards | no | no | search 612 |
| 1440 selected | dir 300, cards 300 | no | no | stack gap 16 |
| 1280 / 1024 selected | dir 300 | no | no | both columns |
| 768 / 720 selected | detail only | no | no | Back visible |
| 390 directory | cards 300 in 330 container | no | no | no overflow |

Inventory peer gaps (Currency→Balls→Consumables→Candy) all 16px. Progression Titles→Badges→Cosmetics→Packs→Catalog all 16px.

### Screenshots

Browser-tool webfont capture is garbled. Accessibility tree + bounding boxes are the source of truth. Owner should review at 100% zoom.

- `docs/project-command-center/evidence/issue4-1440-directory.png`
- `docs/project-command-center/evidence/issue4-1440-overview.png`
- `docs/project-command-center/evidence/issue4-1440-inventory.png`
- `docs/project-command-center/evidence/issue4-1440-progression.png`
- `docs/project-command-center/evidence/issue4-1440-connections.png`
- `docs/project-command-center/evidence/issue4-390-directory.png`

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/admin-hub-overhaul-tests.js` | STATIC PASS | 10 |
| `tests/admin-hub-gate-2a-trainer-tests.js` | STATIC PASS | 8 |
| `tests/admin-hub-next-tests.js` | STATIC PASS | 7 |
| `tests/admin-hub-gate-2a-r-identity-tests.js` | STATIC PASS | 12 |
| `tests/admin-hub-gate-17-s1-snapshot-tests.js` | STATIC PASS | 16 |
| `tests/admin-hub-gate-17-s1b-tests.js` | STATIC PASS | 5 |
| Live staff trainer RPCs | **not run** | needs separate approval |
| Production | **not run** | smoke paused |

## 2026-10-12 — GitHub issue #3 Trainer dossier redesign

- Branch: `admin-hub-overhaul` from reported HEAD `2b5263e`. Implementation commit `7f8393b`. No merge, deploy, SQL, staff-role, or APP stamp.
- Sora mutated NO · Twinkle mutated NO · QA account none (unsigned fixture + unsigned admin-next). PlayTester nonstaff unused.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- A1 visual acceptance remains **open**. This issue is not A1.

### Implementation

Container queries on `.admin-next-trainers-panel` (`@container trainers (min-width: 920px)`) replace the viewport-only 960px + `minmax(280px,360px)` pair. Directory-only is full width. Selected profile is single-column with Back below 920px of trainer container width; sidebar + dossier when the container is wide enough. Header chips, dossier/mon/link cards, compact inventory/progression metrics. Fixture QA moved to `aside.admin-next-fixture-lab` outside the directory. Oak fixture gained Ivysaur + Pikachu so the Pokémon grid is visible.

No new RPCs. No writes. Legacy `admin.html` / `js/admin-live.js` untouched.

### REAL DOM layout (unsigned fixture `http://127.0.0.1:4252/admin-next-trainers-fixture.html`)

| Viewport | Container | Selected columns | Overflow | Overlap |
|---|---|---|---|---|
| 1440 | 1118 | dir 260 + detail 842 | no | no |
| 1280 | 958 | dir 260 + detail 682 | no | no |
| 1024 | 940 | both visible | no | no |
| 768 | 684 | detail only | no | no |
| 720 (200% of 1440) | 636 | detail only | no | no |
| 390 profile | 330 | detail only | no | no |
| 390 directory | 330 | directory only | no | no |

Panes exercised: Overview (Account + Registration cards + chips), Pokémon (3 mon cards, no table), Inventory (coins / 4 of 20 + balls/items + candy), Progression (stat grid + grouped titles/badges/cosmetics; catalog collapsed), Connections (metrics + `admin-next-link-card`, 0 `admin-next-ops-card`). Directory-only has search + two rows + fixture lab, no dossier.

Unsigned `admin-next.html` still shows “Sign in to open the Admin Hub preview.” Trainers stays “Open this tab to load the first page.” No live trainer RPC.

### Screenshots

Browser-tool webfont capture is garbled (Fredoka/Nunito subset). Accessibility tree + bounding-box overflow/overlap checks are the text/layout source of truth. Owner should review in a real browser at 100% zoom.

- `docs/project-command-center/evidence/issue3-1440-directory.png`
- `docs/project-command-center/evidence/issue3-1440-overview.png`
- `docs/project-command-center/evidence/issue3-1440-pokemon.png`
- `docs/project-command-center/evidence/issue3-1440-inventory.png`
- `docs/project-command-center/evidence/issue3-1440-progression.png`
- `docs/project-command-center/evidence/issue3-1440-connections.png`
- `docs/project-command-center/evidence/issue3-390-directory.png`
- `docs/project-command-center/evidence/issue3-390-overview.png`
- `docs/project-command-center/evidence/issue3-390-pokemon.png`
- `docs/project-command-center/evidence/issue3-390-connections.png`

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/admin-hub-overhaul-tests.js` | STATIC PASS | 9 |
| `tests/admin-hub-gate-2a-trainer-tests.js` | STATIC PASS | 8 |
| `tests/admin-hub-next-tests.js` | STATIC PASS | 7 |
| `tests/admin-hub-gate-2a-r-identity-tests.js` | STATIC PASS | 12 |
| `tests/admin-hub-gate-17-s1-snapshot-tests.js` | STATIC PASS | 16 |
| `tests/admin-hub-gate-17-s1b-tests.js` | STATIC PASS | 5 |
| Live staff trainer RPCs | **not run** | needs separate approval |
| Production | **not run** | smoke paused |

## 2026-10-12 — GitHub issue #2 local visual QA

- Branch: `admin-hub-overhaul` · commit `2d29e1e`. No merge, deploy, SQL, or staff-role changes.
- Sora mutated NO · Twinkle mutated NO · PlayTester nonstaff.
- Production APP `20261008-rc133` unchanged. Smoke paused.
- A1 visual acceptance remains **open**.

### Rendered findings (fixture REAL DOM)

| Finding | Action |
|---|---|
| Previous/Next shown while both disabled | Hidden unless `showPager` |
| “Showing 1–2 of 2. Server page size is 50.” on a single page | Status is now `2 trainers.` |
| Username repeated login (`fixtureoak`) | Username omitted when it equals login |
| Available catalog repeated Cosmetics pills | Catalog collapses to a one-line match note |
| Empty/denied/loading hard to reach | Fixture QA buttons; no live `playCall` |
| Unlocked vs locked | Kept as text + `data-state`; titles/badges already distinguished |

### Interaction checks (LOCAL HARNESS / REAL DOM)

Directory, Find, row select, Overview / Progression / empty results, Back (via empty reset), 390px `is-profile` hides directory. Keyboard: search form, trainer buttons, pane tabs, Back remain native controls.

Stale-response cancellation remains generation tokens in `js/admin-next.js` (STATIC). Not re-proven with live RPCs.

### Screenshots

Browser-tool webfont capture is garbled. Accessibility tree is the text source of truth.

- `docs/project-command-center/evidence/issue2-directory-desktop.png`
- `docs/project-command-center/evidence/issue2-overview-desktop.png`
- `docs/project-command-center/evidence/issue2-empty-results.png`
- `docs/project-command-center/evidence/issue2-mobile-profile.png`

### Tests

| Suite | Class | Result |
|---|---|---|
| `tests/admin-hub-overhaul-tests.js` | STATIC PASS | 8 |
| `tests/admin-hub-gate-2a-trainer-tests.js` | STATIC PASS | 8 |
| `tests/admin-hub-next-tests.js` | STATIC PASS | 7 |
| Live staff trainer RPCs | **not run** | needs separate approval |
| Production | **not run** | smoke paused |

## 2026-10-12 — command center + batches A–E

- Branch created: `admin-hub-overhaul` from `gate-2a-trainer-management` (`a8e3aaf`).
- Implementation commit: `6472b20`.
