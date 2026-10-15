# Test matrix

| Area | Automated | Class if green | Not covered |
|---|---|---|---|
| Next-hub IA + allowlist | `tests/admin-hub-next-tests.js` | STATIC | Live staff session |
| Gate 2A presenters / contract args | `tests/admin-hub-gate-2a-trainer-tests.js` | STATIC | Production trainer rows |
| Inspect true-read SQL contract | `tests/admin-hub-gate-2a-r-identity-tests.js` | STATIC | Runtime write probe (already done in 2A-R) |
| Operations snapshot presenter | `tests/admin-hub-gate-17-s1-snapshot-tests.js` | STATIC | Production snapshot |
| Snapshot polling isolation | `tests/admin-hub-gate-17-s1b-tests.js` | STATIC | — |
| Overhaul dossier + canonical doorways | `tests/admin-hub-overhaul-tests.js` | STATIC PASS (28) | — |
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
| A19-GENVAL apply decision (D42) | `GEN-IX-GENVAL-APPLY-DECISION.md` + overhaul STATIC | STATIC (incomplete `[GO]`; hash match; not applied) | Hosted apply; restore; WIRE; PRODUCTION |
| Unsigned admin-next gate | local HTTP | REAL DOM | Staff-open Trainers |
| Live `admin_list_users` / account / inspect | — | **not run** | Needs staff authorization |
| Legacy admin regressions | static “untouched” asserts | STATIC | Full Dashboard click-through |
| Production APP | — | **not run** | Smoke paused |

Honesty labels: STATIC · LOCAL HARNESS · REAL DOM · REAL RPC · PRODUCTION. Do not report PRODUCTION PASS from fixtures.
