# Admin Hub Gates 0A / 0B — action matrix and live contract

**Date:** 2026-10-08  
**Production app at audit start:** `20261008-rc129` / `beb606c`  
**Follow-up inventory:** Gate 1 shell `20261008-rc130`. This addendum folds the Gate 0A frontend inventory and Gate 0B SQL/RPC inventory into the baseline.  
**Database:** starlight-play `dtflmlbjhttoewqgkujf` (read-only catalog + advisors; **no mutations**)  
**Sora mutated:** NO · **Twinkle mutated:** NO · QA account: none (SQL catalog only)

This is the authority baseline for the Admin Hub overhaul. It is **not** implementation sign-off. Gate 1 shipped a feature-flagged read-only shell. Do not decommission legacy admin pages until Gates 3–7 parity. Do not apply revoke-anon, settle-order, or mutation-migration SQL until owner 0B approval.

## Non-negotiables (verified)

| Rule | Live evidence |
|---|---|
| Twitch LIVE does not start RPG | `private.apply_stream_status` (migration `live_rpg_twitch_live_is_permission`) |
| Twitch OFFLINE ends RPG | `director_end_rpg_session('STREAM_OFFLINE')` |
| Explicit staff Start required | `admin_director_command` / `admin_start_round` after `is_play_admin` |
| `twitch-live` Edge Function does not start RPG | Writes `service_set_stream_status` only |
| Player RPCs unchanged | No migrations applied in this gate |

**UI mismatch (R3):** Fixed in Gate 1 / `20261008-rc130`. `admin.html` and `admin-next.html` now say Twitch LIVE permits the Live RPG and does not start it. `admin-live.js` still says RPG stays IDLE until Start. Director SQL unchanged.

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
| R3 | Hub offline copy claimed Twitch auto-starts RPG. | Medium | **Fixed in rc130.** Copy only; director SQL unchanged. |
| R4 | `admin_oak_qa` hardcodes Sora UUID, returns `soraWarning`, has **no Twinkle** mention, and does not hard-block. Direct RPC can mutate Sora. | High | Gate 3: server deny unless explicit owner QA path; never default-target Sora/Twinkle. |
| R5 | Trainer UI triplicated (Hub, Staff tools, Oak QA). Store triplicated (Hub iframe, Store page, Studio). | Medium | Parity matrix before deleting UI. |
| R6 | Many grants skip `private.account_audit`. `admin_remove_pokemon` is a soft `transferred_at` with no audit row. | High | Gate 3: every mutation writes audit. |
| R7 | `site_config` SELECT policy is `true` (client id / broadcaster id public). Secrets are in `private.stream_bridge`. | Low | Keep secrets private. |
| R8 | `play-site/.env.local` exists, gitignored. Blueprint zip included it. | High hygiene | Do not commit. Rotate if that archive was shared. |
| R9 | `twitch-eventsub` and `trainer-session` have `verify_jwt: false`. | Info | Expected for webhook/session. |
| R10 | `admin_remove_pokemon` does not hard-delete. | Info | Preserve soft-remove semantics. |
| R11 | `admin-tools.js` `[data-remove-mon]` and `events.js` `[data-del]` call `admin_remove_pokemon` / `admin_delete_event` with **no confirmation**. | High | Gate 3: explicit confirm matching severity; keep soft-remove for Pokémon. |
| R12 | Live `admin_refill_test` floors **all** inventories to the starter kit. **No frontend caller.** | High | Do not wire. Gate 3: scope to a single QA target or remove. |
| R13 | `admin_qa_grant_pass_reward(p_kind)` grants to **caller `auth.uid()`**, not a selected trainer. Staff Pass QA buttons mutate the signed-in staff account. | Medium | Gate 3: take `p_user` or hide from production staff UI. |
| R14 | `admin-tools.html` / `admin-store.html` without `?embed=1` `location.replace` into hub System Twitch / Economy catalog. `bits-connect.js` still bounces to bare `admin-tools.html`. Dual encounter paths: `admin_director_command` vs `admin_queue_stream_command` / `admin_*_round`. | Medium | Preview deep links must use hub `section=` URLs. Gate 6: one operator path. |
| R15 | Migration files often `GRANT authenticated` + `REVOKE anon`, but the **live catalog still shows PUBLIC/anon EXECUTE** on many mutators. | Medium | Live grants are source of truth until an explicit revoke migration is applied (needs 0B approval). |
| R16 | `public.is_play_admin` INVOKER wrapper **exists live** (client gate) but CREATE is missing from some migration files. | Info | Do not drop. Add CREATE to the migration tree when touching grants. |

## Frontend inventory (0A) — surfaces

| Page | Modules | Hub tabs / job |
|---|---|---|
| `admin.html` | `admin.js`, `admin-live.js`, `admin-special.js`, `admin-oak-qa.js`, `admin-tools.js` (embedded) | Dashboard, Encounters, Trainers, Game Content, Economy & Store, Analytics, System |
| `admin-tools.html` | `admin-tools.js` | Standalone page **redirects** unless `?embed=1`. Default landing is `admin.html?section=system&view=twitch`, not Trainers. Grants/search actually live on Hub Trainers (`admin.html` loads `admin-tools.js`). |
| `admin-store.html` | `admin-store.js`, `admin-studio.js` | Standalone page **redirects** unless `?embed=1`. Hub Economy catalog iframe uses `admin-store.html?embed=1`. |
| `admin-live.html` | redirect | `admin.html?section=dashboard` |
| `events.html` | `events.js` | Staff event save/delete |

Client gate: `supabase.rpc("is_play_admin")` then hide `#staff`. Non-admins never see controls; they can still invoke RPCs if they know names — server must deny (R1/R2).

## Live RPC catalog notes

- ~100 `public.admin_*` functions, almost all `SECURITY DEFINER` + `search_path=public`.
- Guards are `is_play_admin`, `require_hub`, `require_staff_edit`, or `require_owner` — not JWT `user_metadata`.
- `private.account_audit` has **no RLS** (private schema; not Data-API exposed).
- `admin_test_act` / `admin_test_start` limited to PlayTester username in SQL.
- Latest applied migration at audit: `20261007183057` `rc118_pc_box_ops_stale_slots`.
- `admin_oak_qa` Sora UUID `60ff5211-6ef8-40e6-8daa-095b5600bf4c`; warns, does not hard-block; **no Twinkle** UUID.
- Encounter mutations are split: Dashboard `admin_director_command` vs Mix/legacy `admin_queue_stream_command` and `admin_start_round` / `admin_cancel_round` / `admin_clear_round` / pause / resume / hide / advance.
- `RESET_QA` (Oak QA) is destructive for **any selected target UUID**. Historical candy-recon one-offs mutated Sora/Twinkle by design — do not repeat.

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

Preview shell **must not** call `admin_overview` (R1). Read-only Operations uses `admin_live_dashboard`, `admin_build_health`, `admin_game_health` only. No director commands, grants, or store writes. Deep links into mutations must use `admin.html?section=…` (not bare `admin-tools.html` / `admin-store.html`, which redirect; R14).

## Approval needed

Gate 1.5 re-verified this baseline against live SQL (`docs/audits/admin-hub-gate-15-contract-matrix.md`). New findings: R17 (`admin_live_dashboard` ticks/settles), R18 (moderator Pass/Bits/Oak QA), R19 (`admin_coin_ledger` missing live). Do not treat Gate 1 Operations as a true read.

Owner review of this 0A/0B baseline before:

- Revoking `anon` execute grants  
- Changing `admin_overview` settle order  
- Migrating any mutation onto the next hub  
- Decommissioning `admin-tools.html` / `admin-store.html`  
