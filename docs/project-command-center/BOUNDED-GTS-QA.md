# Proposed bounded hosted GTS acceptance

CODEX-62 proposal only. No gift, listing, offer or trade has run under this packet. General launch work and the earlier direct/GTS validation installs did not authorize hosted two-party trading.

## Accounts and fixed scope

TrainerA is existing EmailQA (`15372f80-c560-4486-bf68-e997a73ac2b8`). Its sole active specimen at read-only preflight is the existing staff-gifted normal level5 Metapod `9419c4d5-5fab-49ff-9632-5c89e6b8f97c`, source request `ff96d709-0029-4853-9b0e-5aef5a519eaf`;unlocked,not favorite,no trade cooldown. There are0 open GTS listings and0 pending offers at preparation. Recheck immediately before writes.

TrainerB must be a second ordinary email QA account controlled by the owner, proposed name EmailQA2. The owner creates/signs in to it personally, handling password and any confirmation. No Twitch identity is needed. Do not use Sora,Twinkle,PlayTester,PlayerQA or an unrelated existing trainer as the partner. Pin the actual B UUID/username after setup and verify it before any grant/list/offer/accept;if it already has meaningful player data or is staff,stop and review target scope.

After explicit approval and account setup:

1. Through actual authenticated owner Trainer Gifts, grant B exactly one ordinary normal base-form level5 Caterpie,using a clearly labeled CODEX-62 QA reason. Record the succeeded request/catch ID and normal generated result. Do not inject a catch with SQL or invent an owner session. No item,coin,candy,space,Pass or special-form/shiny grant is included. Normal server grant hooks/rewards remain retained.
2. Sign in as A. Through actual GTS, list only the pinned Metapod,requesting Caterpie,without gender/shiny restrictions and without accepting other species. Record that one listing ID. Last-copy trading is intentionally allowed by the existing policy.
3. Sign in as B. Through actual GTS, offer only the pinned new Caterpie on that exact A listing. Record one offer ID.
4. Sign in as A. Recheck the pending offer,catches,flags/cooldowns and both identities,then accept that exact offer once. Stop after the one swap. No immediate re-trade or cooldown bypass test.

The application uses a shared browser session;the owner handles the necessary sign-in switches. No session export,token reading,Auth impersonation,backend SQL mutation or credential handling to bypass this access requirement. B may be created in the owner's regular browser while the in-app owner session stays available for the gift.

## Outcomes that stay

A receives B's Caterpie and B receives A's Metapod. Normal trade receive metadata/five-minute cooldowns,team/pointer cleanup,stats,notices,eligible trade XP and any idempotent first-species/milestone rewards stay. Current trade XP helper grants5 XP for an eligible trade up to3 per trainer/day;the receive helper can grant configured first-species XP/coins subject to existing ledger idempotency. This is not a zero-balance/zero-XP-change test. Preflight those settings/histories and report exact actual deltas;stop before writes if the configured behavior materially differs from this normal single-gift/single-swap scope.

No PokéCoin purchase,real-money spending,new encounter,release,Oak transfer,evolution,reset,refund,role/Pass/provider/one-link change,Familiarity delivery,reconciliation,scheduler or APP stamp. Gift/traded Pokémon must not create new eligible Play-capture Familiarity events. Unrelated trainers' data remains untouched.

## Verification and stop conditions

Check the actual UI plus independent read-only catalog/data:exact specimen IDs/owners and preserved battle fields,one completed listing/accepted offer,expected per-user trade counters,receive cooldowns,reward ledger keys,unchanged unrelated balances/specimens and no unintended capture-credit event. Do not execute a second mutation merely to test replay;inspect receipts and rely on existing local replay cases. A refresh/read-only reload may verify final state.

Stop on missing authority,wrong/session-changed actor,unknown target/catch,lock/favorite/cooldown,unexpected competing listing/offer/participant,server error,uncertain outcome or state drift. Inspect the bound result before any decision;no automatic retry,duplicate grant,cancellation,reversal,refund or cleanup is authorized. A partial test may leave its exact QA listing/offer pending for investigation. Other trainers can see/use the public board;there is no isolated QA GTS.

This tests the actual two-account GTS UI/backend path. It does not test direct-trade UI (no current caller),provider OAuth,repeated trading,race workload or all staff permissions. CODEX-53/58 local SQL checks cover the specific validation/replay/cooldown guards without needing another live swap.
