# Admin Hub Gates 0A / 0B — action matrix and live contract

**Date:** 2026-10-08  
**Production app at audit start:** `20261008-rc129` / `beb606c`  
**Database:** starlight-play `dtflmlbjhttoewqgkujf` (read-only catalog + advisors; **no mutations**)  
**Sora mutated:** NO · **Twinkle mutated:** NO · QA account: none (SQL catalog only)

This is the authority baseline for the Admin Hub overhaul. It is **not** implementation sign-off. Gate 1 may add a feature-flagged read-only shell. Do not decommission legacy admin pages until Gates 3–7 parity.

## Non-negotiables (verified)

| Rule | Live evidence |
|---|---|
| Twitch LIVE does not start RPG | `private.apply_stream_status` (migration `live_rpg_twitch_live_is_permission`) |
| Twitch OFFLINE ends RPG | `director_end_rpg_session('STREAM_OFFLINE')` |
| Explicit staff Start required | `admin_director_command` / `admin_start_round` after `is_play_admin` |
| `twitch-live` Edge Function does not start RPG | Writes `service_set_stream_status` only |
| Player RPCs unchanged | No migrations applied in this gate |

**UI mismatch:** `admin.html` offline card still says Twitch will activate the Live RPG. `admin-live.js` already says RPG stays IDLE until Start.

## Privilege helpers (live)

| Helper | Meaning |
|---|---|
| `private.is_play_admin()` | `play_staff_role(auth.uid()) is not null` |
| `private.play_staff_role` | Broadcaster Twitch identity → `owner`; `staff_roles.staff` → `moderator`; else stored role |
| `private.require_hub()` | Any staff |
| `private.require_staff_edit()` | `owner` or `admin` only |
| `private.require_owner()` | Secrets (`can_manage_secrets`) |
| `public.is_play_admin` | INVOKER wrapper used by the client gate |

Moderators can run the live console. They cannot grant Pokémon, bag, coins, or other trainer edits.

## Risk register

| ID | Finding | Severity | Disposition |
|---|---|---|---|
| R1 | `public.admin_overview()` runs `private.settle_due_rounds()` **before** `private.admin_overview()`'s `require_hub`. EXECUTE granted to `anon`. | High | Backend follow-up: move settle behind the guard; `REVOKE` from `anon`/`PUBLIC`. Do **not** call this RPC from the next shell. |
| R2 | Most mutating `admin_*` functions `GRANT EXECUTE` to `PUBLIC`/`anon`. Bodies usually fail closed, but the call is still accepted. | Medium | Revoke `anon`/`PUBLIC` after 0B approval. Keep `authenticated`. |
| R3 | Hub offline copy claims Twitch auto-starts RPG. | Medium | Correct copy in Gate 1; do not change director SQL. |
| R4 | `admin_oak_qa` hardcodes Sora UUID, returns `soraWarning`, has **no Twinkle** mention, and does not hard-block. Direct RPC can mutate Sora. | High | Gate 3: server deny unless explicit owner QA path; never default-target Sora/Twinkle. |
| R5 | Trainer UI triplicated (Hub, Staff tools, Oak QA). Store triplicated (Hub iframe, Store page, Studio). | Medium | Parity matrix before deleting UI. |
| R6 | Many grants skip `private.account_audit`. `admin_remove_pokemon` is a soft `transferred_at` with no audit row. | High | Gate 3: every mutation writes audit. |
| R7 | `site_config` SELECT policy is `true` (client id / broadcaster id public). Secrets are in `private.stream_bridge`. | Low | Keep secrets private. |
| R8 | `play-site/.env.local` exists, gitignored. Blueprint zip included it. | High hygiene | Do not commit. Rotate if that archive was shared. |
| R9 | `twitch-eventsub` and `trainer-session` have `verify_jwt: false`. | Info | Expected for webhook/session. |
| R10 | `admin_remove_pokemon` does not hard-delete. | Info | Preserve soft-remove semantics. |

## Frontend inventory (0A) — surfaces

| Page | Modules | Hub tabs / job |
|---|---|---|
| `admin.html` | `admin.js`, `admin-live.js`, `admin-special.js`, `admin-oak-qa.js`, `admin-tools.js` (embedded) | Dashboard, Encounters, Trainers, Game Content, Economy & Store, Analytics, System |
| `admin-tools.html` | `admin-tools.js` | Search, account, grants, identity, Bits, secrets, bridge token |
| `admin-store.html` | `admin-store.js`, `admin-studio.js` | Mart CRUD + Content Studio |
| `admin-live.html` | redirect | `admin.html?section=dashboard` |
| `events.html` | `events.js` | Staff event save/delete |

Client gate: `supabase.rpc("is_play_admin")` then hide `#staff`. Non-admins never see controls; they can still invoke RPCs if they know names — server must deny (R1/R2).

## Live RPC catalog notes

- ~100 `public.admin_*` functions, almost all `SECURITY DEFINER` + `search_path=public`.
- Guards are `is_play_admin`, `require_hub`, `require_staff_edit`, or `require_owner` — not JWT `user_metadata`.
- `private.account_audit` has **no RLS** (private schema; not Data-API exposed).
- `admin_test_act` / `admin_test_start` limited to PlayTester username in SQL.
- Latest applied migration at audit: `20261007183057` `rc118_pc_box_ops_stale_slots`.

## Target information architecture

1. Operations  
2. Trainers  
3. Support & Recovery  
4. Mart & Content  
5. Game Configuration  
6. Analytics & Health  
7. System & Access  

Per-RPC mapping lives in the Gate 0B canvas and in `admin-next.html` deep links. Mutating actions stay on legacy pages until Gate 3+ per-action migration.

## Gate 1 rule

Preview shell **must not** call `admin_overview` (R1). Read-only Operations uses `admin_live_dashboard`, `admin_build_health`, `admin_game_health` only. No director commands, grants, or store writes.

## Approval needed

Owner review of this 0A/0B baseline before:

- Revoking `anon` execute grants  
- Changing `admin_overview` settle order  
- Migrating any mutation onto the next hub  
- Decommissioning `admin-tools.html` / `admin-store.html`  
