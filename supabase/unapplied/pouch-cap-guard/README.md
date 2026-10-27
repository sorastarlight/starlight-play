# Pouch purchase cap guard

Installed with explicit owner approval at migration20261027164355;exact source and unchanged permissions verified. No live purchase,refund,balance/history repair or protected-account mutation.

Oversized Pouch orders are rejected before charging instead of silently clipping purchased spaces at the configured cap. The full cart is checked while holding profile/inventory locks, with a further check before granting;overlapping purchases cannot charge for excess space. Capacity limits,unit prices,ordinary purchases and order replay remain unchanged.

The original fictional reproduction started with50 purchased spaces and a100-space bonus cap:eight Pouches cost960PokéCoins but delivered only50of80advertised spaces. The correction passes12localSQLgroups,including rejection with no charge,exact-fit orders,replay,cap rejection,ordinary items,duplicate SKU rows,concurrent orders,ACL preservation and guarded install/rollback/drift refusal.

INSTALL.sql and ROLLBACK.sql retain exact source/ACL guards. Historical transactions or refunds require a separate exact review;none were inferred or changed.
