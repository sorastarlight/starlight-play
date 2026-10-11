-- REVIEW ARTIFACT ONLY. DO NOT RUN ON PRODUCTION.
-- Gate 2A-R catalog / contract checks after an approved apply on a clone.
--
-- Do not call public.admin_identity_inspect against real trainer accounts
-- while the live function still contains evaluate_cosmetics.
-- Do not mutate Sora, Twinkle, or PlayTester.

-- A. Live baseline before apply (expect hash match)
-- select md5(p.prosrc)
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public' and p.proname = 'admin_identity_inspect';
-- expect: 50058f99f73591a9bd77d4342653cd8c

-- B. After apply
-- expect: no evaluate_cosmetics / unlock_cosmetic in inspect prosrc
-- expect: provolatile = 's' (STABLE)
-- expect: prosecdef true, search_path=public, owner postgres
-- expect: staff guard still first
-- expect: ACL unchanged (anon + authenticated + service_role still present; this gate does not revoke)

-- C. Helpers unchanged
-- expect: md5 of private.evaluate_cosmetics and private.unlock_cosmetic
--         equal to the values recorded at review time in the 2A-R audit.

-- D. Authorization (clone / role switch only)
-- begin; set local role anon; select public.admin_identity_inspect(null); rollback;
-- expect 42501 from GRANT or staff guard — never a cosmetics write

-- E. Missing trainer
-- After apply, on a clone only: inspect a random unused UUID.
-- expect: trainer JSON null or empty card fields; no INSERT to trainer_cosmetics.

-- F. Rollback
-- Apply DOWN. expect prosrc md5 back to 50058f99f73591a9bd77d4342653cd8c
-- and evaluate_cosmetics call site restored.
