# KANTO v1.0 — COMPLETE POKÉMON / FORM IMPLEMENTATION AUDIT

Generated: 2026-09-18 (read-only). Commit `a283bf2`. APP_BUILD 20260918-rc19 / SPRITE_BUILD 20260918-org1 / LOCATION_BUILD 20260916-loc1.

## Verdict

**KANTO POKÉMON / FORM IMPLEMENTATION NOT SAFE**

Staff reset recommendation: **KEEP STAFF RESET PAUSED**

Primary release blockers:
1. Post-Kanto species (Dex >151) are structurally eligible for ordinary random encounters (`spawn_pick_random_dex` / `spawn_species_eligible` capped at 1025). Structural post-Kanto ordinary candidates: **775**. Expected for Kanto v1.0: **0**.
2. Non-base Gen-1-origin forms are catalogued as assets but are **not event-ready**: no `PokemonFormId` identity in production DB; Special Events / Admin / `launch_community_round` are **species (dex) + shiny/gender variant only**.
3. `kanto_availability_json()` acquisition model is `v2-national` (nationalDexMax 1025), not a frozen Kanto-only 146+5 roster view.

## BASELINE

- APP_BUILD: 20260918-rc19
- SPRITE_BUILD: 20260918-org1
- LOCATION_BUILD: 20260916-loc1
- Commit: a283bf24614b8b9ccde93e3fb0a8c381b05e3386
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
- Phase 10 structure 146 + 5 verified: **YES** (structural). Authority: `public.species.is_legendary` / `mythical` + `private.spawn_species_eligible(..., allow_special=false)` + `private.spawn_band` LEGENDARY/EVENT + `launch_community_round` SPECIAL_EVENT gate.
- Transient note: effective eligibility can drop one ordinary species when it is the most recent spawn (`sameAsLastMultiplier`); observed Caterpie #10 temporarily excluded — not a roster hole.

### Phase 10 five

| Dex | Species | Ordinary eligible | Special path | Form used |
|-----|---------|-------------------|--------------|-----------|
| 144 | Articuno | FALSE | SPECIAL_EVENT | BASE only (dex) |
| 145 | Zapdos | FALSE | SPECIAL_EVENT | BASE only (dex) |
| 146 | Moltres | FALSE | SPECIAL_EVENT | BASE only (dex) |
| 150 | Mewtwo | FALSE | SPECIAL_EVENT | BASE only (dex) |
| 151 | Mew | FALSE | SPECIAL_EVENT | BASE only (dex) |

Galarian birds / Mega Mewtwo X/Y cannot contaminate these events today because events cannot select forms — they only pass `dex`. Galarian forms remain ASSET_ONLY.

## NORMAL ENCOUNTER AUTHORITY

- Candidate species (structural ordinary, dex 1–151 excl. legend/mythic): **146**
- Candidate non-base forms: **0** (PASS)
- Candidate species dex >151 (structural ordinary): **775** (FAIL vs Kanto v1.0 expected 0)
- Authority: `private.spawn_pick_random_dex` → `species.dex between 1 and 1025` + `spawn_species_eligible` (legendary/mythical auto off via `allowLegendaryAuto=false`)
- Spawn variants: `normal` / `shiny` / `female` / `shiny-female` only — never Mega/regional/Gmax form_keys
- PASS/FAIL: **FAIL** (all-generation safety)

## NON-BASE FORMS (85)

- Total: 85
- Event-ready: 0
- Asset-only: 85
- Normal encounter enabled: 0 (EXPECTED 0)
- Broken: 0

### MEGA

- Total assets: 19
- Event-ready: 0
- Asset-only: 19
- Normal encounters: 0
- Broken: 0

### REGIONAL

- Alolan: 18
- Galarian: 11
- Hisuian: 4
- Other regional/Totem/Paldean: 2
- Event-ready: 0
- Asset-only: 35
- Normal encounters: 0

### GIGANTAMAX

- Total assets: 12
- Event-ready: 0
- Asset-only: 12
- Normal encounters: 0

### Why not EVENT_READY

- `public.species_forms` has no `PokemonFormId` column (keys: dex, form_key, kind, gender, shiny, source_set, filename, enabled_in_play).
- Organized Showdown import enabled **base** fronts only (`enabled_in_play=true`, form_key=base).
- Leftover SWSH form_key rows (caps/alolan/galarian/gmax) exist with `enabled_in_play=false` and are still not addressable as distinct encounter identities.
- `private.special_events` columns: `dex` + `variant_policy` (NORMAL_ROLL / DISABLED / FORCED_SHINY) — **not form-aware**.
- Client `playSpriteStem` **refuses** mega/alolan/galarian/hisuian/paldea/gmax/totem/cap/costume kinds and falls **back** to base normal/shiny (never falls forward).

## CONTROLLED FORM RESOLUTION TESTS

| Form | Asset | Server form ID | Admin | Event | Normal spawn | Classification |
|------|-------|----------------|-------|-------|--------------|----------------|
| Mega Venusaur (FormId 10033) | true | false | FALSE | FALSE | FALSE | ASSET_ONLY |
| Mega Charizard X (FormId 10034) | true | false | FALSE | FALSE | FALSE | ASSET_ONLY |
| Mega Charizard Y (FormId 10035) | true | false | FALSE | FALSE | FALSE | ASSET_ONLY |
| Mega Clefable (FormId 10278) | true | false | FALSE | FALSE | FALSE | ASSET_ONLY |
| Alolan Raichu (FormId 10100) | true | true | FALSE | FALSE | FALSE | ASSET_ONLY |
| Hisuian Growlithe (FormId 10229) | true | false | FALSE | FALSE | FALSE | ASSET_ONLY |
| Galarian Ponyta (FormId 10162) | true | true | FALSE | FALSE | FALSE | ASSET_ONLY |
| Galarian Mr. Mime (FormId 10168) | true | false | FALSE | FALSE | FALSE | ASSET_ONLY |
| Gigantamax Gengar (FormId 10202) | true | true | FALSE | FALSE | FALSE | ASSET_ONLY |
| Paldean Tauros (FormId 10250) | true | false | FALSE | FALSE | FALSE | ASSET_ONLY |
| Galarian Articuno (FormId 10169) | true | false | FALSE | FALSE | FALSE | ASSET_ONLY |
| Mega Dragonite (FormId 10281) | true | false | FALSE | FALSE | FALSE | ASSET_ONLY |
| Mega Mewtwo X (FormId 10043) | true | false | FALSE | FALSE | FALSE | ASSET_ONLY |
| Mega Mewtwo Y (FormId 10044) | true | false | FALSE | FALSE | FALSE | ASSET_ONLY |
| Pikachu costume (Rock-Star / 10080) | true | false | FALSE | FALSE | FALSE | ASSET_ONLY |
| Pikachu cap (Original-Cap / 10094) | true | true | FALSE | FALSE | FALSE | ASSET_ONLY |

## PIKACHU FORMS

Total Pikachu rows in Gen-1 CSV: 17

| PokemonFormId | Form | Front | Shiny | Female | DB | Resolver | Admin | Event | Normal | Obtainable | Class |
|---------------|------|-------|-------|--------|----|----------|-------|-------|--------|------------|-------|
| 25 | Base | true | true | true | true | true | true | true | true | true | BASE_NORMAL |
| 10080 | Rock-Star | true | true | false | false | false | false | false | false | false | ASSET_ONLY |
| 10081 | Belle | true | true | false | false | false | false | false | false | false | ASSET_ONLY |
| 10082 | Pop-Star | true | true | false | false | false | false | false | false | false | ASSET_ONLY |
| 10083 | Phd | true | true | false | false | false | false | false | false | false | ASSET_ONLY |
| 10084 | Libre | true | true | false | false | false | false | false | false | false | ASSET_ONLY |
| 10085 | Cosplay | true | true | false | false | false | false | false | false | false | ASSET_ONLY |
| 10094 | Original-Cap | true | true | false | true | false | false | false | false | false | ASSET_ONLY |
| 10095 | Hoenn-Cap | true | true | false | true | false | false | false | false | false | ASSET_ONLY |
| 10096 | Sinnoh-Cap | true | true | false | true | false | false | false | false | false | ASSET_ONLY |
| 10097 | Unova-Cap | true | true | false | true | false | false | false | false | false | ASSET_ONLY |
| 10098 | Kalos-Cap | true | true | false | true | false | false | false | false | false | ASSET_ONLY |
| 10099 | Alola-Cap | true | true | false | true | false | false | false | false | false | ASSET_ONLY |
| 10148 | Partner-Cap | true | true | false | true | false | false | false | false | false | ASSET_ONLY |
| 10158 | Starter | true | true | false | false | false | false | false | false | false | ASSET_ONLY |
| 10160 | World-Cap | true | true | false | false | false | false | false | false | false | ASSET_ONLY |
| 10199 | Gigantamax | true | true | false | true | false | false | false | false | false | ASSET_ONLY |

Normal Kanto Pikachu continues as BASE only.

## FEMALE

- Asset-supported base FrontFemale: 22 → [3, 12, 19, 20, 25, 26, 41, 42, 44, 45, 64, 65, 84, 85, 97, 111, 112, 118, 119, 123, 129, 130]
- Gameplay-supported (`female_visual_dex` ∩ 1–151): 22 → [3, 12, 19, 20, 25, 26, 41, 42, 44, 45, 64, 65, 84, 85, 97, 111, 112, 118, 119, 123, 129, 130]
- Asset-only female visuals (base): none
- Gameplay-only (no CSV FrontFemale): none
- Discrepancies: **none** between CSV FrontFemale BASE set and current gameplay female visuals for Kanto.

## SHINY

- Base Front Shiny (matrix): 151/151
- Base Back Shiny (matrix): 151/151
- Play Front Shiny deployed (base): 151/151
- Non-base Front Shiny (matrix): 85/85
- Non-base Back Shiny (matrix): 82/85
- Backs are library-only (not selectable / not in play stems).

## EVENT ENGINE

- Species+form aware: **NO** (species/dex only + shiny policy)
- Mega Dragonite safe as distinct event: **NO** — would launch base Dragonite #149
- Galarian Articuno safe as distinct event: **NO** — would launch base Articuno #144
- Gigantamax Gengar safe as distinct event: **NO** — would launch base Gengar #94
- Pikachu costume safe as distinct event: **NO** — would launch base Pikachu #25
- Architectural limitation: no form identity column on `special_events`, rounds, or catches beyond visual `variant` ∈ {normal,shiny,female,shiny-female}.

## ADMIN

- Base targetable: **YES** (dex 1–national max via PLAY_SPECIES / playDexExists)
- Non-base targetable: **NO** (UI and server accept dex only; art resolves base)
- UI support for forms: **NO**
- Server support for PokemonFormId: **NO**
- Note: Admin can target post-151 base species after national roster rollout (related to all-gen safety FAIL).

## POKÉDEX

- Kanto required entries (UI `kanto.total`): **151**
- Non-base required: **0**
- National total now tracks PLAY_VARIANTS size (~1010+), separate from Kanto 151
- Forms do not add Kanto completion slots: **PASS**
- Caveat: national Pokédex expansion is live; Kanto-only completion still 151 species.

## EVOLUTION

- Enabled evolution_rules: 72
- Routes to dex >151: 0
- Formish mega/alola/galar/hisui/gmax notes/methods: 0
- Accidental form evolution routes: **PASS** (none found)

## MASTERY

- `public.species_mastery` keyed by `(user_id, dex)` only — **species-level**, not form-level.
- Forms do not create separate mastery rows.

## DATABASE TABLES (availability-related)

| Table/view | Purpose | Form-aware | Controls normal | Controls special | Controls admin |
|-----------|---------|------------|-----------------|------------------|----------------|
| public.species | Roster, weights, legendary/mythical flags | No (dex) | Yes | Indirect (flags) | Yes (picker source) |
| public.species_forms | Sprite/form catalog rows | form_key (no FormId) | No (enabled base only used for catalog) | No | No |
| private.spawn_* helpers | Ordinary encounter selection | No | Yes | Via allow_special | No |
| private.special_events | Event definitions | No (dex + variant_policy) | Blocks normal when LIVE | Yes | Admin commands |
| private.launch_community_round | Encounter instantiation | No | Yes | Yes | Yes |
| private.kanto_availability_json | Availability snapshot | No | Reporting (now national) | Reporting | No |
| private.female_visual_dex | Female art eligibility | No | Visual only | Visual only | No |
| public.evolution_rules | Evo graph | No | No | No | Indirect |
| public.species_mastery | Mastery points | No (dex) | No | No | No |
| public.catches | Owned Pokémon | variant shiny/gender only | No | No | No |

Mixed model: **asset-driven play stems** + **database-driven spawn eligibility** + **code-driven form refusal**.

## ALL-GENERATION SAFETY

- Asset maximum Dex (matrix): 1021
- DB species maximum Dex: 1021
- Play PLAY_VARIANTS max: 1021
- Kanto gameplay intended max: 151
- >151 normal encounter species: **775**
- PASS/FAIL: **FAIL**

## CLASSIFICATION COUNTS (236 Gen-1-origin rows)

- BASE_NORMAL: 146
- BASE_SPECIAL: 5
- EVENT_READY: 0
- ASSET_ONLY: 85
- BROKEN: 0

## RELEASE BLOCKERS

1. **Post-Kanto ordinary spawn exposure** (775 species) — violates Kanto v1.0 all-generation safety.
2. **National availability model live** while owner audit expects Kanto-frozen 146+5 encounter surface.
3. Non-base forms are **not event-ready** if owner expects controlled Mega/regional/Gmax instantiation without further engineering (reported gap only; not activated).

## NON-BLOCKING FUTURE WORK

- Add PokemonFormId (or equivalent) to species_forms / special_events / rounds if event-ready forms are desired.
- Import optional Front form stems without enabling spawn.
- Decide whether Admin UI should list forms once server supports them.
- Separate form showcase / collection tracking from Kanto 151 completion.
- Reconcile leftover SWSH disabled form_key rows vs Organized CSV FormIds.

## FINAL VERDICT

KANTO POKÉMON / FORM IMPLEMENTATION NOT SAFE

## STAFF RESET GATE

KEEP STAFF RESET PAUSED

---

Full matrix: `docs/audits/pokemon-form-implementation-audit.csv` (236 rows).

Audit performed read-only. No gameplay, spawn, form flags, events, evolution, Pokédex, mastery, sprites, schema, Admin UI, APP_BUILD, or SPRITE_BUILD mutations.