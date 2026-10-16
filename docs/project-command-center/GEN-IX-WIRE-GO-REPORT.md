# A19-WIRE-GO result (D53)

PlayTester caught one Bulbasaur. WIRE is **off** again. The Pokémon was kept.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **PlayTester** · catch kept · no release.

Production APP `20261008-rc133`. No merge, deploy, or RESET-GO.

## Switch

| When | `enabled` | `updated_at` |
|---|---|---|
| Before | false | 2026-10-15 02:57:32+00 |
| During the test | true | 2026-10-16 02:00:53+00 |
| After | false | 2026-10-16 02:08:21+00 |

D49 migrations `a19_wire_001` / `002` / `003` were present. Helpers `streamlink_wire_set_enabled`, `persist_streamlink_catch`, `materialize_streamlink_catch`, and `settle_if_needed` were present. No function bodies or client permissions were changed.

## Encounter

Ordinary round `d92354d3-b661-4b42-99c5-7adfeba8e2a5`. Bulbasaur, form `1`, male, not shiny, level 4, Pallet Town. `trigger_source=ADMIN_SPECIFIC`. Not a forced `testOutcome`.

REAL DOM: PlayTester was already signed in. The browser joined, then selected an ordinary Poké Ball (13 shown). The live feed said Play Tester caught Bulbasaur.

The prepare window closed before a berry click. The bag had 5 berries and 1 honey. `encounter_players.prep` stayed null. No second attempt, because the catch succeeded.

Browser console errors were not retained after opening My PC. None were returned during the Play clicks.

## Catch `SL00025376`

| Check | Result |
|---|---|
| Public ID | `SL00025376` |
| Content build | `sl-ref-20261013-227b573` |
| Species / form / level / shiny | Bulbasaur / form 1 / level 4 / normal, not shiny |
| Nature | 16 Jolly |
| Ability | 65 Overgrow, slot `1` |
| IVs | 10 / 10 / 0 / 5 / 25 / 25 |
| HP | 18 / 18 |
| Friendship | 50 |
| Moves | Tackle, Growl, Vine Whip (Scarlet/Violet level-up; Vine Whip is level 3 on this pin) |
| Count | 1 catch, 1 `capture_log` row |
| Source | `play:d92354d3-b661-4b42-99c5-7adfeba8e2a5:a98cbf81-a6b2-4dbf-8448-8d62f6d5f523` |
| OT | Play Tester |

`capture_log`: catch rate 45, base chance 0.16, Poké Ball multiplier 1, no berry, honey multiplier 1, roll 0.093, success.

Replay of `settle_if_needed` left the same closed round. Counts stayed 1 catch, 1 log, 1 ledger row.

My PC shows this Bulbasaur at Lv. 4, Poké Ball, Pallet Town, OT Play Tester, HP 18. Box 1 is 13/30. An older Lv. 5 Bulbasaur is still there and was not the test catch.

## Items

No berry was spent. The only PlayTester ledger row in the window is `pokeball` `+1` reason `STREAM_ATTENDANCE`. No throw debit was written. After settlement the bag still reported 13 Poké Balls, the same count the throw button showed.

## Bugs

- Automation missed the 30-second prepare step, so berry use was not exercised.
- A thrown Poké Ball did not appear as a ledger debit. Attendance granted one Poké Ball at settlement.

WIRE was disabled after the check. No production repair was attempted.
