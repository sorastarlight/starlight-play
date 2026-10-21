# Legacy cleanup packet — review stage; no destructive SQL authorized here

## Runtime replacement packet

INSTALL.sql and ROLLBACK.sql guard exact live bodies of five functions. Removes CP and AV response fields; current WIRE types use pinned ref_forms instead of lgpe_species. WIRE stats remain unchanged. Unpinned legacy specimens display unavailable battle stats instead of old model calculations; their type metadata uses the explicit current reference build. New catch/staff-gift writers and stamp no longer explicitly write AV fields. Function signatures, ACLs and authority checks remain intact. No current stored row is changed, and AV columns remain nullable.

## Disposition inventory

Read-only aggregate review:110 unpinned legacy rows across3 owners;65 not transferred,45 transferred;1 favorited;0 locked;1 referenced from profile showcase. There are55 Oak-transfer rows referencing44 distinct legacy specimens,1 listing,0 offers/direct-trade references,63 specimens with candy-ledger references,30 with evolution-log references. No legacy mastery/outbox/insert-authority reference found. Counts overlap. The full review finds46 provisional unreferenced/unfavorited/unlocked specimens (ID-set digest bf92b652da6e061172b280b6d2300817). This is NOT a deletion allow-list; protected ownership and further JSON/source references still need checking.

CLEANUP_REVIEW.sql is read-only and reproducible. It deliberately contains no DELETE, TRUNCATE, DROP or cascading operation. Source baseline and aggregate review are in docs/project-command-center/evidence/legacy-retirement-*.json. No raw specimen/profile backup is committed to GitHub.

## Before a destructive packet can be executable

1. Confirm managed backup/snapshot availability and recovery procedure in the Supabase dashboard. Current connector has no backup inspection tool; dashboard subsequently verified7 scheduled physical backups; latest2026-10-20T07:44:37Z, PITR disabled. Selective recovery remains UNVERIFIED. Create/export a private encrypted backup only to an owner-approved location, never repository/public artifacts. Verify restoration with after-insert XP/presentation/Familiarity triggers accounted for; plain reinsertion can duplicate rewards and is not a tested rollback.
2. Resolve archive versus permanent deletion for old specimens and the reference history. Recommendation: preserve immutable economy/audit evidence, archive full specimen identity privately, and retire old PC entries only through a separately tested transaction. Do not null ledger links, erase candy/evolution history, cancel listings or alter showcased/protected-account specimens as a side effect. This needs a concrete owner decision once the archive schema, exact affected set and restore rehearsal are ready.
3. Re-run source/schema/row-set guards and audit all textual UUID/source-key and nested JSON references, not just foreign keys. Include current showcases, listings/offers, direct trades, Oak, candy/evolution, capture source keys, mastery and insert authority. Pin total surviving WIRE row hashes, profile/inventory/ledger hashes and Familiarity cutoff.
4. Build archive/removal and recovery rehearsal using fictional linked rows and actual relevant triggers/constraints. Include cascade rejection, concurrent mutation, FK/reference retention and exact restoration without reward replay. Only then request a bounded irreversible cleanup decision.

## Remaining dependency retirements

- Keep existing habitat/level/gender helpers as game configuration for now: their lgpe names do not make their behavior obsolete. Any rename must update all launch/event/trade/read callers and prove equivalence across Kanto.
- lgpe_pick_moves still reads old learnsets for legacy stamp fallback. Replace this with a validated current-build/form/version learnset path without inventing Tackle or future levels. Existing two-argument helper lacks form/build pins, so this needs coordinated stamp/fallback caller work and local behavior tests.
- WIRE-off catch generation still has legacy fallback. Removing that route changes fallback gameplay and must not be hidden inside a table drop.
- Remove AV columns only after rebuilding catches_before_write's UPDATE OF column list and verifying all dynamic SQL/source callers, defaults/views/constraints. Catalog currently confirms six AV-column trigger dependencies.
- Drop lgpe_species/stat/pick_moves only after fallback replacement, selftest inventory update and reference scans pass. Never DROP CASCADE.

This packet is a staged retirement; it does not claim all legacy dependencies are gone. No paid service, gameplay RPC, scheduler, reset or build stamp is needed for this preparation.

Runtime packet applied as migration20261021023001; full117-specimen table hash unchanged.95 of110 legacy specimens match a protected owner name;15 belong to2 others. Do not include protected specimen removal without explicit scope decision and exact-ID validation.
