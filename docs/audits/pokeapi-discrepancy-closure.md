# PokéAPI catalog / sprite discrepancy — closure notes

## Catalog: 2223 upstream vs 2222 DB rows

**Exact cause:** PokéAPI lists **two item endpoints** that both normalize to the same
canonical game key `roseliberry`:

| PokéAPI ID | Name           | Endpoint fetch | Canonical key | Outcome |
|------------|----------------|----------------|---------------|---------|
| **723**    | `roseli-berry` | succeeds       | `roseliberry` | first / primary catalog row |
| **2279**   | `roseli-berry` | succeeds       | `roseliberry` | **alias / duplicate key** |

`gameKey("roseli-berry")` strips hyphens → `roseliberry`. The DB primary key is
`item_catalog.slug`, so the second ID cannot create a second row. The importer
upserts on `slug` (merge). This is **not data loss of a distinct item** — it is one
logical Roseli Berry represented twice upstream.

**Invariant:** `upstream_index_count - unique_canonical_keys = alias_count`
(currently `2223 - 2222 = 1`).

Sync tooling now records `aliasesSkipped` explicitly so humans do not need to
spot the arithmetic.

## Sprites: 1094 “Sprites OK” vs 1093 local files

**Exact cause (rc49 report):** the sync counter incremented `spritesOk` once per
**upstream index entry**, including the Roseli Berry alias reprocess. The second
pass reused the same local filename pattern / same logical item, so:

- Local PNG files on disk: **1093**
- Unique catalog rows with `sprite_available`: **1093**
- Inflated “Sprites OK” counter: **1094** (= unique successes + 1 alias re-count)

**Not** a missing download, shared-path collision across different items, or
failed fetch for a distinct item.

**Fix:** importer now skips duplicate canonical keys before sprite accounting and
reports `spritesOk` / `spritesDownloaded` / `spritesReused` / `localSpriteFiles`
separately.

## Policy safety

Gameplay `item_policy` flags are insert-only on sync (`ignore-duplicates`). The
six launch valuables remain `mart_sell_enabled` with game sell prices unchanged
by catalog refreshes.
