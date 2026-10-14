# A19-REF offline pin (GitHub issue #20)

**Authorized:** D20 / A19-REF on `admin-hub-overhaul` only.  
**Not authorized:** live SQL, generator, validator, wiring, inspector, editor, reset, merge, deploy.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**.

## What shipped

| Artifact | Role |
|---|---|
| `tools/build-gen9-ref.js` | Build-time extract from a **pinned** PokéAPI commit |
| `tools/lib/gen9-ref.js` | Offline loader + legal level-up slice (tests only) |
| `data/gen9-ref/*` | Versioned JSON pin + SHA-256 manifest |
| `supabase/unapplied/a19-ref/` | Review-only `CREATE TABLE` + small seed. **Not applied** |
| `tests/gen9-ref-tests.js` | Local integrity / fixture suite |

Upstream: [PokeAPI/pokeapi@227b573](https://github.com/PokeAPI/pokeapi/commit/227b573712414a86ba299d322fa398fbb2893edc) (`data/v2/csv`). Docs: https://pokeapi.co/docs/v2  
`content_build`: `sl-ref-20261013-227b573`  
`ruleset_id`: `streamlink-gen9-xgen`

Runtime catch/admin paths do **not** load this pin yet. Rebuild: `node tools/build-gen9-ref.js` (writes `tools/.cache/`, gitignored). Tests read only `data/gen9-ref/`.

## Counts (from generated `coverage.json`)

| Item | Count |
|---|---|
| Species (Kanto 1–151) | 151 |
| Catalog forms | 236 |
| Natures | 25 |
| Abilities (used) | 135 |
| Moves (used) | 556 |
| Learnset rows | 14048 |
| Kanto evolution links | 88 |
| Resolved learnsets | **220** |
| Unresolved learnsets | **16** |

### By kind

| Kind | Total | Resolved | Unresolved | SV | SWSH | Historical |
|---|---|---|---|---|---|---|
| base | 151 | 151 | 0 | 99 | 40 | 12 |
| regional | 36 | 36 | 0 | 29 | 5 | 2 |
| mega | 19 | 15 | **4** | 0 | 0 | 15 |
| cap | 8 | 8 | 0 | 8 | 0 | 0 |
| cosplay | 6 | 6 | 0 | 0 | 0 | 6 |
| starter | 2 | 2 | 0 | 0 | 0 | 2 |
| other (totem) | 2 | 2 | 0 | 0 | 0 | 2 |
| gigantamax | 12 | 0 | **12** | 0 | 0 | 0 |

## Resolver (fail closed)

1. `scarlet-violet` rows for **that form id**
2. `sword-shield` only if **that form** has SWSH rows (D19 Q4)
3. Documented historical groups when those rows exist: Mega → ORAS/XY; Alola → USUM/SM/LGPE; Hisui already often SV; Galar → SWSH; cosplay → ORAS; Partner starters → LGPE; **base Kanto missing SV/SWSH** (Weedle/Pidgey/Rattata/Spearow/Paras lines) → LGPE
4. Else `unresolved`. **Never invent Tackle. Never copy the base form learnset onto Mega/regional/Gmax.**

Wild slice helper uses **level-up ≤ encounter level** from the chosen group only.

## Coverage gaps (honest)

1. **Gigantamax (12)** — PokéAPI has no per-Gmax learnset rows. Unresolved. Do not inherit the base SWSH/SV set.
2. **Champions megas (4)** — Clefable / Victreebel / Starmie / Dragonite mega ids `10278–10281` only appear under version-group `champions`. Left unresolved (no ORAS/SV/SWSH rows). Future exception needs an owner call.
3. **PokéAPI friendship** — Kanto `base_happiness` in this pin is **70** (older mainline), not the Gen VIII/IX 50. Comment for A19-SCHEMA; do not silently rewrite.
4. **Johto** — Mareep (179) is a documented out-of-roster placeholder. Fail closed.
5. **`/version-group/scarlet-violet` `move_learn_methods` is empty** — learn methods come from `pokemon_moves.csv`, as planned.

Regional forms (Alolan/Galarian/Hisuian) all resolved on **their own** pokemon ids. Mega Charizard X is ORAS and does **not** match base Charizard’s SV slice (fixture).

## Unapplied SQL

`supabase/unapplied/a19-ref/001_create_ref_tables.sql`  
`supabase/unapplied/a19-ref/002_seed_meta_natures_species.sql`  
`supabase/unapplied/a19-ref/DO-NOT-APPLY.md`

Not copied into `supabase/migrations/`. Not run on `dtflmlbjhttoewqgkujf`. Full learnsets stay JSON until **A19-SCHEMA**.

## Tests

| Suite | Class | Result |
|---|---|---|
| `tests/gen9-ref-tests.js` | LOCAL HARNESS | 12 passed |
| `tests/admin-hub-overhaul-tests.js` | STATIC | includes issue 20 existence |

No REAL RPC. No PRODUCTION. No catch-row SELECT.

## Stop

A19-SCHEMA, GENVAL, WIRE, INSPECT, EDIT, and any reset remain **blocked**.
