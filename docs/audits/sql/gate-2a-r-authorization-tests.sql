-- REVIEW ARTIFACT ONLY. DO NOT RUN ON PRODUCTION.
-- Gate 2A-R authorization / drift / atomicity / response-compat checks.
-- Clone or local Postgres only.
--
-- Do not call public.admin_identity_inspect against real trainer accounts
-- while the live function still contains evaluate_cosmetics.
-- Do not mutate Sora, Twinkle, or PlayTester.
-- Do not use a real unused trainer UUID on production.

-- A. Live catalog before apply (this SELECT is also in the catalog-contract file
--    and may be run on production). Expect baseline fingerprint.
-- select md5(p.prosrc), p.provolatile, p.prosecdef
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public' and p.proname = 'admin_identity_inspect';
-- expect: 50058f99f73591a9bd77d4342653cd8c / v / true

-- B. Drift rejection (clone). Copy UP, change the expected md5 in the DO block,
--    run the script. Expect RAISE in $preflight$ and no function replace.
--    Confirm inspect md5 is still 50058f99f73591a9bd77d4342653cd8c after the abort.

-- C. Atomicity / rollback (clone). After a successful UP in an open transaction,
--    force $post$ to fail (wrong fingerprint) before COMMIT.
--    Expect the replace to roll back; live md5 remains baseline.
--    The approved UP already RAISE EXCEPTIONs in $post$; a failed postcondition
--    aborts the same transaction that holds pg_advisory_xact_lock(21021021, 2).

-- D. Authorization after apply (clone / role switch only)
begin;
  set local role anon;
  -- Use a nonexistent UUID. Do not use Sora / Twinkle / PlayTester.
  select public.admin_identity_inspect('00000000-0000-0000-0000-000000000000');
rollback;
-- expect 42501 from GRANT or staff guard — never a cosmetics write

begin;
  set local role authenticated;
  select public.admin_identity_inspect('00000000-0000-0000-0000-000000000000');
rollback;
-- expect 42501 unless the session is an actual staff JWT

-- E. Missing trainer after apply (clone only)
-- inspect a random unused UUID as staff.
-- expect: trainer JSON null or empty card fields; no INSERT to trainer_cosmetics.

-- F. Response compatibility after apply (clone only, staff session)
-- select jsonb_object_keys(public.admin_identity_inspect('<clone-staff-target>'));
-- expect exactly:
--   ok, trainer, rankingVisible, rankingEligible, cosmetics,
--   ownedAvatarPacks, titles, badges, catalog

-- G. DOWN emergency rollback (clone)
-- Apply DOWN only after a successful UP on the clone.
-- expect prosrc md5 back to 50058f99f73591a9bd77d4342653cd8c
-- and evaluate_cosmetics call site restored.
-- DOWN is emergency recovery only. It reopens R21.
