# Admin Hub Gate 2A — read-only Trainer Management frontend

**Date:** 2026-10-11  
**Branch:** `gate-2a-trainer-management`  
**Production APP:** `20261008-rc133` (unchanged, **not deployed**)  
**Database:** starlight-play `dtflmlbjhttoewqgkujf`  
**Inspect fingerprint:** `e9091c0de1b91e67a62bade78cf8edde` STABLE (reconfirmed catalog-only)  
**SQL / grants / staff_roles:** unchanged this gate  
**Sora mutated:** NO · **Twinkle mutated:** NO · **PlayTester:** nonstaff (no `staff_roles` row)  
**Final release smoke:** paused

---

## 1. Verified live contracts (catalog only)

No trainer RPC was invoked against production for discovery. Contracts were read from `pg_proc` / helper catalogs. A write helper would have stopped this gate. None was found.

### `public.admin_list_users(p_query text, p_offset integer)` → jsonb

| Item | Live |
|---|---|
| Guard | `private.require_hub()` first (`is_play_admin` → 42501) |
| Volatility | STABLE DEFINER, owner postgres, `search_path=public` |
| md5 | `4044aa5ba8238efa9b6dbce02f5288db` |
| Writes | none |
| Search | LIKE on username, twitch_login, display_name, profile UUID text, connected Twitch login / display / user id |
| Page | `LIMIT 50 OFFSET greatest(p_offset,0)` plus `total` |
| Shape | `{ ok, total, offset, users[], staffRole }` |
| Per user | `id, login, displayName, avatar, role, createdAt, lastSeenAt, pass, coins, caught` |
| Sensitive | no email, no tokens. Twitch ids are search-only, not returned |
| Failure | 42501 for nonstaff; empty `users` when nothing matches |

### `public.admin_user_account(p_user uuid)` → jsonb

| Item | Live |
|---|---|
| Guard | `require_hub()` first |
| Volatility | STABLE DEFINER |
| md5 | `88f488058dc6f56d827666bee497b531` |
| Helpers | `admin_account_json`, `twitch_connections_json`, `profile_has_password` — all STABLE SELECT |
| Writes | none. Missing profile raises `No Play account for that trainer.` |
| Shape | `ok, user, health, bagSource, connections[], bag, candy[], mons[], staffRole, canEdit, ownerTools` |
| `user` | `id, username, login, displayName, avatar, role, pass, createdAt, lastSeenAt, emailLogin` (boolean only) |
| `mons` | newest 40 live catches |
| Sensitive | Twitch user ids for staff; no email address; no password hash; no tokens |

`canEdit` / `ownerTools` are **not** rendered as controls.

### `public.admin_identity_inspect(p_user uuid)` → jsonb

| Item | Live |
|---|---|
| Guard | `is_play_admin()` first → 42501 |
| Volatility | STABLE DEFINER |
| md5 | `e9091c0de1b91e67a62bade78cf8edde` |
| Writes | none. `evaluate_cosmetics` absent. R21 closed. |
| Keys | `ok, trainer, rankingVisible, rankingEligible, cosmetics, ownedAvatarPacks, titles, badges, catalog` |
| Catalog rows | `{ id, kind, name }` from enabled `progression_cosmetics` |
| Titles / badges | `{ id, name, unlocked, unlockedAt }` |

If a write helper had been found, this gate would have stopped. None was found.

---

## 2. Read-only security

- Same `is_play_admin` gate as the preview shell. No new auth flow.
- `readCall` allowlist only: `admin_build_health`, `admin_game_health`, `admin_live_snapshot`, `admin_list_users`, `admin_user_account`, `admin_identity_inspect`.
- No `admin_overview` (R1), no dashboard tick, no grants, no Oak QA, no role edits, no cosmetic evaluation.
- No service_role in the browser.
- No polling of trainer RPCs. Directory loads on intentional Trainers tab open / search / page. Profile loads on intentional row selection.
- Generation tokens (`trainerListGen`, `trainerProfileGen`) drop stale list/profile responses.
- Sign-out and 42501 clear selected trainer state.
- Text is escaped. No untrusted HTML. Trainer UUIDs are not written to `console` or analytics.
- Email address is not displayed. Password login is a boolean only.

R2 anon EXECUTE and R18 moderator breadth remain OPEN and were not changed.

---

## 3. Files changed

| File | Role |
|---|---|
| `admin-next.html` | Trainers panel: search, pager, directory, dossier, back |
| `js/admin-next.js` | Allowlist + generation-tracked reads |
| `js/admin-next-trainers.js` | Presenters / safe HTML |
| `css/play.css` | Trainer workspace layout |
| `tests/admin-hub-gate-2a-trainer-tests.js` | New static + presenter tests |
| existing hub tests | Allowlist now includes the three trainer reads |
| `docs/audits/admin-hub-gate-2a-trainer-management.md` | This audit |
| `docs/audits/admin-hub-gate-2a-trainer-workspace.md` | Frontend status |

Not changed: `admin.html`, `js/admin-live.js`, SQL, grants, RLS, staff_roles, `build.json`.

---

## 4. UI architecture

Feature flag remains `admin-next.html`. Legacy hub stays the default.

`js/admin-next-trainers.js` is a UMD presenter (`PLAY_ADMIN_NEXT_TRAINERS`) loaded before `js/admin-next.js`. The shell owns auth, `readCall`, generation tokens, and event wiring. Presenters own directory / account / identity mapping and escaped HTML.

Desktop: directory + dossier side by side.  
≤960px: directory or dossier, not both (`is-profile` hides the directory).

---

## 5. Directory behavior

Uses verified `admin_list_users` arguments only: `p_query`, `p_offset`. Server page size is 50. First page loads when a signed-in admin opens Trainers. Find submits the search form. Previous / Next step by 50 using the returned `total`.

**Limitations (not invented):** no extra client filters, no client-side full-catalog search, no page-size control. Empty query browses the first 50 registered trainers.

Loading keeps the previous row set (no list flicker). Non-auth failures keep previous rows and show `Could not load trainers.` 42501 resets trainer state.

---

## 6. Account inspector

`admin_user_account` fields only, in panes:

- **Overview** — display name, login, username, account id, role, Pass, password-login boolean, registered, last seen, level/title/coins when also returned by inspect, ranking flags, primary Twitch
- **Pokémon** — newest 40 live catches
- **Inventory** — bag counts + family candy with quantity
- **Connections** — Twitch linkage indicators only

No link/unlink, role, suspend, grant, or owner-tool controls. `canEdit` / `ownerTools` are ignored.

---

## 7. Identity inspector

Repaired `admin_identity_inspect` on **Progression**:

- Trainer level / XP / title / caught / seen / shiny / Kanto
- Ranking visible / eligible
- Titles, badges, cosmetics with unlocked vs locked (and equipped when present)
- Owned avatar packs
- Available catalog (`id`, `kind`, `name`) with unlock inferred from matching cosmetic ids

No `evaluate_cosmetics`, no grants, no notices, no progression repair.

---

## 8. Search / pagination limitations

| Capability | Status |
|---|---|
| Server LIKE search | used |
| Server page of 50 + `total` | used |
| Invented filters / infinite scroll | **not added** |
| Full PC / Bits / achievements / Oak / email / support timeline | **not in these RPCs** |

---

## 9. Tests

| Suite | Class | Result |
|---|---|---|
| `tests/admin-hub-gate-2a-trainer-tests.js` | STATIC PASS | 8 |
| `tests/admin-hub-next-tests.js` | STATIC PASS | 7 |
| `tests/admin-hub-gate-2a-r-identity-tests.js` | STATIC PASS | 12 |
| `tests/admin-hub-gate-17-s1-snapshot-tests.js` | STATIC PASS | 16 |
| `tests/admin-hub-gate-17-s1b-tests.js` | STATIC PASS | 5 |
| Live staff RPC of production trainers | **not run** | PlayTester remains nonstaff |
| Unsigned preview | REAL DOM PASS | gate copy; staff shell stays hidden; Operations fallback UNAVAILABLE |
| Fixture directory / dossier / progression / catalog / back / mobile | LOCAL HARNESS PASS | sanitized fixtures; `playCall` blocked |
| Keyboard | LOCAL HARNESS PASS | search form, trainer buttons, pane tabs, back |
| Screenshot capture | evidence only | webfont rasterization in the browser tool is garbled; a11y tree is the text source of truth |

No mutating RPC names appear in the preview shell. Operations still polls only `admin_live_snapshot`.

---

## 10. Risks and readiness

| ID | Status |
|---|---|
| R21 | **CLOSED** for inspect (fingerprint reconfirmed) |
| R1 | **OPEN** — `admin_overview` authorization ordering |
| R2 | **OPEN** — anonymous EXECUTE grants |
| R18 | **OPEN** — broad moderator privileges |

**Local visual preview (not production):** serve `play-site` on localhost. Feature flag is opening `admin-next.html`. Live staff RPCs still require a real staff session. Twitch OAuth on localhost may fail if the redirect is not allowlisted; use `admin-next-trainers-fixture.html` for a localhost-only sanitized demo that never calls trainer RPCs.

**Deployment:** not ready for production APP stamp. Preview URL remains feature-flagged `admin-next.html`. Do not merge this branch as an APP deploy from this gate.

**Next review:** owner visual / authorized staff QA of the Trainers tab (separate PlayTester staff approval if live RPC is required), then decide whether to stamp an APP build.

**Final release smoke:** remains paused.
