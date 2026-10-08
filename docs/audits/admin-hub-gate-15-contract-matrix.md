# Admin Hub Gate 1.5 — verified security contract matrix

**Date:** 2026-10-08  
**Production APP:** `20261008-rc131`  
**Feature commit:** `2915d82` · **Stamp:** `ba41665`  
**Database:** starlight-play `dtflmlbjhttoewqgkujf`  
**Latest applied migration:** `20261007183057` `rc118_pc_box_ops_stale_slots`  
**Sora mutated:** NO · **Twinkle mutated:** NO  
**Method:** live `pg_proc` / grants / function bodies (read-only catalog). **No mutating RPC invocations. No anonymous execution tests against functions with side effects.**

Evidence tags used below:

| Tag | Meaning |
|---|---|
| **LIVE SQL** | Read from production `pg_proc`, grants, or table catalog |
| **REPO** | Latest `play-site` migration or JS caller |
| **INFERRED** | Combined LIVE + REPO; helper chain not fully expanded |
| **UNVERIFIED** | Not safe or not possible to confirm in this gate |

This matrix is the authority inventory for Gate 2 design. It does **not** authorize SQL, grant changes, or Trainer Management implementation.

---

## 1. Inventory totals (LIVE SQL)

| Class | Count |
|---|---|
| `public.admin_*` functions | **102** |
| `public.is_play_admin` INVOKER wrapper | **1** |
| Private helpers inventoried (`require_*`, `settle_due_rounds`, `apply_stream_status`, `director_*`, `admin_overview`, `admin_account_json`) | **12** |
| `public.admin_*` with EXECUTE to **anon** | **85** |
| `public.admin_*` EXECUTE **authenticated + postgres + service_role** (no anon) | **16** |
| `public.admin_*` EXECUTE **postgres + service_role** only | **1** (`admin_loot_warnings`) |
| SECURITY DEFINER among `public.admin_*` | **102 / 102** |
| Edge Functions | **7** |

All `public.admin_*` bodies are `SECURITY DEFINER`. Guards are SQL helpers (`private.is_play_admin`, `require_hub`, `require_staff_edit`, `require_owner` / `can_manage_secrets`, or inline `play_staff_role()`), **not** JWT `user_metadata`. **LIVE SQL.**

---

## 2. Privilege helpers (LIVE SQL)

| Helper | Security | Gate |
|---|---|---|
| `private.play_staff_role(uuid)` | DEFINER STABLE | Broadcaster Twitch → `owner`; `staff_roles.staff` → `moderator`; else stored role |
| `private.is_play_admin()` | DEFINER STABLE | `play_staff_role(auth.uid()) is not null` |
| `public.is_play_admin()` | **INVOKER** STABLE | `select private.is_play_admin()` — client gate |
| `private.require_hub()` | INVOKER STABLE | any staff else `42501` |
| `private.require_staff_edit()` | INVOKER STABLE | hub + role in (`owner`,`admin`) |
| `private.require_owner()` | INVOKER STABLE | `can_manage_secrets()` |

Moderators can run the live console (`is_play_admin` / `require_hub`). They must not grant Pokémon (`require_staff_edit`). Several Pass/Bits/QA RPCs currently use the weaker gate (see R18).

---

## 3. Preview read endpoints — call-chain verification

### 3.1 `public.admin_build_health()` — TRUE READ after guard

**LIVE SQL.** Signature `()`. DEFINER VOLATILE. EXECUTE: anon, authenticated, postgres, service_role.  
**Guard first:** `if not private.is_play_admin() then raise 42501`.  
**Body:** SELECT latest `supabase_migrations.schema_migrations.version`; `private.client_build()`. Returns `{ok, clientBuild, dbMigration}`.  
**No INSERT/UPDATE/DELETE, no settle, no director tick.** VOLATILE because of catalog/`now()`-class reads, not because it writes.  
**Callers (REPO):** `admin-next.js` Analytics; `admin.js` analytics overview.  
**Suitability:** Keep for next hub Analytics. Revoke anon EXECUTE after approval (body already fails closed).

### 3.2 `public.admin_game_health()` — TRUE READ after guard (aggregate ops data)

**LIVE SQL.** Signature `()`. DEFINER VOLATILE. EXECUTE includes **anon**.  
**Guard first:** `is_play_admin`.  
**Reads:** `encounter_rounds` 24h aggregates, cancelled-open counts, negative `inventories` / `family_candy`, `stream_status.is_live`, `site_config.broadcaster_twitch_login`, ranking eligibility aggregates over **all** `profiles`.  
**Writes:** none in body.  
**Exposure:** staff-only after guard. Aggregates are not per-trainer PII; ranking duplicate-key counts are operational.  
**Callers (REPO):** `admin-next.js` Analytics; `admin.js` analytics.  
**Suitability:** Keep for Analytics. Do not treat as a trainer dossier. Revoke anon after approval.

### 3.3 `public.admin_live_dashboard()` — **NOT a true read** (R17)

**LIVE SQL.** Signature `()`. DEFINER VOLATILE. EXECUTE: **authenticated, postgres, service_role** (anon revoked).  
**Guard first:** `is_play_admin`, then:

```
return private.director_dashboard() || jsonb_build_object('specialEvent', private.admin_special_event_live_json());
```

**`private.director_dashboard()`** (LIVE SQL) starts with:

```
perform private.director_tick_if_due();
```

**`private.director_tick_if_due()`** (LIVE SQL):

1. `perform private.settle_due_rounds();` — **always**
2. If `stream_director.last_tick_at` is null or older than 10 seconds, `perform private.director_tick();`

**`private.settle_due_rounds()`** (LIVE SQL, VOLATILE): loops unresolved unpaused rounds from the last 2 hours whose throw/reveal deadline has passed and `perform private.settle_if_needed(rec)`. That **writes gameplay state** (encounter resolution, catches, rewards) as DEFINER via the caller chain.

**`private.director_tick()`** (LIVE SQL, truncated but sufficient): `FOR UPDATE` on `stream_director`; may expire holds; pause/resume for ads; **end RPG if known offline**; if LIVE + `rpg_session_active` + auto enabled + due + safe window, **`private.director_start_now(...)`** (queued special or AUTO random). Also updates director timestamps/status.

**Callers (REPO):** `admin-next.js` Operations (`READ_RPCS`); `admin-live.js` dashboard poll.

**Classification:** staff-gated **read-with-tick**. Safer than `admin_overview` because the guard runs **before** settle, and anon cannot EXECUTE. Still **unsuitable as a “read-only preview” poll** while a Live RPG session is active (can settle rounds and start auto encounters). Player `play_sync` / `play_state` already call `director_tick_if_due` **LIVE SQL**, so settlement is not unique to admin — but the preview must not pretend it is side-effect-free.

**This gate did not invoke `admin_live_dashboard`.**

**Suitability:** Keep for legacy Dashboard. Gate 2 Operations snapshot needs a **true read** (`director_dashboard` without tick/settle) or the preview must stop polling this RPC until Gate 6.

### 3.4 `public.admin_overview()` — SETTLE BEFORE GUARD (R1 confirmed)

**LIVE SQL.**

```
begin
  perform private.settle_due_rounds();
  return coalesce(private.admin_overview(), '{}'::jsonb)
    || jsonb_build_object('console', private.play_console_json(250));
end;
```

**EXECUTE includes anon.** DEFINER VOLATILE.

**`private.admin_overview()`** (LIVE SQL, STABLE DEFINER, EXECUTE authenticated+postgres): **`perform private.require_hub()` first**, then reads site_config, stream_bridge flags (secret presence booleans for owner), round JSON, counts. No settle.

**Exact order:**

1. `public.admin_overview` settles due rounds **with no auth check**
2. `private.admin_overview` then `require_hub()` (unauthenticated callers fail here **after** settle)

**Anonymous callers can trigger settlement** if they can hit PostgREST with the anon key and the function name. Settlement writes encounter state (**LIVE SQL** `settle_due_rounds` → `settle_if_needed`).

**Callers (REPO):** `admin.js` `loadHub` poll; `admin-tools.js` standalone boot. **Not** `admin-next.js` (tests forbid the string).

**Player-facing dependency:** Players do **not** call `admin_overview`. Encounter settlement also happens via `director_tick_if_due` (`play_sync`, `play_state`, `director_dashboard`) and `private.load_play_round` / `public.bridge_publish` **LIVE SQL**. Moving settle behind the guard does **not** stop player-driven settlement.

**Remediation (DO NOT APPLY):** see `docs/audits/sql/gate-15-review-admin-overview-guard.sql`.

---

## 4. Other settlement / tick entry points (LIVE SQL)

| Function | Calls settle / tick | Exposed as RPC? |
|---|---|---|
| `public.admin_overview` | `settle_due_rounds` before guard | Yes, **anon** |
| `private.director_tick_if_due` | settle then maybe `director_tick` | No (internal) |
| `private.director_dashboard` | `director_tick_if_due` | Via `admin_live_dashboard` (staff) |
| `public.play_sync` | `director_tick_if_due` | Player RPC |
| `public.play_state` | `director_tick_if_due` | Player RPC |
| `private.load_play_round` | `settle_due_rounds` | INFERRED player load path |
| `public.bridge_publish` | `settle_due_rounds` | MixItUp bridge |

Do **not** change `play_sync` / `apply_stream_status` / `director_tick` in this overhaul phase.

---

## 5. EXECUTE grant classes (LIVE SQL)

### 5.1 No anon (16)

`admin_capture_inspect`, `admin_clear_console`, `admin_director_command`, `admin_director_simulate`, `admin_gift_catalog`, `admin_gift_joined`, `admin_grant_candy`, `admin_live_dashboard`, `admin_oak_qa`, `admin_pause_round`, `admin_resume_round`, `admin_special_event_analytics`, `admin_special_event_command`, `admin_special_event_health`, `admin_test_act`, `admin_test_start`.

These already match the desired “authenticated staff RPC” shape. Bodies still need their internal guards (they have them).

### 5.2 Internal only (1)

`admin_loot_warnings` — postgres + service_role. No `is_play_admin` in body **LIVE SQL**. Treat as **intentionally not Data-API**. Do not GRANT to authenticated.

### 5.3 Anon + authenticated (85)

Includes most grants, store mutators, config saves, secrets, `admin_refill_test`, `admin_overview`, `admin_list_users`, health RPCs, `admin_start_round`, `admin_queue_stream_command`.

**Classification of the 85:**

| Bucket | Examples | Notes |
|---|---|---|
| Publicly executable, internally guarded | Almost all DEFINER admin RPCs | PostgREST accepts the call; body raises `42501` / domain errors. **Do not assume revoke is a no-op** — confirm no Edge Function or SQL GRANT depends on `anon`. |
| Publicly executable, incomplete order | `admin_overview` | Guard after settle |
| Intentionally public (non-admin) | none of the `admin_*` set | `public.is_play_admin` is the client boolean; it is granted to anon but returns false for signed-out |
| Unused / latent | `admin_refill_test`, `admin_grant_achievement`, `admin_set_xp`, `admin_pokemon_forms`, `admin_capture_round`, `admin_bits_qa_redemption`, `admin_capture_save_ball/berry` | No current `playCall` in hub JS (REPO) except as noted |
| Missing live | `admin_coin_ledger` | **REPO** migration exists; **not in live pg_proc** (R19) |

**Edge Function GRANT dependencies (REPO, not re-executed):** `store-asset` calls `admin_store_get` and `admin_store_register_asset` with the **user JWT** (`verify_jwt: true`). Revoking anon does not break it. Revoking authenticated would.

**Proposed revoke** (review only): `docs/audits/sql/gate-15-review-revoke-anon.sql`.

---

## 6. Catalog by next-hub screen

Side-effect class:

- `TRUE_READ` — SELECT after guard  
- `TICK_READ` — staff-gated, settle/tick  
- `MUTATE` — writes trainer/game/store/config  
- `SECRET` — tokens/secrets  
- `QA` — test/reset tooling  
- `LATENT` — live function, no hub caller  
- `MISSING` — JS caller, no live function  

Callers are **REPO**. Grants/guards/security are **LIVE SQL**. Table writes for non-deep-dived functions are **INFERRED** from DML keywords in `prosrc` plus latest migrations.

### 6.1 Operations (do not migrate in Gate 2)

| RPC | Args | Anon? | Guard | Class | Callers | New hub |
|---|---|---|---|---|---|---|
| `admin_live_dashboard` | | no | `is_play_admin` then tick | **TICK_READ** | admin-next, admin-live | Operations **after** true-read split |
| `admin_director_command` | action, payload | no | `is_play_admin` | MUTATE | admin-live | Gate 6 only |
| `admin_start_round` | dex, gender, shiny, form | **yes** | `is_play_admin` | MUTATE | admin.js fallback | Gate 6 |
| `admin_cancel_round` | | **yes** | `require_hub` | MUTATE | admin.js, admin-live | Gate 6 |
| `admin_clear_round` | | **yes** | `require_hub` | MUTATE | admin.js | Gate 6 |
| `admin_advance_phase` | | **yes** | `require_hub` | MUTATE | admin.js | Gate 6 |
| `admin_pause_round` / `resume_round` | | no | `require_hub` | MUTATE | admin.js | Gate 6 |
| `admin_hide_round` | hidden | **yes** | `is_play_admin` | MUTATE | admin.js | Gate 6 |
| `admin_queue_stream_command` | action, payload | **yes** | `is_play_admin` | MUTATE MixItUp | admin.js | Gate 6 dual-path (R14) |
| `admin_gift_catalog` | | no | `require_hub` | TRUE_READ | admin.js | Operations |
| `admin_gift_joined` | key | no | `require_hub` | MUTATE | admin.js | Operations |
| `admin_clear_console` | | no | `require_hub` | MUTATE | admin.js | Operations |
| `admin_overview` | | **yes** | settle **then** hub | **SETTLE_BEFORE_GUARD** | admin.js, admin-tools | **Never** |
| `admin_special_event_command` | action, payload | no | `is_play_admin` | MUTATE | admin-special, studio list | Operations + config |
| `admin_special_event_analytics` / `_health` | | no | `is_play_admin` | TRUE_READ (INFERRED) | admin-special, admin.js | Analytics |

Lifecycle SQL (`apply_stream_status`, `director_begin/end_rpg_session`) is **private**, EXECUTE postgres/service_role. LIVE confirms LIVE is permission-only; OFFLINE ends RPG. **Do not change.**

### 6.2 Trainers / Support (Gate 2 reads; Gate 3 mutations)

| RPC | Args | Anon? | Guard | Class | Callers | Notes |
|---|---|---|---|---|---|---|
| `admin_list_users` | query, offset | **yes** | `require_hub` | TRUE_READ STABLE | admin-tools, oak-qa | Paginated; no email |
| `admin_user_account` | user | **yes** | `require_hub` | TRUE_READ STABLE | admin-tools, oak-qa | 40 mons; bag; candy; connections; `emailLogin` boolean only |
| `admin_identity_inspect` | user | **yes** | `is_play_admin` | TRUE_READ | admin-tools | trainer_card + cosmetics/titles/badges/ranking |
| `admin_grant_pokemon` | user, dex, name, gender, shiny, ball | **yes** | `require_staff_edit` | MUTATE | admin-tools | Dex **1–151** only LIVE; **no** `account_audit` |
| `admin_grant_bag` | user, grants jsonb | **yes** | `require_staff_edit` | MUTATE | admin-tools | Master Ball UI confirm only |
| `admin_grant_candy` | user, dex, amount | no | `require_staff_edit` | MUTATE | admin-tools | No anon; still no account_audit |
| `admin_grant_valuable` | user, item, qty | **yes** | `require_staff_edit` | MUTATE | LATENT JS | |
| `admin_grant_cosmetic` / `revoke_cosmetic` | user, id, reason | **yes** | `require_staff_edit` | MUTATE | admin-tools (confirm) | |
| `admin_grant_title` / `badge` | user, id, reason | **yes** | `require_staff_edit` | MUTATE | admin-tools (confirm) | |
| `admin_grant_achievement` | user, achievement | **yes** | `require_staff_edit` | MUTATE LATENT | no hub JS | |
| `admin_set_coins` | user, coins | **yes** | `require_staff_edit` | MUTATE | admin-tools | coin_ledger INFERRED |
| `admin_set_xp` | user, xp | **yes** | `require_staff_edit` | MUTATE LATENT | no hub JS | |
| `admin_remove_pokemon` | user, catch_id | **yes** | `require_staff_edit` | MUTATE soft `transferred_at` | admin-tools **no confirm** | R10/R11 |
| `admin_unlock_catch` | catch, reason | **yes** | `is_play_admin` | MUTATE | admin.js (confirm) | moderator-capable |
| `admin_set_role` | user, role | **yes** | `require_hub` + inline owner/admin | MUTATE | admin-tools | Moderators blocked in body |
| `admin_set_pass` | login, active | **yes** | `is_play_admin` | MUTATE | admin-tools | **Moderators can grant Pass (R18)** |
| `admin_grant_bits_pack` | login, sku | **yes** | `is_play_admin` | MUTATE | admin-tools | **Moderators (R18)** |
| `admin_set_twitch_primary` / `_flags` | … | **yes** | `require_staff_edit` | MUTATE + `account_audit` | admin-tools | |
| `admin_disconnect_twitch` | user, twitch id | **yes** | inline **owner** | MUTATE + audit | admin-tools (confirm) | |
| `admin_set_ranking_visible` | user, visible, reason | **yes** | `require_staff_edit` | MUTATE | admin-tools (confirm) | |
| `admin_oak_qa` | action, user, payload | no | `is_play_admin` | **QA MUTATE** | oak-qa | Warns Sora; no Twinkle; **moderators** |
| `admin_oak_research_reset` | user | **yes** | `require_staff_edit` | QA MUTATE | oak-qa (confirm) | |
| `admin_qa_grant_pass_reward` | kind | **yes** | `is_play_admin` | QA MUTATE **self** | admin-tools Pass QA | R13 |
| `admin_refill_test` | | **yes** | `require_hub` | QA MUTATE **all bags** | **no JS** | R12 |
| `admin_test_act` / `admin_test_start` | … | no | `require_hub` + PlayTester | QA | test tools | |
| `admin_bits_qa_redemption` | login, title, bits, twitch id | **yes** | `require_staff_edit` | QA LATENT | no hub JS | |
| `admin_bits_retry` | event id | **yes** | `require_staff_edit` | MUTATE | admin-tools | |
| `admin_bits_health` / `_events` | | **yes** | `is_play_admin` | TRUE_READ (INFERRED) | admin-tools, admin.js | |

### 6.3 Mart & Content

| RPC | Anon? | Guard | Class | Callers |
|---|---|---|---|---|
| `admin_store_get` | yes | `require_hub` | TRUE_READ STABLE | admin-store, store-asset EF |
| `admin_content_studio` / `admin_content_picker` / `admin_item_library` | yes | `require_staff_edit` | TRUE_READ | studio / picker |
| `admin_store_save_item` / `_category` / `_look` / `_reorder` | yes | `require_staff_edit` | MUTATE | store + studio |
| `admin_store_duplicate_item` / `_delete_item` / `_delete_category` | yes | `require_staff_edit` | MUTATE | store (delete confirms) |
| `admin_store_register_asset` | yes | `require_staff_edit` | MUTATE | store-asset EF |
| `admin_save_item_identity` / `_look_portrait` / `_pass_rewards` | yes | `require_staff_edit` | MUTATE | studio |
| `admin_save_event` / `admin_delete_event` | yes | `is_play_admin` | MUTATE | **events.js player page** (admin UI gated) |

`private.store_items.status` **exists LIVE** (`text`). Draft vs published is a real column, not UI fiction.

### 6.4 Game configuration / analytics / system

Config saves (`admin_save_game_settings`, `admin_capture_save_*`, `admin_economy_save`, `admin_loot_save_*`, `admin_progression_save`) — **anon EXECUTE**, `is_play_admin`, MUTATE, no `account_audit`.

Simulators / validators — `is_play_admin`, TRUE_READ INFERRED (no DML keyword). `admin_loot_self_test` may write test rows **UNVERIFIED**.

Secrets: `admin_save_twitch_client_secret`, `admin_save_github_token`, `admin_save_channel`, `admin_issue_bridge_token` — **anon EXECUTE**, owner/`can_manage_secrets`, SECRET.

Health family (`admin_capture_health`, `admin_content_health`, `admin_economy_health`, `admin_evolution_validate`, …) — TRUE_READ after `is_play_admin` **INFERRED** except the three preview RPCs which were fully traced.

`admin_coin_ledger` — **MISSING live**, REPO migration `20260913044000_economy_admin.sql`, caller `admin.js:1443`. **UNVERIFIED.**

`admin_pokemon_forms` — LIVE, LATENT JS.

---

## 7. Edge Functions (MCP list + prior 0B)

| Slug | verify_jwt | Mutates | Starts RPG? |
|---|---|---|---|
| twitch-live | true | stream_status via service | **No** (0B + apply_stream_status LIVE) |
| twitch-eventsub | **false** (webhook) | stream_status / bits | **No**; offline ends RPG |
| twitch-ads | true | ad state | No |
| bits-connect | true | EventSub bits | No |
| refresh-pass | true | pass entitlements | No |
| store-asset | true | GitHub image + `admin_store_register_asset` | No |
| trainer-session | **false** | session helper | No |

Edge function **source bodies were not re-downloaded in this gate**. JWT flags are **LIVE MCP**. twitch-live “does not start RPG” remains **LIVE SQL** on `apply_stream_status`.

---

## 8. RLS / private schema (LIVE SQL)

Supabase advisor flags 12 **private** tables with RLS off. **Table ACLs:** `anon`/`authenticated` have **SELECT=false and INSERT=false** on those tables. They are not Data-API readable with the anon key unless `private` is an exposed schema (PostgREST `db_schemas` setting was **NULL / unavailable** in `pg_settings` — **UNVERIFIED** exact API schema list). Treat private as **not client-exposed by GRANT**, not as “RLS will save you.” Enabling RLS without policies would break DEFINER functions that already run as owner — **do not auto-enable**.

`private.account_audit`: RLS off, **0 rows**, no anon SELECT. **LIVE SQL.**

---

## 9. Audit writers (LIVE SQL + REPO)

Functions whose live `prosrc` references `account_audit`:

- `admin_disconnect_twitch`
- `admin_set_twitch_flags`
- `admin_set_twitch_primary`

REPO `account_audit_write` also from player identity RPCs (`TWITCH_LINKED`, `USERNAME_CHANGED`, …).

`admin_qa_grants` writers: `admin_oak_qa`, `admin_qa_grant_pass_reward`. Live rows: PRESET_OAK 15, GRANT_MON 9, RESET_QA 8, PRESET_EVO 6, GRANT_CANDY 1, PASS_REWARD_QA 1. **LIVE SQL counts only — contents not dumped.**

Pokémon/bag/coin/store/config grants: **no** `account_audit` **LIVE SQL**. Economy uses `coin_ledger` / `xp_ledger` / `candy_ledger` / `item_ledger` (player+admin mixed) **INFERRED**.

---

## 10. Frontend allowlist confirmation (REPO)

`admin-next.js` `READ_RPCS` = `admin_live_dashboard`, `admin_build_health`, `admin_game_health` only. `readCall()` throws if any other name is requested. Tests assert no `admin_overview` string.

**Implication of R17:** the preview already ticks/settles when a staff member opens Operations. Gate 2 must not add `admin_overview`. Prefer a new true-read snapshot before expanding Operations polling.

---

## 11. Suitability cheat sheet for Gate 2

| Use in Gate 2 read-only Trainer workspace? | RPCs |
|---|---|
| **Yes, after anon revoke (optional)** | `admin_list_users`, `admin_user_account`, `admin_identity_inspect` |
| **Yes, Analytics only** | `admin_build_health`, `admin_game_health` |
| **Not until true-read split** | `admin_live_dashboard` |
| **Never** | `admin_overview`, `admin_refill_test`, `admin_oak_qa`, any grant/save |
| **Need new SELECT-only RPCs** | Full PC (`pc_layout` + all catches), target `play_collection` / `play_progression`, support history, owner-only email |

Do not reuse `play_sync` / `play_snapshot` for another trainer — those tick the director (**LIVE SQL**).
