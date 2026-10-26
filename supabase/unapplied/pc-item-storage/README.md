# My PC item storage

Owner requested a shared reward overflow box inside My PC, including deposits and withdrawals; stored items must not be usable until withdrawn. This packet implements that request with uncapped PC item storage and the existing usable-bag capacity.

## Behavior

- Shared earned-item delivery fills available bag space and stores the remainder. This includes berry drops, missed-throw balls, ordinary encounter/event loot, daily/Pass supplies, milestones, choice rewards, staff gifts and Bits rewards routed through the existing reward functions.
- Direct legacy staff/event/Bits grant routes and starter kits use the shared delivery path. Direct inventory corrections and ordinary Mart purchases retain their capacity checks; no paid purchase is silently changed to a storage purchase.
- Coins, progression, candy balances, Pokémon and bag-space upgrades retain their existing destinations. Physical bag items, including Rare Candy and evolution stones, can be stored.
- Existing pending berry receipts appear in PC totals without a write on list. The first own-account transfer imports pending receipts exactly once, preserving every earned item. No historical discarded rewards are reconstructed.
- Transfers require an authenticated owner, positive whole quantities and a request UUID. The server checks the actual quantity and bag capacity while holding locks. Repeating the same request returns its saved result; changing its payload is rejected.
- Only explicit withdrawal adds PC items to the usable inventory. No gameplay consumption function reads PC storage.

## Scope and recovery

Three private RLS tables, seven new helper/API functions, and eleven existing function replacements. Existing replacements are the shared grant function, berry delivery, direct reward routing and receipt wording. Source fingerprints guard installation. Existing ACLs and provider authentication checks are preserved; new public APIs enforce auth.uid ownership. No credentials, provider settings, spending, gameplay tests or account records are changed by installation.

ROLLBACK restores the eleven exact existing definitions after fingerprint checks. It preserves PC contents, transfer history and the deposit/withdraw APIs, so rollback cannot strand or delete stored items. No destructive cleanup is included.

## Validation

- 17 local SQL groups: partial/full overflow, strict/non-strict grants, all 68 tested item types (60 drop-pool items, six valuables, Rare Candy and Master Ball), deposit/withdraw conservation for every tested key, duplicate requests, changed payloads, insufficient quantities, full bag, concurrent same/different requests, cross-account/anonymous denial, transaction rollback, old pending receipt import, exact source restoration and rollback drift refusal.
- A stored Poké Ball with zero bag quantity cannot be spent by the actual spend_bag_item helper.
- 164 regression files and build validation pass. Rendered desktop/narrow layouts, deposit count feedback and keyboard retry after an uncertain transfer pass in an isolated network-blocked fixture.
- Production verification is source/ACL only. No actual trainer deposit, withdrawal, gift or claim is performed by the agent.

Private harness and exact source snapshots: C:/Users/FET/AppData/Local/PokemonStreamLink/security/pc-items/.
