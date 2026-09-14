-- Release-candidate correctness: semantic shiny helpers, capture-log flag repair,
-- unknown-ball logging, client build stamp, and an admin capture health RPC.
-- Does not change capture odds.

create or replace function private.variant_is_shiny(p_variant text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_variant, '') ilike '%shiny%';
$$;

create or replace function private.variant_is_female_visual(p_variant text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_variant, '') ilike '%female%';
$$;

create or replace function private.visual_variant(p_dex int, p_gender text, p_shiny boolean)
returns text
language sql
stable
as $$
  select case
    when coalesce(p_shiny, false) and coalesce(p_gender, '') = 'Female' and p_dex = any (private.female_visual_dex()) then 'shiny-female'
    when coalesce(p_shiny, false) then 'shiny'
    when coalesce(p_gender, '') = 'Female' and p_dex = any (private.female_visual_dex()) then 'female'
    else 'normal'
  end;
$$;

create or replace function private.client_build()
returns text
language sql
stable
as $$
  select coalesce(nullif(private.game_settings()->>'clientBuild', ''), '20260914-rc1');
$$;

create or replace function private.capture_round_context(p_round uuid, p_uid uuid)
returns jsonb
language plpgsql
stable
as $$
declare
  r public.encounter_rounds%rowtype;
  ep public.encounter_players%rowtype;
  contributors int;
  participants int;
  owns boolean;
begin
  select * into r from public.encounter_rounds where id = p_round;
  if not found then
    return null;
  end if;
  select * into ep from public.encounter_players where round_id = p_round and user_id = p_uid;
  select count(*)::int, count(*) filter (where prep = 'bait')::int
    into participants, contributors
    from public.encounter_players where round_id = p_round;
  select exists (
    select 1 from public.catches c where c.user_id = p_uid and c.dex = r.dex
  ) into owns;
  return private.capture_chance(
    r.dex,
    ep.ball,
    case when ep.prep = 'bait' then null else ep.prep end,
    contributors,
    participants,
    ep.prep = 'bait',
    owns,
    private.variant_is_shiny(r.variant),
    1.0,
    now()
  );
end;
$$;

do $patch$
declare
  src text;
begin
  src := pg_get_functiondef('private.settle_if_needed(public.encounter_rounds)'::regprocedure);
  src := replace(src, 'r.variant = ''shiny''', 'private.variant_is_shiny(r.variant)');
  src := replace(src, 'c.variant = ''shiny''', 'private.variant_is_shiny(c.variant)');
  execute src;

  src := pg_get_functiondef('private.award_encounter_rewards(uuid,uuid,boolean,text,jsonb)'::regprocedure);
  src := replace(src, 'r.variant = ''shiny''', 'private.variant_is_shiny(r.variant)');
  src := replace(src, 'c.variant = ''shiny''', 'private.variant_is_shiny(c.variant)');
  execute src;
end
$patch$;

update public.capture_log
   set is_shiny = true
 where private.variant_is_shiny(variant)
   and coalesce(is_shiny, false) = false;

update public.site_config
   set game_settings = coalesce(game_settings, '{}'::jsonb) || jsonb_build_object('clientBuild', '20260914-rc1'),
       updated_at = now()
 where id = 1;

do $settings$
declare
  src text;
begin
  src := pg_get_functiondef('private.play_snapshot(uuid,uuid)'::regprocedure);
  if src like '%clientBuild%' then
    return;
  end if;
  src := replace(
    src,
    '''joinSeconds'', settings->>''joinSeconds''',
    '''clientBuild'', private.client_build(), ''joinSeconds'', settings->>''joinSeconds'''
  );
  execute src;
end
$settings$;

create or replace function public.admin_capture_health()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  tests jsonb;
  recent jsonb;
  missing int;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('name', t.name, 'passed', t.passed, 'detail', t.detail)), '[]'::jsonb)
    into tests
    from private.capture_self_test() t;
  select jsonb_build_object(
    'throws', count(*),
    'expected', round(coalesce(sum(final_chance), 0), 3),
    'actual', count(*) filter (where success)
  ) into recent
  from public.capture_log
  where ball_key is not null and ball_key <> 'masterball';
  select count(*)::int into missing
  from public.encounter_players ep
  join public.encounter_rounds r on r.id = ep.round_id
  left join public.capture_log l on l.round_id = ep.round_id and l.user_id = ep.user_id
  where ep.ball is not null
    and coalesce(ep.result, '') not in ('No throw', '')
    and r.started_at > now() - interval '14 days'
    and l.id is null;
  return jsonb_build_object(
    'ok', true,
    'clientBuild', private.client_build(),
    'ultraMultiplier', (select base_multiplier from public.capture_balls where key = 'ultraball'),
    'selfTest', tests,
    'recent', recent,
    'unknownBalls', (select count(*) from public.capture_log where coalesce(detail->'ball'->>'condition', '') = 'UNKNOWN'),
    'shinyFemaleUnflagged', (select count(*) from public.capture_log where variant = 'shiny-female' and not is_shiny),
    'missingLogs', missing
  );
end;
$$;

grant execute on function public.admin_capture_health() to authenticated;
