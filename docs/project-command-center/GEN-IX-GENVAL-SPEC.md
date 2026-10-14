# A19-GENVAL specification (planning only)

Parent: epic [#18](https://github.com/sorastarlight/starlight-play/issues/18). Tracking: [#25](https://github.com/sorastarlight/starlight-play/issues/25). Architecture: D17, D18, D19 (Q1–Q6), D24 (G1/C1/F1). Schema live: D35.

**Verdict: SPEC READY. A19-GENVAL implementation remains UNAPPROVED.**

This document specifies `private.generate_streamlink_mon` and `private.assert_streamlink_legal` plus an offline synthetic test plan. It does **not** create those functions, apply SQL, wire launch/settle/grant/evolve, or touch Pokémon rows.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.

| Honesty | Used |
|---|---|
| STATIC | Unapplied `a19-schema` artifacts, pin `data/gen9-ref/`, #19 plan, D35 report, `stamp_catch_row` |
| LIVE CATALOG | `list_migrations` on `dtflmlbjhttoewqgkujf` (names only). **No** catch-row SELECT |
| LOCAL HARNESS | Pin loader + level-up slice vs fixture matrix |
| NOT RUN | Function CREATE, RPCs, WIRE, restore, PRODUCTION smoke |

---

## 1. Production vs GitHub artifacts (reconcile — no reapply)

Project: `dtflmlbjhttoewqgkujf` / starlight-play. Pin: `sl-ref-20261013-227b573`. Checksums of `001` / `002` / seed files unchanged since #23 `cc66946b` (same hashes as D35).

### 1.1 Named remote migrations (LIVE CATALOG)

These five `a19_apply_*` rows are present and are still the newest:

| Version | Name | GitHub source |
|---|---|---|
| `20261014155507` | `a19_apply_001_private_ref_tables` | `supabase/unapplied/a19-schema/001_private_ref_tables.sql` |
| `20261014155521` | `a19_apply_seed_00_meta` | `seed/00_meta.sql` |
| `20261014155536` | `a19_apply_seed_01_natures` | `seed/01_natures.sql` |
| `20261014155717` | `a19_apply_seed_04_abilities` | `seed/04_abilities.sql` |
| `20261014165331` | `a19_apply_002_catches_nullable_extensions` | `002_catches_nullable_extensions.sql` |

Latest pre-apply migration remains `20261011024514_gate_2a_r_identity_inspect_true_read`. No later `a19_*` row exists. Nothing named `generate_streamlink_mon` / `assert_streamlink_legal` is in remote history or `supabase/migrations/`.

### 1.2 Seeds applied but not named as migrations

D35 applied these with `execute_sql` (ON CONFLICT). They are **not** in `supabase_migrations`:

`02_species`, `03_forms`, `05_form_abilities`, `06_moves`, `07_learnsets` (parts 00–35), `08_evolutions`, `09_obtain`, `10_form_policies`.

GitHub `seed/manifest.json` still has `appliedToSupabase: false` because those files were never copied into `supabase/migrations/`. That flag describes the **branch artifact**, not live catalog counts.

Expected live counts (D35, not re-counted this batch): 25 / 151 / 236 / 135 / 576 / 556 / 14048 / 88 / 236 / 16.

### 1.3 Dual catalogs that must coexist

| Live path | Role now | GENVAL | WIRE |
|---|---|---|---|
| `private.stamp_catch_row` | **Active** generator (md5 IVs, `lgpe_pick_moves`, friendship 0) | Must **not** be replaced | First caller of generate+assert |
| `public.lgpe_species` | Stamp/stat source | Unused by generate | Keep until WIRE |
| `private.ref_*` | Loaded, RLS fail-closed, PostgREST `PGRST106` | Read-only input | Same |
| New `catches` columns | All NULL on existing rows | Not written | Filled on **new** rows only |
| Legacy `iv_*`, `av_*`, `moves text[]`, `friendship` | Still written by stamp | Specimen may *preview* dual-write fields | Dual-write mapping |

Do **not** reapply `001`/`002`/seeds. Do **not** run `003_rollback.sql`.

---

## 2. Locked policies (do not reopen)

| ID | Rule GENVAL must implement |
|---|---|
| D17 | StreamLink-internal Gen IX (`scarlet-violet`) mechanics + version-pinned cross-gen data. Not HOME/cartridge legality. |
| D19 Q1 | **Per-catcher IVs and Natures.** Shared round context is species/form/level/shiny, not cloned combat identity. `#19`’s shared-specimen recommendation is **superseded**. |
| D19 Q2 | Hidden ability only when an authorized event/grant sets `p_allow_hidden`. Ordinary generate/catch: slots `1`/`2` only. |
| D19 Q4 | Learnset VG = form pin: SV if that form has SV rows, else SWSH only if that form has SWSH rows, else a documented historical VG. Never invent moves. Never copy base onto Mega/regional/Gmax. |
| D19 Q5 | `hp_current = hp_max`, `status = null`. |
| D19 Q6 | Sora/Twinkle excluded from tests and any future reset unless a later protected-account go. |
| D24 G1 | Form ids `10195–10206` are not wild/grant individuals. Persist base later; `gigantamax_factor` unused until a later phase. Unresolved learnsets fail closed. |
| D24 C1 | Form ids `10278–10281` fail closed for wild/grant. Persist base; Mega is a later transform. No invented SV/SWSH rows. |
| D24 F1 | Generation friendship = `ref_species.streamlink_base_friendship` (70→50 already derived in seed). Do not rewrite pin JSON or old rows. |
| D35 | Functions read live `private.ref_*`. No player-row writes in the GENVAL phase. |

Production `ref_obtain` for the 16 G1/C1 ids is fully disabled (`enabled` and all targetable flags **false**), even though `data/gen9-ref/obtain.json` still lists some as `adminTargetable`. Runtime and tests must honor **seed `09` + `10`**, not the raw pin obtain row, for those ids.

---

## 3. `private.generate_streamlink_mon`

Proposed signature (implementation later; not created now):

```
private.generate_streamlink_mon(
  p_form_id integer,
  p_level integer,
  p_ctx text,                 -- generate | catch | grant | event | rebuild
  p_seed text,                -- catcher-unique entropy; MUST NOT be round_id alone
  p_allow_hidden boolean default false,
  p_shiny boolean default false,
  p_content_build text default 'sl-ref-20261013-227b573'
) returns jsonb
```

`SECURITY DEFINER`, `REVOKE ALL` from `public`/`anon`/`authenticated`. No PostgREST grant. No `admin_overview`. Fail closed: unknown form, unresolved learnset, G1/C1 form id, obtain mismatch, bad ctx, missing seed, Mareep/out-of-roster dex.

### 3.1 Shared vs per-catcher (Q1)

| Field | Source | Shared on a community round? |
|---|---|---|
| dex, form_id | Encounter / grant argument | Yes |
| level | Existing `encounter_pokemon_level` (WIRE passes it in) | Yes |
| shiny | Existing 1/4096 round roll (WIRE passes it in) | Yes |
| IVs (6× 0–31) | Independent rolls from `p_seed \|\| stat` | **No — per catcher** |
| nature_id (1–25 uniform) | Roll from `p_seed \|\| 'nature'` | **No — per catcher** |
| gender | Pin `gender_rate` + `p_seed` (or forced form gender) | **No — per catcher** (matches today’s stamp) |
| ordinary ability slot | Uniform among non-hidden slots that exist | **No — per catcher** |
| hidden ability | Forbidden unless `p_allow_hidden` and ctx is `grant`/`event` | Never ordinary |
| move slice | Last ≤4 **level-up** moves with `level <= p_level` from the form’s **resolved** VG | Yes (deterministic from form+level) |
| EVs | All 0 | Yes |
| friendship | `streamlink_base_friendship` | Yes |
| held_item | null | Yes |
| gigantamax_factor | null / false; not set by ordinary generate | Yes |
| ruleset_id | `streamlink-gen9-xgen` | Yes |
| content_build | Pin id | Yes |

WIRE must pass a **catcher-unique** `p_seed` (catch uuid, or catch uuid + round id). Using only `round_id` would clone IVs/Natures and violate D19 Q1.

### 3.2 Abilities

1. Load `ref_form_abilities` for `(content_build, form_id)`.
2. Ordinary: candidate slots `{1, 2}` that exist. If only slot `1` exists (Bulbasaur, Charizard, many Kanto), always that slot.
3. Hidden: include slot `hidden` **only** when `p_allow_hidden` is true **and** `p_ctx ∈ {grant, event}` **and** the form has a hidden row **and** obtain allows that channel.
4. Else fail (`hidden-not-authorized` / `no-legal-ability`).
5. Store `ability_id` + `ability_slot` (`'1'` / `'2'` / `'hidden'`).

Grant must **not** accept a caller-supplied ability/IV/nature. Those come from generate.

### 3.3 Moves, level, EVs, HP

- Level ∈ 1–100. Generate does not pick habitat level; the caller passes it.
- Moves: `tools/lib/gen9-ref.js` `levelUpSlice` is the offline oracle (already: SV Bulbasaur lv5 = Tackle / Growl / Vine Whip; Charizard lv36 = Dragon Breath / Fire Fang / Slash / Flamethrower). SQL must match that VG+method+order. **Never invent Tackle.** Fewer than 4 is legal.
- Each slot: `{moveId, pp, ppMax, method, versionGroup}` with `pp = ppMax` from `ref_moves`.
- EVs all 0 (sum 0 ≤ 510).
- Stats / `hp_max` use Gen IX:

```
HP  = floor((2*B + IV + floor(EV/4)) * L / 100) + L + 10
oth = floor((floor((2*B + IV + floor(EV/4)) * L / 100) + 5) * N)
N   = 1.1 raised, 0.9 lowered, else 1.0
```

No nature on HP. Shedinja is out of Kanto v1. `hp_current = hp_max`. `status = null`.

### 3.4 Friendship, size, identity

- Friendship: F1 value from `ref_species` (Bulbasaur 50, Clefable 140, Articuno 35, Mewtwo 0, Mew 100).
- Height/weight: form pin (optional size class later; do not keep invented `dex%` sizes on **new** combat identity).
- `public_id` prefix (`LG` vs `SL`) is **WIRE**, not GENVAL.
- Gender: `gender_rate` −1 genderless, 0 male, 8 female, else seeded ratio. Form `forced_gender` wins.

### 3.5 G1 / C1 / unresolved

If `ref_form_policies.wild_allowed`/`grant_allowed` is false for the requested form, or `ref_forms.learnset_status = unresolved`, **fail**. Do **not** silently remap Gmax/Champions mega ids to base during generate. `persist_as = base` is for a later transform/event path, not a quiet rewrite.

Classic ORAS megas (e.g. Mega Charizard X `10034`) are resolved (historical VG) but `ref_obtain.normal_encounter_enabled = false`. Ordinary `catch`/`generate` must reject them. `grant`/`event` may generate them only if obtain `admin_targetable`/`event_targetable` is true **and** no G1/C1 policy blocks.

### 3.6 Return shape

JSON specimen only. No `INSERT`. Suggested keys: `ok`, `formId`, `dex`, `level`, `natureId`, `abilityId`, `abilitySlot`, `ivs`, `evs`, `moveSlots`, `gender`, `shiny`, `friendship`, `hpMax`, `hpCurrent`, `status`, `heldItem`, `gigantamaxFactor`, `rulesetId`, `contentBuild`, `errors`. Optional `legacyMoves` name array is a WIRE preview, not a live write.

Every successful specimen must also pass `assert_streamlink_legal(..., p_ctx)`.

---

## 4. `private.assert_streamlink_legal`

```
private.assert_streamlink_legal(p_mon jsonb, p_ctx text)
  returns jsonb  -- { ok, errors[] }
```

`p_ctx`: `generate` | `catch` | `grant` | `event` | `evolve` | `trade` | `edit` | `rebuild`.

Server authority. Client may preview later; not in this phase.

### 4.1 Invariants

1. `content_build` is the known pin; `ruleset_id = streamlink-gen9-xgen`. Null / `legacy-lgpe` → fail (`legacy-row`). Historical catches are **not** validated until reset/rebuild.
2. dex + form exist; form belongs to dex.
3. Obtain + G1/C1 policy match `p_ctx` (see §3.5).
4. Gender legal for `gender_rate` / forced gender.
5. `nature_id` ∈ 1–25.
6. Ability belongs to form; hidden only if slot exists **and** ctx/flag allow.
7. Each IV ∈ 0–31.
8. Each EV ∈ 0–252; sum ≤ 510.
9. Level ∈ 1–100.
10. 0–4 moves; each `moveId` exists on **that form’s resolved VG** for some pinned method (level-up / machine / egg / tutor as in pin). Origin `versionGroup` must match that VG. Generate output uses level-up only; validator is wider so evolve/edit can keep a legal machine move.
11. `ppMax` matches pin; `0 < pp ≤ ppMax`.
12. Friendship 0–255.
13. `hp_max` matches formula (tolerance: integer exact); `hp_current` ∈ 0..hp_max; status null or later enum.
14. Held item null until an item catalog grant exists.
15. Unresolved learnset / missing pin row / unknown Mareep-like dex → fail closed.
16. `edit` cannot target protected accounts (enforced at A19-EDIT; validator still rejects if a protected flag is passed).

“Legal” means StreamLink pin-consistent. It does **not** mean HOME-legal.

### 4.2 Evolution context (validator only; evolve RPC is WIRE)

Keep IVs/EVs/nature/OT. Re-pick ability if dest form lacks the old ability (ordinary slots only unless the old slot was a still-legal hidden). Do not auto-overwrite moves unless a slot is illegal on dest; replace **illegal slots only** via dest level-up slice. Kadabra → Alakazam is the fixture.

---

## 5. Coexistence with the live catch pipeline

```
today:  launch → settle/grant/evolve → stamp_catch_row → lgpe columns
GENVAL: functions exist, unused by launch/settle/grant
WIRE:   new rows call generate + assert, then INSERT including new columns
legacy: old rows stay NULL new-columns; stamp path unchanged until WIRE
```

| Rule | Why |
|---|---|
| Do not ALTER `stamp_catch_row` in GENVAL | Live stream keeps working |
| Do not UPDATE existing catches | Historical IVs/moves/friendship stay |
| Do not dual-write new columns from stamp | Avoid half-migrated new catches |
| Do not call assert on NULL-`content_build` rows | They are `legacy-lgpe` by absence |
| `capture_chance` unchanged | Catch odds ≠ individual legality |
| `normal_spawn_max_dex` 151 stays | Roster v1 |
| No FK from `catches` to `ref_*` | Legacy NULLs |

After WIRE, **new** catches fill both legacy display fields (if still required by `catch_json`) and new columns from the same specimen. That mapping is WIRE, not GENVAL.

---

## 6. Offline synthetic test plan

Implementation (later) must keep functions out of `supabase/migrations/` until a GENVAL apply go. Recommended order:

1. **LOCAL HARNESS (JS)** against `data/gen9-ref/` + `tests/fixtures/a19-genval/matrix.json` (this batch).
2. **REAL SQL** on disposable local Postgres (same isolation as #23): apply existing 001/seeds/002, then unapplied GENVAL SQL, run the matrix. No hosted Supabase.
3. **Not in GENVAL:** PlayTester catch, grant, evolve, catch-row SELECT, PRODUCTION.

### 6.1 Fixture matrix (synthetic — not live Pokémon)

| ID | Intent | Expect |
|---|---|---|
| L-BULBA | Bulbasaur lv5, Overgrow, hardy, SV Tackle/Growl/Vine Whip, friendship 50, EVs 0 | pass `catch` |
| L-CHAR | Charizard lv36, Blaze, SV slice Dragon Breath/Fire Fang/Slash/Flamethrower | pass `catch` |
| L-NIDORF / L-NIDORM | Gender lock ♀/♂ | pass; opposite gender fail |
| L-MAGN | Magnemite genderless | pass; Male/Female fail |
| L-CLEF | Clefable friendship 140 (F1 leaves 140) | pass `grant` |
| L-ART | Articuno ordinary catch | fail obtain (`special`) |
| L-ART-G | Articuno grant, friendship 35 | pass `grant` |
| L-MEGAX | Mega Charizard X ordinary catch | fail obtain |
| L-MEGAX-G | Mega X grant, ORAS learnset, Tough Claws | pass `grant` |
| L-GMAX | Gmax Venusaur `10195` any ctx | fail G1 / unresolved |
| L-C1 | Champions mega Clefable `10278` any ctx | fail C1 / unresolved |
| L-HA-NO | Bulbasaur Chlorophyll, `catch`, `allow_hidden=false` | fail |
| L-HA-YES | Same, `grant` + `allow_hidden=true` | pass |
| I-IV | IV 32 | fail |
| I-EV | EV 253 or total 511 | fail |
| I-ABL | Levitate on Bulbasaur | fail |
| I-MOVE | Move not in that form’s resolved VG | fail |
| I-MAREEP | dex 179 | fail closed |
| I-LEGACY | missing `content_build` | fail `legacy-row` |
| E-ALAK | Kadabra→Alakazam keeps IVs; dest ability legal | pass `evolve` |

Live accounts, Sora, Twinkle, and production catch ids are **not** fixtures.

### 6.2 Seed / entropy tests

Two generates with the same form/level/ctx but **different** `p_seed` must be allowed to differ in IVs and nature. Two generates with the **same** `p_seed` must be deterministic. A seed equal to `round_id` alone is documented as illegal for WIRE (Q1), even if the function itself is pure in `p_seed`.

### 6.3 What this batch ships

`tests/fixtures/a19-genval/matrix.json` + STATIC/LOCAL HARNESS checks that the spec and fixtures exist, parse, match the pin slice oracle, and that **no** generator SQL landed in `supabase/migrations/` or admin JS.

---

## 7. Remaining architectural decisions

Locked items are in §2. These still need an owner call **before or with** implementation authorization. Recommendations are not approvals.

| ID | Question | Recommendation |
|---|---|---|
| **A19-GV1** | Ordinary ability: always slot `1`, or per-catcher among non-hidden slots? | Per-catcher among slots that exist (usually only `1` in Kanto). |
| **A19-GV2** | Gender: per-catcher (today) or shared with the round? | Per-catcher. |
| **A19-GV3** | If a table asks for a G1/C1 form id, remap to base or fail? | **Fail closed.** Remap only in a later transform/event phase. |
| **A19-GV4** | May validator accept machine/egg/tutor moves from the resolved VG, while generate emits level-up only? | **Yes.** |
| **A19-GV5** | RNG: `md5(p_seed\|\|label)` like today’s stamp, or `gen_random_bytes`? | Deterministic `md5(p_seed\|\|label)` so fixtures are stable. |
| **A19-GV6** | Dual-write `iv_*` / `moves[]` inside generate JSON vs WIRE-only? | Generate may include `legacyMoves` preview; only WIRE writes columns. |
| **A19-GV7** | New `public_id` prefix `SL` vs keep `LG`? | Defer to WIRE. |

A19-WIRE, INSPECT, EDIT, RESET remain separate. Do not combine GENVAL apply with WIRE.

---

## 8. Proposed implementation scope (when authorized)

1. Unapplied SQL under `supabase/unapplied/a19-genval/` (`DO-NOT-APPLY`): `generate_streamlink_mon`, `assert_streamlink_legal`, REVOKE, no public RPC.
2. JS oracle tests already sketched here, then local REAL SQL rehearsal (#23-style).
3. Stop. Do not replace `stamp_catch_row`. Do not INSERT catches. Do not merge/deploy/stamp APP.

Apply of those functions to `starlight-play` would need a **separate** go after review (same shape as A19-APPLY).

---

## 9. Stop

A19-GENVAL implementation is **not** authorized by this specification. Historical catches are unchanged. The old generator remains active.

Next gate: explicit owner **A19-GENVAL** implementation authorization (functions + offline tests only), optionally answering A19-GV1–GV7.

---

**Later (D37 snapshot pointer):** Owner authorized branch-only implementation. See [GEN-IX-GENVAL-ISSUE-25.md](./GEN-IX-GENVAL-ISSUE-25.md). This file remains the D36 planning snapshot. Production apply is still **UNAPPROVED**.

**Later (D38 snapshot pointer):** Independent review of `b4cf2cc0` required security corrections (tickets, entropy, validator types, move legality). Production apply is still **UNAPPROVED**.

**Later (D39 snapshot pointer):** Independent review of `67141ec3` required specimen-digest binding, additive production SQL, and local-only fixtures. Production apply is still **UNAPPROVED**.
