# Run log

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
