# Pokémon authenticity and legality audit (GitHub issue #16)

Parent: epic #11. **DESIGN / SOURCE AUDIT ONLY.** This batch does not change SQL, RPCs, live Pokémon, production, `admin-next.html`, or privileged permissions.

**Verdict:** StreamLink already persists **Let's Go–inspired individuals**, not empty species shells. That is **not** the same as generating official-game-legal Pokémon. PokéAPI integration is a **Pokédex encyclopedia** (`js/pokedex-reference.js`). It does not generate, validate, or stamp catch rows.

### Errata (2026-10-13 — issues #18 / #19)

Real Let's Go Pikachu / Let's Go Eevee **does have Natures**. This audit incorrectly treated “no nature column” as “LGPE has no natures.” StreamLink **still does not persist** natures. Owner D15–D17 reject LGPE as the **future** target. Historical evidence tables below stay as a snapshot of current code. Implementation plan: `GEN-IX-REBUILD-PLAN-ISSUE-19.md`.

Do not claim FR/LG, HOME, BANK, or cartridge legality. Do not silently mix generations.

| Honesty | What this audit used |
|---|---|
| STATIC | Migrations under `play-site/supabase/migrations/`, player/admin JS, command-center docs |
| LIVE CATALOG | Read-only `information_schema` on project `dtflmlbjhttoewqgkujf` (`public.catches` columns, `lgpe_species` = 151 rows, function **names** present) |
| NOT RUN | Encounter/catch, account writes, `SELECT` of catch rows, bulk `pg_get_functiondef`, staff RPCs, PRODUCTION observation of individual stats |
| REAL RPC / PRODUCTION | **not claimed** |

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none** · PlayTester unused.

---

## 1. What actually exists

Product catch persistence is **Let's Go Pikachu / Let's Go Eevee–inspired (LGPE)**, wired in `20260908_letsgo_storage_trade.sql` and later OT/met, level, and form-aware migrations.

### 1.1 Pipeline (encounter → catch → storage → evolution → views)

```
stream / director AUTO spawn
        │
        ▼
private.spawn_pick_random_dex()     ordinary cap: private.normal_spawn_max_dex() = 151
        │                           BASE forms only for normal encounters
        ▼
private.launch_community_round()    shiny 1/4096; gender via lgpe_roll_gender;
                                    level via encounter_pokemon_level (habitat bounds)
        │
        ▼
community throw + private.capture_chance()   StreamLink catch-rate table (not Gen 1/LGPE formula)
        │
        ▼
INSERT public.catches (user_id, dex, name, variant, gender, ball, round_id, source_key, pokemon_form_id)
        │   typically NO iv/av/moves/level — trigger fills them
        ▼
private.catches_before_write → private.stamp_catch_row
        │   md5(catch id) IVs 0–31; AV 0; last-4 level-up move names; OT/met; invented height/weight
        ▼
owner PC: public.play_storage() → private.catch_json()   FULL ivs/avs/moves/stats/cp/ot
player inspect UI (js/storage.js)                        derived stats + OT/met; NO ivs/moves rendering
public Trainer ID (play_trainer / team_mons)             identity only (no IVs/moves/stats)
admin_user_account mons[]                                newest 40 identity only (no IVs/moves/stats)
evolution: private.evolve_catch                          candy/item/trade; updates dex/name; keeps IVs/moves
```

**Stream director:** AUTO spawn lives in this repo (`private.director_tick` and related migrations). A MixItUp command file exists at `MixItUp/Community Commands/Play - Start Stream Bridge.miucommand`. The external Twitch EventSub / stream-bridge **process** is **not** in `play-site/`; treat its runtime as **cannot verify / unknown**, not as a second generator.

### 1.2 Persisted schema (`public.catches`, LIVE CATALOG)

Present on live `dtflmlbjhttoewqgkujf`:

| Group | Columns |
|---|---|
| Identity | `id`, `user_id`, `dex`, `name`, `variant`, `gender`, `ball`, `caught_at`, `round_id`, `source_key`, `public_id`, `nickname`, `level`, `pokemon_form_id` |
| IVs | `iv_hp`, `iv_atk`, `iv_def`, `iv_spa`, `iv_spd`, `iv_spe` |
| AVs (not EVs) | `av_hp`, `av_atk`, `av_def`, `av_spa`, `av_spd`, `av_spe` |
| Moves | `moves text[]` |
| Size / body | `size_class`, `height_m`, `weight_kg` |
| OT / met | `ot_user_id`, `ot_name`, `ot_number`, `met_level`, `met_location` |
| Flags | `friendship`, `is_alpha`, `favorite`, `locked`, `obtained_method`, `trade_evo_ready`, `trade_locked_until`, `reserved_trade_id`, `transferred_at` |

**No live `public` columns** named `nature`, `ability`, `hidden_ability`, `ev_hp` / `ev_*`, `held_item`, `personality` / `pid`, `pp`, `exp`, `status`, or current HP. A catalog search for those names returned only unrelated `hidden` flags on `encounter_rounds` and `progression_achievements`.

`public.lgpe_species` (LIVE): **151 rows**, columns `dex`, `types`, `hp`, `atk`, `def`, `spa`, `spd`, `spe`, `moves`. This is the **server pin** for LGPE base stats and level-up move JSON. It is not a per-catch row.

Live function **names** confirmed: `private.stamp_catch_row`, `private.catch_json`, `private.lgpe_pick_moves`, `private.lgpe_stat`, `private.evolve_catch`, `private.admin_account_json`, `public.admin_grant_pokemon`, `public.play_storage`, `public.play_collection`, `public.play_evolve`. Bulk body search via `pg_get_functiondef` was **Unauthorized**; bodies below are cited from **migrations** (STATIC). Assume live bodies match the latest replacement migration unless a later fingerprint audit says otherwise.

### 1.3 Generation algorithm (what the trigger actually does)

Source: `private.stamp_catch_row` in `20260914070000_encounter_pokemon_level.sql` (latest stamp in migrations).

| Field | Algorithm | Legal? |
|---|---|---|
| `public_id` | `LG` + 8-digit serial | Product ID, not a game TID/SID/PID |
| Level | Encounter: `encounter_pokemon_level(dex, round_id)` from `lgpe_level_bounds`; else hash of catch id | Habitat-inspired bounds, not route encounter tables |
| IVs | `md5(id \|\| stat) % 32` independently per stat (0–31) | **Range** matches LGPE/modern IVs. **Method** is a UUID hash, not a PID, not an in-game RNG, not a guaranteed 3×31 raid/event draw |
| AVs | Default **0**. No later `UPDATE` of `av_*` found in migrations | LGPE Awakening Values exist as columns but are unused for training |
| Moves | `lgpe_pick_moves`: last 4 **level-up** names from `lgpe_species.moves` with `l <= level`; else any 4; else `['Tackle']` | Names only. No PP, version-group stamp, method per slot, or TM/tutor. Tackle fallback is not species-legal for every dex |
| Gender | `lgpe_roll_gender`: hardcoded Kanto 151-rate array; dex > 151 defaults to rate 4 (50/50). Preserves Male/Female if already set; Genderless/Male-only/Female-only overwrite | Inspired by Gen 1 ratios, not a live PokéAPI gender-rate lookup |
| Shiny | Wild: `random() < 1/4096` in `launch_community_round` | Rate matches modern/LGPE wild, not Gen 1 1/8192 |
| Alpha | Insert trigger: `hashtext(id \|\| 'alpha') % 128 = 0` (`20260909_pc_trade_alpha.sql`) | **PLA-inspired mix-in**, not LGPE |
| Friendship | Default **0** | LGPE typically starts near 70; 0 is not a species base |
| Height / weight | `(0.4 + dex%17×0.08)` / `(5.0 + dex%29×1.7)` × size scale × jitter | **Invented**. Not species Pokédex height/weight |
| OT number | `10000 + hashtext(trainer id) % 90000` | Not an official trainer ID |
| Stats | `lgpe_stat`: HP `floor((2×base+IV+AV)×level/100)+level+10`; others `+5` | Matches LGPE (no nature). Derived at read, not stored |
| CP | GO-like: `floor(atk × √def × √hp × (level/40 × 0.7903)² / 10)` in `catch_json` | **Pokémon GO mix-in**, not LGPE |

Catch insert (form-aware settlement, `20260918050200_form_aware_rpcs.sql`) passes identity + ball + form id only. The trigger stamps the rest.

Admin grant (`public.admin_grant_pokemon`, `20260909_master_admin.sql`): dex **1–151**, name, gender, shiny, ball. Same trigger. No IV/move editor. Soft-remove via `admin_remove_pokemon` sets `transferred_at` — not a stat editor.

### 1.4 Capture odds are StreamLink, not a game formula

`private.capture_chance` / `private.capture_base_chance` (`20260913033000_capture_service.sql`) map species `catch_rate` onto **configured chance tiers**, then multiply ball / berry / honey / shiny / event. Clamp `[minChance, maxChance]` (defaults 0.02–0.85). Master Ball is guaranteed in settlement. This is community-stream catch math, **not** Gen 1, LGPE, or GO catch-curve legality.

### 1.5 Evolution, nickname, trades

`private.evolve_catch` (`20260916170000_phase2_evolution_integrity.sql`):

- Kanto `to_dex` 1–151; candy cost and/or stone / Linking Cord; trade path if `trade_evo_ready`.
- Updates `dex`, `name`, `obtained_method = 'EVOLUTION'`, clears `trade_evo_ready`.
- **Does not re-roll IVs. Does not re-pick moves** (stamp only fills empty `moves`). A Caterpie that becomes Metapod keeps Caterpie’s four names.
- **Not** level-up evolution. Rare Candy (`play_use_rare_candy`) converts to **family candy**; it does **not** increment `catches.level`.

Nickname: `play_set_nickname` (max 12 in PC UI). Trades: GTS / direct trade swap `user_id`; `mark_trade_receive` may set `obtained_method = 'TRADE'` and `trade_evo_ready`. OT fields are **not** rewritten on trade in the reviewed paths (OT stays original — closer to games than “new OT on every owner”).

### 1.6 Who can see which fields

| Surface | RPC / file | IVs / AVs / moves | Derived stats | Notes |
|---|---|---|---|---|
| My PC | `play_storage` → `catch_json` | **Returned** | **Returned** | `js/storage.js` `renderDetail` shows stat bars + OT/met. **No** `mon.ivs` / `mon.avs` / `mon.moves` rendering (STATIC grep) |
| Evolution | `play_collection` | No | No | Ready list: identity + candy/item cost |
| Trainer ID party | `private.team_mons` | No | No | `id, publicId, dex, name, nickname, variant, gender, ball` |
| Public Trainer ID recent | `play_trainer` | No | No | Recent 24: identity + ball + metLocation + formId |
| Admin account | `admin_account_json` / `admin_user_account` | **No** | **No** | Newest 40: `id, dex, name, nickname, variant, gender, ball, level, caughtAt` |
| Pokédex | `js/pokedex.js` + `PLAY_POKEDEX_REF` | n/a | species base only | Abilities are **species flavor**, including hidden labels |
| Admin Hub prototypes | issue #9 / #12 visual | No | No | `mons[]` contract only; `admin_trainer_pc` **not built** |

There is **no** owner Pokémon inspector for IVs/moves today. There is **no** audited stat editor. Grant/remove are identity-level mutators.

### 1.7 PokéAPI vs LGPE reference (do not conflate)

| Artifact | Role | Used to stamp catches? |
|---|---|---|
| `js/pokedex-reference.js` | Generated by `tools/build-pokedex-reference.js` from pokeapi.co (built 2026-09-24). Species flavor, types, height/weight, **abilities** (incl. hidden), species base stats | **No.** Loaded by `pokedex.html` for the Pokédex UI |
| `js/lgpe.js` | Local dump, `version: "lets-go-pikachu-lets-go-eevee"`, level-up + machine learnsets, LGPE base stats | Seed/reference for `lgpe_species`. Standing rule: **do not commit** `js/lgpe.js` |
| `public.lgpe_species` | Server table, 151 rows | **Yes** — move pick + `lgpe_stat` bases |
| PokéAPI itself ([docs v2](https://pokeapi.co/docs/v2)) | Species / pokemon / ability / nature / version-group encyclopedia | **Never at runtime.** Does not produce legal individuals. `stats[].effort` is species EV **yield**, not a caught mon’s EVs |

PokéAPI version-group `lets-go-pikachu-lets-go-eevee` is the coherent learnset pin for the **current** implementation. Nature and ability endpoints exist in PokéAPI because other games use them; LGPE does not assign natures or abilities.

---

## 2. Field-by-field matrix

Status tokens: **implemented & persisted** · **derived at read** · **only reference source** · **planned** · **absent** · **cannot verify**.

| Field | Status | Evidence | Gap vs a coherent game |
|---|---|---|---|
| Species canonical ID | implemented & persisted | `catches.dex`; spawn cap 151 ordinary | National catalog exists; ordinary AUTO cannot exceed 151 (`normal_spawn_max_dex`) |
| Form | implemented & persisted | `pokemon_form_id`; `canonical_form_id`; form-aware spawn firewall | Ordinary = BASE 1–151. Non-base EVENT_READY only (form audit `docs/audits/pokemon-form-implementation-audit.md`) |
| Types | derived at read from species | `lgpe_species.types` in `catch_json`; Pokédex uses `PLAY_POKEDEX_REF` | Two sources. Catch JSON uses LGPE table; Pokédex uses PokéAPI snapshot |
| Species base stats | only reference source (server: `lgpe_species`; client Pokédex: PokéAPI) | Not stored on the catch | Do not confuse with the individual's derived stats |
| Level | implemented & persisted | Round-seeded habitat bounds or hash | Not route tables; Rare Candy does not level up |
| Derived stats (HP/Atk/Def/SpA/SpD/Spe) | derived at read | `private.lgpe_stat` in `catch_json`; PC bars in `storage.js` | LGPE formula (no nature). Admin cannot see them via `mons[]` |
| Current HP / status condition | absent | No columns | No battle HP/status |
| IVs per stat | implemented & persisted | `iv_*`; stamp `md5 % 32` | Range OK for LGPE. Method is not a game RNG. Admin cannot inspect |
| EVs per stat | absent | No `ev_*`. PokéAPI `effort` is species yield only | LGPE uses **AVs**, not EVs. Do not backfill EVs |
| AVs per stat | implemented & persisted (always 0 in practice) | `av_*` default 0; no training UPDATE found | Columns exist; training loop **absent** |
| Nature | absent | No column; PokéAPI `/nature` unused | LGPE has no natures. Adding them is a **different ruleset** |
| Ability | absent on catch | Pokédex shows abilities from `PLAY_POKEDEX_REF.forms[].abilities` | Encyclopedia only. LGPE has no abilities |
| Hidden ability legality | only reference source (Pokédex label) | `abilityLabel` appends “(Hidden)” | Never rolled onto a catch |
| Gender | implemented & persisted | Hardcoded Kanto rates; spawn + stamp | Admin grant may pass Unknown then re-roll unless Male/Female |
| Shiny | implemented & persisted | `variant` contains `shiny`; 1/4096 wild | Rate is modern/LGPE, not Gen 1 |
| Learnset / 4 moves | implemented & persisted (names only) | `moves text[]`; last 4 level-up | No PP, no method/version per slot, no TM, no evo relearn; Tackle fallback |
| Poké Ball | implemented & persisted | `catches.ball` | StreamLink ball keys, not every cartridge ball |
| Catch location / time | implemented & persisted | `caught_at`, `met_location` (`lgpe_habitat` if unset), `met_level`, `round_id` | Habitat string, not a FR/LG route name table |
| Held item | absent | No column | — |
| Friendship | implemented & persisted | Default 0 | Not species base friendship |
| Exp / exp group | absent | No column; no level-up from EXP | Candy/stream progression is separate |
| Evolution constraints | implemented (RPG candy/item/trade) | `evolution_rules`, `evolve_catch`, Kanto 1–151 | Not level/friendship/trade-in-battle. Game-inspired, not cartridge |
| Provenance | implemented & persisted | `source_key`, `obtained_method`, `ot_*`, `round_id` | Product provenance, not a legality ribbon/PID |
| Ribbons on the mon | absent on catch | Issue #12: no inspect contract | Do not invent |
| Size class | implemented & persisted | XS–XL from hash | LGPE-inspired |
| Height / weight on catch | implemented & persisted | Invented dex% formula | **Conflicts** with Pokédex species height/weight |
| CP | derived at read | GO formula in `catch_json` | Mixed ruleset; not LGPE |
| Alpha | implemented & persisted | 1/128 hash | PLA mix-in |
| PID / personality / encryption | absent | UUID `id` + `public_id` | Cannot be HOME-legal |
| PP / move version-group stamp | absent | Names only | — |

---

## 3. Target ruleset (choose one; do not mix)

PokéAPI documents **version groups**, not individuals ([PokéAPI v2](https://pokeapi.co/docs/v2): `/version-group`, `/pokemon`, `/move`, `/ability`, `/nature`). A version-group tells you which learn methods and Pokédexes exist. It does **not** mint a legal catch.

### Recommendation (D14, pending owner A16a): keep **LGPE-inspired StreamLink v1** as the honest current ruleset

**Why this is the only coherent description of what already shipped:**

- Stored mechanics are IV 0–31 + AV + no nature + `lgpe_stat` without nature modifiers + 4 level-up names + friendship + size class.
- Server pin is `lgpe_species` (151) and local `js/lgpe.js` version-group `lets-go-pikachu-lets-go-eevee`.
- Ordinary encounters are Kanto BASE 1–151.
- Natures and abilities are **not** in the catch schema. Teaching the client to show Pokédex abilities as if they were on the mon would be a lie.

**Game-inspired consistency (in-product):** a StreamLink catch should look like a Let's Go Kanto mon: Kanto dex, LGPE stat formula, LGPE level-up moves for that level, valid gender for the species, shiny as a variant flag, OT/met, ball.

**Official exchange legality (HOME / BANK / cartridge):** **out of scope and not promised.** No PID, no language, no met-game, no ribbons, no encryption, no HOME tracker. Never advertise “legal for Home” or “legal for Showdown” without a separate owner product decision.

### Rejected silent mixes

| Mix | Why it is invalid |
|---|---|
| FR/LG DVs (0–15) + current `iv_*` 0–31 | Different IV generation |
| FR/LG + abilities (Gen 3) + current schema | Abilities do not exist on catches; LGPE also has none |
| Modern natures + current `lgpe_stat` | Formula ignores nature; no column |
| Modern EVs + current AVs | Different training system; `effort` on PokéAPI is yield |
| GO CP + LGPE stats + PLA alpha as if one game | Already mixed in presentation; do not call it legal |
| Pokédex hidden ability as catch ability | Reference UI only |

### Alternate future rulesets (explicit owner choice later — A16e)

1. **Stay LGPE (recommended default).** Tighten generation (learnset pin, species height/weight, friendship base, drop GO CP from authoritative JSON or label it display-only, isolate Alpha as a StreamLink badge).
2. **Modern (Gen 8/9) StreamLink.** New columns: nature, ability (incl. hidden legality), EVs *or* keep AVs but then it is still not modern. New stat formula with nature. Learnset pin a chosen version-group. **New catches only.**
3. **FR/LG nostalgia.** DVs, Gen 3 abilities *or* no abilities (Yellow vs FR/LG is already a fork), different catch formula. Would **fork** the current schema.

Do not implement 2 or 3 onto existing rows by inventing natures/abilities.

---

## 4. Gap analysis (evidence-backed)

1. **PokéAPI ≠ legality.** Abilities and species stats in the Pokédex are encyclopedia data. Catch rows never receive them.
2. **IVs exist but are not a legal generator.** Deterministic md5 of the catch UUID. Reproducible, not an in-game PID/IV draw. Fine for a stream RPG if labeled honestly; not cartridge-legal.
3. **AVs are a husk.** Persisted, always 0, no training RPC.
4. **Moves are a 4-name slice.** No PP, no TM, no version stamp. Evolution does not teach the new species’ level-up set. Empty learnset → Tackle.
5. **Admin cannot inspect the fields that do exist.** `mons[]` omits ivs/avs/moves/stats. Issue #9/#12 UI used that contract on purpose.
6. **No owner stat editor.** Grant/remove only. A freeform `UPDATE public.catches` would bypass validation — that path must not be the design.
7. **Mixed presentation math.** GO CP inside LGPE `catch_json`; PLA-like Alpha; invented height/weight vs Pokédex species size; friendship 0.
8. **Candy evolution vs game evolution.** Product-correct for StreamLink; not FR/LG or LGPE level/stone/trade.
9. **Post-Kanto.** Gender defaults to 50/50; `lgpe_species` has no row → stats fall back to base 50 and moves to Tackle. Ordinary spawn is contained; grants are 1–151. A future Johto spawn without a new species pin would be illegal even by StreamLink rules.
10. **PC UI hides IVs/moves** even though `play_storage` already returns them. Showing them is a **frontend** honesty fix, not new authority — still needs owner UX approval (A16f).

---

## 5. Cache, versioning, provenance (proposal only)

| Layer | Current | Proposal (after A16a) |
|---|---|---|
| Server pin | `public.lgpe_species` 151, unversioned table | Add `ruleset_id` / `version_group` / `content_build` on the pin (e.g. `lets-go-pikachu-lets-go-eevee@<date>`). Do not hot-pull PokéAPI in RPCs |
| Pokédex encyclopedia | `js/pokedex-reference.js` (`source: pokeapi.co (synced)`, `builtAt`) | Keep separate. Never stamp catches from it |
| Local LGPE dump | `js/lgpe.js` (do not commit) | Build → SQL seed in migrations with a content hash. Runtime stays SQL |
| Catch provenance | `source_key`, `obtained_method`, `round_id` | Add optional `ruleset_id` on **new** inserts only (NULL = “pre-audit LGPE hash IVs”) |
| Update lifecycle | Rebuild reference JS by tool | Pin learnsets; review diffs; never rewrite stored IVs when the pin updates |
| Fixtures | Capture tests exist for balls/odds (`supabase/tests/capture_tests.sql`) | New legality fixtures: gender rates, move slices at given levels, stat formula, spawn cap, grant 1–151. No live account writes |

Runtime must **not** call pokeapi.co to generate a mon.

---

## 6. Generation algorithm (new catches only, after A16c)

Stay on LGPE unless A16e says otherwise.

1. Pick species/form from the existing spawn firewall (BASE 1–151 ordinary).
2. Level from habitat bounds (already).
3. Gender from pinned gender-rate table (already; replace hardcoded array with versioned pin when convenient).
4. Shiny 1/4096 (already) unless an event table says otherwise.
5. IVs: keep 0–31 independent rolls. Prefer `gen_random_bytes` / `random()` at insert time **or** keep hash if the owner wants determinism from `id`. Document the choice. Do **not** switch existing rows.
6. AVs: 0 at catch (already). Training is a later product.
7. Moves: last 4 LGPE level-up names at `level` from the pinned JSON; if fewer than 4, take what exists; **never** invent Tackle unless the species actually learns it in that version-group.
8. Height/weight: copy **species** LGPE/Pokédex values, optionally scaled by size class — stop using `dex % 17`.
9. Friendship: species base (typically 70), not 0.
10. Do not write nature/ability columns unless A16e adds a modern ruleset.
11. Label CP as display-only or remove it from `catch_json` in a later approved RPC change.
12. Alpha: keep as StreamLink badge, not a game IV generator.

Server invariants (validate on insert/evolve/grant): dex in allowed set; form matches dex; gender legal; IVs 0–31; AVs 0–200 if ever trained; `cardinality(moves) <= 4`; every move ∈ pinned learnset for that dex/version; shiny only via `variant`; no client-supplied IVs on player catch.

---

## 7. Backfill (do not invent)

Existing mons **already have** hashed IVs, AVs=0, and a 4-move slice. Issue #16 forbids inventing IVs and forbids mutating stored Pokémon.

| Idea | Decision |
|---|---|
| Re-roll IVs to “make them legal” | **Forbidden.** They are already 0–31 values with provenance = hash(id) |
| Fill nature/ability on old rows | **Forbidden** unless A16e + per-row owner tool. Default: NULL = “unset / pre-ruleset” |
| Re-pick moves from a new learnset pin | **Forbidden** as a silent UPDATE. Optional future owner tool with dry-run |
| Copy species height/weight onto old rows | Would mutate body fields. Only with A16c + explicit tool, not a blanket SQL |
| Add `ruleset_id` | Nullable column on **new** inserts; leave old rows NULL |

Read-only reports (counts of null form, empty moves, dex>151, Unknown gender) are allowed later as catalog SQL. This batch did **not** `SELECT` catch rows.

---

## 8. Owner inspector and audited editor (design only)

### 8.1 Read-only inspector (A16b — new SQL/RPC approval)

Not `admin_user_account.mons[]`. Not a table dump.

- New read RPC, e.g. `admin_trainer_pc` / `admin_catch_inspect`, `STABLE`, `SECURITY DEFINER`, `is_play_admin` (or owner-only if the owner prefers).
- Return `private.catch_json` plus provenance (`source_key`, `round_id`, `obtained_method`) for **one trainer**, with paging — not newest-40 truncation without a label.
- Reuse server derivation; do not recompute stats in JS.
- Protected accounts (Sora / Twinkle): readable, **not** editable (see 8.2).
- Wire into Admin Hub only after A9 (frontend) **and** this RPC approval. Issue #9/#12 visuals stay `mons[]` until then.
- Do **not** expose this to normal players beyond what `play_storage` already returns to the owner of the mon.

### 8.2 Audited privileged editor (A16d — separate write approval)

**Not** `UPDATE public.catches` from a staff form. **Not** `admin_grant_pokemon` with extra columns.

Minimum contract:

| Control | Requirement |
|---|---|
| Role | Owner-only (`private.play_staff_role() = 'owner'`). Admins do not get a stealth path |
| Protected accounts | Hard-block Sora / Twinkle (and any later protected list). No QA exception in the RPC |
| Input | Field whitelist: nickname, level (bounds), IVs 0–31, AVs 0–200, moves (≤4, learnset), gender (species-legal), shiny/variant, ball, met fields, friendship, form (legal for dex). **No** arbitrary JSON blob |
| Validation | Same invariants as generation. Reject illegal ability/nature unless A16e created those columns |
| Dry-run | `p_commit boolean default false` returns a **before/after diff** without write |
| Reason / case id | Required non-empty `p_reason`, optional `p_case_id` |
| Transaction | One RPC, one catch, idempotency key |
| History | Append-only `catch_audit` (or existing account_audit if extended): actor, catch id, before JSON, after JSON, reason, case id, at |
| Rollback | Compensating owner RPC that applies a **historical snapshot** through the same validator — not unrestricted UPDATE |
| Confirmation | Explicit `p_confirm` matching species name or catch public id for IV/move/level changes |
| Grant path | Keep `admin_grant_pokemon` as **create**, not edit. New mons still go through `stamp_catch_row` until A16c replaces the stamper |

Batch F / A3 / A9 do **not** authorize this editor.

### 8.3 Player PC display (A16f)

Optional frontend: render `mon.ivs` / `mon.moves` already returned by `play_storage`. No new authority. Still an owner UX approval because it changes what trainers see.

---

## 9. Phased plan

All phases need the listed owner approval. None are started.

| Phase | Work | Approval | Mutates Pokémon? |
|---|---|---|---|
| **0** | This audit + command center | Issue #16 (this batch) | No |
| **1** | Honesty copy: product is LGPE-inspired, not HOME-legal; Pokédex abilities ≠ catch abilities | A16a | No |
| **2** | Owner read inspector RPC + staff UI later | A16b (SQL/RPC) then A9 for hub chrome | No |
| **3** | Optional PC IV/move display from existing JSON | A16f | No |
| **4** | New-catch stamper: species size, friendship base, learnset-safe moves, documented IV RNG, `ruleset_id` | A16c (SQL) | **New rows only** |
| **5** | Audited owner editor + history table | A16d (SQL + owner-only grant) | Only via editor, never Sora/Twinkle |
| **6** | Optional modern/FR-LG ruleset as a **new** pin | A16e | New rows only; old rows stay NULL extras |
| **7** | AV training / TM tutor / evo relearn if the product wants those | Separate | Product design |

Test coverage for later phases (not run now): gender-only species, empty learnset, dex 151 vs 152, shiny variant strings, form firewall, stamp does not overwrite supplied legal IVs, editor dry-run, protected-account reject, evolve keeps IVs.

---

## 10. Explicit approvals required before any implementation

| ID | Question | Recommendation |
|---|---|---|
| **A16a** | Confirm LGPE-inspired StreamLink v1 as the current honest ruleset? | Yes |
| **A16b** | New read-only inspect RPC exposing `catch_json` to staff? | Yes, after SQL review; not via `admin_overview` |
| **A16c** | Change `stamp_catch_row` for **new** catches (size, friendship, Tackle fallback, ruleset id)? | After A16a; never rewrite old IVs |
| **A16d** | Owner-only audited editor? | Separate write approval; history table; protected accounts |
| **A16e** | Adopt a modern or FR/LG ruleset instead of LGPE? | **No** unless the owner explicitly wants a new game |
| **A16f** | Show IVs/moves on My PC? | Frontend only; optional |
| A3 / A9 / Batch F | Privileged hub / live tab | Still **not** this issue |
| Merge / APP stamp / PRODUCTION | — | Forbidden this batch |

---

## 11. Unknowns (not guessed)

- Live function **bodies** vs latest migration (names confirmed; bulk `pg_get_functiondef` unauthorized).
- Distribution of existing IV/move/gender values (no `SELECT` on `catches`).
- Whether `lgpe_species.moves` JSON matches current PokéAPI LGPE learnsets byte-for-byte (151 rows exist; content not sampled).
- External stream-bridge EventSub daemon (not in `play-site/`). MixItUp start command exists in the parent workspace; it is not the generator.
- Whether any out-of-repo job writes `catches` besides the RPCs in this repo — **cannot verify**.
- Production APP still `20261008-rc133`; this audit does not observe production DOM.

---

## 12. What this batch did not do

No SQL, grants, RLS, staff-role changes, encounter runs, catch inserts, trainer mutations, `admin-next.html` edits, `admin.html` / `js/admin-live.js` edits, merge, deploy, APP stamp, A9, Batch F, issues #13 / #14 / #15 / #17.

---

## Citations (repo paths)

- Stamp / stats / moves: `supabase/migrations/20260908_letsgo_storage_trade.sql`, `20260914070000_encounter_pokemon_level.sql`
- OT/met/gender: `20260909_letsgo_ot_met.sql`
- Form-aware catch JSON + settle insert: `20260918050200_form_aware_rpcs.sql`
- Spawn cap: `20260918040000_kanto_encounter_containment.sql`, `20260918030000_national_organized_roster.sql`
- Capture odds: `20260913033000_capture_service.sql`
- Evolve: `20260916170000_phase2_evolution_integrity.sql`, `20260914024000_kanto_evo_service.sql`
- Admin grant / mons[]: `20260909_master_admin.sql`, `20260915012000_account_identity_admin.sql`
- PC: `public.play_storage` in `20260909_pc_trade_alpha.sql`; `js/storage.js`
- Public trainer: `20260928120000_play_trainer_public_journal_achievements.sql`; `private.team_mons` in `20260908_letsgo_storage_trade.sql`
- Pokédex encyclopedia: `js/pokedex-reference.js`, `js/pokedex.js`, `tools/build-pokedex-reference.js`
- Form matrix: `docs/audits/pokemon-form-implementation-audit.md`
- Admin mons contract: `docs/audits/admin-hub-gate-2-data-contracts.md`
- PokéAPI: https://pokeapi.co/docs/v2
