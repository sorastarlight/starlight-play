# A19-WIRE-GO readiness (D50)

**Verdict: READY TO ASK. This is not A19-WIRE-GO.** Nothing was flipped, generated, or caught. Commit: `15b4e63d`.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.

LIVE CATALOG this batch: switch `enabled=false` (`updated_at` 2026-10-15 02:57:32+00). Remote migrations present: `20261015025732` `a19_wire_001_switch_and_persist`, `20261015025754` `a19_wire_002_materialize_hook`, `20261015025816` `a19_wire_003_settle_integration`.

Production APP `20261008-rc133`. Smoke paused.

---

## One-catch activation plan (after a later named GO)

**Identity:** owner-named existing disposable login that is **not** `sorastarlight` / `twinklephoenixstar`. Default candidate: **PlayTester**, kept nonstaff. Do not create an account in the GO itself unless the owner already named a new login.

**Species:** one ordinary wild-legal base form (recommended Bulbasaur / form `1`). Never G1/C1.

**Do not** use hosted `generate_streamlink_mon`, grants, Oak QA edits, or hidden tickets.

### 1. Flip on (postgres only)

`SELECT private.streamlink_wire_set_enabled(true);`  
Then catalog-check `enabled=true`. Clients cannot call this (EXECUTE revoked).

### 2. One ordinary Play catch

PlayTester (or the named login) on Play: join the live community round → optional berry prepare → throw one Poké Ball → wait for existing settle.

Use a **TEST** `testOutcome=catch` round only if the owner wants a guaranteed persist proof; that path does **not** prove live odds.

If the first ordinary throw escapes: record ball spend, confirm no catch, allow **one** retry. Then disable if still failing.

### 3. Pass checks (that trainer + that round only)

| Check | Expect |
|---|---|
| Odds / result | `capture_log` shows the same ball/berry/honey math as today; result `Caught` or `Escaped` |
| Items | one ball spent in settle; berry only if prepared |
| New catch | `public_id` starts with `SL`; `content_build=sl-ref-20261013-227b573`; nature 1–25; ability slot `1` or `2` (not hidden); IVs 0–31; `hp_max`/`hp_current`; friendship 50 for historical-70 species; `source_key=play:<round>:<user>` |
| Replay | second settle of the same round: still one catch, no second ball/XP |
| Legacy | pre-existing `LG` rows stay NULL GENVAL; `stamp_catch_row` still null-only |

Inspect only the named QA catch (and optionally one unrelated legacy `LG` row that is **not** Sora/Twinkle). No protected-account access.

### 4. Immediate disable

`SELECT private.streamlink_wire_set_enabled(false);` as `postgres`.  
Catalog-check `enabled=false`. New settles return to stamp/`LG`. Already-written `SL` rows stay.

Disable first if persist errors, wrong prefix, hidden ability on an ordinary catch, extra spend, or ghost `Caught`.

### 5. Minimal cleanup (separate sentence in the GO)

If authorized: **release that one QA `catch_id`** through the existing player-release path. Not RESET-GO. Not a bag/XP rewind. Not Sora/Twinkle.

---

## Exact owner GO still required

A later message must say **A19-WIRE-GO**, name the QA login, allow `streamlink_wire_set_enabled(true)` then the one Play catch, and say whether to disable immediately after and whether to release that one catch. Exclude grants, hosted generate, RESET-GO, merge, deploy, APP stamp.

**STOP.** A19-WIRE-GO remains **UNAPPROVED**.
