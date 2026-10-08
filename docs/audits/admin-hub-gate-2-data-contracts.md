# Gate 2 — Trainer data contracts

Maps every profile field to an authoritative source. **If a source is missing, Gate 2 UI must say Not available.** Do not derive fake stats in the browser.

Tags: **LIVE SQL** · **REPO** · **UNVERIFIED** · **NEW RPC (proposed, not built)**

---

## 1. Existing admin read RPCs (safe to reuse for Gate 2)

None of these call `settle_due_rounds` or `director_tick_if_due` in their live bodies.

### `public.admin_list_users(p_query text, p_offset int)`

| | |
|---|---|
| Guard | `require_hub` **LIVE** |
| Volatility | STABLE |
| Anon EXECUTE | yes |
| Returns | `ok, total, offset, users[], staffRole` |
| Per user | `id, login, displayName, avatar, role, createdAt, lastSeenAt, pass, coins, caught` |
| Email | no |
| Twitch ids | search only, not returned |
| PC | no |
| Side effects | none in body **LIVE** |

Page size: implementation uses offset steps of 50 **REPO** (`admin-tools.js`).

### `public.admin_user_account(p_user uuid)` → `private.admin_account_json`

| | |
|---|---|
| Guard | `require_hub` |
| Volatility | STABLE |
| Returns | `ok, user, health, bagSource, connections[], bag, candy[], mons[], staffRole, canEdit, ownerTools` |
| `user.emailLogin` | boolean via `profile_has_password` (**email exists + password**, not the address) |
| `mons[]` | up to **40** live catches (`transferred_at is null`); fields `id, dex, name, nickname, variant, gender, ball, level, caughtAt` |
| Missing on mons | favorite, locked, box, form id, obtained_method |
| `bag` | merged inventory layers |
| `candy[]` | familyId, name, baseDex, qty, members |
| Side effects | none **LIVE** |

### `public.admin_identity_inspect(p_user uuid)`

| | |
|---|---|
| Guard | `is_play_admin` |
| Volatility | VOLATILE (no DML keyword **LIVE**) |
| Returns | `ok, trainer` (`private.trainer_card`), `rankingVisible`, `rankingEligible`, `cosmetics`, `ownedAvatarPacks`, `titles[]`, `badges[]`, `catalog` |
| Email / bag / PC | no |
| Achievements | showcase fragment only, not full `play_progression` list |

`private.trainer_card` **does not include the account UUID** (by design **REPO**). Always keep `p_user` from the directory selection.

---

## 2. Player RPCs — do not use as admin-target APIs

| RPC | Why not for another trainer |
|---|---|
| `play_sync` / `play_snapshot` | Uses `auth.uid()`; **calls `director_tick_if_due`** **LIVE SQL** (R17) |
| `play_storage` | Self PC layout only |
| `play_collection` | Self bag + research + owned with favorite/locked |
| `play_progression` | Self achievements |
| `play_trainer(p_login)` | Public card; not a staff dossier; no uuid |

---

## 3. Field dictionary

| Field | Authoritative table / JSON | Gate 2 RPC | Notes |
|---|---|---|---|
| uuid | `profiles.id` | list / account | |
| display name | profiles | list / account / card | |
| trainer login | `username` / `twitch_login` | list | |
| email address | `auth.users.email` | **NEW `admin_trainer_email` staff_edit** | Not on profiles |
| email present | `profile_has_password` | `user.emailLogin` | Boolean only |
| role | `staff_roles` + owner heuristic | list `role` | |
| Pass | `profiles.starlight_pass` | list/account | |
| coins | `inventories.coins` | list + bag | |
| XP / level | profiles + progression service | identity `trainer` | |
| Pokédex counts | trainer_card | identity | |
| live mon count | catches where transferred_at is null | list `caught` | |
| 40 recent mons | catches | account `mons` | Incomplete PC |
| favorite / locked | `catches.favorite` `locked` **LIVE columns** | **NEW pc RPC** | |
| PC boxes | `profiles.pc_layout` JSON **no box column on catches** | **NEW pc RPC** | |
| team | pc_layout / team ids | identity `trainer.team` (showcase) vs full team **UNVERIFIED overlap** | Prefer pc RPC |
| bag items | inventories + JSON layers | account `bag` | |
| family candy | `family_candy` | account `candy` | |
| Twitch connections | `twitch_connections` | account `connections` | |
| ranking flags | profiles | identity | |
| titles / badges / cosmetics | progression tables | identity | |
| achievements list | `trainer_achievements` | **NEW progression RPC** | |
| Oak research | `oak_research_claims` | **NEW or unavailable** | |
| evolution log | `evolution_log` | **NEW or unavailable** | |
| staff identity audit | `private.account_audit` | **NEW**; currently **0 rows** | |
| Oak QA history | `admin_qa_grants` | **NEW select by target_user** | |
| coin movements | `coin_ledger` | `admin_coin_ledger` **MISSING LIVE** | R19 |
| last activity | `profiles.lastSeenAt` | list | Not a full journal |

---

## 4. Proposed new RPCs (Gate 2 implementation, after owner review)

All: `SECURITY DEFINER`, `search_path=public`, **GRANT authenticated only**, `require_hub` first, **no** `director_tick`, **no** `settle_due_rounds`, **no** `play_snapshot`.

### `admin_trainer_pc(p_user uuid)`

SELECT all live catches with `catch_json` fields + favorite/locked/obtained_method/form + join `pc_layout` boxes/slots + team ids. Paginate if >200 mons (`p_offset`).

### `admin_trainer_progression(p_user uuid)`

SELECT achievements, titles, badges, research claims, evolution_log summary. No writes.

### `admin_trainer_support_log(p_user uuid)`

UNION-style JSON: `account_audit` for target, `admin_qa_grants` for target, optional ledger tails. Never include tokens.

### `admin_trainer_email(p_user uuid)` **require_staff_edit**

Returns `{hasEmail, email}` or `{hasEmail}` for moderators (second function / role branch). Do not put email on the directory.

If owner rejects new RPCs for Gate 2, ship directory + overview + partial Pokémon/inventory from the three existing reads only, and label gaps.

---

## 5. Protected accounts (for later mutation gates)

| Account | UUID (REPO / historical) |
|---|---|
| Sora | `60ff5211-6ef8-40e6-8daa-095b5600bf4c` (hardcoded in live `admin_oak_qa`) |
| Twinkle | `da777b13-6879-44a8-99f4-a154e54d3d75` (`historical_candy_family_reconciliation` migration only) |

Gate 2 **read** of these accounts is allowed for staff (same as today). Gate 3 mutations must server-deny. This gate did not SELECT those rows.

---

## 6. What Gate 2 must not fetch

- `admin_overview` (R1)
- `admin_live_dashboard` (R17) from the Trainers tab
- `admin_oak_qa` even as “inspect”
- `admin_refill_test`
- Full `auth.users` dumps
- Client-side scan of all `profiles` via Supabase table SELECT (RLS may allow own row only — **do not add a wide SELECT policy**)
