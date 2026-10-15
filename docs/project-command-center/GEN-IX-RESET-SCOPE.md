# A19-RESET R-A scope (D43 preparation only)

**Verdict: SCOPE READY. Reset remains UNAPPLIED.**

Owner authorization 2 allowed inventory and an executable script. It did **not** authorize DELETE, TRUNCATE, DROP, or any other destructive reset.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.

Pin `sl-ref-20261013-227b573` and `private.ref_*` are out of scope.

| Honesty | Used |
|---|---|
| LIVE CATALOG | `information_schema` / `pg_catalog` + aggregate counts only |
| STATIC | Issue #19 R-A playbook |
| NOT RUN | DELETE / TRUNCATE / DROP / A19-RESET-GO / catch-row identity SELECT |

---

## Policy

R-A (D19 / A19-Q3): remove disposable caught Pokémon, party/PC pointers, and affected trades. Keep Pokédex history and economy.

This packet also inventories encounter participation and **active** encounter state (owner request). It does **not** delete historical `encounter_rounds` rows (catches still reference them; 0 active rounds at inventory time).

Protected accounts stay excluded (A19-Q6) until a later protected-account go:

| Match | Login / username |
|---|---|
| Sora | `sorastarlight` |
| Twinkle | `twinklephoenixstar` |

LIVE CATALOG matched **2** protected `profiles` rows by those logins. No identity dump.

---

## LIVE CATALOG counts (project `dtflmlbjhttoewqgkujf`)

Taken during D43 catalog verification. Aggregates only.

| Category | Total | In proposed reset (non-protected) | Kept (protected / preserve) |
|---|---|---|---|
| `public.catches` | 110 | **12** | **98** |
| `public.oak_transfers` | 55 | **12** | 43 |
| `public.evolution_log` | 35 | **6** | 29 |
| `public.trade_listings` | 1 | listings whose `catch_id` is in the 12 | listings on kept catches |
| `public.trade_offers` | 0 | 0 | 0 |
| `public.direct_trades` | 0 | 0 | 0 |
| `public.encounter_players` | 202 | **20** | 182 |
| `public.encounter_activity` | 0 | 0 | 0 |
| `public.capture_log` | 0 | 0 | 0 |
| `public.encounter_rounds` unresolved+uncancelled | 0 | cancel if any appear | historical rounds kept |
| non-protected `profiles.team_ids` nonempty | — | **1** profile | protected teams kept |
| non-protected `profiles.pc_layout` nonempty | — | **2** profiles | protected PC kept |
| `private.streamlink_hidden_tickets` | 0 | 0 (script may delete leftovers) | n/a |

Most stored Pokémon belong to Sora or Twinkle. A default R-A therefore removes **12** test catches, not the 98 protected ones.

---

## Tables and row categories

### Delete (non-protected / reset-catch only)

| Table | What goes |
|---|---|
| `public.trade_offers` | rows whose `catch_id` is a reset catch (FK CASCADE from listings also applies) |
| `public.trade_listings` | rows whose `catch_id` is a reset catch (hard FK `ON DELETE CASCADE` from catches; deleted first for clarity) |
| `public.direct_trades` | rows whose `a_catch` or `b_catch` is a reset catch (soft uuid, no FK) |
| `public.oak_transfers` | rows whose `catch_id` is a reset catch (hard FK, **no** `ON DELETE`) |
| `public.evolution_log` | rows for non-protected users (catch-derived; not Pokédex seen) |
| `public.encounter_players` | rows for non-protected users |
| `public.encounter_activity` | rows for non-protected users |
| `public.capture_log` | rows for non-protected users |
| `public.play_console_log` | rows for non-protected users (encounter console) |
| `public.catches` | rows whose `user_id` is not protected |
| `private.streamlink_hidden_tickets` | any leftover server tickets (currently 0) |

### Rewrite pointers (non-protected profiles only)

| Column | Effect |
|---|---|
| `public.profiles.team_ids` | set to `{}` |
| `public.profiles.pc_layout` | set to `{}` |
| `public.profiles.team_ids` / `pc_layout` on **protected** profiles | strip only reset catch ids if any leaked in; do not empty their boxes |

### Null economy pointers (do not delete ledger rows)

| Table | Effect |
|---|---|
| `public.candy_ledger.related_catch` | `NULL` where the uuid is a reset catch |

### Active encounter state

| Table | Effect |
|---|---|
| `public.encounter_rounds` | if `resolved IS NOT TRUE` and `cancelled IS NOT TRUE`, mark cancelled/resolved. **Do not DELETE** historical rounds |

### Optional derived counters (in script, non-protected only)

`public.trainer_stats` catch/encounter fields (`captures`, streaks, `fails`, `released`, trade counters, `evolved`, `encounters`, `optimal_catches`, first-dex fields). **Not** `candy_earned` / `candy_spent`.

### Soft leftover (not mutated by the script)

`public.profiles.showcase` may hold catch uuids. Shape is not a hard FK. Inspect before a future GO if a showcase still points at a deleted id.

---

## Preserve (do not DELETE / UPDATE)

| Area | Objects |
|---|---|
| Accounts / auth | `auth.*`, `public.profiles` rows themselves |
| Twitch | `public.twitch_connections`, `profiles.twitch_login`, `profiles.twitch_user_id` |
| Sora / Twinkle | those profiles and **all** of their catches, team, PC, trades, oak transfers, evo log, encounter participation |
| Economy | `inventories`, `coin_ledger`, `item_ledger`, `item_catalog`, `item_policy`, `item_prices`, `mart_sales`, `family_candy`, `candies`, `candy_ledger` **rows**, Pass / daily claims |
| Pokédex history | `species_seen`, `form_seen` |
| Dex/research catalogs | `oak_research_*`, `evolution_families`, `evolution_rules`, `evolution_config`, `species_mastery` |
| Site / staff | `site_config`, `staff_roles`, `stream_status`, `stream_commands` |
| Pin | all `private.ref_*`, `private.ref_meta` |
| GENVAL catalog | functions + `private.streamlink_hidden_tickets` **table** (rows only may be cleared) |
| Rankings cosmetics | `trainer_badges`, `trainer_titles`, `trainer_cosmetics`, `progression_*` |

---

## Dependencies

Hard FKs that block a naive `DELETE FROM catches`:

- `oak_transfers.catch_id → catches(id)` (no `ON DELETE`)
- `trade_listings.catch_id → catches(id) ON DELETE CASCADE`
- `trade_offers.catch_id → catches(id) ON DELETE CASCADE`
- `catches.round_id → encounter_rounds(id)` (rounds must stay)
- `catches.user_id → profiles(id) ON DELETE CASCADE` (do not delete profiles)

Soft uuid refs: `direct_trades.a_catch` / `b_catch`, `evolution_log.catch_id`, `candy_ledger.related_catch`, `profiles.team_ids`, `profiles.pc_layout`.

---

## Effects if later executed

| Surface | Effect |
|---|---|
| My PC / party | non-protected boxes and teams empty; 12 catches gone |
| Sora / Twinkle PC | unchanged |
| GTS / direct trade | pending listings/offers on reset catches removed |
| Pokédex | **unchanged** (`species_seen` / `form_seen` kept) |
| PokéCoins / bag | **unchanged**; candy ledger rows kept with `related_catch` nulled |
| Twitch / accounts | **unchanged** |
| Rankings catch counts | may look stale until `trainer_stats` optional block runs |
| Active encounter | none at inventory time; script would cancel any later live round |

---

## Next gate

**A19-RESET-TEST** (clone dry-run) then a named **A19-RESET-GO**. This D43 packet is not that GO.

Unapplied script: `supabase/unapplied/a19-reset/001_ra_pokemon_progression.sql`.
