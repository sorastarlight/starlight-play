# Admin Hub parity and transaction history

October28 current update: Transactions andcapture validation are installed/source verified;the earlier preparation-only sections below are historical. Analytics Checks andordinary-product copying now have separate locally tested activation packets held for owner review. See [current return review](OWNER-RETURN-REVIEW-OCT28.md). Production mainb10fac2b andSQL20261028040347;post-change backup availability is verified.

Historical inventory,October27,2026. The native Hub remains the primary staff destination. This review does not establish full functional parity or authorize retiring the old entry pages.

## What remains

The literal RPC inventory found 87 names in the old entries and 66 in the native Hub. Fifty old names are absent from the new scripts. Each now has a disposition in [the inventory](evidence/admin-parity-oct27.json): 27 replacements, nine partial replacements, eleven held workflows and three retired QA/debug tools. Name counts alone do not prove equivalent behavior.

The important gaps are transaction history, reviewed cosmetic revocation, product duplication, destructive category/product removal, bulk/paid entitlement shortcuts and field-level diagnostics parity. Existing native drafts do not constitute product duplication. Legacy self-grant and phase-stepping QA should not become ordinary staff controls. Destructive catalog cleanup remains held for the owner's exact-scope review.

## Prepared locally: PokéCoin transactions

`js/admin-coin-ledger.js` and `css/admin-coin-ledger.css` provide a standalone, disconnected read-only component. They are deliberately not mounted or loaded by the production Hub. Source-only metadata inspection confirmed that the old transaction endpoint is absent; the old button cannot simply be wired into the native Hub.

The candidate offers 20/40/100 records per page, cursor paging, optional trainer filtering and a transaction detail dialog. It shows recorded changes and before/after balances without changing them. Bigint record IDs remain decimal strings. Missing data is unavailable, rather than a fabricated zero balance. Long notes and names are escaped; source detail/idempotency fields are excluded. Changing accounts clears the view and ignores late responses.

The private endpoint/install/rollback review is at `C:\Users\FET\AppData\Local\PokemonStreamLink\security\hub-ledger\README.md`. Installation and activation remain held. No production transaction records were read and no application RPC was invoked.

Validation: 23 isolated PostgreSQL groups and 23 JavaScript model/adapter checks passed. Twenty-four real local rendered states at 320/390/768/1280 widths had no horizontal page overflow or unsafe injected DOM. Native dialog Escape restored focus; paging fetched distinct older records and returned to the first page; account reset removed the report. The SQL rehearsal uses fictional records and a controlled role-lookup stub beneath the copied current staff helper, so it does not certify production Auth policy.

## Current boundaries

Production remains at the previously verified team-editor publication, main `61c6f5d205fca886f2b7cb67221084480266a1d1`. Latest installed migration remains `20261027164355`. The next post-change physical backup is due October 28; the old October 27 point should not be repeatedly polled. No new production SQL, grants, protected-account changes, hosted notices, claims, purchases or APP stamp occurred in this review.

Batch regression: all 187 selected non-writing test suites and build validation passed. The two artifact-writing suites were excluded. Prior reported suite totals are historical; this batch records the actual selected count.
