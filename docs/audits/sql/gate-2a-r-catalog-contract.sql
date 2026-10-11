-- REVIEW ARTIFACT. Catalog SELECT only. Safe to run on production.
-- Gate 2A-R live contract / helper-volatility / no-write verification.
-- Does NOT call public.admin_identity_inspect.
-- Does NOT mutate staff_roles, trainers, or function bodies.

-- A. Inspect catalog (expect write-read baseline until UP is approved)
select
  pg_catalog.pg_get_function_identity_arguments(p.oid) as args,
  pg_catalog.pg_get_function_result(p.oid) as result,
  l.lanname,
  p.provolatile,
  p.prosecdef,
  pg_catalog.pg_get_userbyid(p.proowner) as owner,
  p.proconfig,
  md5(p.prosrc) as src_md5,
  length(p.prosrc) as src_len,
  p.proacl::text as acl,
  position('perform private.evaluate_cosmetics(p_user);' in p.prosrc) > 0 as has_write
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
join pg_catalog.pg_language l on l.oid = p.prolang
where n.nspname = 'public'
  and p.proname = 'admin_identity_inspect'
  and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_user uuid';
-- expect before UP:
--   args=p_user uuid, result=jsonb, lanname=plpgsql
--   provolatile=v, prosecdef=true, owner=postgres
--   proconfig={search_path=public}
--   src_md5=50058f99f73591a9bd77d4342653cd8c, src_len=1542
--   acl includes anon=X/postgres, authenticated=X/postgres, service_role=X/postgres
--   has_write=true
-- expect after UP (not applied):
--   provolatile=s, src_md5=e9091c0de1b91e67a62bade78cf8edde, src_len=1496, has_write=false

-- B. Reachable helpers after the evaluate_cosmetics call is removed.
-- All of these must stay STABLE or IMMUTABLE and free of DML.
select
  n.nspname || '.' || p.proname as fn,
  p.provolatile,
  p.prosecdef,
  md5(p.prosrc) as src_md5,
  p.prosrc ~* E'(^|[^a-z_])(insert|update|delete|merge|truncate)\\s' as dml,
  p.prosrc ~* 'evaluate_cosmetics|unlock_cosmetic|push_notice|ensure_trainer_stats' as write_helper
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where (n.nspname, p.proname) in (
  ('private', 'is_play_admin'),
  ('private', 'play_staff_role'),
  ('private', 'trainer_card'),
  ('private', 'ranking_eligible_uid'),
  ('private', 'identity_cosmetics_json'),
  ('private', 'owned_avatar_packs_json'),
  ('private', 'trainer_xp_progress'),
  ('private', 'collection_variant_stats'),
  ('private', 'progression_config'),
  ('private', 'catch_brief'),
  ('private', 'team_bg_ok'),
  ('private', 'trainer_sprite_ok'),
  ('private', 'card_bg_ok'),
  ('private', 'card_frame_ok'),
  ('private', 'mastery_top_json'),
  ('private', 'team_mons'),
  ('private', 'cosmetic_admin_entitled'),
  ('private', 'cosmetic_asset'),
  ('private', 'trainer_level'),
  ('private', 'xp_to_reach_level'),
  ('private', 'xp_for_level'),
  ('private', 'female_visual_dex'),
  ('private', 'game_settings')
)
order by 1;
-- expect: every row provolatile in ('s', 'i'), dml=false, write_helper=false
-- recorded 2026-10-10 live checksums:
--   private.is_play_admin                  s DEFINER 5dec088fc6372699343e924773106f9c
--   private.play_staff_role                s DEFINER 56cd588e9e8affdb6a29e7225b92919a
--   private.trainer_card                   s         3b7e21d51467aee55a4ff3ce8a03bc5e
--   private.ranking_eligible_uid           s         d6db4eca46d2c04d7649b1fa3794e9d1
--   private.identity_cosmetics_json        s         7b4d9c5b47003381019eec622050ac2b
--   private.owned_avatar_packs_json        s         32a8bf8edf1c6251a1be51ef6f01e03e
--   private.trainer_xp_progress            s         56bcd48f6888866b133239fc7cbed57a
--   private.collection_variant_stats       s         5237ebca2a304be12d69506b853d8d29
--   private.progression_config             s         2eeec805c6edd5ca07cd47873da73411
--   private.catch_brief                    s         82771304276698b6d3265ae71c1e708a
--   private.team_bg_ok                     s         e2d5134c2b6f3bf52abc34643f8fbc75
--   private.trainer_sprite_ok              s         dcf89a7480534f2c877edbe7f74f739a
--   private.card_bg_ok                     i         77b1a9cbd28e48ed0796c41da96bd99c
--   private.card_frame_ok                  s         c44e1b3c815339d924b6c6b0ea7b933f
--   private.mastery_top_json               s         fdbb105de0e091f05bd2e8868dd22f52
--   private.team_mons                      s         598973e71996893f747e3474de214c0d
--   private.cosmetic_admin_entitled        s DEFINER f8a14f311c12ea7452bc7026bdb9bfdc
--   private.cosmetic_asset                 i         dbcf12b612d8dfce2e87c0c6022ed7c7
--   private.trainer_level                  s         1991bd9372ec037cac3a616128970c00
--   private.xp_to_reach_level              s         9728299208695989c60a0d9af968c5f2
--   private.xp_for_level                   s         3347b846206bc59f0a580d78145d6462
--   private.female_visual_dex              s         09138aba566dec033a389e82c4a38ffc
--   private.game_settings                  s         2f532f8384feaa461b73d3ca8d736c4a

-- C. Confirm trainer_card does not call ensure_trainer_stats
-- (ensure_trainer_stats is VOLATILE and writes trainer_stats).
select
  position('ensure_trainer_stats' in p.prosrc) = 0 as trainer_card_skips_ensure,
  md5(p.prosrc) as trainer_card_md5
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private' and p.proname = 'trainer_card';
-- expect trainer_card_skips_ensure=true, trainer_card_md5=3b7e21d51467aee55a4ff3ce8a03bc5e

-- D. Unchanged write helpers (not rewritten by this package)
select p.proname, p.provolatile, md5(p.prosrc) as src_md5
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private'
  and p.proname in ('evaluate_cosmetics', 'unlock_cosmetic', 'push_notice', 'ensure_trainer_stats')
order by 1;
-- expect:
--   ensure_trainer_stats v e8edf6d58825f7422570fef66884b28a
--   evaluate_cosmetics   v 024bb6f7d95682dc5dbd50c676afd2af
--   push_notice          v 0916366cfefccd66f94f2736226f733e
--   unlock_cosmetic      v 90afc724cfa4362473cda04656ff432b
