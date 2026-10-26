# Expanded shop draft catalogue

Owner-authorized Admin Hub migration. Adds a staff-edit-only read of current supported shop items and replaces only the draft writer's six-item sprite lookup with the same canonical enabled catalogue. Master Balls, disabled items, Pokémon, family Candy and unsupported item-policy entries are excluded; this does not change checkout or grant policy. Existing product codes, quantities, hidden draft status and duplicate protection remain.

Nine real local PostgreSQL check groups pass, including concurrent duplicate refusal and exact rollback. Install changes no product or player records. The new read endpoint is STABLE and is denied to anonymous users; its invoker helper is not browser executable. Existing permissions are preserved.

Run INSTALL.sql only against its exact guarded source/schema. ROLLBACK.sql refuses drift, restores the exact original six-item writer and revokes the new read/helper. It retains every product and category; no deletion occurs. Rolling back requires reverting the matching two frontend files too.
