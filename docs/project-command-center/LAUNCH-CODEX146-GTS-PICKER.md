# CODEX-146 — Consistent GTS Pokémon search

Actual GTS picker search omitted Pokédex numbers even though My PC supports them. Added numeric, padded and #prefixed terms to the existing local filter. Names, nicknames, gender, shiny and duplicate filtering remain supported. Missing dex values do not acquire a fictional zero. Eligibility, selection, RPC arguments and server authority are unchanged.

Empty copy now distinguishes a search with no matches, no duplicate Pokémon, and no eligible Pokémon. Searching no longer tells a trainer to catch more merely because the entered text has no match.

Validation: 12 LOCAL actual-render-function cases, including baseline numeric-search failure before the fix; 107/107 non-writing regression suites; build31HTML/464references. Isolated REAL BROWSER actual controller with fictional reads confirms #025 returns Pikachu only and a failed search displays the corrected message. Network and mutations blocked; no listing, offer, trade, Auth, SQL, provider, reward or APP action. Private fixture and screenshots: LOCALAPPDATA/PokemonStreamLink/security/codex146.

Exact two-runtime-file publication under CODEX-78 follows separately. Sora NO; Twinkle NO; PlayTester unchanged. Broader site-wide inspection and required real-device/provider acceptance remain open.
