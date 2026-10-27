# Whole-bundle supply delivery and weekly confirmation

Prepared; not installed or published.

Scope: replace only private.pc_deliver_items(uuid,jsonb,text) and private.hub_deliver_pass(uuid,jsonb,text), and publish only js/store.js.

For DAILY_REWARD deliveries (including Pass supplies), total all physical item quantities after applying any awarded bag expansion. If the full item bundle fits, deliver all items to the Bag. Otherwise store all items through the existing PC storage/waiting mechanism. Other reward reasons retain their current delivery behavior. Coins, candy and Pokémon continue using their existing destinations. Existing stored items are not moved or regranted.

Pass receipts retain inBag/stored maps and the unique delivery idempotency key. The Mart uses that receipt for popup identity instead of reward contents, preventing identical bundles in different periods from being suppressed. A success toast remains available if the reveal API is absent; confirmation identifies the actual destination.

Validation:179 regression suites and build pass. Isolated PostgreSQL schema replay with fictional data passed eight focused checks (exact fit, spare room, insufficient/full Bag, unchanged other rewards, receipt/repeat delivery and restoration), plus guarded rollback/install/repeated-install refusal. Existing berry and calendar integration checks also passed in that replay. No production claim or player mutation was performed. Source/ACL drift aborts install and rollback; rollback changes functions only, preserving delivered rewards and receipts.

INSTALL.sql and ROLLBACK.sql are transactional. Source contracts are exact inspected definitions, with no credentials. A source-only production verification is intended after owner approval; no live claim is included.

SUPPLY-BUNDLE-DELIVERY LIVE:owner approved exact two-function install and one-file publication. Migration20261027113546;both source hashes match tested candidates and ACLs unchanged. Main9c1e76ed17e395e848f67f6af8ed09f0ae393895,Pages40497369836 SUCCESS;hosted js/store.js exact match.179suites/build;isolated SQL integration and guarded rollback/install pass.86recovery files verified. Recovery install uses base64 exact function definitions to preserve mixed source newlines;retested. No live claim, grant, protected-account change or retrospective item move. Next post-change physical backup not yet observed;October27 07:47 point predates this migration. Approval spent.
