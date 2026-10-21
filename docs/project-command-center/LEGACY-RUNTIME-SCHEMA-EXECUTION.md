# CODEX-42 — Legacy runtime and schema retirement complete

Owner authorized the remaining fallback/schema cleanup, explicitly approved retiring legacy catch/grant routes, and approved conservative WIRE evolution. Installed migrations: `20261021034225` (`retire_legacy_writers_and_correct_wire_evolution`) and `20261021035222` (`retire_av_columns_and_legacy_reference_runtime`). This completes CODEX-40's requested retirement through CODEX-41/42; it does not complete launch readiness.

## Result

Twelve exact function replacements remove WIRE-off specimen generation, legacy bridge imports and old admin/Oak catch presets. Bridge token validation, status/round publishing and heartbeats remain. Play is the catch route; Trainer Gifts is the staff grant route. Missing generated WIRE fields fail closed. The catch stamp preserves generated battle values instead of rolling fallback values.

Evolution maps the matched base/regional form and ordinary ability slot within the pinned build, recalculates maximum HP and preserves existing damage/fainted state. Level, IVs, EVs, nature and learned moves stay unchanged. Unsupported hidden/costume/ambiguous mappings stop before candy/items; replay does not recharge. No production evolution was executed as a test.

Six obsolete AV columns and two unused old stat/move helpers are removed. The old 151-row species reference is retained as `private.retired_lgpe_species`, protected by RLS with no anonymous/player access. Habitat/level/gender helpers remain required configuration despite their historical `lgpe_` names. No active routine references the removed AV columns or old stat/move helpers/reference table.

All seven WIRE Pokémon retain every supported field: post-removal dataset hash `62a30076d38ae7c0cec63621ffe6a32e`. Before removal their full hash, including the six AV fields, was `63b6a3794b396c66107e6ae7d35a2824`. AV values are privately archived; all were zero. Both recovery archives pass integrity checks. Original legacy110 archive contains 168 records (110 specimens,55 Oak rows,1 listing,2 scoped profile pointer records); new schema archive contains7 AV records. Fifteen protected economy/history/discovery datasets match before/after.

Final schema/source hash: `d323eb5bcaf331c375056a216bfd1c66`. All12 runtime hashes, signatures, ACLs, security/volatility/search-path attributes match their verified post-runtime values after the schema migration. WIRE remains on; Familiarity cutoff remains `2026-10-20T16:55:59.896904Z`; director remains held offline with no queued/next encounter. Existing bridge ticks can update director heartbeat timestamps; this operation did not schedule encounters.

## Verification and limits

- REAL LOCAL SQL:29 runtime checks;31 chained archive/schema/recovery checks. Actual generator/legality/binding code and pinned reference seeds; deterministic local settlement interfaces and counted evolution economy interfaces. Fictional linked rows, relevant production column types/triggers/core FKs; not every hosted constraint or Auth policy is cloned.
- STATIC / LOCAL HARNESS:78 non-writing regression suites passed before the schema-only packet. Build31 pages/423 references passes; APP stays `20261008-rc133`.
- READ-ONLY HOSTED: exact source/schema/data/archive/access verification; all15 protected datasets unchanged. Security advisor categories:268 mutable search paths (down2),78 anonymous executable definers,196 authenticated executable definers,48 RLS/no-policy notices,1 leaked-password-protection notice. Existing notices remain separate work; see [Supabase linter](https://supabase.com/docs/guides/database/database-linter).
- ACTUAL AUTHENTICATED DOM: EmailQA My PC reload shows Caterpie Lv6 Bug, stats22/7/9/7/7/12, one stored specimen. No management/gameplay control clicked. Proof: task visualization `emailqa-pc-schema-retired.png`.

Two schema attempts rolled back at the final fingerprint guard. Diagnostics proved identical schema-line sets but different ordering: catalog identifiers use C collation, while JSON-derived text inherited the hosted default. The generator now explicitly matches C ordering and checks its projected baseline against the actual baseline before preparing signatures. The corrected guarded packet then installed successfully. No checks were disabled. Initial manual verification used an inconsistent newline separator; rerunning with `chr(10)` confirmed both archive checksums and the supported specimen checksum. Published final evidence uses the corrected results.

## Recovery and next work

Keep both private archives and the private reference table; no purge authorized. `supabase/unapplied/legacy-schema-retirement/ROLLBACK.sql` restores this schema phase. `RECOVER_SCHEMA_AND_SPECIMENS.sql` atomically restores schema, prior runtime sources and the reviewed110 specimens if all strict current-data/profile/archive guards match. Both recovery paths passed local tests, including injected failure/atomic rollback; no production restore was performed. Later specimen/profile edits may correctly require a newly reviewed recovery packet. Original standalone specimen restore deliberately refuses newer schema/source state.

Next launch work: bounded Mart/Oak/evolution/trade checks and staff-action checks, reliable Familiarity processing decision, deferred Twitch provider QA, player acceptance and release operations. Local evolution validation is complete; hosted candy/item spending or a real evolution needs a bounded gameplay decision. No new encounter, gift, delivery, scheduler, reset, APP stamp or spending occurred. No new protected-account mutation in CODEX-42; Sora/Twinkle's earlier approved legacy removals belong to CODEX-41. PlayTester remains nonstaff.

Evidence: `evidence/legacy-runtime-hosted-verification.json`, `legacy-runtime-post-schema-verification.json`, `legacy-schema-hosted-verification.json`, `legacy-schema-protected-state-verification.json`, `legacy-schema-local-result.json`, `legacy-schema-advisor-summary.json`; packet READMEs describe exact behavior and recovery limits.

Post-schema integration: `node tools/legacy-runtime-rehearsal.js --without-av` passes30 REAL LOCAL SQL checks against the final row type, including actual generation, gifts, evolution, settlement/replay and source rollback. Evidence: legacy-runtime-post-schema-local-result.json.
