-- A19-APPLY PREFLIGHT (issue #24)
-- SELECT-only catalog metadata. DO NOT RUN writes.
-- DO NOT SELECT public.catches rows, profiles, or auth.users.
-- DO NOT invoke RPCs, stamp_catch_row, or other functions except pg_catalog helpers.
-- Not a migration. Must never be copied into supabase/migrations/.

-- 1. Connection identity
SELECT current_database() AS db,
       current_user AS current_role,
       session_user AS session_role,
       current_setting('server_version') AS server_version,
       current_setting('search_path') AS search_path,
       current_setting('transaction_read_only') AS txn_read_only;

-- 2. public.catches columns (structure only)
SELECT column_name, data_type, udt_name, is_nullable, column_default, ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'catches'
ORDER BY ordinal_position;

-- 3. Staged extension columns must be absent today
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'catches'
  AND column_name IN (
    'nature_id','ability_id','ability_slot','ev_hp','ev_atk','ev_def','ev_spa','ev_spd','ev_spe',
    'move_slots','ruleset_id','content_build','hp_current','hp_max','status','held_item','gigantamax_factor'
  );

-- 4. Constraints / indexes / triggers / size estimate (no COUNT)
SELECT c.conname, c.contype, pg_get_constraintdef(c.oid) AS def
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public' AND t.relname = 'catches'
ORDER BY 1;

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'catches'
ORDER BY 1;

SELECT tg.tgname, tg.tgenabled, p.proname AS function_name, n.nspname AS function_schema, p.prosecdef
FROM pg_trigger tg
JOIN pg_proc p ON p.oid = tg.tgfoid
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE tg.tgrelid = 'public.catches'::regclass AND NOT tg.tgisinternal
ORDER BY 1;

SELECT c.relname, c.reltuples, c.relpages, c.relrowsecurity, c.relforcerowsecurity,
       pg_catalog.pg_get_userbyid(c.relowner) AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'catches';

-- 5. Incoming FKs (table names only)
SELECT n.nspname AS from_schema, t.relname AS from_table, c.conname
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE c.contype = 'f' AND c.confrelid = 'public.catches'::regclass
ORDER BY 1,2,3;

-- 6. ref_* collisions
SELECT n.nspname, c.relname, c.relkind
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public','private')
  AND c.relkind = 'r'
  AND (c.relname LIKE 'ref_%' OR c.relname = 'ref_form_policies');

-- 7. Schema ACLs and USAGE
SELECT n.nspname, pg_catalog.pg_get_userbyid(n.nspowner) AS owner, n.nspacl::text AS acl
FROM pg_namespace n
WHERE n.nspname IN ('public','private');

SELECT r.rolname,
       has_schema_privilege(r.rolname, 'private', 'USAGE') AS private_usage,
       has_schema_privilege(r.rolname, 'public', 'USAGE') AS public_usage
FROM pg_roles r
WHERE r.rolname IN ('anon','authenticated','service_role','authenticator','postgres')
ORDER BY 1;

-- 8. PostgREST settings (postgres role is often NULL on hosted)
SELECT current_setting('pgrst.db_schemas', true) AS pgrst_db_schemas,
       current_setting('pgrst.db_anon_role', true) AS pgrst_anon_role,
       current_setting('pgrst.db_extra_search_path', true) AS pgrst_extra_search_path;

-- 8b. Hosted PostgREST often stores db_schemas on role authenticator, not postgres.
SELECT rolname, rolconfig
FROM pg_roles
WHERE rolname IN ('authenticator', 'anon', 'authenticated');

-- 8c. Nonsecret WAL flags (not a backup inventory)
SELECT name, setting
FROM pg_settings
WHERE name IN ('archive_mode', 'wal_level', 'max_wal_senders');
