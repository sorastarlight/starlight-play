# Berry affinity — installed

Status: **installed with explicit owner approval**, migration `20261027040048` (`berry_type_affinity`). Read-only verification matched all six tested function definitions and permissions and all 22 berry descriptions/eligibility flags. No live catch was run.

## Scope

`INSTALL.sql` atomically creates one private helper, replaces five existing private functions, and updates descriptions/catch eligibility for 22 existing berries. It guards previous definitions and ACLs, settlement/simulator contracts, and berry balance/catalog values. Catalog rows are locked before checking. Lock and statement timeouts bound execution.

- 18 specialist berries cover all 18 types. Wiki covers Steel.
- A matching specialist multiplies its existing rarity boost by 1.10, once for either type.
- Sitrus, Razz, Silver Pinap and Golden Razz remain universal with their existing boosts.
- Nine existing berries become usable for catching: Bluk, Wepear, Leppa, Persim, Figy, Wiki, Mago, Aguav and Iapapa.
- Encounter preview and settlement receive canonical form identity. Regional types come from the same pinned reference build used by WIRE. Missing nonbase mappings do not guess a bonus. The existing simulator remains base-species-only and uses the same chance function.
- The 2% floor, 85% cap, Master Ball guarantee and Pinap coin bonuses remain unchanged.
- Prices, item-drop probabilities/pool, player quantities, PC capacity, permissions and reward timing do not change.

`ROLLBACK.sql` checks installed definitions, helper permissions and catalog values before restoring prior functions, descriptions and catch eligibility. It removes the helper and preserves earned Pokémon, items and receipts. It refuses if checked definitions or catalog values have changed.

## Local evidence

37 PostgreSQL check groups pass in a disposable loopback-only PostgreSQL 17 cluster restored from schema only. No production player/Auth records were imported. Fixtures use fictional users, catalog metadata and repository-pinned Pokémon reference data. The cluster was stopped and temporary data removed afterward.

Coverage includes all 236 pinned forms × 22 berries; base/regional/dual/missing types; disabled berries; actual bag spending for every berry; actual settlement and WIRE specimen creation; capture-log rewards; success/escape/no-drop outcomes; idempotent and overlapping receipt requests; all 60 reward types; full bag → PC → waiting type overflow; withdrawal/promotion; stored-only spending denial; caps and coin preservation; drift refusal and rollback.

Successful and escaped catches were settled with both bag and PC full. Their drop and consolation Poké Ball remain safely pending. Deterministic RNG exists only inside the disposable fixture; no hosted outcome was forced.

168 JavaScript regression suites and build validation pass. `tests/berry-affinity-tests.js` verifies server descriptions take precedence over generic Mart summaries. The two description adapters were published at main `8ace08e3` (Pages run `40447439581`): `js/play-ux.js` and `js/store.js`. They do not hard-code an uninstalled bonus.

Safe results: `local-evidence.json`. Full private runner, fixtures and diagnostics: `%LOCALAPPDATA%/PokemonStreamLink/security/berry-affinity/`. Run `node <that directory>/schema-test.cjs` from the canonical checkout. It refuses hosted database environment targets and never reads the protected production database password. The retained schema-only archive and reviewed recovery packet hashes are prerequisites.

## Activation handoff

Review `docs/project-command-center/BERRY-AFFINITY-DESIGN.md`, obtain production authority, recheck contracts, apply only this packet, and publish only the two related frontend files. Verify source/catalog state without a hosted catch. A real gameplay test remains a separate bounded action. Do not add this uninstalled packet to the installed recovery manifest yet. APP remains `20261008-rc133`.
