# Trainer record IA — issue #12

**Parent:** GitHub epic #11 (Trainer account management, collection managers, helpdesk).  
**This issue:** static comparison prototype only. **Not A1. Not A9. Not A10.** Not issue #13 recovery. Not issue #14 ticket schema.

Proposal A shell stays: persistent hub nav; Trainers **index or** full-width record; All trainers restores query / page / scroll; Support doorway; no grants on the record.

Comparison:

- Before (issue #10): [hub-a-visual-v4.html](./design-reset/hub-a-visual-v4.html)
- After (this issue): [hub-a-visual-v5.html](./design-reset/hub-a-visual-v5.html)

**D13** records this IA: simplified identity header, Starlight Pass, readable Connections, Inventory and Unlockables category managers, Tickets placement. Live `admin-next.html` is unchanged.

---

## Before / after

| | Visual v4 | Visual v5 |
|---|---|---|
| Persistent header | Avatar + name + Pass chip + **Level / Caught / Coins / Last seen** facts | Avatar (verified field or initial), display name, @login, role, **Starlight Pass**, last seen only |
| Pokémon art | Official PNG; collection subtitle still showed `#dex` | PNG with **no Pokédex overlay**. Dex stays in the detail text |
| Inventory | Four stacked summaries | Category browser → item list → detail. Grant/Remove **disabled storyboard** |
| Progression | Chip soup of titles/badges | Ranking + level stay. **Unlockables** groups: Titles, Badges, Trainer ID Backgrounds, Avatars, Ribbons (future), other catalog kinds |
| Connections | Compact flag chips | Per-link identity cards with purpose of primary / confirmed / loginEnabled / gameplayEnabled / status / bot-utility. No unlink |
| Tickets | Absent | Tab placement for open cases + history. **No ticket data** |
| Directory Pass | Chip “Pass” | Chip **Starlight Pass** / No Pass |

Unchanged: newest-40 collection is **not** the PC; Support doorway; raised nav; full-row directory; unsigned Oak / Leaf / Blue only.

---

## Data-field matrix

Sources: Gate 2A catalog (`docs/audits/admin-hub-gate-2a-trainer-management.md`), Gate 2 field dictionary, `js/admin-next-trainers.js` `EXPECTED_IDENTITY_KEYS`.  
**Show unavailable. Never invent.**

### Directory — `admin_list_users` (verified)

| UI | Source | Missing / do not show |
|---|---|---|
| Avatar | `users[].avatar` | Empty → initial, not a broken image |
| Display name / @login | `displayName`, `login` | |
| Role | `role` | |
| Starlight Pass | `pass` boolean | Do not label “Pass” alone |
| Pokémon count | `caught` | Live catches only |
| Last seen | `lastSeenAt` | Null → unavailable |
| Coins, createdAt, UUID column | omit from directory | UUID is the row key |

### Record header

| UI | Source | If missing |
|---|---|---|
| Avatar | `admin_user_account.user.avatar` (same as list) | Initial |
| Display name / @login | `user.displayName`, `user.login` | login fallback |
| Role | `user.role` | player |
| **Starlight Pass** | `user.pass` | No Pass |
| Last seen | `user.lastSeenAt` | unavailable |
| Level / caught / coins | **not in header** | Progression / directory / Inventory |
| Email address | **never** | not on these RPCs |
| Confirmed-Twitch one-liner | only if a connection has `confirmed === true` | omit; do not say Verified |

### Overview — `admin_user_account.user`

| UI | Source | Missing |
|---|---|---|
| Display name, login, username if different | `user` | |
| Account id | `user.id` | |
| Role, Starlight Pass, password login | `role`, `pass`, `emailLogin` | email **address** |
| Registered | `user.createdAt` | |
| Twitch one-liner | `health.primaryTwitch` | full table on Connections |
| Level, coins, ranking, tickets | — | other tabs |

### Pokémon — `admin_user_account.mons[]`

| UI | Source | Limit |
|---|---|---|
| id, dex, name, nickname, variant, gender, ball, level, caughtAt | `mons[]` | **newest 40 live** |
| Art | dex + verified shiny PNG map (issue #10) | no dex overlay on the PNG |
| favorite, locked, box, form, obtained_method, moves, stats | **unavailable** | needs a new PC read |
| Full PC | **unavailable** | do not claim complete |

### Inventory — `bag` + `candy[]`

| UI | Source | Missing |
|---|---|---|
| Coins | `bag.coins` | |
| Bag used / capacity | `bag.used`, `bag.capacity` | |
| Poké / Great / Ultra / Master Ball | `bag.pokeball` etc. Master Ball **display only** | |
| Berry, bait, lure | `bag.*` | |
| Family candy | `candy[]` where `qty > 0` (`name`, `familyId`, `qty`) | |
| Bits | **unavailable** | |
| Full item catalog / Mart SKUs | **unavailable** | do not fake |
| Grant / remove | **no write RPC on this page** | disabled storyboard; A3 still open |

### Progression / Unlockables — `admin_identity_inspect`

Verified keys: `ok, trainer, rankingVisible, rankingEligible, cosmetics, ownedAvatarPacks, titles, badges, catalog`.

| Category | Source | Status in v5 |
|---|---|---|
| Level / XP / title / caught / seen / shinyCaught | `inspect.trainer` | **Available** — stays on Progression |
| Ranking listed / eligible | `rankingVisible`, `rankingEligible` | **Available** |
| Titles | `titles[]` `{ id, name, unlocked, unlockedAt }` | **Available** |
| Badges | `badges[]` `{ id, name, unlocked, unlockedAt }` | **Available** as Badges. Do **not** relabel as Ribbons |
| Trainer ID Backgrounds | `cosmetics[]` / `catalog[]` where `kind=background` | **Available** when kind is present |
| Avatars | `ownedAvatarPacks[]` plus `cosmetics` `kind=avatar` | **Available** as pack ids / avatar cosmetics |
| Other catalog kinds | leftover `catalog[]` `{ id, kind, name }` (e.g. `team_background`, `frame`) | Show only kinds that return |
| Ribbons | **no distinct inspect array** | **Future scope.** Player UI may map cosmetic `kind=badge` to “Ribbon”; this preview will not guess |
| Achievements, Oak research, evolution log | **unavailable** | future read |
| Grant / revoke | **no write** | disabled storyboard |

Equipped is only asserted when `cosmetics[].equipped` is present, or when `trainer.title` matches an unlocked title id/name. Otherwise Owned / Locked.

### Connections — `health` + `connections[]`

| Flag | Meaning to show | Do not say |
|---|---|---|
| `primary` | Main Twitch identity for this trainer | Online |
| `confirmed` | Identity-confirmation flag on the link | Verified (social) |
| `loginEnabled` | This Twitch can sign the trainer in | |
| `gameplayEnabled` | This link can earn gameplay rewards | |
| `status` | Raw status string | Live presence |
| `health.botTwitch` / status utility | Count of bot/utility links | “This player is a bot” |
| Unlink / set primary | **not here** | Issue #13 + Support doorway |

Fields per row: `type, displayName, login, twitchUserId, primary, confirmed, gameplayEnabled, loginEnabled, status, linkedAt`.

### Tickets — **no contract**

| UI | Source | Notes |
|---|---|---|
| Open cases | **missing** | Tab exists so staff know where history will live |
| History | **missing** | Issue #14 |
| Player submission | **missing** | Issue #14 |
| Staff inbox | Support IA, not this record | Do not mix owner recovery into the timeline |

Private tickets must never render on another trainer’s record. This prototype shows **unavailable**, not sample complaints.

### Explicitly not in these RPCs

Full PC · favorite/locked/box · email address · Bits · coin ledger · Oak QA history · account audit journal · password reset · Twitch unlink · ticket rows · ribbon-as-separate-catalog.

---

## Interaction

- Category and item rows are native `<button>`s. Tab + Enter/Space. Escape pops one drill-in (Pokémon detail, unlock item, inventory item, then group).
- Grant / Remove / Revoke are `disabled` inside a dashed **Storyboard only** box. They cannot look live.
- Reduced motion: existing `prefers-reduced-motion` kill-switch on transitions.
- 1440 / 1024 / 720 / 390. Directory still full-row. Header no longer uses a four-metric fact strip.

---

## Future A9 / write gates (do not start)

- Vendored PNG art (issue #10).
- New reads before claiming PC, ribbons, tickets, or email.
- Issue #13 security design before any password reset or unlink.
- Issue #14 architecture before any ticket table, RLS, or player form.
- A3 before any grant UI that actually calls a mutator.
- **A9** still required to touch `admin-next.html`.

---

## Honesty

Illustrative Oak / Leaf / Blue only. No Sora, Twinkle, or PlayTester. No `playCall`. No fabricated balances beyond the same fixture numbers v4 already used for Oak’s bag. Screenshot fonts may garble — review the local HTML at 100% zoom.
