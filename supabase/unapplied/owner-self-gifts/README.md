# Owner self-gifting

Approved by the owner on October 26, 2026. Installed as migration 20261026195430.

Only an authenticated owner may gift physical items or Pokémon to themselves through the audited staff reward action. Other protected targets remain blocked. Coins, inventory expansion, Pass actions and other unlocks remain blocked for protected targets. The Pokémon persistence guard uses the same owner-and-self check; its private ACL remains unchanged.

The gift screen exposes only Items and Pokémon for this exception. All existing validation, generation, receipts and retry handling remain in place.

Validation: 26 local SQL checks using schema-only recovery and fictional accounts; actual item delivery, duplicate receipt, protected-target and non-owner denials, Pass restrictions, unchanged ACLs, guarded rollback and reinstall. Canonical generation was not exercised locally because reference data was absent. All 164 regression suites passed. Rendered owner gifts, owner Pass and other protected target states passed.

Install and rollback refuse changed source or ACLs. Rollback removes the exception, not already delivered gifts. Three deployed source/ACL matches verified through a native read-only TLS connection after the connector's catalog queries failed.

The separately approved live assortment is six ordinary level-5 Pokémon and five each of twelve physical item types, using the owner's real session. Delivery results are recorded in the run log.
