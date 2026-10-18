# D77-R2 — PlayerQA verification

**Verdict:** **D77-R2 PLAYERQA VERIFIED — ENCOUNTER OWNER GO REQUIRED**  
**Status:** The existing account was verified. No encounter ran. The D78 text below is not authorization.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `f87e66fc`  
**Work commit:** filled by the pointer commit after this report lands.  
**Production APP:** `20261008-rc133` (unchanged).  
**Project:** `dtflmlbjhttoewqgkujf`  
**WIRE:** remains disabled (`enabled = false`).

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · PlayerQA mutated **NO**.

No password, token, cookie, or session secret is in this report.

Do not run the encounter under this batch. Final release smoke stays paused.

## 1. PlayerQA

Class: **READ-ONLY LIVE CATALOG**. Checked `2026-10-18 04:36:20.5377+00`. One profile and one Auth identity.

| Check | Result |
|---|---|
| Auth UUID | `1d36e67c-298d-4657-8685-19363af9b7cc` |
| Profile id | same UUID |
| Email | `fetkun@gmail.com` |
| Email confirmed | yes |
| Username | `playerqa` |
| Display name | `playerqa` |
| Staff roles | none |
| Twitch connections | 0 |
| Profile Twitch login | null |
| Pokémon | 0 |
| Duplicate username rows | 1 |
| Duplicate email identities | 1 |

The registration form stores the lowercased username in `profiles.display_name` when no separate display name is sent. The canonical display name is `playerqa`, not `PlayerQA`. The Play page shows the same value.

Inventory matches the `public.inventories` column defaults. `starter_granted` is false and PokéCoins are 0, so the welcome kit was not applied.

| Item | Count |
|---|---|
| Poké Ball | 10 |
| Great Ball | 5 |
| Ultra Ball | 3 |
| Berry | 10 |
| Honey (`bait`) | 10 |
| Poké Radar (`lure`) | 0 |
| PokéCoins | 0 |

Profile defaults include xp 0, an empty team, plain card frame, and `trainer_sprite` `red-gen1`. No onboarding-incomplete flag is stored. The Trainer guide is skippable and does not gate Play.

## 2. Browser session

Class: **REAL DOM**. `https://play.sorastarlight.net/` was already open. The account status read `Signed in as playerqa.` and the handle read `@playerqa`. No sign-in, join, throw, Mart, radar, or welcome action was clicked.

Poké Radar is an optional auto-join item. PlayerQA has none, and the radar button is disabled. Manual join does not require one.

## 3. Species Familiarity

Class: **READ-ONLY LIVE CATALOG**. No drift.

| Check | Result |
|---|---|
| Lifecycle | `inactive` |
| `activated_at` | null |
| Familiarity events | 0 |
| Outbox rows | 0 |
| WIRE `enabled` | false |
| `settle_if_needed` md5 | `565c102d0a8c84a3dfd036653aca307c` |
| Stamp md5 | `b66ad1b961b3573a2c48947dfe0413ea` |
| `grant_mastery` md5 | `d5c11cc672f2cb16ae0210023a8dd91b` |
| `mastery_rank` md5 | `04fa122f1f4424cd6e63fa1f3ffa16a4` |
| `play_rankings` md5 | `b6526a939abdba0ef106e127925c43b0` |
| APP | `20261008-rc133` |

## 4. Encounter readiness

PlayerQA can join a normal Play round. The account is nonstaff, email-confirmed, and holds 10 Poké Balls from registration defaults. A round still has to be opened by the existing encounter system. This batch did not open one.

A public round can include other trainers. The smoke must stop before the throw if anyone other than PlayerQA joins.

Ordinary odds are not guaranteed. An escape spends the ball and writes a capture log, and it does not insert a specimen. **A failed throw does not validate the catch timestamp trigger.** Do not change odds and do not retry.

## 5. Proposed D78 GO

This statement is **not approved**.

```text
OWNER GO — one PlayerQA stamp smoke. Not yet approved.

Account: playerqa
Auth UUID: 1d36e67c-298d-4657-8685-19363af9b7cc
Email: fetkun@gmail.com
Display name on file: playerqa

Permitted action: one canonical Play encounter attempt while
private.species_mastery_activation.lifecycle is inactive and WIRE enabled is false.
PlayerQA may join and throw one Poké Ball only.
Do not use a Berry, Honey, Poké Radar, Great Ball, Ultra Ball, or Master Ball.

Maximum new specimens: 1, and only if the throw catches.
Keep the specimen if it is caught. Do not delete it.

The attempt also writes the round, the player result, one capture log, and console lines.
announce_throws spends the one Poké Ball.
A catch also runs the existing catch triggers, including the server_inserted_at stamp.
An escape does not create a specimen and does not prove the stamp. Stop. Do not retry.

After the attempt, read only PlayerQA's new catch id if one exists, the catch count
for that round and this UUID, the activation singleton, the familiarity event count,
the outbox count, and the WIRE flag.

Stop if another trainer joins, if lifecycle is not inactive, if WIRE is enabled,
if a second specimen appears, if an outbox row or familiarity event appears,
or if any item other than the one Poké Ball is spent.

Do not activate Species Familiarity. Do not reconcile or deliver.
Do not change odds, settlement, points, or Rankings.
```

## 6. Remaining risks

- An escape leaves the stamp unproven. The next step would need a new GO, not an automatic retry.
- Another trainer joining a public round can spend items and catch. Stop before the throw if that happens.
- The stored display name is `playerqa`.
- Registration defaults include Berries and Honey. The GO forbids using them.
- No production catch has yet proved the stamp.

Do not run this GO as part of D77-R2.
