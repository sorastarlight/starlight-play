# Berry drops and saved catch rewards

Implementation follows the owner's request and subsequent proceed instruction. It adds XP-scaled berry rewards to existing encounter loot and one standard Poké Ball for each valid failed throw. It does not replace ordinary loot, alter capture probability, activate berry affinities, or backfill historical catches.

The 60-item pool and five rarity buckets are documented in BERRY-DROP-PROGRESSION.md. The Inventory screen shows the trainer's current chance and saved pending rewards. Items are awarded immediately when space exists; otherwise the same selected item can be collected later. The server never accepts a client-selected item or RNG value.

Installation: migration 20261026183846, initially disabled. Seven function hashes and permissions matched the local rehearsal; three private tables have RLS and postgres-only privileges. Two public functions require authentication and enforce own-account receipts.

Validation: 26 fictional SQL groups, 60 actual item grant paths, 163 regression files, build validation, desktop/narrow rendered panels and full-bag interaction. The actual capture-log trigger exercised the new hook in the local database. Concurrent claims and competing grants for one remaining slot passed. Activation, stop and exact rollback passed locally. No hosted catch, claim, test grant, notification acknowledgement or protected-account action ran.

Runtime publication: four files only (inventory.html, js/inventory.js, js/catch-rewards.js, css/play.css), main fc10cffe0c740be0792e5bb1ec5b457f0e01e6fe. APP remains 20261008-rc133.

Recovery: supabase/unapplied/berry-catch-drops contains INSTALL, ACTIVATE, STOP and ROLLBACK. Rollback stops recording and restores the two replaced functions while preserving earned receipts and claim endpoints. The migration is recorded in the 72-file recovery inventory. A physical backup covering this new migration has not yet been verified.

Activation and hosted-source confirmation are recorded below after deployment completes.

Confirmed live: Pages 40379747343 succeeded; eight plain/versioned source matches passed. Policy activated at 2026-10-26 18:42:46.054568 UTC with 60 pool items. Initial connector errors were followed by a read confirming disabled/null cutoff before the guarded retry; final enabled/cutoff verification succeeded. No gameplay test ran.
