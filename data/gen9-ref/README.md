# Offline Gen IX reference pin

**Do not apply this data to live Supabase from this folder.** Seed SQL lives in `supabase/unapplied/a19-ref/` and is review-only.

| Field | Value |
|---|---|
| content_build | sl-ref-20261013-227b573 |
| ruleset | streamlink-gen9-xgen |
| upstream | https://github.com/PokeAPI/pokeapi/commit/227b573712414a86ba299d322fa398fbb2893edc |
| docs | https://pokeapi.co/docs/v2 |
| roster | Kanto 1–151 + catalog forms from `data/pokemon-forms-seed.json` |
| runtime network | never |

## Rebuild

```
node tools/build-gen9-ref.js
node tests/gen9-ref-tests.js
```

Downloads CSVs into `tools/.cache/pokeapi/227b573712414a86ba299d322fa398fbb2893edc/` (gitignored). Tests read only `data/gen9-ref/`.

## Resolution

1. Use `scarlet-violet` learnset rows for **that form id** if any exist.
2. Else use `sword-shield` only if **that form** has SWSH rows.
3. Else use a kind-specific historical group (Alola → USUM/SM/LGPE, Mega → ORAS/XY, Hisui → Legends Arceus, Gmax → SWSH) **only if that form has rows**.
4. Else `unresolved`. Never invent Tackle. Never copy the base form's learnset onto Mega/regional/Gmax/costume forms.

Wild slices may use **level-up** moves at or below the encounter level from the chosen group only.

## Counts (this build)

See `coverage.json`. Forms: 236. Resolved learnsets: 220. Unresolved: 16.
