-- REVIEW ARTIFACT ONLY. DO NOT APPLY WITHOUT OWNER APPROVAL.
-- Gate 2A-R: make public.admin_identity_inspect(p_user uuid) a true read.
--
-- Reviewed live baseline 2026-10-10 on starlight-play dtflmlbjhttoewqgkujf:
--   md5(pg_proc.prosrc) = 50058f99f73591a9bd77d4342653cd8c
--   length(prosrc) = 1542
--   call site: perform private.evaluate_cosmetics(p_user);
--
-- This replaces ONLY admin_identity_inspect.
-- It does not change evaluate_cosmetics, unlock_cosmetic, play_progression,
-- grants, RLS, or EXECUTE grants (R2 anon EXECUTE is out of scope).
--
-- Rollback: docs/audits/sql/gate-2a-r-identity-inspect-down.sql

do $preflight$
declare
  src text;
  vol "char";
  src_hash text;
begin
  select p.prosrc, p.provolatile, md5(p.prosrc)
    into src, vol, src_hash
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'admin_identity_inspect'
     and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_user uuid';

  if src is null then
    raise exception 'preflight: public.admin_identity_inspect(p_user uuid) is missing. Refuse to create a new endpoint here.';
  end if;
  if src_hash <> '50058f99f73591a9bd77d4342653cd8c' then
    raise exception 'preflight: live admin_identity_inspect prosrc md5 % differs from reviewed baseline 50058f99f73591a9bd77d4342653cd8c. Refuse to overwrite.', src_hash;
  end if;
  if position('if not private.is_play_admin()' in src) = 0 then
    raise exception 'preflight: staff guard missing from reviewed baseline. Refuse to overwrite.';
  end if;
  if position('perform private.evaluate_cosmetics(p_user);' in src) = 0 then
    raise exception 'preflight: expected evaluate_cosmetics call site missing. Function is not the reviewed write-read. Refuse to overwrite.';
  end if;
  if vol is distinct from 'v' then
    raise exception 'preflight: expected VOLATILE reviewed baseline. Refuse to overwrite.';
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
