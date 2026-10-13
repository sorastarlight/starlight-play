# Test matrix

| Area | Automated | Class if green | Not covered |
|---|---|---|---|
| Next-hub IA + allowlist | `tests/admin-hub-next-tests.js` | STATIC | Live staff session |
| Gate 2A presenters / contract args | `tests/admin-hub-gate-2a-trainer-tests.js` | STATIC | Production trainer rows |
| Inspect true-read SQL contract | `tests/admin-hub-gate-2a-r-identity-tests.js` | STATIC | Runtime write probe (already done in 2A-R) |
| Operations snapshot presenter | `tests/admin-hub-gate-17-s1-snapshot-tests.js` | STATIC | Production snapshot |
| Snapshot polling isolation | `tests/admin-hub-gate-17-s1b-tests.js` | STATIC | — |
| Overhaul dossier + canonical doorways | `tests/admin-hub-overhaul-tests.js` | STATIC PASS (15) | — |
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
| Unsigned admin-next gate | local HTTP | REAL DOM | Staff-open Trainers |
| Live `admin_list_users` / account / inspect | — | **not run** | Needs staff authorization |
| Legacy admin regressions | static “untouched” asserts | STATIC | Full Dashboard click-through |
| Production APP | — | **not run** | Smoke paused |

Honesty labels: STATIC · LOCAL HARNESS · REAL DOM · REAL RPC · PRODUCTION. Do not report PRODUCTION PASS from fixtures.
