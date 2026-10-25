# Admin Hub redesign — October 25

Status: implementation in progress. Owner requested a coordinated redesign, complete reward selection, removal of legacy editor dependencies, and direct account corrections. This supersedes treating these features as merely future wishes. No production data cleanup has run.

## Approved direction

- Rename Support & Recovery to Service Desk throughout the current interface.
- Rename Mart & Content to Items & Economy. Replace Floors with Shop Categories in staff and player language; keep technical IDs stable until a tested migration replaces them.
- Reduce vertical stacking: focused workspaces for Products, Categories, Pass Rewards and Economy. Desktop list/detail layout, compact toolbars, clear selection, one editing task at a time; mobile single-column navigation preserves drafts and focus.
- Service Desk: ticket queue alongside conversation; selected trainer summary and recovery actions in a contextual panel. Keep internal notes visually distinct from player replies. Preserve access rules.
- Replace implementation jargon with familiar staff language. Keep actionable failure messages, confirmation of costs and uncertainty protections.
- Shared visual reward picker for supported balls, berries, evolution candy, Pokémon and other sellable items. Search, category filters, sprites, quantity and reward-specific options. Existing eight-key Pass whitelist is insufficient and requires delivery/storage changes, not just a larger menu.
- Secret Gift per reward: staff sees actual contents and a concealment marker; player sees gift-box art and neutral text before delivery. Ensure hidden contents are not leaked through payloads, accessible names, alt text or previews. Reveal delivered contents normally. Exact reveal timing remains subject to existing claim flow review.
- Replace unsupported-product handoffs with fully migrated editing workflows. Inventory all product/payment/reward structures before conversion; archive and validate exact mappings and rollback. Do not silently delete active products, purchases, receipts, balances or player holdings under a generic wipe instruction.
- Direct trainer corrections are separate from gifts: set resulting item quantity, PokéCoins or capacity with before/after review, staff reason and audit history. Never silently discard inventory when reducing capacity below current usage.
- Pokémon are unique specimens. Owner explicitly chose selecting exact specimens for removals. Show identity, stats and protections before removal; additions need valid generated specimen data. A species count must not hide which Pokémon are removed.

## Implementation sequence

1. Current wording and navigation audit; compact disconnected redesign using realistic populated data.
2. Service Desk and Items & Economy layout implementation and responsive/keyboard review.
3. Shared catalog and delivery contract inventory; locally tested reward schema, Secret Gift serialization and migrations/rollback.
4. Direct correction endpoints and UI with concurrency checks, immutable audit records, preview/confirmation and retry safety.
5. Exact legacy conversion packet: counts, mappings, archive, recovery and verification. Owner reviews destructive production scope before execution.
6. Scoped production publication/install and bounded acceptance. Do not mark local fixtures as hosted evidence.

## First changes

Local shell headings and trainer links renamed. No runtime capability expanded yet. Module-level category wording, public Mart wording, layout work and all new editing functionality remain outstanding. Nothing from this redesign has been published.

Progress: compact shop views and Service Desk first slice published; expanded reward picker and correction models local only. Master Balls are staff-gift/Pass-only, never shop purchases. Daily/weekly typed draft controller now tested; complete server delivery and cleanup proposal still required.


Current progress: Service Desk and native product editing, expanded Pass rewards/Secret Gifts and direct trainer Corrections are LIVE (CODEX243–245). Earlier local-only statements above are historical. Remaining migration includes full configuration, Director/encounter tools and System/integrations; protected account edits and destructive cleanup have not run.
