# Berry affinity proposal

Status: mathematically checked design; not a deployed gameplay change.

Every berry retains its current rarity-based catch multiplier. A matching Pokémon type multiplies that result by1.10, once even for dual types. Every type receives the same relative bonus. No mismatch penalty; existing 2% minimum and85% maximum remain, and Master Ball guarantees remain separate. Pinap and Silver Pinap coin effects remain. Prices and inventories stay unchanged.

This is a relative increase, not ten percentage points. At a20% pre-berry chance, common berries give21% normally or23.1% on a match; rare1.15 berries give23% or25.3%; Golden Razz gives26% or28.6%. Existing rarity multipliers remain1.05/1.10/1.15, with Silver Pinap1.20 and Golden Razz1.30.

## Color-inspired affinities
Colors provide a mnemonic, not a claim about canonical Pokémon berry mechanics. Some types use flavor/shape associations where colors overlap.

| Berry | Affinity | Existing multiplier | Matching multiplier |
| --- | --- | ---: | ---: |
|Oran|Water|1.05|1.155|
|Aspear|Ice|1.05|1.155|
|Bluk|Dark|1.05|1.155|
|Cheri|Fire|1.05|1.155|
|Chesto|Ghost|1.05|1.155|
|Leppa|Fighting|1.05|1.155|
|Nanab|Flying|1.05|1.155|
|Pecha|Fairy|1.05|1.155|
|Pinap|Electric|1.05|1.155|
|Rawst|Grass|1.05|1.155|
|Wepear|Poison|1.05|1.155|
|Lum|Dragon|1.10|1.210|
|Persim|Normal|1.10|1.210|
|Sitrus|Electric|1.10|1.210|
|Aguav|Bug|1.15|1.265|
|Figy|Rock|1.15|1.265|
|Iapapa|Ground|1.15|1.265|
|Mago|Psychic|1.15|1.265|
|Razz|Fire|1.15|1.265|
|Wiki|Ghost|1.15|1.265|
|Silver Pinap|Steel|1.20|1.320|
|Golden Razz|Fire|1.30|1.430|

## Balance checks
110,110 numerical combinations across22berries,1,001base chances and5other-modifier values show no probability decrease, no cap violation, and no extra stacking for dual types (matching is one boolean). Largest observed absolute increase before/at the cap: 7.722 percentage points. This verifies arithmetic bounds, not long-term economy balance or a hosted catch.

## Required implementation
Use the encounter's canonical form types, not only its Pokédex number. Current settlement sends a context object without form types, and the read-side encounter context does not pass that object. Update both consistently, then use the same server-derived type match in the chance helper and simulation. Verify regional forms, disabled berries, dual types, missing mappings, cap/guarantee behavior, existing coin bonuses, and exact rollback with fictional local records before any production activation. Catalog descriptions must publish with the mechanics, never advertise an uninstalled bonus.

No encounter, player mutation, catalog update or gameplay activation has run for this proposal.
