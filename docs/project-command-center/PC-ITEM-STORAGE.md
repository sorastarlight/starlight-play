# My PC item storage and reward overflow

Owner approved replacing inconsistent full-bag reward behavior with PC item storage, including deposits and withdrawals. Stored items must be withdrawn before use.

## Player behavior

My PC now has Pokémon and Items tabs. Items provides search, bag/PC counts, quantity selection, deposits and withdrawals. The bag keeps its existing capacity; PC item storage has no gameplay capacity limit. Ordinary Mart purchases retain their bag-space checks. Coins, candy balances and Pokémon retain their existing destinations.

Earned physical items fill available bag space; the remainder goes to My PC with a notification. The shared flow covers normal encounter/event drops, berry bonuses, missed-throw balls, daily/Pass supplies, progression/choice rewards, native staff gifts and Bits reward delivery. Starter kits and older direct reward routes also use it. Existing pending catch receipts appear in PC totals and import exactly once during an own-account transfer. Previously discarded historical rewards are not reconstructed.

The server validates available quantity and bag space, serializes transfers and saves request receipts. Retries cannot duplicate movement. The browser retains uncertain requests across reloads and PC-tab changes until confirmed. Only explicit withdrawals move stored items into usable inventory; gameplay functions continue to consume bag contents only.

## Evidence and scope

- LOCAL SQL: 17 groups with 68 item types, full/partial overflow, deposit/withdraw conservation, duplicate and changed requests, transaction rollback, concurrent withdrawals, auth isolation, pending catch import and exact rollback. The actual throw-item spending helper rejects a stored-only Poké Ball.
- LOCAL frontend: 164 regression files and build validation pass. Rendered desktop/narrow layouts, deposit counts, keyboard confirmation and safe retry after simulated lost response passed. Fixtures blocked network access and used fictional accounts.
- PRODUCTION SQL: migration 20261026190657. All 18 function definitions/ACLs match local evidence. Three private tables have RLS and postgres-only privileges. No hosted deposits, withdrawals, claims, gameplay or protected-account actions were tested.
- Runtime publication: five files only, main 26cf6f7d2c6ab595e4da7792aba5fbf063436d6a. APP remains 20261008-rc133.
- Recovery packet: supabase/unapplied/pc-item-storage. Guarded rollback restores eleven prior functions while retaining PC contents and withdrawal access. Recovery inventory now has 74 files. A physical backup covering the new migration is not yet verified.

Hosted deployment/source evidence will be recorded after Pages completes.

Confirmed live: Pages40383961744 succeeded. All10plain/versioned runtime source checks match main26cf6f7d. No authenticated hosted navigation or player RPC was used for acceptance.
