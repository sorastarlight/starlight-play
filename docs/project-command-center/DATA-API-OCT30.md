# CODEX-43 — Explicit Data API grants readiness

The owner requested action on Supabase's October30,2026 new-table grant change. Verified against the [official announcement](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically) and [API security guidance](https://supabase.com/docs/guides/api/securing-your-api). Existing relation grants are retained. New/recreated public tables require explicit role grants; RLS remains a separate row filter. Service-role RLS bypass does not replace object privileges.

## Site impact and action taken

Read-only catalog audit covered64 public tables/views. All15 traced direct Data API privilege requirements across9 relations pass. Required base tables have RLS; species_mastery_progress uses security_invoker and its underlying species_mastery_events SELECT is included. Anonymous zero-row REST reads for species/site_config returned200. Private schema remains outside the Data API (PGRST106 probe). No missing live grant was found, so no production migration, role grant, RLS edit or automatic-exposure setting change was necessary.

The contract in supabase/table-access-contract.json records browser reads (profiles, catches, species, evolution_families, evolution_rules, twitch_connections, Familiarity view/backing events), public catalog/config reads, and traced Edge Function access (service_role SELECT/UPDATE on profiles/site_config and SELECT on twitch_connections). It is a minimum direct-client contract, not an exhaustive RPC/invoker/Realtime permission model. Existing broader grants remain; removing them belongs to a separate tested security-hardening change. No credentials or trainer rows were exported.

Added tools/check-new-table-access.js to normal validate-build.js. New/modified SQL creating public tables must explicitly revoke inherited grants from PUBLIC, anon, authenticated, service_role, then declare deliberate grants. Player grants require explicit RLS in the same file. Unqualified table creation is rejected. Unchanged293 historical SQL files are recorded by normalized SHA256, not rewritten or reapplied. This preserves historical source fingerprints, recovery packets and generated seeds. Do not regenerate that history manifest to bypass a failure. A new/changed file without table creation simply passes this particular check.

This is a source preflight, not a PostgreSQL parser: dynamic DDL/routine bodies require manual review; sequence permissions, views, policy correctness and grant ordering still need real role tests. No blanket GRANT ON ALL TABLES or ALTER DEFAULT PRIVILEGES workaround was introduced. Internal RPC tables should stay private, with only the appropriate EXECUTE exposed.

supabase/table-access-template.sql is commented, non-executable guidance. New public tables must enable RLS and define scoped policies, then grant only necessary operations. Server-only tables need no player grant. Direct identity/serial inserts may need scoped sequence USAGE. Views need deliberate SELECT and invoker/security review. Future ephemeral/preview/reset environments must include these declarations in their creation migrations and run the contract check after provisioning.

Historical migration files alone are not certified as a complete replay/reset baseline: much reviewed hosted work lives in separately guarded unapplied packets. This change does not promise that supabase db reset can reconstruct the entire site, and no reset/recreation was performed. Do not bulk replay old migrations or old runtime packets to address this notice.

## Validation

16 source-preflight regression cases pass. Seven REAL LOCAL SQL checks on an isolated PostgreSQL instance with fictional rows and no default grants prove: RLS-only permission denial; explicit SELECT plus owner-row filtering; write denial; anonymous denial; service_role denial until explicitly granted; scoped backend reads; and private storage accessed by an approved definer RPC without player table grants. This is actual role switching locally, not a hosted authenticated session or full migration replay.

Commands:

- node tools/check-new-table-access.js
- node tests/new-table-access-tests.js
- node tools/data-api-grants-rehearsal.js
- node tools/data-api-access-audit.js (prints read-only SQL for the known contract)
- node tools/validate-build.js

Hosted evidence: evidence/data-api-oct30-verification.json. Existing live functionality is not expected to break on October30 from this change; future schema work is now checked. No production grant changes, encounter, gift, account mutation, scheduler, spending or APP stamp occurred. Broader advisor notices remain separate launch work.
