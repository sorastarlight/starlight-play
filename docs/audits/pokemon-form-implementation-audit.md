# KANTO v1.0 — COMPLETE POKÉMON / FORM IMPLEMENTATION AUDIT

Generated: 2026-09-18 (post form-aware). Commit `f5c2a1a`. APP_BUILD 20260918-rc19 / SPRITE_BUILD 20260918-org1 / LOCATION_BUILD 20260916-loc1.

## Verdict

**FORM-AWARE SPECIAL ENCOUNTER / ADMIN PHASE — MATRIX PROVEN**

- Identity: National Dex + PokemonFormId (NULL/dex = BASE). Facing is rendering-only.
- Normal encounters: BASE ordinary 146; BASE special 5; non-base ordinary 0; Dex>151 ordinary 0 (`private.normal_spawn_max_dex()` + BASE firewall).
- Gen-1-origin non-base: 85 → EVENT_READY 85, ASSET_ONLY 0, BROKEN 0.

## BASELINE

- APP_BUILD: 20260918-rc19
- SPRITE_BUILD: 20260918-org1
- LOCATION_BUILD: 20260916-loc1
- Commit: f5c2a1a
- Production: Supabase project `dtflmlbjhttoewqgkujf` / play.sorastarlight.net

## ASSET CATALOG (variant-matrix.csv)

- Total species/form rows: 1283
- Generations: 1, 2, 3, 4, 5, 6, 7, 8, 9
- Gen-1-origin rows: 236
- Base Kanto: 151
- Non-base Kanto-origin: 85

### Non-base form distribution (CSV)

- Alolan: 18
- Mega: 15
- Gigantamax: 12
- Galarian: 11
- Hisuian: 4
- Mega-X: 2
- Mega-Y: 2
- Starter: 2
- Alola-Cap: 1
- Belle: 1
- Cosplay: 1
- Hoenn-Cap: 1
- Kalos-Cap: 1
- Libre: 1
- Original-Cap: 1
- Paldea-Aqua-Breed: 1
- Paldea-Blaze-Breed: 1
- Paldea-Combat-Breed: 1
- Partner-Cap: 1
- Phd: 1
- Pop-Star: 1
- Rock-Star: 1
- Sinnoh-Cap: 1
- Totem: 1
- Totem-Alola: 1
- Unova-Cap: 1
- World-Cap: 1

## BASE 151

- Implemented (species + PLAY_VARIANTS + play Front Base/Shiny): 151/151
- Resolver-valid: 151/151
- Normal encounter (structural, excl. Phase 10 five): 146
- Special encounter: 5
- Unavailable/broken base: 0
- Phase 10 structure 146 + 5 verified: **YES**. Authority: `private.normal_spawn_max_dex()` + legendary/mythical + BASE form firewall + SPECIAL_EVENT / intentional Admin gate.

### Phase 10 five

| Dex | Species | Ordinary eligible | Special path | Form used |
|-----|---------|-------------------|--------------|-----------|
| 144 | Articuno | FALSE | SPECIAL_EVENT | BASE (form_id=144) |
| 145 | Zapdos | FALSE | SPECIAL_EVENT | BASE (form_id=145) |
| 146 | Moltres | FALSE | SPECIAL_EVENT | BASE (form_id=146) |
| 150 | Mewtwo | FALSE | SPECIAL_EVENT | BASE (form_id=150) |
| 151 | Mew | FALSE | SPECIAL_EVENT | BASE (form_id=151) |

Existing Phase 10 events remain BASE. Galarian birds / Mega Mewtwo are separately EVENT_READY and require explicit form targeting.

## NORMAL ENCOUNTER AUTHORITY

- Candidate species (structural ordinary, dex 1–151 excl. legend/mythic): **146**
- Candidate non-base forms: **0** (PASS)
- Candidate species dex >151 (structural ordinary): **0** (PASS; `normal_spawn_max_dex()`)
- Authority: `private.spawn_pick_random_dex` capped by `private.normal_spawn_max_dex()` + BASE form forced on AUTO
- Spawn variants: `normal` / `shiny` / `female` / `shiny-female` only — never Mega/regional/Gmax form_keys
- PASS/FAIL: **PASS**

## NON-BASE FORMS (85)

- Total: 85
- Event-ready: 85
- Asset-only: 0
- Normal encounter enabled: 0 (EXPECTED 0)
- Broken: 0

### MEGA

- Total assets: 19
- Event-ready: 19
- Asset-only: 0
- Normal encounters: 0
- Broken: 0

### REGIONAL

- Alolan: 18 (EVENT_READY 18)
- Galarian: 11 (EVENT_READY 11)
- Hisuian: 4 (EVENT_READY 4)
- Other regional/Totem/Paldean: 2
- Normal encounters: 0

### GIGANTAMAX

- Total assets: 12
- Event-ready: 12
- Asset-only: 0
- Normal encounters: 0

## FORM-AWARE ENGINE

- Catalog: `public.pokemon_forms` (PokemonFormId PK)
- Round / catch / special_events columns: `pokemon_form_id`
- Launch: `private.launch_community_round(..., p_form_id)` + `private.assert_form_launchable`
- Client: `js/forms.js` + `playSpriteStem(dex, variant, formId)` → `forms/{id}`
- Facing Front/Back: rendering only; Back never selectable as form

## CLASSIFICATION COUNTS (236 Gen-1-origin rows)

- BASE_NORMAL: 146
- BASE_SPECIAL: 5
- EVENT_READY: 85
- ASSET_ONLY: 0
- BROKEN: 0

## FINAL VERDICT

FORM-AWARE MATRIX PROVEN (146 BASE_NORMAL / 5 BASE_SPECIAL / 85 EVENT_READY / 0 BROKEN / 0 non-base normal)

---

Full matrix: `docs/audits/pokemon-form-implementation-audit.csv` (236 rows).