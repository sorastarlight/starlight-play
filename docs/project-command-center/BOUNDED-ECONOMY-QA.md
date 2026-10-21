# CODEX-50 — Proposed bounded hosted EmailQA economy checks

Prepared October21,2026. Not executed; previous encounter/throw approvals are spent and not reused. Current read-only preflight finds exactly one EmailQA profile,300 PokéCoins, no Evolution Candy, and one unlocked/unfavorited/off-team Caterpie at level6. Published SKU poke5 currently costs100 coins and grants one ordinary Poké Ball (its historical SKU name does not describe quantity). Current enabled evolution10-11 costs15 family candy and no item.

Proposed allowance, EmailQA only, ordinary server validation and retained outcomes:

1. Purchase exactly one ordinary Poké Ball through the actual Mart UI, at most100 existing in-game PokéCoins. Verify exact one debit/grant and order ledger. No Bits or real-money spending. Cancel before checkout if SKU/price/grants changed or inventory capacity is insufficient.
2. With an actual authenticated owner/staff session (never a forged JWT), give EmailQA exactly15 Caterpie Evolution Candy using Trainer Gifts and a clearly labeled QA reason. Inspect the audit receipt. No other item/coins/XP/specimen grants or owner/other-trainer mutation. If staff access is absent, hold this step; do not bypass staff authorization with SQL.
3. Use EmailQA's existing caught Caterpie for one ordinary Caterpie→Metapod evolution through the actual UI/rule10-11. Verify exactly15 candy spent once, preserved level/IVs/EVs/nature/moves, correct Metapod form/ability/HP mapping, one normal evolution reward/history, and original Caterpie Familiarity unchanged. No extra evolution, changed mapping, forced success or refund. Repeated-read verification only; no extra destructive RPC for replay discovery.
4. Transfer that resulting Metapod to Oak once through its normal confirmation. This permanently removes that QA specimen from the player collection by setting transferred_at (the stored row remains) and returns normal family candy. Verify one transfer/history row, correct family identity, unchanged prior Familiarity event/count, and normal ledger effects. If any lock/favorite/team/listing/session or unexpected state appears, stop before the action.

No other trainer, public encounter, director/worker change, inventory provisioning beyond the one15-candy staff grant, Pass claim/override, trade with another account, reset, cleanup refund, balance repair, archive purge, scheduling, build stamp or final release authorization is included. Sora/Twinkle/PlayTester remain excluded. The small normal XP/candy/rewards from evolution/Oak remain on EmailQA; do not promise zero data mutation.

Before each action, verify EmailQA session and exact target/state. Stop on errors or identity/state drift and retain evidence. Protected balances/specimens/trainer state outside EmailQA must remain unchanged. Owner may approve the whole bounded packet once; missing access is an access gate, not authority to invent a staff session. Hosted trade and broader staff Pass tests need a later concrete scope. No second controlled QA account is currently available for a two-party trade.

This is an important gameplay/economy decision under .cursor/rules/streamlink-project.mdc, separate from routine read-only development or the approved heartbeat function replacement.

## Execution so far

Owner approved this packet. The one Mart purchase passed via actual UI and SQL verification:300→200 coins,7→8 Poké Balls,one debit/order,other profiles/inventories unchanged. No purchase retry was performed. Remaining three actions have not run because no authenticated owner session is accessible. Owner sign-in requested;no further permission required for the approved actions. See evidence/qa50-mart-purchase.json.

## Gift/evolution completion and Oak prerequisite

CODEX-50 continuation: actual owner Trainer Gifts delivered exactly15 Caterpie Candy with QA reason and succeeded audit; actual EmailQA evolution10-11 succeeded once. Preserved level6/IVs/EVs/nature/moves/stamp;Metapod form11/ability61/HP23;family18→3;one evolution row;original Caterpie Familiar1 unchanged. Normal+35XP/+100coin/+2 mastery each retained,finalcoins300/balls8. Initial preflight public.candies was obsolete:authoritative family_candy had3 prior,not0;corrected and original3 preserved. Oak not attempted:onlyoneMetapod,0 eligible and server last-copy guard;no duplicate grant/bypass/extra encounter. Other profile XP/watch/team and inventory hashes unchanged;other new candy entries0. Sora/Twinkle gameplay mutations NO;owner sign-in activity is user initiated.

The proposal missed the Oak duplicate prerequisite during preparation. Both its UI and server deliberately keep the last owned copy of each species. No transfer RPC was invoked after discovering0 eligible. A successful hosted Oak test still needs a legitimate duplicate and separately scoped provisioning; the existing approved packet does not authorize another grant or catch. Do not weaken the protection to finish QA.

## Additional Metapod authorization

October 21: owner explicitly authorized giving EmailQA one additional Metapod to finish the Oak test. Use authenticated Trainer Gifts, one ordinary non-shiny Metapod at the form's default level 5, server-generated stats, and a QA audit reason. Then transfer the original evolved level-6 Metapod under the already approved Oak scope, retaining the gifted copy and normal outcomes. This supersedes the earlier duplicate-provisioning hold, not any other gameplay limit. No grant has run yet: the browser remains signed in as EmailQA, and owner access was requested. Do not bypass the staff session requirement with SQL.
