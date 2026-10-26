# Berry item drops — progression-based local model

Status: offline model implemented and tested; no production mechanics, grants, catalogs or account data changed. This completes the requested XP/economy analysis before choosing the activation curve.

## Current source evidence (October 26)
Trainer-level step cost is round(100 × level^1.35), accumulated from level1. Level3 requires355XP;level5 1446;level8 4830;level10 8428;level20 45742. Current progression config awards5joinXP,10catchXP,25new-speciesXP, plus other situational bonuses. Live watch heartbeat awards1XP per180credited seconds (20/hour). Watch-only level10 therefore takes421.4credited live hours;wall-clock time may be longer. We did not call heartbeat or change watch/XP data.

## Selected starting model
Use authoritative XP before the catch reward is awarded. Linearly interpolate between these XP anchors:0XP90%;355XP75%;1446XP60%;4830XP45%;8428XP35%. Stay35% thereafter. This is the chance of one item after a successful catch using a berry, not the chance of catching the Pokémon. No hard cutoff, no reduced item quality at high levels. Berry rarity controls the separate item-quality draw. No catch-count override is needed initially given the slow watch-XP rate;it remains a consideration if play evidence shows a problem.

Per trainer and round:one eligible failed throw awards exactly1standard Poké Ball, regardless of trainer level or berry. Joining without a valid throw earns none. A successful catch without a berry earns normal rewards only. One participant's result never changes another's consolation eligibility. No cancellation/test/refund path should mint these rewards. A failed standard-ball throw is therefore ball-neutral by the owner's requested rule.

## Current eligible pool
Published, visible PokéCoin products only;deduplicated by granted inventory item. Exclude storage, Master Balls, avatars, Pokémon, currency and account unlocks. This is a reviewed snapshot, not automatic inclusion of future products. Each drop gives1item. Uniform choice inside the selected bucket;the reviewed bucket weights sum100.

- Everyday: Aspear Berry, Cheri Berry, Chesto Berry, Nanab Berry, Oran Berry, Pecha Berry, Rawst Berry, Poké Radar, Poké Ball, Honey.
- Better: Feather Ball, Friend Ball, Heal Ball, Hisui Heavy Ball, Hisui Poké Ball, Luxury Ball, Premier Ball, Old Ball, Strange Ball, Ash's Poké Ball, Cherish Ball, Clone Ball, Dark Ball, GS Ball, Safari Ball, Sport Ball, Lum Berry, Origin Ball, Sitrus Berry, Pinap Berry.
- Rare: Razz Berry, Great Ball, Hisui Great Ball, Leaden Ball, Wing Ball, Nest Ball, Dive Ball, Level Ball, Love Ball, Lure Ball, Net Ball, Timer Ball, Dusk Ball, Fast Ball, Heavy Ball, Moon Ball, Quick Ball, Repeat Ball, Gigaton Ball, Hisui Ultra Ball, Jet Ball, Ultra Ball.
- Evolution: Fire Stone, Leaf Stone, Thunder Stone, Water Stone, Moon Stone, Linking Cord.
- Premium: Silver Pinap Berry, Golden Razz Berry.

Evolution candy is not currently a live purchasable product and is therefore absent. Disabling a pool item later must prevent new selection;an already-earned pending reward retains its saved identity. Empty buckets must be rejected in configuration rather than silently changing the distribution.

| Berry rarity | Everyday | Better | Rare | Evolution | Premium |
| --- | ---: | ---: | ---: | ---: | ---: |
| Common |70%|25%|4%|1%|0%|
| Uncommon |55%|30%|10%|4%|1%|
| Rare |40%|35%|15%|8%|2%|
| Epic |25%|35%|22%|13%|5%|

## Expected progression
Analytical scenarios assume one berry on every throw,5joinXP per attempt,10XP per success,25XP for each specified new species,and no other XP bonuses. Fractional attempts approximate the selected success rate;these are expectations,not playtest measurements. Failure rewards are additional to these successful-catch item counts.

| Successful catches | Catch rate | New species | Starting watch hours | Expected item drops |
| ---: | ---: | ---: | ---: | ---: |
|50|50%|25|0|33.9|
|100|50%|50|0|60.6|
|250|50%|100|0|121.9|
|100|25%|50|0|57.9|
|100|85%|50|0|61.7|
|100|50%|50|100|49.1|

## Value check
These are replacement purchase values, not awarded cash or guaranteed resale values. No claim of complete economy balance follows. At50%catch success a60coin common berry costs120coins per successful catch if used on every attempt;expected beginner drop purchase value is about88coins per success. Even at the85%catch cap, that value alone is below the combined cost of consumed standard balls and berries (about171coins per success after failure-ball replacement). Existing participation/capture rewards remain additional and can make ordinary play profitable by design.

| Berry rarity | Purchase value per item drop | Per successful beginner catch | Per successful level10+ catch |
| --- | ---: | ---: | ---: |
|common|98.13|88.32|34.35|
|uncommon|129.62|116.66|45.37|
|rare|161.94|145.74|56.68|
|epic|207.81|187.03|72.73|

## Implementation requirements before activation
- Record pre-reward XP, berry identity, outcome, random result and selected item exactly once in the server settlement transaction, keyed by round/trainer. Clients never supply XP/rolls/items. Retries return the saved outcome.
- Full bags retain an earned pending delivery, including consolation balls. Claiming must atomically respect capacity and never reroll. Pending delivery is not itself another reward grant.
- Use a readable notice such as “Bulbasaur dropped an item during the catch!” with item art/name/quantity. Failure notice says “Bulbasaur escaped! You received1Poké Ball.” Pending rewards say “Waiting for inventory space.” Only show delivered wording after actual delivery.
- Integrate Notifications without duplicate notices, preserving private fields. No new scheduled worker is authorized or needed by this model.
- Local SQL must test concurrent settlement/claim retries,rollback,full bags,capacity changes,all failure eligibility branches,existing rewards unchanged,invalid RNG/configuration and no rerolls.
- Berry affinity remains a separate catch-probability calculation. The later owner-accepted specialist/universal layout supersedes the earlier22-row draft;this model does not activate any inactive berry or add the proposed Steel specialist.

## Validation and scope
`node tests/berry-drop-balance-tests.js` checks100001XPpoints for monotonicity/bounds,all rarity buckets,random boundaries,catalog exclusions and progression benchmarks. `node tools/berry-drop-balance.js` reproduces the JSON report from the public-catalog snapshot. This is local JavaScript balance code,not installed server SQL or a live reward system. No hosted throw,claim,grant,notice or protected-account action occurred.

## Implemented 2026-10-26
The offline proposal is now implemented and active for future eligible captures. See BERRY-DROP-IMPLEMENTATION.md for deployment, cutoff, 26 local SQL groups, source verification and recovery details. Berry affinities remain separate.
