# CODEX-55 — Bounded hosted staff Pass acceptance proposal

Current status: owner approved the five-action packet. Repeated read-only preflight matches the state and bundle values below. The actual in-app site session still identifies EmailQA; Admin Hub correctly denies staff access. No Pass action has run. Owner site sign-in was requested as an access step only; no new approval is required for this same approved sequence. Do not use the separate Supabase dashboard login as an application staff session.

Prepared October 21, 2026. Not executed. Owner's general launch-readiness direction does not authorize extra hosted reward grants. The remaining Pass workflow needs a specific economy/override QA decision and an actual owner/admin application session; do not bypass it with SQL or use legacy actor-targeted QA tools.

Target only existing EmailQA, UUID15372f80-c560-4486-bf68-e997a73ac2b8. Current read-only preflight: Pass false, pass_source/pass_checked_at null, no staff override, daily/weekly claim timestamps null. Inventory300 coins;8 Poké Balls,5 Great,3 Ultra,10 berries,10 bait,0 lure; bag_bonus0. Existing UI capacity50 and current used36. Recheck actual UI/state immediately before each write and stop on changed target/configuration, missing authority or insufficient full-bundle space.

Proposed actual Admin Hub Trainer record → Starlight Pass sequence, with a clearly labeled CODEX-55 QA reason in each confirmation:

1. Turn Pass on once. Verify effective active status, staff-gift provenance and one succeeded audit receipt.
2. Turn Pass off once. Verify persistent staff override and retained origin/history. No Twitch subscription refresh is invoked or simulated hosted.
3. While Pass remains off, give daily rewards again once: exactly2 berries,1 bait,20 PokéCoins.
4. Still off, give weekly rewards again once: exactly5 Poké Balls,3 berries,1 lure,150 PokéCoins.
5. Clear the staff override once. With unchanged preflight subscription evidence, restore the original false Pass/null provenance and confirm the record follows subscription status again. If subscription state changed in the meantime, stop and report rather than overwriting it.

Normal grant outcomes stay: total+170 existing-game coins,+5 berries,+1 bait,+5 Poké Balls,+1 lure; expected final coins470 and bag48/50. No refund, extra inventory-space grant, forced partial delivery, player daily/weekly claim, Daily Trainer Supply claim, Pokémon grant, trade, encounter, protected account mutation, subscription unlink, role change, paid spending, reset or APP stamp. No automatic retry after an error/uncertain result; inspect the bound receipt first. No duplicate action is authorized merely to test retry.

Verify receipts/status and exact inventory deltas, unchanged player claim timestamps, preserved Pokémon/Familiarity, and unchanged unrelated trainer economy. Read player claim history separately from staff reward history; a staff re-grant is not a player claim. Scope tests the real staff dispatch/override UI and hosted backend, not Twitch callback integrity or all subscription combinations.

After completion, EmailQA remains signed in or the owner session remains as supplied; no further owner switch is required just for screenshots. User performs any needed sign-in and passwords stay private. Existing local staff module rehearsal was rerun:21 REAL LOCAL SQL checks pass, including override persistence, atomic failure, concurrent/sequential idempotence and role/protected denials. Its reward interfaces are fictional and some generator scaffolding predates later runtime changes; prior actual candy/Pokémon gift QA proves those separately. It does not substitute for these hosted Pass checks.

Approval requested: only this five-action EmailQA sequence and retained two-bundle rewards. On approval, sign in as owner in the application browser before execution. No owner inventory or Pass test action will be targeted.
