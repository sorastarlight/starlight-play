# Proposed isolated local recovery drill

> Current status: CODEX-71 COMPLETE (October21): owner reset the database password and updated the protected helper credential. Actual bounded logical export/isolated PG17 restore passed:111 table projections/digests,585 functions,143 relations,56 policies,322 indexes,30 triggers and444 constraints verified. One exact PG17 CHECK parenthesization difference is archive-confirmed and passes49 boundary/NULL cases;default owner-only ACL representation normalized narrowly.31 omitted table data sets remain empty. Private artifacts retained outsideGit,user+SYSTEM ACL;runtime stopped. Auth/DataAPI HTTP200 and actual EmailQA Inventory pass. Physical restore/full Auth service recovery remain unverified;no new gameplay,hosted SQL,spending or APP stamp. See RECOVERY-DRILL-CODEX71.md. Earlier access holds are historical.

APPROVED by owner for the bounded local recovery drill. Native dump credential access is pending;no export/restore/provisioning has run. See RECOVERY-DRILL-CODEX65.md. Current daily-backup loss-window policy remains accepted;this approval concerns local logical recovery evidence and the specified private data copy,not hosted restore or spending.

## Recommended bounded method

Use a logical export from starlight-play into a new access-restricted directory outside Git under the current Windows user's local application data. Create only a new local loopback PostgreSQL17 test instance. Never restore into production,the card-binder project,an existing QA database or a hosted branch. No new service/plan/spending. Human handles any needed database credential through a secure local entry method;never paste credentials into chat or print connection strings. Stop if authenticated dump access is unavailable.

The exported database can include private player/support/staff audit records,legacy archives and Auth user records including credential hashes. Do not print/browse secret fields or commit any dump,data row,credential or token. Omit live session/refresh/recovery token data and Vault secret contents from the export. Keep an explicit omitted-object manifest so the result is not mistaken for complete Auth/Vault recovery. Retain restricted local artifacts for review;no permanent purge is implied.

Prepare exact dump/restore arguments and the omission manifest before execution. Restore only with network-capable/scheduling extensions and job activation disabled/omitted from the outset,not stopped after they have run. Preserve their definitions as inert metadata for comparison. No email,OAuth callback,webhook,worker delivery,reconciliation,external HTTP or gameplay smoke. Stop if extension dependencies cannot be represented safely;report incomplete coverage rather than weakening isolation or guards.

Verify coherent public/private application schema/data,roles/ACL/RLS,activation cutoffs,immutable capture identities,queues/ledgers,private archive counts and hashes and approved function fingerprints. Compare export-time counts/hashes to restored data without displaying row contents. Record PostgreSQL version,command exit codes,timing,omissions and errors. This is a logical export/restore rehearsal at a new point;it does not prove the provider's07:44physical backup can be restored or restore service/Auth configuration. Those limits must remain in the release decision.

## Why not the convenient physical clone

Only two existing projects are present,both real products;neither is a drill destination. A new hosted physical clone incurs additional project costs. More importantly,Supabase documents that copied pg_cron/network extensions can run immediately and cannot be paused before the binary restore. That conflicts with the review requirement to inspect an inert restored state before runtime starts. No clone or production job change is proposed here.

Source:[Restore to a new project](https://supabase.com/docs/guides/platform/clone-project),checkedOctober21,2026. A later physical-backup drill would require a separately reviewed safe method/cost and explicit authorization. No final release,APP stamp or production reset follows from this proposal.
