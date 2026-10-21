# CODEX-71 — Logical recovery drill completed

On October21,2026 the owner reset the database password and replaced the protected local credential. Native read-only access passed with verified TLS. The previously approved private export and isolated restore then completed. No production records or configuration were changed by this drill.

## Verified result

A shared repeatable-read snapshot supplied the native schema/data archives, filtered Auth records and source digests. All111 included table projections match restored data. All585 functions,143 relations,56 RLS policies,322 indexes and30 application triggers match. All444 constraints are accounted for. Supplemental index/trigger/constraint catalog comparisons were collected after export; the original archive independently confirms the one constraint exception below. The precise snapshot timestamp was not captured; the retained summary records the bounded export window instead.

PostgreSQL17.6 and local17.11 render one private.ref_species friendship CHECK with different AND parentheses. The exact original archive and both expressions were checked;49 combinations including NULL and boundary values agree. This is a pinned single exception, not general expression normalization. Restored NULL table ACLs are compared using PostgreSQL17's owner-only default; explicit nondefault ACLs and function ACLs remain exact.

## Private artifact safety

Artifacts remain outside Git in the restricted LocalAppData/PokemonStreamLink/recovery/codex65-20261021/drill-nDdynq directory. Recursive verification found zero unexpected allow principals across2714 paths: only the current Windows account and SYSTEM. The local server is stopped and port55487 has no listener. Retain these artifacts; no purge or production restore is authorized.

Only approved user password hashes were retained. Live sessions/reset/confirmation tokens, raw Auth metadata, provider secrets and Vault contents were excluded at source. Identity JSON uses a field allowlist. Recovery-challenge audit parents retain identity/FK references but use expired synthetic authority.31 omitted table data sets are empty locally. See the private omission manifest for exact scope; never publish raw archives, user records, credential values or private data digests.

Local roles are non-login/non-superuser except the disposable local administrator. Scheduler/network/Vault extensions are absent, preload libraries empty and background workers disabled. Cron/migration inventories remain inert metadata. No local Auth service,SMTP,OAuth,bridge,network integration or gameplay function was exercised.

## Checks and operational limits

Eleven fictional filter/isolation checks passed before using production data, including native schema restore, unknown-secret refusal, audit FK preservation and constraint/ACL equivalence.82 existing non-writing STATIC/LOCAL HARNESS suites pass;build validates31 HTML files/464 references.29 published frontend files still match checkout. APP remains20261008-rc133.

After the password reset, Auth health and public Data API GETs returned200; actual EmailQA Inventory loaded470 PokéCoins,49/50 space and7 item cards. Read-only catalog inspection confirmed the owner guard unchanged, bridge heartbeat current, zero pending Familiarity events and18 successful worker runs after the credential update with zero observed failures.

This proves bounded logical database recovery. It does not certify Supabase physical-backup restoration, full Auth service/provider/SMTP recovery, session continuity, automatic job reactivation or a recovery-time guarantee. Daily-backup loss tolerance remains the owner's accepted policy. Final release still requires the remaining security/acceptance review and explicit release decision; the deferred Twitch policy stays disabled pending real provider QA. No new hosted gameplay, grant, SQL migration, spending, scheduling change or build stamp occurred.

Evidence: [safe recovery summary](evidence/recovery-drill-codex71.json), [fictional tests](evidence/recovery-filter-fictional.json), [regressions](evidence/codex71-regressions.json), [service health](evidence/password-reset-service-health.json).

## Rechecking the retained restore

Use node tools/local-recovery-drill.js --verify-existing drill-nDdynq from the canonical checkout. This starts only the known isolated local cluster, verifies its manifest/data/schema/isolation and stops it; it does not connect to production or need its password. The default PowerShell access check remains a read-only preflight. Explicit -Operation Plan reviews source metadata; explicit -Operation Drill performs the approved export/restore and must not be treated as a routine health check. Dependencies are installed PostgreSQL17 tools and the existing pinned pg driver in tools/.cache/codex65-pg17; do not substitute arbitrary versions or bypass the reviewed manifest.
