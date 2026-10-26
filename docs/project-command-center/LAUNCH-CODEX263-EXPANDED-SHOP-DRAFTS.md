# CODEX-263: Expanded visual shop draft picker

New products can select enabled Poké Balls, berries, evolution items and inventory space from the server catalogue rather than six hard-coded items. Search and category filters share a bounded scrolling visual grid; quantities, prices and review stay nearby. Master Balls remain staff gifts and Pass rewards only. This slice does not add Pokémon/family Candy purchases, new item mechanics, paid Bits activation, avatar authoring or multi-reward product creation.

The staff-edit-only STABLE options endpoint returns categories, used codes and supported rewards. The existing atomic create-only writer rechecks the same live selection, so disabled items and forged Master Ball requests fail. Existing hidden draft, price/quantity bounds, unique codes, trigger validation and permission checks remain. No checkout/grant function changed. No product record was created in production.

Migration20261026041556 installed;three source hashes/ACLs match, five controls and the76-product count are unchanged. New read is denied to anonymous clients; its private invoker helper is denied to browser roles. Existing owner/admin edit authority is retained.

Validation:147 regression suites;feature31HTML508stamps;16 ready/review/empty/error layouts at320/390/768/1024 without page overflow or observed broken images. Native browser filtering, Quick Ball selection, exact review, cancel focus, pending disable and account-reset/late-save checks pass in disconnected fixtures. Nine isolated PostgreSQL groups exercise actual role helpers, READ ONLY loading, four new reward types, trigger persistence, invalid/stale reward rejection, duplicate code refusal, competing transaction refusal and exact guarded rollback. Early fixture assumptions about role SQLSTATE and code underscores were corrected; no production data was involved.

Fifty recovery files verified. Git packet: supabase/unapplied/hub-mart-draft-catalog/ . Private evidence: C:/Users/FET/AppData/Local/PokemonStreamLink/security/codex263/ . Rollback retains products/categories and restores the six-item writer while revoking the new read; frontend rollback is required with it.

Frontend publication pending:js/admin-next-create.js and css/admin-create.css only. No hosted application call, product creation/save, purchase/grant, protected-account change, credential/provider action, cleanup or APP stamp. APP20261008-rc133 unchanged.
