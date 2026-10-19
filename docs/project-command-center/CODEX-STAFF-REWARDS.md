# Trainer Pass and gifts - CODEX-4

Owner requested scroll/header/Inventory corrections, Pass monitoring and discretionary re-grants, persistent staff Pass control, and direct gifts. Owner chose **Keep staff override until cleared**. This narrowly supersedes historical read-only/write and database gates for this feature. D86, gameplay/encounter work, protected-account mutations, WIRE/Familiarity activation and spending remain unauthorized.

## Implemented

- Section changes preserve scroll/focus. Account status sits under the name. Inventory uses PokéCoins and Inventory Space / Evolution Candy; buttons omit snapshot wording.
- Pass shows status, provenance, override, claim times, subscription status and newest 50 ledger-backed claims/staff receipts. Timestamp alone never proves delivery.
- Owner/admin can turn Pass on/off, clear override, or give configured daily/weekly rewards again regardless of eligibility/cooldown. Inventory limits remain enforced; player claim clocks are unchanged.
- Gifts support items, Evolution Candy, canonical Kanto Pokémon, enabled titles, cosmetics and badges. Reason/confirmation bind to trainer/action; UUID receipts prevent duplicate retries and preserve atomic failed outcomes. Protected trainers remain blocked.
- Private tables deny direct client access. Public APIs require existing owner/admin guard; service credentials never enter browser code. Legacy tools remain unchanged.

## Installed backend - do not replay

Production migration `staff_trainer_pass_and_rewards`, version `20261019034158`, applied through Supabase MCP. Exact immutable package: `supabase/unapplied/codex-staff-rewards/INSTALL.sql`, SHA256 `CBDDFB53CD7CDEA1525A2559D3DBDE539919C06F6D370E7C7180F417ACA08BC2`. Despite its historical directory name, this package IS installed. GitHub does not apply SQL.

Dependency fingerprint preflight refuses drift/collisions. New grant-only adapter preserves pinned canonical generation/validation, leaving the existing WIRE-gated persister unchanged (MD5 `0d1724fb07b156d6124b2f0f556303a4`). WIRE remains false. No D85 dependency reconciled.

`refresh-pass` v5 ACTIVE, JWT verification retained. Response uses the saved effective row after override enforcement. Incomplete checks preserve effective state. Live v4 matched local source before editing.

Live catalog: RLS enabled on private tables, no client table privileges; internal functions have no client EXECUTE; public APIs deny anon and guard owner/admin. New receipt and override tables empty after installation. No real account/Pass/reward mutation tested.

Security advisors show expected deny-all RLS tables (https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) and authenticated SECURITY DEFINER APIs (https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). Intentional API entry is followed by staff authorization; local SQL verifies other-role denial.

## Evidence and limits

- 72 non-writing suites pass; build validation passes: APP `20261008-rc133`, 384 stamps. Two artifact-writing suites excluded as before.
- REAL SQL: 21 disposable embedded Postgres checks, including atomic failure, concurrent/sequential idempotence, altered UUID refusal, role/anon/protected denials, persistent override during refresh, unchanged claim clocks and actual synthetic canonical Pokémon generation with WIRE off.
- Actual Edge handler under mocks: 8 checks for effective overrides, broadcaster, incomplete/failed checks, persistence failure and unauthenticated denial. No network/hosted writes.
- REAL DOM: sanitized responsive fixture at 1440/1024/720/390; header/labels/Pass/Gifts checked. Final native keyboard Pass-to-Inventory switch preserved scrollY 400 exactly.
- Authenticated production actions and actual reward delivery remain unverified. No Sora/Twinkle/PlayTester/PlayerQA mutations, gameplay RPC, stamp, activation or spending.

Published via introducing Git commit on development/main and Pages. Hard-refresh existing Admin Hub tabs. Owner visual/function review remains open; served source is not authenticated grant proof.

## Emergency disable

Through a reviewed migration, revoke EXECUTE on `public.admin_trainer_reward_action(uuid,uuid,text,jsonb,text)` from authenticated and service_role. Preserve audits and override enforcement: deleting overrides could re-enable subscription-backed Pass. Do not drop audit data or blindly reverse grants. Read API may remain for diagnosis; restore write access only after review.
