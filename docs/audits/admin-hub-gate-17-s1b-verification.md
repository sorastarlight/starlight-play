# Admin Hub Gate 1.7 S1B — authorized staff verification and preview integration

**Date:** 2026-10-10  
**Production APP before:** `20261008-rc132` · feature `3c87845` · stamp `b36d255`  
**Production APP after:** `20261008-rc133` · feature `bbf5405` · stamp `6d2517f`  
**SPRITE:** `20260923-home1` · **LOCATION:** `20260916-loc1` (unchanged)  
**Site:** https://play.sorastarlight.net  
**Database:** starlight-play `dtflmlbjhttoewqgkujf`  
**Latest applied migration:** `20261009183910` `gate_17_s1_admin_live_snapshot` (no new SQL this gate)  
**Contract:** `public.admin_live_snapshot()` `gate-17-s1-v2`  
**Sora mutated:** NO · **Twinkle mutated:** NO  
**PlayTester staff_roles:** temporary `moderator` for Stage A/B verification, then restored to nonstaff  
**SQL / RLS / GRANT changes:** NO  
**Legacy Admin Hub / live director:** untouched except stamp query strings

Final release smoke remains paused.

---

## 1. Verified baselines (before changes)

| Surface | Result |
|---|---|
| Repo HEAD | `85b67f9` S1B Stage A block record |
| Production `js/build.js` | `20261008-rc132` / `3c87845` |
| Preview allowlist | `admin_build_health`, `admin_game_health` |
| Live snapshot | jsonb, DEFINER, STABLE, owner `postgres`, `search_path=pg_catalog`, v2, authenticated EXECUTE only |
| `staff_roles` | 1 row: Twinkle `moderator`. PlayTester role **null** |

---

## 2. Moderator authorization (before promote)

`public.admin_live_snapshot()` calls `private.is_play_admin()` first. That helper is `private.play_staff_role(auth.uid()) is not null`.

Stored `staff_roles.role = 'moderator'` returns `moderator`. Stored `staff` is remapped to `moderator`. Either value satisfies the snapshot guard.

PlayTester **before** owner approval:

| Check | Result |
|---|---|
| Auth user / profile | present |
| `staff_roles` row | none |
| `play_staff_role(PlayTester)` | `null` |
| Snapshot via PlayTester JWT | `42501` `not allowed` |

Sora remained `owner` via Twitch. Twinkle remained `moderator`. Those accounts were not used.

### Additional permissions a moderator grant unlocks

`moderator` is hub staff, not a snapshot-only role. LIVE SQL counts:

| Gate | Approx. `public.admin_*` | PlayTester as moderator |
|---|---|---|
| `is_play_admin` / `require_hub` | 64 | **allowed** (includes snapshot, health, live dashboard tick-read, Oak QA, Pass/Bits, many console commands) |
| `require_staff_edit` (`owner`/`admin` only) | 32 | **denied** (Pokémon/bag/coin/XP grants, removals) |
| `require_owner` / `can_manage_secrets` | 4 | **denied** |

This gate called only `admin_live_snapshot` for Stage A, plus preview-shell `is_play_admin`, `admin_build_health`, `admin_game_health`, and incidental player `play_notices`. No tick, settle, director command, grant, or repair RPCs.

---

## 3. Stage A — authorized verification

Owner approved: *Promote PlayTester to moderator in staff_roles for Gate 1.7 S1B, then continue.*

Inserted **only** PlayTester UUID `a98cbf81-a6b2-4dbf-8448-8d62f6d5f523` as `moderator`. Sora/Twinkle rows unchanged. After insert: `play_staff_role(PlayTester)=moderator`, Sora `owner`, Twinkle `moderator`, `staff_roles` count = 2.

### A3 authorized reads

Three PlayTester JWT calls to `admin_live_snapshot()` succeeded. Sanitized evidence: `docs/audits/admin-hub-gate-17-s1b-shots/stage-a-staff-reads.json`.

| Field | All 3 reads |
|---|---|
| `ok` / `observation` | true |
| `contract` | `gate-17-s1-v2` |
| JSON keys | `asOf`, `contract`, `currentEncounter`, `director`, `lastEncounter`, `observation`, `ok`, `rpgSession`, `settlement`, `twitch` |
| Twitch | `STALE` · `live` JSON null · `known` false · `stale` true · `checkedAt` 2026-10-10 17:15:29 · title absent |
| RPG | `INACTIVE` · `active` false · `sessionId` null · `directorRowPresent` true · `sessionRowPresent` false |
| Director | `OFFLINE` · last tick/update 2026-10-11 01:16:25 |
| Current encounter | JSON null (pointer closed) |
| Last encounter | id `4492c16e-…` · Rattata · dex 19 · female · phase `closed` · cancelled/resolved · `inProgress` false |
| Settlement | `awaiting` null · `state` `UNAVAILABLE` |

Twitch STALE is correct: `is_live` is false but `checked_at` is older than 15 minutes. STALE is not OFFLINE. RPG INACTIVE is not inferred from Twitch. Closed director pointer is last-encounter history, not current.

### A4 read-only comparison

| Source | Before | During 3 reads | After |
|---|---|---|---|
| `stream_status` id/is_live/checked_at/updated_at/source | `1` / false / 17:15:29 / 17:15:29 / `stream.offline` | same in all payloads | unchanged |
| `stream_director` status / rpg / session_id / last_encounter_id | OFFLINE / false / null / `4492c16e-…` | same | unchanged |
| `encounter_rounds` pointed `updated_at` / phase | 2026-09-19 00:35:01 / closed | same | unchanged |
| `stream_sessions` | no row | `sessionRowPresent` false | no row |
| `stream_director.last_tick_at` | 01:16:03 (pre-window) | **01:16:25 on all 3 payloads** | 01:16:35 (post-window) |

The three snapshot responses reported the **same** director tick timestamp. `last_tick_at` moved before the first read and again after the third, on the existing ~10s `director_tick_if_due` cadence from unrelated player/hub activity. Snapshot body is SELECT-only and STABLE; it cannot write those columns.

**A4 PASS** for “the reads themselves did not cause writes.” Concurrent director ticks are attributed, not treated as snapshot side effects.

**STAGE A PASS.**

---

## 4. Stage B — preview integration

Preview-only files:

| File | Change |
|---|---|
| `js/admin-next-ops.js` | Presenter for Twitch / RPG / director / current / last encounter / settlement |
| `js/admin-next.js` | Allowlist adds `admin_live_snapshot`; 30s single-flight poll; stop off Operations / hidden / sign-out |
| `admin-next.html` | Live Operations overview cards + freshness; loads presenter |
| `css/play.css` | Preview-only pastel Operations cards |
| tests + QA script + this audit | focused |

Legacy `admin.html` / `admin-live.js` not rewritten. No SQL.

### RPC allowlist

`admin_build_health`, `admin_game_health`, `admin_live_snapshot`.

Not added: `admin_live_dashboard`, `admin_overview`, `admin_director_command`, `admin_start_round`, `director_tick_if_due`, `settle_due_rounds`. No generic dispatcher.

### Polling

- 30 seconds
- Only `admin_live_snapshot`
- One in-flight request
- Starts on Operations, stops on other tabs
- Timer cleared while the page is hidden
- Cleaned up on sign-out
- Failed reads show denied/unavailable; stale data is not shown as confirmed live
- Health RPCs remain one-shot Analytics reads

---

## 5. Tests

### STATIC PASS

`tests/admin-hub-next-tests.js` (7), `tests/admin-hub-gate-17-s1-snapshot-tests.js` (16), `tests/admin-hub-gate-17-s1b-tests.js` (5).

Allowlist, no unsafe RPCs, no mutation controls, no generic dispatcher, lifecycle copy, STALE≠OFFLINE, settlement UNAVAILABLE, last encounter historical, missing director = UNKNOWN.

### MOCK PASS

LIVE+ACTIVE, LIVE+INACTIVE, OFFLINE+INACTIVE, UNKNOWN, STALE, missing director, missing session row, open encounter, closed last encounter, settlement UNAVAILABLE, unauthorized, network/missing.

### REAL DOM PASS (local harness + PlayTester)

`tools/qa-admin-next-s1b.js` → `docs/audits/admin-hub-gate-17-s1b-shots/`

| Check | Result |
|---|---|
| Unsigned gate | staff hidden · “Sign in to open the Admin Hub preview.” |
| Operations staff | Twitch STALE, RPG INACTIVE, Director OFFLINE, Current NONE, Last CLOSED Rattata, Settlement UNAVAILABLE |
| Analytics | one-shot health copy |
| Refresh / tab switch | snapshot on Operations; health on Analytics |
| Hidden | interval cleared |
| Viewports | 1920 / 1440 / 960 / 390 |

### NETWORK

Requested names: `is_play_admin`, `play_notices`, `admin_live_snapshot`, `admin_build_health`, `admin_game_health`.

Zero hits: `admin_live_dashboard`, `admin_overview`, tick, settle, director commands, grants, repairs.

---

## 6. Production deployment

| Check | Result |
|---|---|
| Pages build | `built` 2026-10-11T01:23:53Z |
| `js/build.js` | `20261008-rc133` · git `bbf5405` · sprite/location unchanged |
| Deployed allowlist | `admin_build_health`, `admin_game_health`, `admin_live_snapshot` |
| Unsigned HTML | staff gated · Operations UNAVAILABLE fallback present |
| Staff Operations (PlayTester while still moderator) | Twitch STALE · RPG INACTIVE · Director OFFLINE · Current NONE · Last CLOSED · Settlement UNAVAILABLE |
| Production RPCs | `is_play_admin`, `play_notices`, `admin_live_snapshot`, `admin_build_health`, `admin_game_health` |
| Unsafe RPCs | none |

## 7. Cleanup

PlayTester `staff_roles` row deleted after production staff verification.

| Check | After restore |
|---|---|
| `play_staff_role(PlayTester)` | `null` |
| PlayTester snapshot JWT | `42501` `not allowed` |
| Twinkle | still `moderator` |
| Sora | still `owner` |
| `staff_roles` count | 1 |

No Sora/Twinkle/gameplay rows were written. Temporary scripts deleted. PlayTester sessions signed out.

---

## 8. Remaining risks

- R1 `admin_overview` settle-before-guard still OPEN
- R17 preview path now uses the true-read snapshot; legacy Dashboard still ticks
- R18 moderator-capable Pass/Bits/Oak QA still OPEN — temporary PlayTester moderator was restored so that surface is closed again
- Temporary moderator is a standing-privilege grant, not a snapshot-only capability. Future admin QA needs the same explicit approval
