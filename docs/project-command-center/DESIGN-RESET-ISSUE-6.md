# Admin Hub design reset — issue #6

**Branch:** `admin-hub-overhaul`  
**Status:** DESIGN / RESEARCH ONLY. No production wiring.  
**Does not approve:** A1 (visual), A3 (canonical grant UI), A7 (adopt Workspace 2.0).  
**New owner choice:** **A8** — pick Proposal A (record workspace) or Proposal B (inbox split) before any further Trainers UI work.

Owner review (2026-10-13): *“None of this makes sense in the overall layout of the data.”* That supersedes implied acceptance from issues #2–#5. The defect is hub information architecture, not the directory widget.

Wireframes (static local HTML, no `playCall`):

- [Index](./design-reset/index.html)
- [Proposal A — record workspace](./design-reset/proposal-a.html)
- [Proposal B — inbox split](./design-reset/proposal-b.html)
- [Owner decision](./DESIGN-RESET-DECISION.md)

Illustrative names in wireframes are invented (Oak, Leaf, Blue, …). **Not** Sora, Twinkle, or PlayTester.

---

## 1. Why the last five issues failed

Issues #2–#5 iterated a **widget** (cards, then a table) inside a **fixture canvas** that is not the real hub. Staff still cannot answer:

1. Where do I find a trainer?
2. What is this account, versus what they hold, versus how they sign in?
3. Where do I *do* something (grant, unlink, start a stream)?
4. What is missing because the RPC does not return it?

Workspace 2.0 made a denser list. It did not place that list in a staff workflow or a durable page shell. A table in a fixture is still a gallery if the rest of the hub is a strip of preview tabs and a dump of UTC strings.

---

## 2. Source-checked system (not invented)

Traced from `ADMIN-HUB-INVENTORY.md`, Gate 2A/2 contracts, `admin-next.html`, `js/admin-next.js`, and presenters. No write-risk RPC was invoked.

### Current hub (`admin.html`) — default staff entry

| Tab | What staff actually do | Source |
|---|---|---|
| Dashboard | Start/stop live director, console | `js/admin-live.js` |
| Encounters | Commands, settings, balance, specials | `js/admin.js` |
| Trainers | Search, inspect, grant pack, PC/role, gift desk | `js/admin-tools.js` |
| Game Content | Evolution validate, progression, **Oak QA** | `js/admin.js`, `js/admin-oak-qa.js` |
| Economy & Store | Coin/loot editors, catalog, studio | `js/admin.js`, `js/admin-store.js` |
| Analytics | Health, reports | `js/admin.js` |
| System & Integrations | Secrets, Pass grant, QA Pass | `js/admin.js`, `js/admin-tools.js` |

### Next hub (`admin-next.html`) — feature flag = this URL

| Tab | Live read today | Write |
|---|---|---|
| Operations | `admin_live_snapshot` (30s poll, observation) | none |
| Trainers | `admin_list_users`, `admin_user_account`, `admin_identity_inspect` | none |
| Support & Recovery | none (copy + legacy deep links) | none here |
| Mart & Content | none | none here |
| Game Configuration | none | none here |
| Analytics & Health | `admin_build_health`, `admin_game_health` (once) | none |
| System & Access | none | none here |

Staff gate is `is_play_admin`. Frontend visibility is not authorization.

### Duplicate write doorways (legacy still authoritative)

| Action | Today | Canonical until A3 |
|---|---|---|
| Grant Pokémon / items / candy | Trainers desk **and** Oak QA | **Owner must pick.** Design: one Support doorway. Do not implement. |
| Set coins / XP, credit Bits, set role, remove Pokémon | Trainers desk | Trainers desk |
| Twitch primary / flags / unlink | Trainers desk | Trainers desk |
| Ranking visible write | Trainers desk | Trainers desk |
| Grant / remove Pass, QA Pass | System | System |
| Oak research reset | Oak QA | Oak QA |
| Live start/stop | Dashboard | Operations / Dashboard |
| Store CRUD | Economy | Mart |
| Secrets | System | System |

Next hub must not grow a second control for any row.

### SELECT-only RPCs the next hub may show

`admin_build_health`, `admin_game_health`, `admin_live_snapshot`, `admin_list_users`, `admin_user_account`, `admin_identity_inspect`.

Fingerprints (catalog, unchanged this issue): list `4044aa5ba8238efa9b6dbce02f5288db`, account `88f488058dc6f56d827666bee497b531`, inspect `e9091c0de1b91e67a62bade78cf8edde` STABLE. R21 closed.

### Not available from those three trainer RPCs

Full PC boxes, favorite/locked, Bits entitlements, achievement journal, Oak research, evolution log, email address, support/QA timeline, coin ledger. Say **unavailable**. Do not invent.

---

## 3. External patterns (sources, not skins)

These are conceptual references. StreamLink keeps its own type, color, and product names.

| Source | Applicable pattern | Do not copy |
|---|---|---|
| [Linear UI redesign](https://linear.app/now/how-we-redesigned-the-linear-ui) | Inverted-L chrome: persistent nav + page header + one content panel. Reduce chrome so hierarchy is nav → view header → record. Density over decoration. | Linear sidebar icons, Inter Display, their color system |
| [Intercom Inbox](https://www.intercom.com/help/en/articles/6258745-the-inbox-explained) | Two work modes: **table/bird’s-eye** for scanning many records; **selected record** for the work. Configurable columns. Compact timestamps with full time on hover. | Conversation chrome, teammate avatars, snooze/assign |
| [Intercom panels](https://www.intercom.com/help/en/articles/7911926-customize-the-inbox-to-suit-you-and-how-you-work-best) | Staff can collapse the list to give one record the full screen. That is a **mode**, not a permanent 300px card rail. | Their three-panel chat layout |
| [Retool design](https://docs.retool.com/education/coe/well-architected/design) | One primary + one accent. Tables: no outer box, no vertical rules, no shadow. Tags for status. Navigation is how staff move between jobs. | Retool components, Plotly dashboards |
| [Shopify admin customers](https://shopify.dev/docs/api/admin-extensions/latest/targets/customers) | **Index** (find/filter/page) is a different page from **details** (one customer). Writes live on the record or in a named action, not on every list card. | Shopify Polaris, order widgets |
| Stripe dashboard (general) | Customer list is identity + a few truthful statuses. Detail page groups payments / info as sections. No activity chart unless the feed exists. | Stripe graphs, billing chrome |

**Taken for StreamLink:** one durable hub shell; find and inspect are different jobs; directory shows only list-RPC fields; record groups account / holdings / progression / sign-in; writes have one named home; missing contracts stay labeled unavailable.

---

## 4. Task inventory / user journeys

| ID | Staff job | Entry | Needed context | Read / write | APIs today | Unknown |
|---|---|---|---|---|---|---|
| T1 | Find a trainer by name, login, UUID, Twitch login | **Trainers** search | `admin_list_users` row | Read | `p_query`, `p_offset`, page 50 | Email search needs a new staff_edit RPC |
| T2 | Understand account state | Trainers → record Overview | Identity, role, Pass, password-login boolean, registered, last seen | Read | `admin_user_account.user` | Moderator vs owner email (R18) |
| T3 | Investigate missing Pokémon | Record → Pokémon | Newest 40 live catches | Read (partial) | `account.mons[]` | Full PC / favorite / locked need `admin_trainer_pc` (not built) |
| T4 | Investigate missing items / candy / coins | Record → Inventory | Bag + candy qty | Read | `account.bag`, `account.candy` | Bits not in these RPCs |
| T5 | View linked Twitch identities | Record → Connections | Primary / confirmed / gameplay / login | Read | `account.connections`, `account.health` | Unlink stays legacy write |
| T6 | Troubleshoot “they were just here” | Overview last seen + Connections | `lastSeenAt` is **not** a journal | Read | list/account timestamps | No activity feed RPC |
| T7 | Grant / adjust items, coins, Pokémon, role | **Support** doorway → legacy desk | Target UUID from Trainers | Write (legacy only) | `admin_grant_*`, `admin_set_*` | **A3:** Trainers desk vs Oak QA vs future Support case |
| T8 | Oak QA provenance grant / research reset | Support → Oak QA | QA account, not a normal trainer grant | Write (legacy) | `admin_oak_qa` | Same A3 |
| T9 | Operate a stream | **Operations** | Snapshot observation | Read here; start/stop on current Dashboard | `admin_live_snapshot` | Do not mix `admin_live_dashboard` into Trainers (R17) |
| T10 | Adjust economy / content | **Mart** / **Configuration** | SKU or encounter editors | Write on current hub | store/config saves | Preview stays copy + deep link |
| T11 | Grant Pass / edit secrets | **System** | Owner tools | Write on current hub | System RPCs | Not a Trainers action |
| T12 | Health / build | **Analytics** | Build + game health | Read | `admin_build_health`, `admin_game_health` | Not a trainer dashboard |

Journey that both proposals share:

1. Open Admin Hub → persistent nav (not a fixture “Next Hub” kicker).
2. Trainers → search (`p_query`) → page of 50 (`p_offset`).
3. Open one trainer → full record with grouped panes.
4. If the job is a mutation, leave through **Support** (or System / Operations). Trainers never grows grant buttons in this design.

---

## 5. Proposed global information architecture

One shell for every next-hub page:

```
┌ nav (persistent) ┬ page header (title + context + staff) ┐
│ Operations       │                                          │
│ Trainers         │  page body (one job)                     │
│ Support          │                                          │
│ Mart             │                                          │
│ Configuration    │                                          │
│ Analytics        │                                          │
│ System           │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

| Nav item | Authoritative home | Inspect | Act |
|---|---|---|---|
| Operations | Live RPG observation | snapshot | Start/stop stays current Dashboard until a later ops gate |
| **Trainers** | Find + inspect accounts | list + account + inspect | none |
| **Support** | Privileged trainer recovery | none yet | Single doorway to legacy grant/Oak QA until A3 |
| Mart | Catalog / studio | none here | Current Economy |
| Configuration | Encounters / numbers | none here | Current Encounters |
| Analytics | Build + game health | health RPCs | none |
| System | Secrets, Pass grant | none here | Current System |

**Support vs Trainers vs Oak QA** (A3 remains owner’s):

- **Trainers** = lookup and truth of *what the account is*.
- **Support** = the only next-hub door to *change* a trainer.
- **Oak QA** = provenance-tagged QA grants / research reset, not the everyday gift desk. It is reached from Support, not from the Trainers record.

Do not decide A3 here. Both proposals keep the doorway, not a second grant desk.

Page header is always: current area title, one-line context (search query, selected trainer, or “observation only”), staff identity. No hero banner.

---

## 6. Data-field mapping (verified)

Sources: Gate 2A live catalog (`docs/audits/admin-hub-gate-2a-trainer-management.md`) and presenters. `—` = do not show. **Unavailable** = show that word, never invent.

### Directory — `admin_list_users` only

| Field | JSON | Directory | Notes |
|---|---|---|---|
| id | `users[].id` | row key, not a column | UUID search works in `p_query`; do not print UUID on every row |
| displayName | `displayName` | primary | Fallback login |
| login | `login` | secondary `@login` | |
| avatar | `avatar` | 32px or initial | Empty = letter, not a broken image |
| role | `role` | chip | Default `player` |
| pass | `pass` | Pass / — | Boolean |
| caught | `caught` | Pokémon count | Live catches only |
| lastSeenAt | `lastSeenAt` | compact date | Full UTC in `title` / details. Null → unavailable |
| coins | `coins` | **omit from directory** | Duplicates Inventory; clutters scan |
| createdAt | `createdAt` | **omit from directory** | Overview only |
| total / offset | envelope | pager | Page size **50**. No client-side full catalog |
| staffRole | envelope | not a row field | |

Not on the list RPC: Twitch linked boolean, email, level, title. Do not infer “Twitch linked” from a login string.

### Record header (both proposals)

| UI | Source | If missing |
|---|---|---|
| Name / handle / avatar | `admin_user_account.user` | login fallback |
| Role / Pass | `user.role`, `user.pass` | player / No Pass |
| Last seen | `user.lastSeenAt` | unavailable |
| Level / caught / coins | `inspect.trainer.level`, `trainer.caught` or list `caught`, `bag.coins` | **unavailable** — never invent |

### Overview

| UI | Source | Duplicate to drop |
|---|---|---|
| Display name, login, username if different | `user` | |
| Account id | `user.id` | not in directory |
| Role, Pass, password-login present | `user.role`, `user.pass`, `user.emailLogin` | email **address** never shown |
| Registered, last seen | `user.createdAt`, `user.lastSeenAt` | compact + full on demand |
| Connection one-liner | `health.primaryTwitch` or first primary connection | full table stays on Connections |
| Level / coins / ranking | — | Progression / Inventory |

### Pokémon

| UI | Source | Limit |
|---|---|---|
| name, dex, variant, gender, level, ball, nickname, caughtAt | `mons[]` | newest **40** live |
| favorite, locked, box, form id, obtained_method | **unavailable** | needs new `admin_trainer_pc` |
| Full PC | **unavailable** | do not claim complete |

### Inventory

| UI | Source |
|---|---|
| coins, used / capacity | `bag.coins`, `bag.used`, `bag.capacity` |
| pokeball, greatball, ultraball, masterball | `bag.*` (Master Ball display only) |
| berry, bait, lure | `bag.*` |
| family candy | `candy[]` where `qty > 0` (`name`, `familyId`, `qty`) |
| Bits | **unavailable** |

### Progression

| UI | Source |
|---|---|
| level, xp, title, caught, seen, shinyCaught, kanto.caught | `inspect.trainer` |
| rankingVisible, rankingEligible | inspect booleans |
| titles / badges | `{ id, name, unlocked, unlockedAt }` |
| cosmetics | unlocked / locked / equipped when present |
| ownedAvatarPacks | id list |
| catalog | `{ id, kind, name }`; collapse if it matches cosmetics |
| achievements, Oak research, evolution log | **unavailable** |

### Connections

| UI | Source |
|---|---|
| Primary / linked / gameplay / bot counts | `health.primaryTwitch`, `linkedTwitch`, `gameplayTwitch`, `botTwitch` |
| Each link | `type`, `displayName`, `login`, `twitchUserId`, `primary`, `confirmed`, `gameplayEnabled`, `loginEnabled`, `status`, `linkedAt` |
| Link / unlink / primary write | not in preview — Support doorway |

### Status labeling (no ungrounded words)

| Label | Grounding |
|---|---|
| Player / staff / other `role` | `user.role` or list `role` only |
| Pass / No Pass | `pass` boolean |
| Password login yes/no | `emailLogin` boolean — **not** “has email” |
| Ranking listed / hidden | `rankingVisible` / `rankingEligible` on Progression only |
| Twitch primary / confirmed / gameplay | connection flags |
| unavailable | field absent or null |
| Never: Active, Healthy, VIP, Online, Banned, Verified | not in these RPCs |

---

## 7. Visual system (proposal, not implemented)

| Token | Value | Job |
|---|---|---|
| Page bg | `#f6f1ec` | One surface. No nested full-page white cards |
| Ink | `#2a1f28` | Body |
| Muted | `#6b5a66` | Meta, compact dates |
| Line | `#eadfe4` | Horizontal rules only |
| Pass | `#c45c7a` | Pass chip only |
| Focus | `#c9a227` 2px | `:focus-visible` |
| Row hover | `#fff7fb` | Directory / list |

**Type** (existing Fredoka / Nunito stay if implemented later; wireframes use system-ui so review is readable):

| Role | Size / weight |
|---|---|
| Hub product | 13 / 600 |
| Page title | 20 / 650 |
| Section | 14 / 650 |
| Body / table | 13 / 400 |
| Meta / chips | 12 / 500 |

**Space:** 4 · 8 · 12 · 16 · 24. Row height 40–44px. Section gap 16px. No 32px empty card padding.

**Icons:** text and initials first. One style if icons are added later.

**Dates:** `12 Oct, 2:14 PM` (local). Full `2026-10-12 18:14:03 UTC` in `title` and a `<details>` on Overview. Directory must not be a UTC column.

**Charts / metrics:** only verified numbers (caught, coins, bag used). No activity sparkline, no fake health doughnut.

**Responsive:** 1440 uses the chosen IA (A: full table or full record; B: list + record). 390 stacks nav behind “Admin menu”; directory or record, not both. 200% zoom uses the same container rules, not a second breakpoint soup.

**A11y:** real `<button>` rows (not `role=row` on the button), `role=tab` panes, visible focus, `prefers-reduced-motion: reduce`, 100% zoom is the design size.

**Fixture chrome:** a one-line “Design wireframe — not live data” under the page title. Never a dominating lab panel.

---

## 8. Two candidates (summary)

Full annotated frames: [Proposal A](./design-reset/proposal-a.html) and [Proposal B](./design-reset/proposal-b.html). Decision sheet: [DESIGN-RESET-DECISION.md](./DESIGN-RESET-DECISION.md).

**A — Record workspace.** Trainers is an index page (dense table). Opening a row replaces the table with a full-width record. **All trainers** restores query, offset, scroll. Shopify/Stripe show-page. Matches Intercom’s “collapse the list” mode as the *default inspect*.

**B — Inbox split.** Trainers is always a dense name list (one line, not 300px cards) plus the record. Desktop keeps the list; 390 is list or record. Intercom Inbox default. Better for hopping during a stream; worse for “layout of the data” because two densities share one view.

Neither is a renamed card gallery. Neither is wired into `admin-next.html`.
