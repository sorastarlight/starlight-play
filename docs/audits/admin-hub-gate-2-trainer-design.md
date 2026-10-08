# Gate 2 — Read-only Trainer Management design

**Status:** IMPLEMENTATION-READY DESIGN. **Do not implement in this gate.**  
**Host:** existing `admin-next.html` preview. **Do not replace `admin.html`.**  
**Mutations:** none. Support actions stay on the current hub until Gate 3.

Production baseline: `20261008-rc131`. Authority: `docs/audits/admin-hub-gate-15-contract-matrix.md` and `admin-hub-gate-2-data-contracts.md`.

---

## 1. Goals

Staff can find a trainer, inspect a verified dossier, and leave to legacy Support when they need to change something.

Non-goals for Gate 2: grants, coin/XP edits, Oak QA, identity repairs, PC destructive ops, email writes, “edit any column.”

---

## 2. Navigation / feature flag

- Page remains `data-page="admin-next"`. Default staff entry remains `admin.html`.
- Tab **Trainers** (already in the seven-item IA) becomes the directory + profile workspace.
- Tab **Support & Recovery** stays a deep-link card to `admin.html?section=trainers` and Oak QA. **No mutation buttons.**
- Feature flag = “the preview URL exists.” No extra JS flag. If a new read RPC is missing, the panel shows **Not available** and the legacy link.

Fallback: `Open current Trainers` already points at `admin.html?section=trainers`.

---

## 3. Staff authorization

1. Same gate as today: `supabase.rpc("is_play_admin")` then show `#staff`.
2. Every new RPC: `require_hub()` (or `is_play_admin`) **before** any SELECT of foreign trainer rows.
3. Email and raw `auth.users` fields: `require_staff_edit()` (owner/admin), never moderators.
4. Moderators may **view** directory + gameplay dossier (hub already lets them open Trainers). They must not see email.
5. Do **not** call `admin_overview` or `admin_live_dashboard` from this tab (R1 / R17).

`admin-next.js` `readCall` allowlist must be extended **only** with named TRUE_READ RPCs after they exist. Until then Gate 2 UI can reuse `admin_list_users` / `admin_user_account` / `admin_identity_inspect` which are STABLE/read after guard — **LIVE SQL**.

---

## 4. Trainer directory

### 4.1 Search

| Query | Behavior | Source |
|---|---|---|
| Display name / username / Twitch login | Existing `admin_list_users.p_query` | LIVE `profiles` + `twitch_connections` |
| Internal UUID | Allow exact UUID in `p_query` (already useful; confirm in implementation) | `profiles.id` |
| Twitch user id | Already matched in SQL search **REPO** | `twitch_connections.twitch_user_id` |
| Email | **New**, `require_staff_edit` only | `auth.users.email` — not on `profiles` |
| Trainer public ID / login | Same as username | `profiles.username` / `twitch_login` |

Do not load the entire user table into the browser. Keep server pagination (`p_offset`, page size 50 as today).

### 4.2 Row fields (directory)

| Field | Source | If missing |
|---|---|---|
| Display name, login, avatar | `admin_list_users` | — |
| Role | list `role` | player |
| Pass | list `pass` | false |
| Coins | list `coins` | 0 |
| Live Pokémon count | list `caught` (`transferred_at is null`) | 0 |
| Last seen | list `lastSeenAt` | **Not available** if null |
| Created | list `createdAt` | |
| Twitch linked | **Not on list today** — show “—” unless a cheap boolean is added | Do not infer from login string |

Do not show email on the list.

### 4.3 UX

- Search field + Find / Previous / Next (existing pattern).
- Empty: “No trainers match.”
- Error: `playRpcError`, keep previous rows.
- Sort: **server default** (current list order). Do not add client sort of a full dump.
- Selecting a row opens the profile workspace in the main pane (desktop: list | profile; 390px: list then profile with Back).

---

## 5. Profile workspace layout

One page, in-page subnav (not new site routes): **Overview · Pokémon · Inventory · Progression · Connections · Support history**.

Visual system: existing `.hub-card`, `.staff-users`, `.user-desk-grid`, admin-next metrics. No React/Tailwind.

### 5.1 Overview

| UI | Authoritative source | Gate 2 |
|---|---|---|
| Identity (name, login, uuid, avatar) | `admin_user_account.user` | Yes |
| Account status / role / Pass | `user.role`, `user.pass` | Yes |
| Email login present | `user.emailLogin` boolean | Yes (boolean). Raw email: **new RPC, staff_edit only**, else “Hidden” |
| Level / XP / title | `admin_identity_inspect.trainer` | Yes |
| Pokédex progress | `trainer.variants` / `trainer.kanto` | Yes |
| Catch statistics | trainer_card stats | Yes |
| Coins (summary) | `bag.coins` or `trainer.coins` | Yes |
| Twitch linked / primary | `health` + `connections` | Yes |
| Recent activity | **No verified admin feed** | **Not available** (do not fake from `lastSeenAt` alone) |

### 5.2 Pokémon

| UI | Source | Gate 2 |
|---|---|---|
| Species, form, shiny, gender, level, nickname, ball, caughtAt | `mons[]` from `admin_user_account` | **Partial** — max **40** newest live mons **LIVE SQL** |
| Team / PC box / slot | `profiles.pc_layout` via player `play_storage` | **Not available** for another user today → **new read RPC** `admin_trainer_pc` |
| Favorite / locked | `catches.favorite` / `locked` | **Not in admin mons[]** → include in `admin_trainer_pc` |
| Soft-removed | `transferred_at` | Out of default list; optional “show transferred” later |
| Acquisition | `obtained_method` / `source_key` | **UNVERIFIED** on admin payload — mark **Not available** until the new RPC selects it |

Until `admin_trainer_pc` exists, show the 40-mon list plus a banner: “Full PC boxes are not in this snapshot. Open current Trainers / player PC is not a substitute.”

### 5.3 Inventory

| UI | Source | Gate 2 |
|---|---|---|
| Balls, berries, items, capacity | `admin_user_account.bag` | Yes |
| Family candy | `candy[]` | Yes |
| Coins | `bag.coins` | Yes |
| Pass | `user.pass` | Yes |
| Bits entitlements | **Not in these three RPCs** | **Not available** |
| Master Ball | `bag` / `balls.masterball` | Display only; no edit |

### 5.4 Progression

| UI | Source | Gate 2 |
|---|---|---|
| XP / level | identity `trainer` | Yes |
| Titles / badges / cosmetics owned | `admin_identity_inspect` | Yes |
| Achievements full list | player `play_progression` (self only) | **Not available** for arbitrary UUID → new `admin_trainer_progression` |
| Oak research claims | `play_collection` (self) | **Not available** → include in new RPC or mark unavailable |
| Evolution history | `evolution_log` | **Not available** unless new SELECT |

Do not call `play_progression` / `play_collection` as the signed-in staff user and pretend it is the target.

### 5.5 Account connections

Use `admin_user_account.connections[]` (Twitch user id, login, primary, gameplay/login flags, type, confirmed). Owner-only unlink remains legacy.

Diagnostics: `health.primaryTwitch`, `linkedTwitch`, `botTwitch`. Auth email: see Overview.

### 5.6 Support history

`private.account_audit` has **0 rows** and almost no admin writers. `admin_qa_grants` has Oak QA history.

Gate 2 display:

- Oak QA grants for this UUID from a **new staff-only SELECT** (or skip if not ready).
- Identity audit rows if any.
- Coin/XP/candy ledgers: **Not available** as a unified support timeline until Gate 3 audit contract.
- Empty state: “No staff audit rows for this trainer.” Never invent history.

---

## 6. Component architecture (vanilla)

Keep `js/admin-next.js` as the shell (tabs, gate, `readCall`).

Add `js/admin-next-trainers.js` loaded only on `admin-next.html`:

- `loadDirectory(query, offset)`
- `loadProfile(userId)` — parallel `admin_user_account` + `admin_identity_inspect` (existing) and later the new RPCs
- Render functions per subnav
- No shared mutable global with `admin-live.js`

Data-loading boundary: presentation receives JSON; it does not compute eligibility, coins, or capture odds.

---

## 7. Error / a11y / responsive

- Directory and profile `role="status"` live regions (existing hub pattern).
- Keyboard: list buttons already; profile subnav as tabs with `aria-selected`.
- 1920 / 960 / 390: stack list above profile; sticky subnav on small screens.
- Reduced motion: no new animation required.

---

## 8. Designed — not implemented — mutation workflows (Gate 3+)

Each future action on Support must follow this sequence. Gate 2 only **displays** a “Open current Trainers to perform this” link.

Shared steps (all mutations):

1. Target verification (uuid + login + Twitch shown)
2. Current-state re-fetch
3. Action name in plain language
4. Validated inputs (existing RPC constraints: Kanto 1–151 for `admin_grant_pokemon`, etc.)
5. Reason string (new `p_reason` — **not in most live RPCs today**; requires SQL in Gate 3)
6. Preview (before/after counts)
7. Protection checks (Sora/Twinkle/server deny)
8. Explicit confirm (`playPresentConfirm`, danger for remove/reset)
9. Existing server RPC (do not add a generic updater)
10. Re-fetch authoritative JSON
11. Audit row
12. Status text from server `message`

| Workflow | Live RPC | Extra Gate 3 needs |
|---|---|---|
| Grant item | `admin_grant_bag` | reason + audit; Master Ball confirm **already UI-only** |
| Grant Pokémon | `admin_grant_pokemon` | reason + audit; still no hard-delete |
| Grant Candy | `admin_grant_candy` | reason + audit |
| Adjust coins | `admin_set_coins` | reason; ledger already INFERRED |
| Correct progression | `admin_set_xp`, `admin_grant_achievement` | LATENT; do not expose until audited |
| Stuck encounter | Dashboard `admin_director_command` / cancel | **Not in Trainer tab** |
| Inventory repair | case-specific grants, not `admin_refill_test` | **Never refill-all** |
| Missing rewards | inspect ledgers + targeted grant | new read RPCs first |
| Twitch linking | `admin_set_twitch_*` / disconnect | already audited |
| Protected Pokémon | `locked` on catch; `admin_unlock_catch` | confirm + audit |
| Undo mistaken grant | soft-remove / ledger reversal | never silent delete |

---

## 9. Tests planned for the implementation gate (not this gate)

- Static: Trainers tab still has no grant RPC strings except allowlisted reads.
- `admin-hub-next-tests.js` allowlist update.
- Pagination does not request `offset` beyond `total`.
- Moderator session: email hidden (once email RPC exists).
- Non-admin: `#staff` hidden; RPC 42501.
- Real DOM 1920/960/390 of directory empty + populated fixtures — PlayTester only.

---

## 10. Out of scope

Stream lifecycle, Mart editor, config editors, SQL, EXECUTE revokes, Oak QA, Sora/Twinkle.
