# Gift picker and review refinement - CODEX-5

Owner requested visual Pokémon selection with name/dex search and generation switching, the same selection for Evolution Candy, accurate ribbon/Gym Badge/cosmetic terminology, public item names, reasons inside confirmation, and a more visual gift review. Existing GitHub publication authorization applies.

## Changes

- Native modal sprite picker shared by Pokémon and Evolution Candy. Partial names, punctuation/accent/gender normalization and exact padded dex numbers (for example #025). Keyboard controls, Escape, focus restoration without scrolling and responsive layout.
- Generation selector reads an explicit released-generation list. Kanto is the only current release; reference species beyond Kanto do not silently enable gifts. Future releases require backend support and an explicit generation range/artwork entry together.
- Existing public playItemLabel/playItemSprite helpers supply item presentation. Pokémon names come from the existing species reference and images from local HOME assets.
- Live read-only catalog inspection confirmed progression_badges contains achievement ribbons; UI calls these Ribbons, preserving storage/API ids. Gym Badges remain separately described as Gym Leader awards with ownership/grants unavailable. No Gym Badge progression was invented.
- Live enabled cosmetics: 28 Trainer ID backgrounds, 67 Pokémon team backgrounds, 1 Trainer ID frame. Selection and review identify kind; Progression uses matching terminology.
- Required staff reason moved from both page forms into an artwork-led review dialog with recipient, gift details, restrained entrance motion and reduced-motion support. Confirmed reason remains bound to the same request UUID, trainer and payload; existing retries/server validation unchanged. Fixture permits review but disables final submission.

## Validation

72 non-writing suites and build validation pass (APP rc133, 388 stamps). Added name/dex/punctuation/gender search, public labels, modal-only reasons and naming regression checks. REAL DOM sanitized fixture: Pokémon #025 -> Pikachu, name search Mr Mime -> #122, selection retained for candy, gift review and Escape/focus restoration. At 390px dialog fits inside viewport without horizontal overflow. Native dialog supplies keyboard focus containment.

This batch changes frontend and records only. Supabase catalog SELECTs only; no schema, reward, Pass or protected-account mutation; no gameplay, D86, activation, APP stamp or spending. Sora NO; Twinkle NO; PlayTester/PlayerQA NO; roles unverified. Authenticated production grant remains untested; owner visual/function review open. Hard-refresh existing Admin Hub tab after publication. Git introducing commit and Pages run provide publication evidence.
