# DO NOT APPLY

A19-GENVAL artifacts for GitHub issue #25. **Branch-only.** D37 authorizes writing and **disposable local Postgres rehearsal** of these files, not live execution.

- Not listed in `supabase/migrations/`
- Must not be run with Supabase MCP `apply_migration` / `execute_sql`
- Must not be applied to project `dtflmlbjhttoewqgkujf`
- Applying to live needs a **separate** owner go after independent review
- `tools/a19-genval-rehearsal.js` may run them on **127.0.0.1 embedded Postgres only**
- Does **not** replace `private.stamp_catch_row`
- Does **not** INSERT/UPDATE/DELETE `public.catches`
- A19-WIRE / reset / merge / deploy remain **UNAPPROVED**

| File | Role |
|---|---|
| `001_generate_and_assert.sql` | `generate_streamlink_mon`, `assert_streamlink_legal`, helpers, REVOKE |
| `002_rollback.sql` | DROP those functions/tables only |

Pin: `sl-ref-20261013-227b573`. Requires `private.ref_*` from A19-SCHEMA (already applied on production; loaded locally by the rehearsal).
