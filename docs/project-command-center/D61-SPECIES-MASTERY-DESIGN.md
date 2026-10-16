# D61 — Species Mastery and duplicate Pokémon value (design proposal)

**Status:** PROPOSED / DESIGN ONLY. Not approved for implementation.  
**Branch:** `admin-hub-overhaul`  
**Prerequisite:** D60 tests and local Play/Help verification pending. D59 not deployed.  
**No changes authorized:** schema, RPCs, caught specimens, encounters, capture odds, spending, balances, settlement, APP version, WIRE, reset, merge, or deployment.

## Goal

Give repeat catches ongoing value without turning duplicates into required inventory fodder, speeding Pokédex completion, or rewarding catch-spam. Preserve each catch as an individual Pokémon. Do not silently consume, transfer, merge, or delete specimens.

## Distinct progression concepts

1. **Pokédex:** species discovery/registration. Repeat catches do not create new species entries.
2. **My PC / collection:** every legitimately caught individual remains identifiable, including form/variant, original catch details, ownership and history. Do not collapse specimens into mastery points.
3. **Species Mastery:** *account-level, species-scoped* record of familiarity gained from eligible play. It does not edit specimen characteristics.
4. **Future Research Tasks:** separate system on the locked roadmap; mastery should not preempt its task list, rewards or backfills.

### Species identity rules

- Scope baseline mastery by canonical species ID (not display name, evolution family, form, shiny state, or gender). E.g. Bulbasaur and Ivysaur have separate tracks; a shiny Bulbasaur contributes to Bulbasaur's track, not a second shiny track.
- Forms, shinies and gender differences remain distinct collection attributes and can support optional *collection badges* later. No added mastery multiplier for shiny, rare forms, or legendaries.
- Regional variants share base species mastery provisionally while keeping their form-specific collection representation. **Requires canonical owner confirmation** if the game's Pokédex indexes regional species separately.
- Do not infer ownership, evolution ancestry, or variant from filename/sprite asset tags. Use authoritative specimen data.
- No retroactive mystery events from historic records. Backfill policy is a separate approval; safest launch is prospective progress, while historical owned/species counts remain visible.

## Proposed mastery ladder (tunable, not locked)

| Tier | Name | Lifetime eligible species catches | Meaning |
| --- | --- | ---: | --- |
| 0 | Discovered | 0 | Species encountered or seen, separate from catch progress |
| 1 | Familiar | 1 | First genuine catch; opens mastery card |
| 2 | Acquainted | 3 | Repeat encounters have meaning |
| 3 | Experienced | 6 | Visible badge and scrapbook-like record |
| 4 | Specialist | 12 | Cosmetics/profile display unlock |
| 5 | Expert | 20 | Prestige badge and optional themed decoration |

*Thresholds are provisional.* The total is lifetime **eligible successful catch events**, not number currently held in PC; releasing/trading later must not subtract completed mastery. Track a separate duplicate catch count: `max(eligibleCatchCount - 1, 0)`. No failure-to-catch mastery. Do not count replayed settlement, imported specimens, manual/admin grants, test fixtures, or synthetic resets without explicit policy.

## Reward principles

- Default to non-economic rewards: mastery emblem, new card border, species lore/facts already in licensed reference data, small cosmetics, Trainer profile showcase slot, and progress celebration.
- No PokéCoins, Rings, Bits, item bonuses, increased catch rates, rare Pokémon, or subscription perks in D61. Any economy connection requires explicit later balance review.
- No gameplay power increases. Do not make catching duplicates mandatory to unlock regions or complete the Pokédex.
- No disposal rewards: do **not** incentivize transfer/release, fusion, or bulk conversion until an independently reviewed feature protects favorites and special specimens.
- Show clear current level, next threshold, eligible captures counted, and the fact that duplicates are never required for Pokédex registration.

## Anti-grind and fairness

- One mastery increment at most per eligible, settled catch ID; idempotent on replay.
- Ordinary catches of the same species can increase mastery, but reward milestones flatten and stop at a modest finite cap. No uncapped escalating payout.
- No advantages for Bits spending or purchased balls. Do not use paid consumables to multiply mastery.
- Consider a daily species progress cap **only if** real encounter frequency demonstrates abuse; avoid arbitrarily penalizing participants with fewer stream opportunities. If later introduced, expose the cap clearly and still retain all valid caught Pokémon.
- High-odds/common species will reach mastery more often; that is acceptable for cosmetic prestige, but rare species should not be required for overall progression or seasonal rewards.

## Player presentation

- **My PC:** optional compact mastery badge on a species detail panel; specimens remain individually accessible. No clutter in the encounter Join/Prepare/Throw flow.
- **Pokédex:** under the species page, an optional 'Mastery' section with progression `6/12 to Specialist`, recent eligible capture date, and milestone badges; no confusion with seen/caught.
- **Trainer profile (later roadmap):** up to three pinned mastered species, purely expressive; no system dependency yet.
- **Post-catch results (later implementation):** one unobtrusive line, e.g. `Bulbasaur Mastery +1 · 3/6`, using already-settled result data; do not introduce extra synchronous settle calls or block results.
- **Accessibility:** color-independent tier text, keyboard focus, screen-reader progress label; reduced-motion behavior and narrow mobile widths.

## Proposed data/settlement architecture — no SQL in D61

- Canonical event input should be a finalized catch record with globally stable catch ID, trainer ID, canonical species ID, legitimate source and settlement state. Server is authority; browser localStorage is not.
- Ledger/event layer: unique `(trainer_id, catch_id)` eligibility records; atomic insert-if-absent semantics and server-maintained species total. Determine eligibility using existing catch/settlement provenance; if unavailable, STOP and design explicit provenance rather than heuristic guessing.
- Materialized totals may derive from immutable qualifying events. Ensure replays, retries and concurrent completions are idempotent.
- Handle later account merges, deleted users, trade transfers, specimen release, moderation reversals, and backfills explicitly, not via optimistic assumptions.
- Feature rollout gates: (1) inspect actual schema and valid provenance, (2) design migrations and synthetic fixtures, (3) disposable local database rehearsal, (4) security and economy review, (5) separately authorized hosted changes, (6) read-only verification, (7) user-approved rollout. **No implementation GO here.**

## Required test plan for eventual implementation

1. First Bulbasaur catch = 1 eligible count; second = 2, not extra Pokédex species.
2. Five or more repeated legitimate catches tally correctly and cross milestone once.
3. Replay of same settled catch does not add mastery or rewards.
4. Duplicate capture with different form/shiny increments same canonical species track only, while retaining individual specimen variant.
5. Different species do not share mastery track; evolutions are distinct.
6. Failed/escaped/no-ball or unjoined rounds yield no increment.
7. Old catch imports, fixture data, admin grants and reset replacements do not count until explicitly approved.
8. Account A catches cannot influence account B; RLS/server authorization prevents arbitrary client credits.
9. Concurrent duplicate settle notifications are idempotent and do not double-celebrate.
10. All specimens remain unchanged; WIRE off path and current encounter/ledger regressions are unaffected.
11. Mobile, keyboard, screen reader and reduced motion checks; loading and unavailable states do not invent progress.
12. A backward-compatible rollout does not expose incomplete mastery UI to production accounts.

## Decisions for owner before D62 build

1. Approve proposed five collectible tiers (1/3/6/12/20 catches), or adjust thresholds after encounter-frequency data?
2. Count mastery only on successful catches (recommended), or include non-capture participation later as a distinct activity track?
3. Share canonical species mastery across regional variants (recommended pending Dex model), while leaving forms distinct in PC?
4. Prospective-only progress at launch (recommended), or separately review and authorize a validated historic backfill?
5. Cosmetics/badges only (recommended), with zero economic or catch-odds effects?

## Exit criteria for this D61 design batch

- Written proposal only; no player-facing activation and no schema or game logic changes.
- Do not mark feature `DONE`; mark design `PROPOSED`.
- D60 execution and deployment decisions remain independent.
- Locked sequence after Species Mastery: Pokédex milestones, Partner Pokémon/nicknames, Trainer profiles/titles, Research Tasks, locations/biomes, community research, encounter chains, Adventure Log, Legendaries, events/outbreaks, stream↔Play synchronization, balance/retention analytics, Johto.
