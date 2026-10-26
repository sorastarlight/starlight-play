# Single My PC item box

Owner approved one box of 30 item types, stacked quantities, with excess earned rewards safely waiting. Manual deposits of new types are refused when full. Existing stacks still accept deposits. Items remain unusable until withdrawn into the bag.

INSTALL adds a nullable slot column and unique per-trainer slot index to the private item table, two private layout helpers and an own-account arrangement RPC. It replaces only the PC item store/read/transfer functions. No Pokémon functions, rows or layouts are changed. No existing item quantities are modified at installation. Existing stored types are projected into 30 slots without writes; additional types remain visible as waiting rewards. Normal own-account transfers materialize layout and promote waiting rewards after slots open.

All moves and automatic storage share the inventory row lock. Transfers retain UUID receipts. Reordering requires the expected layout, rejects stale/foreign/duplicate entries, and is convergent on identical retries. Private tables remain inaccessible from the Data API; public RPCs require auth.uid().

LOCAL: 19 SQL groups, 68 item types, full/partial stacks, waiting promotion, simultaneous last-slot deposits, concurrent rewards, idempotency, account isolation, read-only legacy projection, rollback preservation and drift refusal. 164 JavaScript regression suites and build validation passed. Rendered local checks covered item selection, withdrawal, keyboard-accessible move, mobile detail visibility and unchanged populated Pokémon view after tab switching. No real player transfers or grants.

Rollback restores prior store/read/transfer definitions, revokes arrangement access and preserves all item quantities and slot metadata. Roll back the three frontend files with it; the previous frontend can then access all stored items. No destructive cleanup is included.
