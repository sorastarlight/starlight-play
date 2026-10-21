# CODEX-39 — WIRE stat display correction prepared; SQL unapplied

CODEX-37 found an actual My PC display mismatch: the new Caterpie had stored HP22 but displayed HP23. The shared `private.catch_json(public.catches)` unconditionally uses LGPE base/stat logic even when `ruleset_id='streamlink-gen9-xgen'`. No stored catch is corrupt or being converted.

## Concrete correction

Unapplied packet: `supabase/unapplied/wire-stat-formatter/INSTALL.sql`; guarded `ROLLBACK.sql` and manifest alongside it. Original formatter body MD5 `26eb7c2e22cd998137826e094360475d`; proposed MD5 `ec15d532dd58053ee4ac6c24e5e901de`.

Only the WIRE-ruleset `stats` object changes. HP uses stored `hp_max`; other stats use the existing server `streamlink_stat` helper with the stored IV/EV/level and exact content-build/form/nature reference rows. No AV/legacy formula is applied to WIRE rows. Missing references/IVs/EVs/nature remain unavailable rather than being invented. Legacy rows retain the original complete payload. CP and all other fields remain unchanged; this is not a new CP system or a generation/catch patch.

Current direct callers are `play_storage`, `trade_listing_json`, and `play_trade_listing`; other GTS views consume those serializers. No callable signatures, permissions, RLS, schema tables, catch data, generation functions or gameplay rules change. This is a shared read-function update and remains held for its separate owner decision.

Routine frontend adjustment in `js/storage.js` shows missing/non-finite stats as a compact dash with an accessible unavailable label rather than a false0; actual zero remains0. The compact label fits the existing36px stat column. This frontend fix is separately publishable routine maintenance; it cannot correct the wrong numeric response until the SQL is approved/installed.

## Evidence

- **14 REAL LOCAL SQL checks** using the actual original/new formatter and actual stat helper bodies, fictional records and small presentation dependency stubs: reproduce23-vs22; correct WIRE stats; all non-stat fields/CP identical; stored specimen unchanged; legacy full payload identical; nature floors, EVs, missing reference/nature/IV/EV/HP, zero values, alternate forms, and exact rollback.
- **3 LOCAL HARNESS renderer checks** execute the actual extracted stat renderer with complete, missing, zero and malformed values.
- **78 non-writing regression suites pass**; focused renderer rerun after compact unavailable-label adjustment passes. Build31 HTML/423 references; APP20261008-rc133 unchanged.
- Read-only hosted guard preflight passed. Pure read comparison on the retained QA Caterpie gives old stats23/11/11/11/11/12; proposed22/7/9/7/7/12 with its actual Timid nature. This is not an installed-fix or hosted corrected-UI pass.

Evidence: `wire-stat-formatter-local-result.json`, `wire-stat-formatter-static-regressions.json`, `wire-stat-formatter-qa-comparison.json`, `wire-stat-formatter-dependencies.json`. Reproduce: `node tools/prepare-wire-stat-formatter.js`, `node tools/wire-stat-formatter-rehearsal.js`, `node tests/pc-stat-values-tests.js`. Rehearsal refuses hosted environment and uses disposable loopback PostgreSQL; no packages installed.

Limitations: full production reference data, actual Supabase roles/REST and every indirect caller are not cloned locally. Public frontend publication does not install the database patch. R-PC-STATS stays open until approval, guarded install, independent function/specimen checks and actual My PC refresh confirm the corrected response. Do not modify the retained catch to mask the formatter bug.
