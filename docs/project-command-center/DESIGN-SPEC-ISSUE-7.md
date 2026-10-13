# Admin Hub implementation specification — issue #7

**Direction:** Proposal A — record workspace (**A8 APPROVED** as design direction).  
**This document is not A1.** It is not authority to edit `admin-next.html` or replace any live preview.  
**Next owner gate:** **A9** — frontend-only implementation of this spec on `admin-hub-overhaul`.

Static prototype (no `playCall`): [hub-a.html](./design-reset/hub-a.html)

Illustrative names (Oak, Leaf, Blue, …) are not Sora, Twinkle, or PlayTester.

---

## 1. Shell

```
┌ topnav (existing Play site chrome) ─────────────────────────────────┐
│ Sora Starlight · Play links · staff account                         │
├ nav (176px) ──────────┬ page header ────────────────────────────────┤
│ Admin Hub             │ Title · one-line context · staff            │
│ Operations            ├─────────────────────────────────────────────┤
│ Trainers              │                                             │
│ Support               │ page body (one job)                         │
│ Mart                  │                                             │
│ Configuration         │                                             │
│ Analytics             │                                             │
│ System                │                                             │
└───────────────────────┴─────────────────────────────────────────────┘
```

Rules:

- Persistent nav on every next-hub page. Brand is **Admin Hub**, not “Next Hub.”
- No hero banner, no fixture lab inside the canvas, no nested full-page white card wrapping the whole body.
- Page header is title + one context line (search query, selected trainer, or “observation only”).
- `?section=` deep links stay: `operations`, `trainers`, `support`, `mart`, `config`, `analytics`, `system`.
- 390: nav collapses behind **Admin menu**. Body is one column.

Authoritative homes (unchanged from issue #6):

| Nav | Job | Live read today | Write |
|---|---|---|---|
| Operations | Observe live RPG | `admin_live_snapshot` | none here — Dashboard starts/stops |
| Trainers | Find + inspect | list / account / inspect | none |
| Support | Doorway for future recovery | none | none here; A3 open |
| Mart | Catalog pointer | none | current Economy |
| Configuration | Encounter pointer | none | current Encounters |
| Analytics | Build + game health | health RPCs | none |
| System | Secrets / Pass pointer | none | current System |

---

## 2. Page hierarchy

### Operations

Observation only. Presenter contract stays `PLAY_ADMIN_NEXT_SNAPSHOT` / `gate-17-s1-v2`.

Show: Twitch, Live RPG session, Director, Current encounter, Last recorded encounter, Settlement, Permission model (`LIVE permits · OFFLINE ends · Start is explicit`).

Do not infer RPG ACTIVE from Twitch LIVE. Settlement stays UNAVAILABLE unless the snapshot says otherwise. Compact `asOf` in the header, full UTC on demand. One link: current Dashboard. No Start/End.

### Trainers — index

Full-width table. Search (`p_query`) + Previous/Next (`p_offset`, page **50**).

| Column | Source |
|---|---|
| Trainer (avatar/initial, displayName, @login) | `admin_list_users.users[]` |
| Role chip | `role` (default player) |
| Pass / — | `pass` boolean |
| Pokémon | `caught` |
| Last seen | compact from `lastSeenAt`; null → unavailable |

Omit coins and createdAt from the directory. UUID is the row key, not a column. Empty: “No trainers match.” Denied: “Trainer search is restricted to staff.” Loading keeps prior rows.

Selecting a row **replaces** the table with the record. Store `query`, `offset`, and directory scroll for restore.

### Trainers — record

**All trainers** restores query, offset, and scroll.

Header: avatar, displayName, @login, role chip, Pass chip.

Facts (missing → **unavailable**): Level (`inspect.trainer.level`), Caught (`trainer.caught` or list `caught`), Coins (`bag.coins`), Last seen (`user.lastSeenAt`).

Tabs: Overview · Pokémon · Inventory · Progression · Connections. Fields do not repeat across tabs.

| Tab | Source | Must not show |
|---|---|---|
| Overview | `admin_user_account.user` + one Twitch one-liner from `health` | email address, ranking, coins, full connection table |
| Pokémon | `mons[]` newest 40 live | full PC, favorite, locked, boxes |
| Inventory | `bag`, `candy[]` qty > 0 | Bits |
| Progression | `admin_identity_inspect` | achievements, Oak research, evolution log |
| Connections | `health` + `connections[]` | link/unlink controls |

Password login is `emailLogin` boolean only. Ranking flags live on Progression. Status words only from verified fields (no Active / VIP / Online).

Footer of the record (not a grant): “Need to change this account?” → Support with `?section=support&trainer=<uuid>`. Support still cannot write.

### Support

Read-only doorway. If `trainer` query is present, show a **context strip** (name, login, id) copied from the last inspect — not a new RPC. Copy: this preview cannot grant, unlink, or set roles.

Two current-hub links only:

- Canonical grants / coins / unlinks / roles → `admin.html?section=trainers`
- Canonical Oak QA → `admin.html?section=content&view=oakqa`

Do not pick A3. Do not add grant forms.

### Mart / Configuration / Analytics / System

Keep informational copy + one current-hub link. Analytics may show the existing health metrics. Same shell header so they feel like the same product.

---

## 3. Components (future frontend)

| Component | Role | Notes |
|---|---|---|
| `HubNav` | Persistent section list | Existing `[data-next-tab]` |
| `PageHeader` | Title + context + staff | New; replaces eyebrow + h2 + muted intro pile |
| `DirectoryTable` | Index rows as real `<button>`s inside table rows | Do not put `role=row` on the button |
| `RecordHeader` | Identity + four facts | Unavailable when null |
| `RecordTabs` | `role=tab` | Existing `PANES` |
| `KvList` | Overview / inventory facts | No card chrome required |
| `MonList` | Compact newest-40 | Not a sprite grid unless URLs exist |
| `UnlockList` | Titles / badges / cosmetics | Locked vs unlocked vs equipped |
| `SupportContext` | Optional trainer strip | Query param only |
| `LegacyLink` | One doorway per write home | Existing `admin-next-legacy` |
| `StatusLine` | `role=status` | Loading / denied / empty / error |

Visual tokens (from issue #6, still not implemented in `play.css`):

| Token | Value |
|---|---|
| Page bg | `#f6f1ec` |
| Ink / muted / line | `#2a1f28` / `#6b5a66` / `#eadfe4` |
| Pass / focus / hover | `#c45c7a` / `#c9a227` 2px / `#fff7fb` |
| Type | 20/650 title, 14/650 section, 13/400 body, 12/500 meta |
| Space | 4 · 8 · 12 · 16 · 24; row 40–44px |

Dates: `12 Oct, 2:14 PM` + `title` full UTC. `prefers-reduced-motion: reduce`. 100% zoom is the design size.

---

## 4. Responsive / states

| Width | Behavior |
|---|---|
| ≥1024 inside hub-main | Nav + body. Trainers is table **or** record, never both. |
| <720 of trainer container | Same swap. Stacked directory cells with `data-label`. |
| 390 | Admin menu. One column. |

| State | Directory | Record | Operations |
|---|---|---|---|
| Loading | Keep rows; status “Loading trainers…” | “Loading trainer…” | Existing loading cards |
| Denied 42501 | Clear selection; staff-only copy | Same; sign-out clears | Restricted copy |
| Error | Keep rows; “Could not load trainers.” | Keep last or show error | Fallback UNAVAILABLE |
| Empty | “No trainers match.” | — | — |
| Sparse | Zero counts are values | Facts say unavailable | — |

Keyboard: search form, row buttons, tabs, All trainers, nav tabs, Admin menu. Focus-visible gold. Generation tokens `trainerListGen` / `trainerProfileGen` stay. No trainer polling.

---

## 5. Files that a later A9 frontend may touch

| File | Future edit | Hazard |
|---|---|---|
| `admin-next.html` | Shell header, Trainers markup, Support context slot | Do not add grant controls or drop `?section=` |
| `css/play.css` | Scoped `.admin-next-*` tokens | Do not restyle legacy `admin.html` |
| `js/admin-next.js` | Restore scroll; Support `trainer` query; keep `readCall` allowlist | No `admin_overview`, no writes |
| `js/admin-next-trainers.js` | Table directory + record header; reuse `presentDirectory` / `presentProfile` | Keep PAGE 50; escape all text |
| `js/admin-next-ops.js` | Optional class names only | Do not change snapshot semantics |
| `tests/admin-hub-*.js` | Shell + restore + Support-context asserts | Honesty labels |

**Do not edit for A9:** `admin.html`, `js/admin-live.js`, SQL, grants, RLS, `staff_roles`, `build.json`, Workspace 2.0 / card fixtures (keep for comparison until owner says otherwise).

---

## 6. Integration hazards

- Feature flag remains “`admin-next.html` exists.” Default staff entry stays `admin.html`.
- List page size is server 50. Do not add client filters that imply a full catalog.
- `emailLogin` is not “has email.” Email address is never shown.
- Twitch linked cannot be inferred from login.
- `canEdit` / `ownerTools` on account JSON must stay unrendered.
- Operations poll stays snapshot-only and stops off-tab.
- Support `trainer=` is display context, not a write target in this preview.
- Localhost Twitch OAuth may fail (A6). Fixture/prototype remains the layout path.
- R1 / R2 / R18 stay OPEN. R21 stays CLOSED.

---

## 7. Proposed frontend-only implementation plan (needs A9)

Do **not** start this plan until the owner authorizes A9.

1. Shell pass on `admin-next.html` + scoped CSS: persistent Admin Hub nav, `PageHeader`, remove the large preview kicker from the canvas.
2. Trainers index: table presenter from list RPC; compact dates; restore query/offset/scroll.
3. Trainers record: full-width Proposal A IA; Support context link.
4. Support: optional context strip; keep two legacy links; still no writes.
5. Operations / remaining sections: same header chrome; existing presenters.
6. Static + REAL DOM suites at 1440 and 390. No live staff RPC unless A2.

Stop after that for **A1** on the integrated preview. Still no merge, deploy, APP stamp, SQL, or Batch F.

---

## 8. Open approvals

| ID | Status |
|---|---|
| A8 | **APPROVED** — Proposal A is the design direction |
| A9 | **NEEDED** — implement this spec into `admin-next.html` |
| A1 | **OPEN** — visual acceptance |
| A3 | **OPEN** — canonical grant UI |
| A7 | **NOT APPROVED** — Workspace 2.0 fixture stays comparison-only |
| A4 / A5 | **NOT AUTHORIZED** — merge / Batch F |
