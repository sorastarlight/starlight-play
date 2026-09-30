-- Expand free Team Showcase backgrounds + ADMIN/OWNER cosmetic entitlement
-- (presentation-only; no gameplay/economy grants).

-- 1) Promote curated Kanto locations to starter (free for every Trainer).
update public.progression_cosmetics
   set starter = true,
       requirement = '{"type":"starter"}'::jsonb,
       how_to = 'Available to every Trainer.',
       description = coalesce(nullif(description, ''), name)
 where id in (
   'team-bg-pallet-town',
   'team-bg-viridian-forest',
   'team-bg-route-1',
   'team-bg-mt-moon',
   'team-bg-saffron-city',
   'team-bg-safari-zone'
 );

-- Keep remaining location BGs locked for normal Trainers (admin entitlement below).
update public.progression_cosmetics
   set starter = false,
       requirement = '{"type":"admin"}'::jsonb,
       how_to = 'Coming soon — unlocks through future Trainer rewards.'
 where id in (
   'team-bg-cerulean-cave',
   'team-bg-cinnabar-lab',
   'team-bg-power-plant',
   'team-bg-victory-road'
 );

-- Optional extra locked catalog entries from existing local FRLG assets.
insert into public.progression_cosmetics (id, kind, name, description, how_to, requirement, sort_order, enabled, starter)
values
  ('team-bg-route-2', 'team_background', 'Route 2', 'Forest-edge route backdrop.', 'Coming soon — unlocks through future Trainer rewards.', '{"type":"admin"}', 230, true, false),
  ('team-bg-digletts-cave', 'team_background', 'Diglett''s Cave', 'Tunnel glow for My Team.', 'Coming soon — unlocks through future Trainer rewards.', '{"type":"admin"}', 231, true, false),
  ('team-bg-rock-tunnel', 'team_background', 'Rock Tunnel', 'Dim cavern mood for My Team.', 'Coming soon — unlocks through future Trainer rewards.', '{"type":"admin"}', 232, true, false),
  ('team-bg-seafoam-islands', 'team_background', 'Seafoam Islands', 'Icy sea-cave atmosphere.', 'Coming soon — unlocks through future Trainer rewards.', '{"type":"admin"}', 233, true, false)
on conflict (id) do update
  set kind = excluded.kind,
      name = excluded.name,
      description = excluded.description,
      how_to = excluded.how_to,
      requirement = excluded.requirement,
      sort_order = excluded.sort_order,
      enabled = excluded.enabled,
      starter = excluded.starter;

-- Backfill newly free starters (no notices).
insert into public.trainer_cosmetics (user_id, cosmetic_id, source)
select p.id, c.id, 'starter'
  from public.profiles p
  cross join public.progression_cosmetics c
 where c.kind = 'team_background'
   and c.starter
   and c.enabled
on conflict do nothing;

-- 2) Authoritative ADMIN/OWNER cosmetic entitlement (no fake ownership rows).
-- Rule: private.play_staff_role(uid) in ('admin','owner')
-- Applies ONLY to kinds: background, frame, team_background.
-- Moderators / staff are NOT entitled.

create or replace function private.cosmetic_admin_entitled(p_uid uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(private.play_staff_role(p_uid), '') in ('admin', 'owner')
     and lower(coalesce(p_kind, '')) in ('background', 'frame', 'team_background');
$function$;

create or replace function private.assert_cosmetic_owned(p_uid uuid, p_kind text, p_asset text)
returns text
language plpgsql
as $function$
declare
  rec public.progression_cosmetics;
  asset text := btrim(coalesce(p_asset, ''));
begin
  select * into rec
    from public.progression_cosmetics
   where kind = p_kind and enabled and private.cosmetic_asset(id) = asset;
  if rec.id is null then
    raise exception 'That Trainer ID look is not available.';
  end if;
  -- Admin/owner cosmetic entitlement: allow equip without inserting ownership rows.
  if private.cosmetic_admin_entitled(p_uid, rec.kind) then
    return rec.id;
  end if;
  if not private.owns_cosmetic(p_uid, rec.id) then
    if rec.starter or private.cosmetic_requirement_met(p_uid, rec.requirement) then
      perform private.unlock_cosmetic(p_uid, rec.id, coalesce(rec.requirement->>'type', 'progress'), false);
    end if;
  end if;
  if not private.owns_cosmetic(p_uid, rec.id) then
    raise exception '%', rec.how_to;
  end if;
  return rec.id;
end;
$function$;

create or replace function private.identity_cosmetics_json(p_uid uuid)
returns jsonb
language plpgsql
stable
as $function$
declare
  equipped_bg text;
  equipped_frame text;
  equipped_team_bg text;
  admin_cosmetics boolean := private.cosmetic_admin_entitled(p_uid, 'background');
begin
  if p_uid is null then
    return '[]'::jsonb;
  end if;
  select
    case when private.card_bg_ok(card_bg) then card_bg else 'hoenn' end,
    case when private.card_frame_ok(card_frame) then card_frame else 'plain' end,
    case when private.team_bg_ok(coalesce(nullif(team_bg, ''), 'starlight-gradient'))
      then coalesce(nullif(team_bg, ''), 'starlight-gradient')
      else 'starlight-gradient'
    end
    into equipped_bg, equipped_frame, equipped_team_bg
    from public.profiles where id = p_uid;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id,
      'kind', c.kind,
      'name', c.name,
      'description', c.description,
      'howTo', c.how_to,
      'asset', private.cosmetic_asset(c.id),
      'starter', c.starter,
      'unlocked', tc.cosmetic_id is not null
        or c.starter
        or (admin_cosmetics and c.kind in ('background', 'frame', 'team_background')),
      'equipped', case
        when c.kind = 'background' then private.cosmetic_asset(c.id) = equipped_bg
        when c.kind = 'frame' then private.cosmetic_asset(c.id) = equipped_frame
        when c.kind = 'team_background' then private.cosmetic_asset(c.id) = equipped_team_bg
        else false
      end,
      'isNew', tc.cosmetic_id is not null and tc.seen_at is null and not c.starter,
      'unlockedAt', tc.unlocked_at,
      'source', tc.source
    ) order by c.sort_order)
    from public.progression_cosmetics c
    left join public.trainer_cosmetics tc
      on tc.cosmetic_id = c.id and tc.user_id = p_uid
    where c.enabled
  ), '[]'::jsonb);
end;
$function$;
