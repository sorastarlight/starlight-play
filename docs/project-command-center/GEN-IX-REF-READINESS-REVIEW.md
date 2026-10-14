# A19-REF readiness review (GitHub issue #21)

**Authorized:** offline review / research / fixtures / unapplied SQL proposals on `admin-hub-overhaul`.  
**Not authorized:** A19-SCHEMA, live SQL, generator, catch writes, reset, merge, deploy.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**.

Pin under review: `data/gen9-ref/` `sl-ref-20261013-227b573` (issue #20 / `89dac99`).  
Coverage **unchanged:** 220 resolved / 16 unresolved. Proposals below are **not** applied to the pin (`authorized: false`).

| Honesty | Used |
|---|---|
| STATIC | Unapplied SQL, pin JSON, migrations lockdown pattern |
| LOCAL HARNESS | `tests/gen9-ref-tests.js`, `tests/gen9-ref-readiness-tests.js` |
| REFERENCE | Official SWSH Gigantamax press release; Bulbapedia friendship lists; PokéAPI VG `champions`; Champions/Z-A ability write-ups |
| NOT RUN | Connected SQL, catch-row SELECT, PRODUCTION |

---

## 1. Gigantamax (12) — no own learnset ≠ no valid moves

Official Sword/Shield: Gigantamax is a **battle-only** Dynamax variant. Appearance and height change; Ability and non-HP stats stay the same; the Pokémon **keeps its existing moves**; moves of one type become a species G-Max Move.

Sources:

- [TPC press, 2019-07-08](https://press.pokemon.com/en/GIGANTAMAX-A-PHENOMENON-THAT-CHANGES-SIZE-AND-APPEARANCE-OF-POKEMON-RE) — size/appearance change; unique G-Max Move from a typed move; only rare specimens of certain species can Gigantamax.
- [Bulbapedia: Gigantamax](https://bulbapedia.bulbagarden.net/wiki/Gigantamax) — functionally Dynamax plus a species G-Max Move; Ability unchanged.

PokéAPI pin: each Gmax id is a separate `pokemon` row with **zero** `pokemon_moves` rows. The #20 resolver therefore left them unresolved. That is correct as a *per-id* fail-closed. It is **not** evidence that a Gmax Charizard cannot know Flamethrower.

### Matrix (from the pin)

| form_id | Dex | Species | Own rows | Base id | Base VG | Stats=base | Types=base | Abilities=base | Height |
|---|---|---|---|---|---|---|---|---|---|
| 10195 | 3 | Venusaur | 0 | 3 | scarlet-violet | yes | yes | yes | 24 vs 2 |
| 10196 | 6 | Charizard | 0 | 6 | scarlet-violet | yes | yes | yes | 28 vs 1.7 |
| 10197 | 9 | Blastoise | 0 | 9 | scarlet-violet | yes | yes | yes | 25 vs 1.6 |
| 10198 | 12 | Butterfree | 0 | 12 | sword-shield | yes | yes | yes | 17 vs 1.1 |
| 10199 | 25 | Pikachu | 0 | 25 | scarlet-violet | yes | yes | yes | 21 vs 0.4 |
| 10200 | 52 | Meowth (Kantonian) | 0 | 52 | scarlet-violet | yes | yes | yes | 33 vs 0.4 |
| 10201 | 68 | Machamp | 0 | 68 | sword-shield | yes | yes | yes | 25 vs 1.6 |
| 10202 | 94 | Gengar | 0 | 94 | scarlet-violet | yes | yes | yes | 20 vs 1.5 |
| 10203 | 99 | Kingler | 0 | 99 | sword-shield | yes | yes | yes | 19 vs 1.3 |
| 10204 | 131 | Lapras | 0 | 131 | scarlet-violet | yes | yes | yes | 24 vs 2.5 |
| 10205 | 133 | Eevee | 0 | 133 | scarlet-violet | yes | yes | yes | 18 vs 0.3 |
| 10206 | 143 | Snorlax | 0 | 143 | scarlet-violet | yes | yes | yes | 35 vs 2.1 |

All 12 Kantonian bases also have `sword-shield` in `exceptions.versionGroupsPresent`. Meowth Gmax is Normal-type Kantonian, not Galarian. Current `levelUpSlice` stays fail-closed (fixture).

### Recommended owner decision (not applied)

**G1 (recommended):** Do not persist Gmax as a distinct wild/grant form. Persist the **base** individual plus an optional later `gigantamax_factor` flag. Learnset = that base’s already-resolved VG. G-Max Moves are battle-only and out of scope until a battle system exists.

**G2:** If a catalog Gmax id must be stored, add an explicit exception `gmax-transform-shares-resolved-base` pointing at the same-dex base form. That is a **documented share of an already-legal set**, not invented Tackle and not a silent inherit onto an unrelated form. Optional tighter variant: force the shared VG to `sword-shield` because Gmax exists only in SWSH (all 12 bases have SWSH rows).

**G3:** Keep Gmax unavailable as a generated/granted form (current pin behavior).

Helper: `tools/lib/gen9-ref-proposals.js` `proposedGmaxLearnset` (`authorized: false`).

---

## 2. Champions / Z-A megas (4)

These four are **new** megas from Pokémon Legends: Z-A, later shown in Pokémon Champions. They are **not** ORAS megas. Z-A has no Ability mechanic (like PLA). Champions later published Ability assignments.

| form_id | Species | Pin types | Pin BST | Pin ability | Champions/Z-A ability reports |
|---|---|---|---|---|---|
| 10278 | Clefable | Fairy/Flying | 95/80/93/135/110/70 | 156 magic-bounce | Magic Bounce |
| 10279 | Victreebel | Grass/Poison | 80/125/85/135/95/70 | 215 innards-out | Innards Out |
| 10280 | Starmie | Water/Psychic | 60/100/105/130/105/120 | 37 huge-power | Huge Power |
| 10281 | Dragonite | Dragon/Flying | 91/124/115/145/125/100 | 136 multiscale | Multiscale |

Sources:

- PokéAPI `GET /version-group/champions/` id **32**, generation-ix, empty `move_learn_methods` (same nuance as SV).
- PokéAPI also has `legends-za` (30) and `mega-dimension` (31). The #20 resolver tried ORAS/XY, not those groups.
- Pin `exceptions`: each of the four has `versionGroupsPresent: ["champions"]` only. No SV, SWSH, or ORAS rows on **that mega id**.
- Pin `learnsets.json` has **0 rows** for 10278–10281 (unresolved forms are not extracted).
- Base forms are resolved (Clefable/Victreebel/Dragonite SV; Starmie SWSH).
- Ability write-ups: [Kotaku](https://kotaku.com/pokemon-legends-z-a-mega-evolutions-abilities-champions-2000683952), [Game8 Champions](https://game8.co/games/Pokemon-Champions/archives/593733). Official Asia press for Champions Regulation M-C names Z megas, not these four.

Classic Mega Evolution keeps the Pokémon’s current 4 moves. A Champions learnset, if later extracted, is a **battle-sim catalog**, not proof that a StreamLink wild Clefable should be generated as the mega with those rows.

### Recommended owner decision (not applied)

**C1 (recommended):** Keep the mega ids **fail-closed** for wild/grant generation. Persist the **base** individual. Mega stats / types / ability apply only as a later transform. Do **not** fabricate SV or SWSH rows on 10278–10281.

**C2:** If a stored mega row is required, share the **base** form’s already-resolved learnset (`mega-transform-of-base`), same honesty rule as Gmax G2. Still do not treat `champions` as a wild VG without a separate owner exception.

**C3:** Extract `champions` rows in a future pin rebuild and review them as a named historical VG. Blocked on an owner call; not done here.

Unknowns: exact Z-A field learnsets; whether PokéAPI `champions` rows are legal acquire methods or competitive dumps; whether StreamLink will ever persist mega as the stored form.

Helper: `proposedChampionsMega` (`authorized: false`).

---

## 3. Friendship

The pin stores PokéAPI `pokemon_species.base_happiness` and must keep that source value.

| Pin value | Kanto species | Count |
|---|---|---|
| 70 | Default majority | 140 |
| 140 | Clefairy, Clefable, Chansey | 3 |
| 35 | Articuno, Zapdos, Moltres, Dratini, Dragonair, Dragonite | 6 |
| 0 | Mewtwo | 1 |
| 100 | Mew | 1 |

[Bulbapedia: List of Pokémon by base friendship](https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_by_base_friendship): beginning in Generation VIII, every species that had **70** was lowered to **50**, except non-Galarian Stunfisk and Timburr (neither is in Kanto v1). Other values (0 / 35 / 100 / 140) stay.

[Bulbapedia: Friendship](https://bulbapedia.bulbagarden.net/wiki/Friendship): Gen IX still uses the species base value on catch (Friend Ball exception 200). Evolution friendship threshold is 160 from Gen VIII on.

### Recommended owner decision (not applied)

**F1 (recommended):** Keep `pokeapi_base_friendship` as the checked-in pin. At generation time use `streamlink_base_friendship = 50` when the pin is 70, else keep the pin value. Do not rewrite `data/gen9-ref/species.json` or existing catch rows.

Kanto v1 has no Stunfisk/Timburr exception to encode.

Helper: `proposedStreamlinkFriendship` (`authorized: false`).

---

## 4. Unapplied SQL readiness

Reviewed: `supabase/unapplied/a19-ref/001_create_ref_tables.sql`, `002_seed_meta_natures_species.sql`, pin JSON shapes, `public.lgpe_species` (`20260908_letsgo_storage_trade.sql`), and the public-ledger lockdown (`20260916020000_public_ledger_lockdown.sql`).

### Findings on the current #20 SQL

| Topic | Current artifact | Risk |
|---|---|---|
| Schema | Bare `ref_*` → `public` | Supabase Data API exposes `public` |
| RLS | None | Anon/authenticated can read (or mutate) if default grants exist |
| REVOKE | None | Same |
| `content_build` | Only on `ref_meta` | Cannot store two pins; child rows are orphaned from the pin id |
| Unique / PK | `ref_learnsets` has none; `ref_evolutions` has none | Duplicate load / no idempotence |
| `ON CONFLICT` | Seed is plain `INSERT` | Re-run fails |
| Partial seed | meta + natures + species only | Forms/learnsets unseeded; FKs would block a later half-load |
| `lgpe_species` | Untouched (good) | Dual source of truth until A19-WIRE |
| Provenance | Mentioned in pin meta, not in SQL | Should live on `ref_meta` |
| Volume | 14 048 learnset rows | Need COPY / batched INSERT, not one giant VALUES |
| Transaction | `BEGIN`/`COMMIT` | Fine; rollback is the file, not a live savepoint |
| Functions | None | No new `EXECUTE` surface (good). Do not add public SECURITY DEFINER later |

`lgpe_species` is already revoked + RLS’d as public reference. New `ref_*` tables must be at least that strict. Better: put them in **`private`** and never expose that schema on PostgREST.

### Proposed revision (still DO-NOT-APPLY)

`supabase/unapplied/a19-ref-review/001_proposed_secure_ref_tables.sql`

- `private.ref_*` + RLS + `REVOKE ALL` from `public` / `anon` / `authenticated`
- `content_build` on every table (multi-pin coexistence)
- Dual friendship columns
- Composite PKs / uniques
- Example `ON CONFLICT` on `ref_meta`
- Explicit “leave `lgpe_species` in place”

### Ranked A19-SCHEMA blockers

1. **P0 security** — do not create unlocked `public.ref_*`.
2. **P0 integrity** — `content_build` lineage + unique learnset/evolution keys.
3. **P1 load** — idempotent seed strategy; do not apply the partial #20 seed as-is.
4. **P1 dual catalog** — document that `lgpe_species` remains live until A19-WIRE.
5. **P2 policy** — owner G1/C1/F1 (or alternatives) before generator work. Tables can exist without resolving Gmax/mega.

---

## 5. Validation

| Suite | Class | Result |
|---|---|---|
| `tests/gen9-ref-tests.js` | LOCAL HARNESS | existing 12 (pin integrity) |
| `tests/gen9-ref-readiness-tests.js` | LOCAL HARNESS | Gmax matrix, Champions fail-closed, friendship map, SQL gaps |
| `tests/admin-hub-overhaul-tests.js` | STATIC | issue 21 existence |

Pin checksums still match. Resolver still fail-closed. No REAL RPC. No PRODUCTION.

---

## 6. Proposed future A19-SCHEMA scope (needs a new owner approval)

If later approved, and only then:

1. Create `private.ref_*` from the reviewed secure SQL (not the #20 public draft).
2. Seed from `data/gen9-ref/` with `content_build`, dual friendship, and batched learnsets.
3. Do **not** UPDATE `public.catches` or drop `lgpe_species`.
4. Apply G1/C1/F1 only if the owner accepted those policies.
5. No generator, validator, or Data API exposure in that batch.

---

## Stop

A19-SCHEMA remains **UNAPPROVED**. Do not apply either unapplied folder. D22 records this review only.
