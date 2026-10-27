# Saved reward gift boxes and full-day previews

Owner requested whole-delivery gift boxes in My PC using the supplied PNG, all-or-nothing unpacking to either Your Bag or the PC item box, exact advance Oak items, a Candy pack on Day7, complete clickable day previews and a clearer purchase reveal.

INSTALL guards ten existing function definitions/ACLs, the exact rotation plan and absence of the new table. Adds seven helper/API functions and one private RLS table with no direct client access. The sole new public RPC requires the authenticated trainer who owns the box, locks profile/inventory/box in order, checks complete capacity, and saves an idempotent opening receipt. No existing inventory, profile, Pokémon, reward history or saved PC contents are rewritten. No historical rewards are manufactured. No claim, grant or gameplay test is included in production verification.

New overflowing item deliveries are sealed into one box per delivery. Boxes stack as one item type within the existing30-slot layout; excess boxes wait safely if no slot is free. A box is never consumed unless every physical item fits the selected destination. Coins, Candy and Pokémon follow their existing destinations. New missed verified Pass periods use the same box flow and become claimed only after unpacking. Existing legacy Pass crates and pending catch receipts retain compatible redemption. Existing loose stored items stay loose.

Daily automatic rewards contain seven distinct items each week, each currently priced250–500PokéCoins. Cheap collector balls were replaced; no Master Balls or avatar packs. Existing snapshotted rewards retain their earned contents. The existing future activation boundary and verified-period eligibility remain unchanged. Unverified past days say No verified Pass; only actual saved entitlements say Sent To Your PC.

Oak keeps the same weighted common-Berry pool and quantities. A deterministic per-trainer/day weighted selection lets the preview and claim agree, including repeat owner tests. The seven-day Candy choice and other rewards are unchanged; Day7 uses three existing Candy sprites.

ROLLBACK stops new box creation and restores the previous schedule/claim preview functions, preserving the table, unopened boxes, read/redemption support and original PC quantities. RESUME restores this exact tested candidate. Neither packet deletes earned objects. LOCAL evidence:23 SQL check groups, full dependency replay,186 regression suites, build, real rendered day/purchase/box interactions and320/390/768/1024 layouts. Source-only production acceptance is intended; no hosted gameplay or protected-account writes.

PRODUCTION SQL installed at 20261027155547. All17function sources/ACLs match the rehearsed candidate; private RLS, direct-access/anonymous denial and pending index verified. No live claim/extraction or player-data repair. Frontend publication pending.
