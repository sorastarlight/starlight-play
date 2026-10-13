# Run log

## 2026-10-13 — GitHub issue #12 trainer record IA

- Branch: `admin-hub-overhaul`. Design only. `hub-a-visual-v4.html` kept for comparison. `admin-next.html` unchanged. No merge, deploy, SQL, staff-role, APP stamp, A9, Batch F, #13, or #14.
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
