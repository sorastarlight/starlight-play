# D58 live encounter validation

**Verdict: PASS for the three ordinary PlayTester encounters.** WIRE is off again. The two catches are kept. The escape created no Pokémon.

D55 migration `20261016042345` was not reinstalled. Fingerprints still match D57: `spend_bag_item` `5419a99d0c1735f44564b84338e32578`, `announce_throws` `0cd4a8e2a647ba388ce19b14b6f5a8c4`. APP `20261008-rc133` unchanged.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **PlayTester**. No inventory grant or backfill.

## Prerequisites

PlayTester was signed in on the Cursor browser (`Signed in as Play Tester`, account id matched). WIRE started `enabled=false`. No unresolved encounter was open. Bag before the test: 13 Poké Balls, 5 Oran Berries, 1 Honey, 1 Great Ball.

WIRE was enabled only for the three rounds, then disabled. Final `enabled=false`.

## Scenarios

| # | Plan | Round | DOM | Database |
|---|---|---|---|---|
| 1 | Join, Oran Berry, owned Poké Ball | `1ae877c7-8d70-4809-9652-e17aa29761bb` | Joined, chose Oran Berry, threw Poké Ball, caught Bulbasaur | `prep=berry`, `ball=pokeball`, Caught, one catch, one capture log |
| 2 | Join, Honey, owned Poké Ball | `63b2c8fa-9ba8-404f-b3a0-533f10023fcc` | Joined, Honey message, threw Poké Ball, caught Bulbasaur | `prep=bait`, `ball=pokeball`, Caught, one catch, one capture log |
| 3 | Join, no item, owned Poké Ball | `996dbdac-eeb8-4f6f-9443-062cbd539586` | Joined, ready with no item, threw Poké Ball, unable to catch | `prep=none`, `ball=pokeball`, Escaped, no catch row, one capture log |

Nothing was left untested. Odds were not forced.

## Economy

Starting bag 13 / 5 / 1. Ending bag 11 Poké Balls, 4 Oran Berries, 0 Honey.

Ledger rows after `2026-10-16 04:33:00+00`, in order:

- Oran Berry `BAG_SPEND` −1
- Poké Ball `BAG_SPEND` −1
- Poké Ball `STREAM_ATTENDANCE` +1, separate, tied to the first round
- Honey `BAG_SPEND` −1
- Poké Ball `BAG_SPEND` −1
- Poké Ball `BAG_SPEND` −1 on the escape

Each owned throw has one ball debit, including the escape. Attendance did not replace those debits except as its own +1. Replaying `settle_if_needed` on all three rounds left 6 ledger rows, 2 new catches, 0 escape catches, and 11 Poké Balls.

The D53 Bulbasaur source `play:d92354d3-b661-4b42-99c5-7adfeba8e2a5:…` is still one row, level 4, Poké Ball. `SL00025376` was not edited.

## UI

Play showed the phase buttons and the result lines above. After the second catch the throw button read **Poké Ball, 13 owned** because attendance had replaced the first ball. Before the third throw it read **Poké Ball ×12**. My PC loaded **15 / 30**, up from **13 / 30** at the start of this session. No error banner was visible. A browser console hook was not attached, so this is not a console-log pass.

No merge, deploy, RESET-GO, or restore.
