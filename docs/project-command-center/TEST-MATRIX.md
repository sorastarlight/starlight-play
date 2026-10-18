# Test matrix

| Area | Automated | Class if green | Not covered |
|---|---|---|---|
| Next-hub IA + allowlist | `tests/admin-hub-next-tests.js` | STATIC | Live staff session |
| Gate 2A presenters / contract args | `tests/admin-hub-gate-2a-trainer-tests.js` | STATIC | Production trainer rows |
| Inspect true-read SQL contract | `tests/admin-hub-gate-2a-r-identity-tests.js` | STATIC | Runtime write probe (already done in 2A-R) |
| Operations snapshot presenter | `tests/admin-hub-gate-17-s1-snapshot-tests.js` | STATIC | Production snapshot |
| Snapshot polling isolation | `tests/admin-hub-gate-17-s1b-tests.js` | STATIC | — |
| Overhaul dossier + canonical doorways | `tests/admin-hub-overhaul-tests.js` | STATIC (command-center + hub) | — |
| Fixture search/select/panes/empty/denied/loading | `admin-next-trainers-fixture.html` + overhaul tests | LOCAL HARNESS / REAL DOM (unsigned fixture) | Live staff Trainers |
| Trainer workspace overflow / column overlap | fixture REAL DOM bounding boxes at 1920, 1440, 1280, 1024, 768, 720, 390 | REAL DOM (unsigned fixture) | Live staff Trainers / PRODUCTION |
| Directory card width + dossier section gap | fixture REAL DOM: browse/sidebar cards 300px; stack gap token 16px | REAL DOM (unsigned fixture) | Live staff Trainers |
| Workspace 2.0 prototype | `tests/admin-hub-workspace-v2-tests.js` | STATIC PASS (6) | Live staff Trainers |
| Workspace 2.0 directory/profile/restore | `admin-next-trainers-workspace-v2.html` REAL DOM | REAL DOM (unsigned fixture) | Production / live RPCs |
| Issue #6 design reset artifacts | `tests/admin-hub-overhaul-tests.js` existence + no `playCall` | STATIC | Not an implementation |
| Issue #6 wireframe review | `design-reset/proposal-a.html` / `proposal-b.html` REAL DOM | REAL DOM (static HTML) | Production / live RPCs |
| Issue #7 spec + hub prototype | `DESIGN-SPEC-ISSUE-7.md`, `design-reset/hub-a.html` | STATIC + REAL DOM (static HTML) | `admin-next.html` integration |
| Issue #8 visual v2 | `hub-a-visual-v2.html` + style guide | STATIC + REAL DOM (static HTML) | `admin-next.html` integration |
| Issue #9 Pokémon UX | `hub-a-visual-v3.html` + Pokémon UX guide | STATIC + REAL DOM (static HTML) | `admin-next.html` integration |
| Issue #10 trainer UX | `hub-a-visual-v4.html` + trainer UX guide | STATIC + REAL DOM (static HTML) | `admin-next.html` integration |
| Issue #12 trainer record IA | `hub-a-visual-v5.html` + TRAINER-RECORD-ISSUE-12.md | STATIC + REAL DOM (static HTML) | `admin-next.html` integration; tickets/recovery writes |
| Issue #16 legality audit | `POKEMON-LEGALITY-AUDIT-ISSUE-16.md` + overhaul tests | STATIC; LIVE CATALOG columns | Catch-row SELECT; encounter; editor RPC; PRODUCTION |
| Issue #19 Gen IX rebuild plan | `GEN-IX-REBUILD-PLAN-ISSUE-19.md` + overhaul tests | STATIC; LIVE CATALOG FKs | Generator; reset; PRODUCTION |
| Issue #20 Gen IX offline pin | `tests/gen9-ref-tests.js` + pin JSON | LOCAL HARNESS (12) | Live SQL apply; generator |
| Issue #21 A19-REF readiness | `tests/gen9-ref-readiness-tests.js` | LOCAL HARNESS | Live SQL; accepted Gmax/mega rules |
| Issue #22 A19-SCHEMA artifacts | `tests/a19-schema-tests.js` | STATIC / LOCAL HARNESS (9) | Live SQL apply; generator |
| Issue #23 A19-SCHEMA rehearsal | `tools/a19-schema-rehearsal.js` + isolation tests | REAL SQL (17) on `127.0.0.1`; STATIC isolation (5) | Live Supabase; PostgREST; PRODUCTION |
| Issue #24 A19-APPLY preflight | `tests/a19-apply-preflight-tests.js` + catalog SELECTs + REST `Accept-Profile` | STATIC + LIVE CATALOG + LIVE API (`PGRST106`) | Dashboard backup list; PITR add-on; apply; PRODUCTION |
| Issue #24 A19-APPLY decision packet | `tests/a19-apply-decision-tests.js` + seed/pin/DDL SHA-256 | STATIC; OWNER REPORT backup `2026-10-14 07:44:26 +0000` | Independent backup listing; PRODUCTION apply |
| Issue #24 A19-APPLY handoff | `tests/a19-apply-handoff-tests.js` | STATIC (D34 BLOCKED snapshot; checksums unchanged) | Historical |
| Issue #24 A19-APPLY report (D35) | `tests/a19-apply-report-tests.js` + catalog counts + REST `Accept-Profile` | STATIC + LIVE CATALOG + LIVE API (`PGRST106`) | WIRE; catch-row SELECT; restore; PRODUCTION smoke |
| A19-GENVAL specification (D36) | `tests/a19-genval-spec-tests.js` + pin slice oracle + fixture matrix | STATIC + LOCAL HARNESS | Historical snapshot |
| A19-GENVAL implementation (D37) | `tests/a19-genval-impl-tests.js` + `tools/a19-genval-rehearsal.js` | STATIC + LOCAL HARNESS + REAL SQL | Historical snapshot |
| A19-GENVAL security corrections (D38) | `tests/a19-genval-impl-tests.js` + `tools/a19-genval-rehearsal.js` | STATIC + LOCAL HARNESS + REAL SQL | Historical snapshot |
| A19-GENVAL specimen binding (D39) | `tests/a19-genval-impl-tests.js` + `tools/a19-genval-rehearsal.js` | STATIC + LOCAL HARNESS + REAL SQL (15/15 on 127.0.0.1) | Historical snapshot |
| A19-GENVAL readiness (D40) | readiness + apply-checklist docs + overhaul/impl STATIC | STATIC + LIVE CATALOG + LIVE PLATFORM + REAL SQL (15/15 reconfirm) | Historical snapshot |
| A19-GENVAL recovery runbook (D41) | apply-checklist + overhaul/impl STATIC | STATIC (docs only; SQL unchanged; catalog not rerun) | Historical snapshot |
| A19-GENVAL apply decision (D42) | `GEN-IX-GENVAL-APPLY-DECISION.md` + overhaul STATIC | STATIC (incomplete `[GO]` snapshot; hash match; not applied that batch) | Historical |
| A19-GENVAL apply report (D43) | `GEN-IX-GENVAL-APPLY-REPORT.md` + catalog SELECTs | STATIC + LIVE CATALOG PASS | Hosted generate/assert; WIRE; A19-RESET-GO; PRODUCTION smoke |
| A19-RESET R-A prep (D43) | `GEN-IX-RESET-SCOPE.md` + unapplied `a19-reset/001` | STATIC + LIVE CATALOG counts | Destructive execute |
| A19-GENVAL reconciliation (D44) | `GEN-IX-GENVAL-RECONCILIATION.md` + catalog fingerprints | STATIC + LIVE CATALOG | Hosted generate; byte-identical replay |
| A19-WIRE plan (D44) | `GEN-IX-WIRE-PLAN.md` | STATIC | Historical plan snapshot |
| A19-RESET rehearsal spec (D44) | `GEN-IX-RESET-REHEARSAL.md` | STATIC + LIVE CATALOG recount 12/98 | A19-RESET-GO |
| A19-WIRE-DEV (D45) | `tests/a19-wire-impl-tests.js` + `tools/a19-wire-rehearsal.js` | STATIC + REAL SQL 18/18 on `127.0.0.1:55434` | WIRE-APPLY; live settle swap; PRODUCTION |
| A19-RESET-TEST (D45) | `tools/a19-reset-rehearsal.js` | REAL SQL 7/7 on `127.0.0.1:55435` | Production RESET-GO |
| A19-WIRE-INTEGRATE (D46) | `tools/a19-wire-settle-rehearsal.js` + `003_settle_integration.sql` | STATIC + REAL SQL 13/13 on `127.0.0.1:55436` | Historical D46; superseded by D47 |
| A19-WIRE parity (D47) | `tools/a19-wire-settle-rehearsal.js` + LIVE CATALOG `settle_if_needed` | STATIC + LIVE CATALOG + REAL SQL 16/16 on `127.0.0.1:55436` | WIRE-APPLY; PRODUCTION |
| A19-WIRE-APPLY decision (D48) | `GEN-IX-WIRE-APPLY-DECISION.md` + disk SHA-256 | STATIC | Historical D48 |
| A19-WIRE-APPLY (D49) | `GEN-IX-WIRE-APPLY-REPORT.md` + catalog SELECTs | STATIC + LIVE CATALOG PASS | WIRE-GO; hosted generate; PRODUCTION |
| A19-WIRE-GO readiness (D50) | `GEN-IX-WIRE-GO-READINESS.md` + switch/migration catalog | STATIC + LIVE CATALOG | WIRE-GO; PRODUCTION |
| PlayTester reset (D51) | production `signin.html?reset=1` + auth recover/mail.send | REAL DOM + LIVE CATALOG | PlayTester password login; WIRE-GO |
| Play browser probe (D52) | Cursor browser Play + Pokédex | REAL DOM | Historical signed-out probe |
| A19-WIRE-GO (D53) | Cursor browser Play + My PC, plus catch/capture_log/switch catalog | REAL DOM + REAL gameplay + LIVE catalog | Berry click missed the prepare window; no ball-debit ledger row |
| Encounter economy (D54) | `tools/d54-economy-rehearsal.js` + phase-driver fixture | STATIC + REAL SQL 12/12 on `127.0.0.1:55437` | Superseded by D55 for the safety-net throw |
| Economy final review (D55) | `tools/d55-economy-rehearsal.js` + borrowed-ball rules | STATIC + REAL SQL 13/13 on `127.0.0.1:55438` | Apply handoff is D56 |
| D55-ECONOMY-APPLY decision (D56) | `GEN-IX-ECONOMY-APPLY-DECISION.md` + disk SHA-256 + live catalog | STATIC + LIVE CATALOG | Historical handoff |
| D55-ECONOMY-APPLY (D57) | migration `20261016042345` + function MD5 catalog | LIVE CATALOG PASS | No throw, catch read, or backfill |
| D58 live test | Cursor browser Play + My PC, PlayTester rounds only | REAL DOM + REAL gameplay + LIVE catalog | Berry catch, Honey catch, no-item escape; WIRE off |
| D59 onboarding | `tests/onboarding-tests.js` + local harness and local Play/How to Play/Register | STATIC + LOCAL HARNESS + REAL DOM | Guide only. No encounter, account, or WIRE change. Not deployed |
| D62 mastery prototype | `node tests/species-mastery-tests.js` | STATIC | 9/9. Not connected to settlement |
| D63 compatibility | onboarding, mastery, and hub tests plus catalog reads | STATIC + LOCAL HARNESS + LIVE CATALOG | WIRE false. No catch-row read |
| D64 event ledger | `tools/d64-mastery-rehearsal.js` + `tests/d64-mastery-static-tests.js` | STATIC + REAL SQL 19/19 on `127.0.0.1:55439` | PostgreSQL 17.5. Not applied. Not production |
| D65 mastery hardening | `tools/d65-mastery-rehearsal.js` + `tests/d65-mastery-static-tests.js` | STATIC + REAL SQL 19/19 on `127.0.0.1:55440` | PostgreSQL 17.5. D64 suite re-run 19/19. Not applied |
| D66 mastery lifecycle | `tools/d66-mastery-rehearsal.js` + `tests/d66-mastery-static-tests.js` | STATIC + REAL SQL 14/14 on `127.0.0.1:55441` + LIVE CATALOG | PostgreSQL 17.5. D64 19/19 and D65 19/19 re-run. Not applied |
| D67 mastery catch safety | `tools/d67-mastery-rehearsal.js` + `tests/d67-mastery-static-tests.js` | STATIC + REAL SQL 20/20 on `127.0.0.1:55442` | PostgreSQL 17.5. D64 19/19, D65 19/19, and D66 14/14 re-run. Not applied |
| D68 mastery install review | `tools/d68-mastery-rehearsal.js` + `tests/d68-mastery-static-tests.js` | STATIC + REAL SQL 14/14 on `127.0.0.1:55443` | PostgreSQL 17.5. D64 19/19, D65 19/19, D66 14/14, D67 20/20 re-run. Not applied |
| D69 mastery GO packet | hosted catalog plus packet review | LIVE CATALOG + STATIC | PostgreSQL 17.6. WIRE false. No catch-row read. Not installed |
| D70 mastery schema install | hosted `execute_sql` plus catalog verification | LIVE CATALOG | PostgreSQL 17.6. Four COMMITs. Inactive. WIRE false. No catch-row read |
| D71 mastery integration plan | hosted catalog plus `tools/d71-mastery-integration-rehearsal.js` | LIVE CATALOG + REAL SQL 7/7 on `127.0.0.1:55444` | PostgreSQL 17.5 local, 17.6 hosted. D64–D68 re-run. Not activated |
| D72 familiarity settlement draft | `tools/d72-mastery-settlement-rehearsal.js` | REAL SQL 18/18 on `127.0.0.1:55445` | PostgreSQL 17.5. Odds and spends are stubs. Not installed |
| D73 familiarity install readiness | hosted catalog plus `tools/d73-readiness-rehearsal.js` | READ-ONLY LIVE CATALOG + REAL SQL 8/8 on `127.0.0.1:55446` | PostgreSQL 17.6 hosted, 17.5 local. Not installed |
| D74 familiarity integration install | hosted `execute_sql` of hashed 005, 006, and 007 | LIVE CATALOG | All three committed. Lifecycle inactive. No encounter |
| D75 familiarity activation readiness | hosted catalog plus `tools/d75-activation-rehearsal.js` | READ-ONLY LIVE CATALOG + REAL SQL 19/19 on `127.0.0.1:55447` | PostgreSQL 17.6 hosted, 17.5 local. Not activated |
| D76 stamp-smoke readiness | hosted catalog plus `tools/d76-stamp-smoke-rehearsal.js` | READ-ONLY LIVE CATALOG + REAL SQL 8/8 on `127.0.0.1:55448` | PostgreSQL 17.6 hosted, 17.5 local. No hosted catch |
| D77 PlayerQA provisioning | hosted identity lookup and registration source | READ-ONLY LIVE CATALOG | PlayerQA absent. Account not created |
| D77-R1 PlayerQA registration | hosted username and email existence check | READ-ONLY LIVE CATALOG | Both free. Signup not run |
| D77-R2 PlayerQA verification | hosted PlayerQA row plus the open Play page | READ-ONLY LIVE CATALOG + REAL DOM | Signed in as playerqa. No encounter |
| D78 PlayerQA stamp smoke | hosted round, director, and PlayerQA catalog | READ-ONLY LIVE CATALOG + REAL DOM | No open round. Encounter not started |
| D79 QA encounter isolation | hosted selector, RLS, and a local selector model | READ-ONLY LIVE CATALOG + REAL SQL | 8/8 local model. No prototype |
| D80 encounter safety review | hosted active-row probe and a local guard model | READ-ONLY LIVE CATALOG + REAL SQL | 15/15 local model. Draft not installed |
| D81 launch-guard readiness | hosted function catalog and the unapplied file on local Postgres | READ-ONLY LIVE CATALOG + REAL SQL | 17/17 local. File not installed |
| D82 launch-guard security gate | hosted grants and a non-mutating private-schema request | READ-ONLY LIVE CATALOG + LIVE API | PGRST106. No mutation. File not installed |
| D83 launch-guard install | hosted function catalog before and after the unchanged file | REAL SQL | md5 `53d7e8a3f3894212e854618dc0663101`. No gameplay RPC |
| D84 verification plan | existing D81 rehearsal and D83 fingerprint | STATIC | No new hosted call. Stamp still blocked |
| D85 local stamp rehearsal | hosted function fingerprints before any local write | READ-ONLY LIVE CATALOG | Mismatch. No database started |
| Unsigned admin-next gate | local HTTP | REAL DOM | Staff-open Trainers |
| Live `admin_list_users` / account / inspect | — | **not run** | Needs staff authorization |
| Legacy admin regressions | static “untouched” asserts | STATIC | Full Dashboard click-through |
| Production APP | — | **not run** | Smoke paused |

Honesty labels: STATIC · LOCAL HARNESS · REAL DOM · REAL RPC · PRODUCTION. Do not report PRODUCTION PASS from fixtures.
