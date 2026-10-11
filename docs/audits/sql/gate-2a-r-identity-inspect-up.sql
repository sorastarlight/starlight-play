-- REVIEW ARTIFACT ONLY. DO NOT APPLY WITHOUT OWNER APPROVAL.
-- Gate 2A-R: make public.admin_identity_inspect(p_user uuid) a true read.
--
-- Reviewed live baseline 2026-10-10 on starlight-play dtflmlbjhttoewqgkujf:
--   md5(pg_proc.prosrc) = 50058f99f73591a9bd77d4342653cd8c
--   length(prosrc) = 1542
--   VOLATILE SECURITY DEFINER, search_path=public, owner postgres
--   returns jsonb, language plpgsql, args p_user uuid
--   ACL {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   call site: perform private.evaluate_cosmetics(p_user);
--
-- Approved post-UP fingerprint (LF function body only):
--   md5(pg_proc.prosrc) = e9091c0de1b91e67a62bade78cf8edde
--   length(prosrc) = 1496
--
-- One transaction. Advisory xact lock. Preflight + replace + postcondition
-- either all commit or all roll back. No partial apply.
-- Run as one script. Do not execute statements separately.
--
-- Does not change evaluate_cosmetics, unlock_cosmetic, play_progression,
-- RLS, or EXECUTE grants (R2 anon EXECUTE is out of scope).
--
-- Rollback: docs/audits/sql/gate-2a-r-identity-inspect-down.sql
-- DOWN restores the cosmetic-unlock side effect and reopens R21.
-- DOWN is emergency recovery only. Do not run it as routine cleanup.

begin;

select pg_catalog.pg_advisory_xact_lock(21021021, 2);

do $preflight$
declare
  oid_fn oid;
  src text;
  src_hash text;
  vol "char";
  definer boolean;
  owner_name text;
  args text;
  result text;
  lang text;
  cfg text[];
  acl text;
begin
  select p.oid, p.prosrc, md5(p.prosrc), p.provolatile, p.prosecdef,
         pg_catalog.pg_get_userbyid(p.proowner),
         pg_catalog.pg_get_function_identity_arguments(p.oid),
         pg_catalog.pg_get_function_result(p.oid),
         l.lanname, p.proconfig, p.proacl::text
    into oid_fn, src, src_hash, vol, definer, owner_name, args, result, lang, cfg, acl
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    join pg_catalog.pg_language l on l.oid = p.prolang
   where n.nspname = 'public'
     and p.proname = 'admin_identity_inspect'
     and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_user uuid';

  if oid_fn is null then
    raise exception 'preflight: public.admin_identity_inspect(p_user uuid) is missing. Refuse to create a new endpoint here.';
  end if;
  if args is distinct from 'p_user uuid' then
    raise exception 'preflight: unexpected signature %.', args;
  end if;
  if result is distinct from 'jsonb' then
    raise exception 'preflight: unexpected result type %.', result;
  end if;
  if lang is distinct from 'plpgsql' then
    raise exception 'preflight: unexpected language %.', lang;
  end if;
  if definer is distinct from true then
    raise exception 'preflight: SECURITY DEFINER is not enabled. Refuse to overwrite.';
  end if;
  if owner_name is distinct from 'postgres' then
    raise exception 'preflight: owner is %, expected postgres.', owner_name;
  end if;
  if vol is distinct from 'v' then
    raise exception 'preflight: expected VOLATILE reviewed baseline. Refuse to overwrite.';
  end if;
  if cfg is distinct from array['search_path=public']::text[] then
    raise exception 'preflight: unexpected search_path config %.', cfg;
  end if;
  if src_hash <> '50058f99f73591a9bd77d4342653cd8c' then
    raise exception 'preflight: live admin_identity_inspect prosrc md5 % differs from reviewed baseline 50058f99f73591a9bd77d4342653cd8c. Refuse to overwrite.', src_hash;
  end if;
  if position('if not private.is_play_admin()' in src) = 0 then
    raise exception 'preflight: staff guard missing from reviewed baseline. Refuse to overwrite.';
  end if;
  if position('perform private.evaluate_cosmetics(p_user);' in src) = 0 then
    raise exception 'preflight: expected evaluate_cosmetics call site missing. Refuse to overwrite.';
  end if;
  if not pg_catalog.has_function_privilege('anon', oid_fn, 'EXECUTE')
     or not pg_catalog.has_function_privilege('authenticated', oid_fn, 'EXECUTE')
     or not pg_catalog.has_function_privilege('service_role', oid_fn, 'EXECUTE')
     or not pg_catalog.has_function_privilege('postgres', oid_fn, 'EXECUTE') then
    raise exception 'preflight: unexpected EXECUTE ACL. Refuse to overwrite.';
  end if;
  if position('anon=X/postgres' in coalesce(acl, '')) = 0
     or position('authenticated=X/postgres' in coalesce(acl, '')) = 0
     or position('service_role=X/postgres' in coalesce(acl, '')) = 0 then
    raise exception 'preflight: EXECUTE ACL text % is not the reviewed grant set.', acl;
  end if;
end;
$preflight$;

create or replace function public.admin_identity_inspect(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_user is null then
    raise exception 'Pick a trainer.';
  end if;
  return jsonb_build_object(
    'ok', true,
    'trainer', private.trainer_card(p_user),
    'rankingVisible', coalesce((select ranking_visible from public.profiles where id = p_user), true),
    'rankingEligible', private.ranking_eligible_uid(p_user),
    'cosmetics', private.identity_cosmetics_json(p_user),
    'ownedAvatarPacks', private.owned_avatar_packs_json(p_user),
    'titles', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'unlocked', tt.title_id is not null, 'unlockedAt', tt.unlocked_at) order by t.sort_order)
      from public.progression_titles t
      left join public.trainer_titles tt on tt.title_id = t.id and tt.user_id = p_user
      where t.enabled
    ), '[]'::jsonb),
    'badges', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'unlocked', tb.badge_id is not null, 'unlockedAt', tb.unlocked_at) order by b.sort_order)
      from public.progression_badges b
      left join public.trainer_badges tb on tb.badge_id = b.id and tb.user_id = p_user
      where b.enabled
    ), '[]'::jsonb),
    'catalog', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'kind', c.kind, 'name', c.name) order by c.sort_order)
      from public.progression_cosmetics c where c.enabled
    ), '[]'::jsonb)
  );
end;
$function$;

alter function public.admin_identity_inspect(uuid) owner to postgres;

do $post$
declare
  oid_fn oid;
  src_hash text;
  vol "char";
  definer boolean;
  owner_name text;
  args text;
  result text;
  lang text;
  cfg text[];
begin
  select p.oid, md5(p.prosrc), p.provolatile, p.prosecdef,
         pg_catalog.pg_get_userbyid(p.proowner),
         pg_catalog.pg_get_function_identity_arguments(p.oid),
         pg_catalog.pg_get_function_result(p.oid),
         l.lanname, p.proconfig
    into oid_fn, src_hash, vol, definer, owner_name, args, result, lang, cfg
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    join pg_catalog.pg_language l on l.oid = p.prolang
   where n.nspname = 'public'
     and p.proname = 'admin_identity_inspect'
     and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_user uuid';

  if oid_fn is null or args is distinct from 'p_user uuid' or result is distinct from 'jsonb'
     or lang is distinct from 'plpgsql' or definer is distinct from true
     or owner_name is distinct from 'postgres'
     or vol is distinct from 's'
     or cfg is distinct from array['search_path=public']::text[] then
    raise exception 'postcondition: catalog properties drifted after replace. Rolling back.';
  end if;
  if src_hash <> 'e9091c0de1b91e67a62bade78cf8edde' then
    raise exception 'postcondition: post-UP prosrc md5 % is not the approved fingerprint. Rolling back.', src_hash;
  end if;
  if position('evaluate_cosmetics' in (
       select p.prosrc from pg_catalog.pg_proc p
        where p.oid = oid_fn
     )) > 0 then
    raise exception 'postcondition: evaluate_cosmetics still present. Rolling back.';
  end if;
  if not pg_catalog.has_function_privilege('anon', oid_fn, 'EXECUTE')
     or not pg_catalog.has_function_privilege('authenticated', oid_fn, 'EXECUTE') then
    raise exception 'postcondition: EXECUTE grants changed. Rolling back.';
  end if;
end;
$post$;

commit;
