# Test matrix

| Area | Automated | Class if green | Not covered |
|---|---|---|---|
| Next-hub IA + allowlist | `tests/admin-hub-next-tests.js` | STATIC | Live staff session |
| Gate 2A presenters / contract args | `tests/admin-hub-gate-2a-trainer-tests.js` | STATIC | Production trainer rows |
| Inspect true-read SQL contract | `tests/admin-hub-gate-2a-r-identity-tests.js` | STATIC | Runtime write probe (already done in 2A-R) |
| Operations snapshot presenter | `tests/admin-hub-gate-17-s1-snapshot-tests.js` | STATIC | Production snapshot |
| Snapshot polling isolation | `tests/admin-hub-gate-17-s1b-tests.js` | STATIC | — |
| Overhaul dossier + canonical doorways | `tests/admin-hub-overhaul-tests.js` | STATIC PASS (8) | — |
| Fixture search/select/panes/empty/denied/loading | `admin-next-trainers-fixture.html` + overhaul tests | LOCAL HARNESS / REAL DOM (unsigned fixture) | Live staff Trainers |
| Unsigned admin-next gate | local HTTP | REAL DOM | Staff-open Trainers |
| Live `admin_list_users` / account / inspect | — | **not run** | Needs staff authorization |
| Legacy admin regressions | static “untouched” asserts | STATIC | Full Dashboard click-through |
| Production APP | — | **not run** | Smoke paused |

Honesty labels: STATIC · LOCAL HARNESS · REAL DOM · REAL RPC · PRODUCTION. Do not report PRODUCTION PASS from fixtures.
