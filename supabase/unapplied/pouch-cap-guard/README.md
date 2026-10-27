# Pouch purchase cap guard — owner decision required

Prepared and locally tested; NOT installed. Separate finding from the completed reward-box work.

The existing checkout charges the requested quantity, but private.grant_known silently clips bag_bonus at the configured cap. A fictional reproduction matching the screenshot starts at50 purchased spaces with a100-space bonus cap:8Pouches cost960PokéCoins, but only50of80advertised spaces arrive. This is a current source/local reproduction, not a production account audit.

The proposed one-function replacement validates the whole cart’s Bag space before charging, locks the existing profile/inventory in order so overlapping purchases cannot overrun the remaining allowance, and rechecks the actual grant. Oversized orders fail atomically with remaining-space guidance. The current capacity limit, unit prices, normal item purchases, permissions and idempotent order replay stay unchanged.

12isolated SQL groups pass, including the original failure, rejection without charges, exact-fit purchase, existing-order replay, cap rejection, ordinary items, repeated SKU rows, overlapping orders, unchanged ACLs, exact install/rollback and drift refusal. INSTALL/ROLLBACK guard exact source/ACL bytes. No production purchase, SQL installation, refund, balance repair or player-data edit is authorized or performed.

This additional production economy fix needs a separate owner decision under .cursor/rules/streamlink-project.mdc. Proposed activation is only this function replacement and source verification. Historical transactions/refunds require separate exact review; none are inferred here.
