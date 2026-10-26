# Current legacy-stat dependency audit

Read-only October26 catalog/source inspection confirms the old CP/AV catch columns are absent, consistent with the previously installed CODEX-42 retirement. Runtime JavaScript search found no active CP/AV/Awakening presentation use. Do not create a second catch-column cleanup proposal for already retired columns.

The unreferenced js/lgpe.js data asset remains in Git. Searches across current HTML/JS/JSON and non-documentation tooling found no PLAY_LGPE or lgpe.js callers outside that asset. It can be considered in the exact obsolete-source cleanup review; it is not loaded by current pages. No source file was removed in this audit.

Four database helpers retain the lgpe prefix: gender_rate, habitat, level_bounds and roll_gender. They contain current Kanto gender ratios, locations, level ranges and gender selection, not CP/AV stat generation. Live callers include encounter_pokemon_level, launch_community_round, public_round_json, Special Events, stamp_catch_row and trade creation, plus the helpers themselves. They are active gameplay dependencies and must not be dropped merely because of their names. Any later renaming/replacement must preserve those meanings and test every caller as a separately scoped change.

The earlier private retirement archives remain available for recovery. This audit authorizes no archive purge, ecology/gameplay change, SQL migration or protected-account action. Current explicit cleanup proposal is the separate one-product catalog packet; current important owner decision is CODEX-273's staff last-sign-in safeguard.
