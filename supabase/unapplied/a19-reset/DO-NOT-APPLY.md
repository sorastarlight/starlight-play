# DO NOT APPLY

A19-RESET R-A preparation for GitHub issue #25. **Unapplied.** This folder is inventory + a fail-closed script. It is **not** A19-RESET-GO.

- Do **not** run `001_ra_pokemon_progression.sql` against project `dtflmlbjhttoewqgkujf`
- Do **not** send it through Supabase MCP `apply_migration` / `execute_sql`
- Do **not** copy it into `supabase/migrations/`
- Execution needs a later named **A19-RESET-GO** plus `SET starlight.reset_confirm = 'A19-RESET-GO'`
- Sora (`sorastarlight`) and Twinkle (`twinklephoenixstar`) are excluded
- Accounts, Twitch links, economy, Pokédex seen, site config, and `private.ref_*` are out of scope

D43 prepared this packet only. No DELETE / TRUNCATE / DROP was executed.
