# PokéAPI item sync report
- Started: 2026-09-20T07:45:04.636Z
- Finished: 2026-09-20T07:55:13.540Z
- Dry run: false
- Upstream processed: 2223
- Fetched: 2223
- Unique canonical keys: 2222
- DB upserted: 2222
- New slugs: 0
- Changed/seen existing: 2222
- Unchanged estimate: 2222
- Aliases/skipped: 1
- Sprites ok (unique items): 1093
- Sprites downloaded: 0
- Sprites reused (local cache): 1093
- Sprites missing: 1129
- Local sprite files: 1093
- Categories: all-machines, all-mail, apricorn-balls, apricorn-box, bad-held-items, baking-only, catching-bonus, choice, collectibles, curry-ingredients, data-cards, dex-completion, dynamax-crystals, effort-drop, effort-training, event-items, evolution, flutes, gameplay, healing, held-items, in-a-pinch, jewels, loot, medicine, mega-stones, memories, miracle-shooter, mulch, nature-mints, other, picky-healing, picnic, plates, plot-advancement, pp-recovery, revival, sandwich-ingredients, scarves, special-balls, species-candies, species-specific, spelunking, standard-balls, stat-boosts, status-cures, tera-shard, tm-materials, training, type-enhancement, type-protection, unused, vitamins, z-crystals
- Pockets: battle, berries, key, machines, mail, medicine, misc, pokeballs
- Valuable candidates (heuristic): 42
- Errors: 0
## Invariants
- `upstream processed - unique keys = aliases/skipped` (PokéAPI may list duplicate names that collapse to one game key).
- `sprites ok` counts unique catalog items with a usable sprite, not upstream index length.
- `local sprite files` is the on-disk PNG count under `images/items/pokeapi/`.
- Gameplay policy flags are never reset by this sync.
- New items receive catalog-only defaults (all gameplay flags false).
## Aliases / skipped duplicates
- roseli-berry (id 2279) → slug `roseliberry` skipped; primary id 723 (duplicate_canonical_key)