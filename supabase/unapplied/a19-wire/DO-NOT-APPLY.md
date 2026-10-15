# DO NOT APPLY

A19-WIRE branch-only persist pipeline for GitHub issues #25 / #18. **Unapplied to production.**

- Do **not** run these files against project `dtflmlbjhttoewqgkujf`
- Do **not** send them through Supabase MCP `apply_migration` / `execute_sql`
- Do **not** copy them into `supabase/migrations/`
- Do **not** flip `private.streamlink_wire_switch.enabled`
- Do **not** replace `private.stamp_catch_row`
- Client flags and session GUCs (`starlight.wire_genval`, and any other setting) **cannot** activate WIRE

Production activation needs a later named **A19-WIRE-APPLY** (install, switch still false) and a separate **A19-WIRE-GO** (switch on, QA first).

This folder is D45 persist + D46/D47 settle integration. Disposable local REAL SQL only.
`local/040_test_inject.sql` is rehearsal-only and must never be installed live.

**Later (D49):** Owner GO applied hashed `001`→`002`→`003` to `dtflmlbjhttoewqgkujf` via MCP. Source files stay here. Do **not** copy them into `supabase/migrations/`. `local/*` remains DO NOT APPLY. A19-WIRE-GO remains UNAPPROVED. Switch stays false.
