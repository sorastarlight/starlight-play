# Gift categories, candy identity and artwork - CODEX-6

Owner requested separate Trainer ID and Pokémon team backgrounds; separate Items, PokéCoins and Inventory Space; dedicated candy/ribbon confirmation art; and an explanation of existing candy/Oak behavior. Current publication authorization applies.

## UI changes

Gift types now separate Items, PokéCoins, Inventory Space, Trainer ID Backgrounds, Pokémon Team Backgrounds and Trainer ID Frames. Filtered choices preserve the existing audited server actions: coins/space map to item with fixed keys, appearance categories map to cosmetic. No backend contract or grant semantics changed.

Candy selection shows one entry per family and uses existing dedicated local candy PNGs. Search still accepts evolved species/name/dex, resolving Charizard to Charmander Evolution Candy. Confirmation and history use the family name. Ribbons use the existing catalog/map/helpers and local PNGs, including legacy badge IDs; no placeholder star when mapped artwork exists. Fixture ownership is synthetic; historical misleading Gym Badge fixture entries corrected to achievement ribbons.

## Live read-only candy audit

Catalog SELECT and function-definition reads only; no gameplay RPC invoked. All 151 Kanto species have family membership, grouped into 79 candy families (54 with enabled evolution rules). All 151 local presentation mappings match live family IDs, zero mismatches. Dedicated PNG files exist for every mapped family. Singleton family candy does not invent an unavailable evolution.

Charmander #4, Charmeleon #5 and Charizard #6 all have family_id=4 and family_candy_species_id=4. Current play_transfer_oak resolves that family and pays by evo_stage: 1/2/3; shiny OR alpha adds one, with a further one at every 50 transfers of that species. Therefore an eligible ordinary duplicate Charizard pays 3 Charmander Evolution Candy. Transfers remain blocked for last owned copy, team membership, favorites/locks or open listings. No transfer was executed for this audit.

Current admin_grant_candy also resolves the selected dex to the family before granting; the former Charizard wording was a UI error, not a separate Charizard balance. private.evolve_catch spends rule.family_id from the same family_candy balance. Enabled Charmander->Charmeleon rule costs 40, Charmeleon->Charizard costs 80. Other eligibility requirements remain unchanged.

Comparison: [Pokémon GO official help](https://scopelyexplore.helpshift.com/hc/en/5-pokemon-go/faq/1121-powering-up-pokemon/) documents one candy type per evolutionary family, earned from any stage. [Let’s Go official overview](https://pokemonletsgo.pokemon.com/en-us/pokemon-go/) describes candy as stat boosts and Oak transfer rewards; its species candy is not the evolution-payment mechanic used here. [Let’s Go candy reference](https://www.serebii.net/letsgopikachueevee/candy.shtml) lists Charmander Candy and its stat-boost effect. Our evolution currency follows the shared-family approach; amounts/costs are this game's settings.

## Evidence and limits

72 non-writing suites/build pass, including 14 reward UI checks for category filtering/payloads, mapped ribbon PNGs, all candy artwork and family naming across stages. REAL DOM sanitized fixture: separated types, Charizard search resolves Charmander candy, candy and Alert Ribbon PNGs visibly render in confirmation. No live gift or account mutation. No schema/gameplay/D86/activation/stamp/spending. Sora/Twinkle/PlayTester/PlayerQA NO; staff roles unverified. Authenticated real grant and owner visual acceptance remain open. APP rc133, 395 stamps. Publication evidence in introducing Git commit and Pages run; hard refresh existing admin tab.
