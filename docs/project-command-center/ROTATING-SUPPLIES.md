# Pass calendar and Oak streak rewards

October 27, 2026: claim-button alignment is LIVE at main `bc6874b6` / Pages `40503751151`; exact hosted CSS verified. A one-item list and a 24-item list have identical button top/bottom positions, with reward lists constrained to their own scroll area.

The owner approved the exact reward-authority packet. Installed 20261027131755;all15sources/ACLs and private-table access verified. Six-file publication at main 7dea2ff35078b2183afde0c3166a043baad3d1b3 is deployed: Pages40510990734 succeeded and all six hosted files match exact reviewed source. It uses the existing verified-period Pass policy and whole-bundle Bag-first/PC overflow delivery.

## Pass daily rotation

Each UTC day provides **one item, quantity 1, plus 50 PokéCoins**. The calendar shows the item sprite/name; the claim card shows the coins. No avatars, Master Balls, bag expansions or Pokémon grants are in this default rotation. Daily items use existing rare/epic catalog classifications or the rare evolution-item loot tier.

| Rotation week | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|---|---|---|---|---|---|---|---|
| 1 | Figy Berry | Moon Ball | Fire Stone | Silver Pinap Berry | Ultra Ball | Wiki Berry | GS Ball |
| 2 | Mago Berry | Hisui Ultra Ball | Water Stone | Razz Berry | Cherish Ball | Aguav Berry | Jet Ball |
| 3 | Iapapa Berry | Gigaton Ball | Thunder Stone | Silver Pinap Berry | Ash’s Poké Ball | Figy Berry | Moon Ball |
| 4 | Wiki Berry | Ultra Ball | Leaf Stone | Mago Berry | Clone Ball | Aguav Berry | Golden Razz Berry |

The rotation repeats after four weeks and uses a stable November 2 UTC anchor. Activation begins with future periods; it does not replace a bundle already recorded for a trainer. Missing an eligible verified period still saves that recorded reward as a PC Supply Crate. An upcoming preview does not establish subscription coverage for an offline day.

## Weekly drop and Bits positioning

Each weekly drop includes **150 PokéCoins** and seven physical items across five types:

| Week | Contents | Listed in-game value, including coins |
|---|---|---:|
| 1 | Great Ball ×2, Lum Berry ×2, Honey ×1, Poké Radar ×1, Moon Ball ×1 | 1,430 |
| 2 | Hisui Great Ball ×2, Sitrus Berry ×2, Honey ×1, Poké Radar ×1, Cherish Ball ×1 | 1,230 |
| 3 | Wing Ball ×2, Persim Berry ×2, Honey ×1, Poké Radar ×1, GS Ball ×1 | 1,230 |
| 4 | Leaden Ball ×2, Lum Berry ×2, Honey ×1, Poké Radar ×1, Ash’s Poké Ball ×1 | 1,230 |

Published Bits packs currently contain 14–21 items and have listed values from 1,540 upward. Each provides an immediate bulk boost larger than one weekly Pass drop. This comparison is per delivery using current in-game prices; it is not a value-per-real-dollar claim. No Bits prices, provider settings or pack contents change here.

Across four fully eligible/claimed weeks, the Pass gives 56 physical items and 2,000 actual PokéCoins. Its listed total value is 15,320, versus the current configured 120 items/1,160 coins and 11,060 total value. The proposal trades bulk for rarity; it adds no guaranteed catches, XP multiplier or stat advantage. This arithmetic is starting-balance evidence, not long-term economy measurement.

## Oak’s seven consecutive days

The owner selected any seven consecutive successful daily check-ins, including streaks spanning calendar weeks. Oak keeps the existing Eastern daily reset and claim protection. The calendar shows Day 1–7 and actual recorded claims. A missed day starts a new streak; earned gifts remain safe until collected. Only future eligible days count after activation.

The completion gift is **10 Evolution Candy for one chosen available evolution family, 150 PokéCoins, one Evolution Stone and one random rare Poké Ball**. Stone weeks rotate Fire → Water → Thunder → Leaf → Moon. The ball is selected once from Moon, Cherish, GS, Ash’s, Clone and Dark Balls; it is saved with the earned gift and never rerolled by retries. Master Ball is excluded.

Current catch Candy is 3/5/8 by evolution stage, with evolution costs of 15–100. Ten chosen Candy is about 3⅓ first-stage catches’ worth and below the cheapest evolution cost. It is useful progress without automatically completing an evolution. The picker lists existing enabled Candy families with enabled evolution rules.

Claiming the Candy choice delivers its physical items as one Bag-first bundle, or entirely to PC storage if they do not fit. Coins and Candy use their existing ledgers. The confirmation names the selected Candy and the actual item destination. Sorastarlight’s 30-second repeat claims do not advance this seven-day progress.

## Staff controls and validation

The native Pass editor clearly identifies the automatic calendar and supports reviewed switching to custom fixed bundles and back. Revisions and replay receipts protect mode changes. Existing earned bundles are preserved; a maintenance rollback cannot be bypassed by the mode switch. The old incorrect 20-hour/6-day editor copy is replaced with the actual UTC calendar timing.

LOCAL: 183 regression suites, build, 28 SQL groups, 1,461 pure date checks and 140 SQL/JS schedule comparisons pass. SQL covers all 30 stone/rare-ball combinations, duplicate/concurrent claims, retained gifts, missing days, activation cutoff, owner-repeat exclusion, permissions, mode switching and guarded rollback/resume. Rendered calendars fit 320/390/768/1024; the narrow Candy dialog and real reward reveal were inspected.

Review/install/recovery: [rotating-supplies packet](../../supabase/unapplied/rotating-supplies/README.md). Production verification used source/metadata only. No live claim, grant, provider check, account mutation or cleanup was performed. APP remains `20261008-rc133`.

