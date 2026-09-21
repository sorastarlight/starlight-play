-- Pokédex discovery model: authoritative SEEN + optional form_seen.
-- SEEN registration point = play_join (valid participation), plus catch safety net.
-- Remove passive play_snapshot Seen (page poll must not discover).
-- Safe historical backfill: every caught species => seen.
-- Do NOT backfill Seen from historical encounter rounds (TEST/admin uncertainty).

create table if not exists public.form_seen (
  user_id uuid not null references public.profiles(id) on delete cascade,
  form_id integer not null,
  dex integer not null check (dex between 1 and 1025),
  first_seen_at timestamptz not null default now(),
  primary key (user_id, form_id)
);

create index if not exists form_seen_user_dex_idx on public.form_seen (user_id, dex);

alter table public.form_seen enable row level security;

drop policy if exists "trainers read own form seen" on public.form_seen;
create policy "trainers read own form seen"
  on public.form_seen for select to authenticated
  using (user_id = auth.uid());

grant select on public.form_seen to authenticated;

drop function if exists private.mark_seen(uuid, integer);
drop function if exists private.mark_seen(uuid, integer, integer);

create or replace function private.mark_seen(p_uid uuid, p_dex integer, p_form_id integer default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  fid integer;
  form_dex integer;
begin
  if p_uid is null or p_dex is null or p_dex < 1 or p_dex > 151 then
    return;
  end if;

  insert into public.species_seen (user_id, dex)
  values (p_uid, p_dex)
  on conflict (user_id, dex) do nothing;

  fid := nullif(p_form_id, 0);
  if fid is null then
    fid := p_dex;
  end if;

  select pf.dex into form_dex
    from public.pokemon_forms pf
   where pf.pokemon_form_id = fid;

  if form_dex is null then
    fid := p_dex;
  elsif form_dex <> p_dex then
    -- Form must belong to the encounter species; still keep species Seen.
    return;
  end if;

  insert into public.form_seen (user_id, form_id, dex)
  values (p_uid, fid, p_dex)
  on conflict (user_id, form_id) do nothing;
end;
$function$;

-- Passive Seen only on genuine encounter participation (join), not page polls.
create or replace function public.play_join(p_round_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r public.encounter_rounds;
  uid uuid := auth.uid();
  twitch_user text;
  twitch_name text;
  already boolean;
begin
  if uid is null then raise exception 'Sign in to join.' using errcode = '42501'; end if;
  r := private.load_play_round(p_round_id);
  if private.round_paused(r) then raise exception 'The encounter is paused.'; end if;
  if not private.join_window_open(r) then raise exception 'That phase has ended.'; end if;
  insert into public.inventories (user_id) values (uid) on conflict (user_id) do nothing;
  perform private.mark_seen(uid, r.dex, r.pokemon_form_id);
  already := exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid);
  if r.source = 'mixitup' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then raise exception 'Sign in with Twitch to join the live encounter.'; end if;
    if not already then perform private.enqueue_stream_command('join', jsonb_build_object('user', twitch_user, 'name', twitch_name)); end if;
  end if;
  if already then
    return private.play_snapshot(uid, r.id) || jsonb_build_object('ok', true, 'message', 'You have joined the encounter! Please wait while other Trainers join you.');
  end if;
  insert into public.encounter_players (round_id, user_id) values (r.id, uid);
  perform private.log_activity(r.id, uid, 'joined', null);
  update public.encounter_rounds set last_action = coalesce(private.trainer_label(uid), 'A trainer') || ' joined the encounter!', updated_at = now() where id = r.id;
  return private.play_snapshot(uid, r.id) || jsonb_build_object('ok', true, 'message', 'You have joined the encounter! Please wait while other Trainers join you.');
end;
$function$;

-- Strip passive Seen from snapshot polls.
create or replace function private.play_snapshot(p_uid uuid, p_round_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r public.encounter_rounds;
  bag jsonb;
  me jsonb;
  pass jsonb;
  settings jsonb;
  enc jsonb;
  is_admin boolean;
  staff_role text;
  vis jsonb;
  inv public.inventories;
  radar_on boolean;
begin
  perform set_config('row_security', 'off', true);
  r := private.load_play_round(p_round_id);
  if r is not null then
    r := coalesce(private.settle_if_needed(r), r);
  end if;
  staff_role := case when p_uid is not null then private.play_staff_role(p_uid) else null end;
  is_admin := staff_role is not null;
  settings := private.game_settings();
  if p_uid is not null then
    perform private.ensure_broadcaster_pass(p_uid);
    inv := private.ensure_inventory(p_uid);
    radar_on := coalesce(inv.lure_until, '-infinity'::timestamptz) > now();
    if inv.lure_armed is distinct from radar_on then
      update public.inventories set lure_armed = radar_on, updated_at = now() where user_id = p_uid;
      inv.lure_armed := radar_on;
    end if;
    -- Discovery is join/catch authoritative. Do not mark_seen on snapshot.
    bag := jsonb_build_object(
      'berry', inv.berry, 'bait', inv.bait, 'pokeball', inv.pokeball,
      'greatball', inv.greatball, 'ultraball', inv.ultraball,
      'lure', inv.lure, 'coins', inv.coins,
      'capacity', private.bag_capacity(p_uid), 'used', private.item_total(inv),
      'lureArmed', radar_on, 'lureUntil', inv.lure_until
    ) || private.merge_inventory_layers(inv);
    select jsonb_build_object('active', p.starlight_pass, 'source', p.pass_source, 'checkedAt', p.pass_checked_at),
           private.normalize_encounter_settings(p.encounter_settings)
      into pass, enc from public.profiles p where p.id = p_uid;
    if r is not null then
      select jsonb_build_object('joined', true, 'prep', ep.prep, 'ball', ep.ball, 'result', ep.result, 'chance', ep.chance, 'caught', ep.caught)
        into me from public.encounter_players ep where ep.round_id = r.id and ep.user_id = p_uid;
    end if;
  end if;
  vis := private.public_round_json(r);
  return jsonb_build_object(
    'round', vis, 'me', me, 'youJoined', me is not null, 'bag', bag, 'pass', pass,
    'trainer', private.trainer_card(p_uid), 'ownedAvatarPacks', private.owned_avatar_packs_json(p_uid),
    'encounterSettings', enc, 'isAdmin', is_admin, 'staffRole', staff_role,
    'canManageSecrets', staff_role = 'owner', 'captureItems', private.capture_items_json(),
    'ballAdvice', private.play_ball_advice_json(p_uid, r),
    'pendingChoices', private.pending_choices_json(p_uid),
    'settings', jsonb_build_object(
      'clientBuild', private.client_build(), 'joinSeconds', settings->>'joinSeconds', 'prepareSeconds', settings->>'prepareSeconds',
      'throwSeconds', settings->>'throwSeconds', 'revealSeconds', settings->>'revealSeconds',
      'captureBalance', settings->'captureBalance'
    ),
    'channel', (select broadcaster_twitch_login from public.site_config where id = 1),
    'bitsStoreEnabled', false, 'bitsCatalogEnabled', true, 'coinShopEnabled', true,
    'live', (select is_live from public.stream_status where id = 1),
    'console', private.play_console_json(100)
  );
end;
$function$;

-- Catch always implies Seen (species + form), without granting extra rewards here.
create or replace function private.after_catch_xp()
returns trigger
language plpgsql
as $function$
declare
  cfg jsonb := private.progression_config();
  first_species boolean;
  first_female boolean;
  first_shiny boolean;
  catch_rate int;
  pay int;
begin
  if coalesce(new.obtained_method, '') = 'ADMIN_QA'
     or coalesce(new.source_key, '') like 'admin:%' then
    -- Still register discovery for QA catches so Pokédex states stay coherent,
    -- but skip XP/rewards (existing behavior).
    perform private.mark_seen(new.user_id, new.dex, new.pokemon_form_id);
    return new;
  end if;
  if private.round_is_test(new.round_id) then
    return new;
  end if;
  perform private.mark_seen(new.user_id, new.dex, new.pokemon_form_id);
  perform private.ensure_inventory(new.user_id);
  perform private.ensure_trainer_stats(new.user_id);
  if new.round_id is not null then
    perform private.register_capture_collection(new);
  end if;
  perform private.grant_xp(
    new.user_id, coalesce((cfg->>'catchXp')::int, 10), 'CAPTURE', 'Successful catch',
    jsonb_build_object('idempotency', 'xp-catch:' || new.id::text)
  );
  select not exists (
    select 1 from public.catches where user_id = new.user_id and dex = new.dex and id <> new.id
  ) into first_species;
  if first_species then
    perform private.grant_xp(
      new.user_id, coalesce((cfg->>'newDexXp')::int, 25), 'NEW_DEX', 'New Pokédex species',
      jsonb_build_object('idempotency', 'xp-dex:' || new.user_id::text || ':' || new.dex::text)
    );
    update public.trainer_stats
       set first_pokemon_dex = coalesce(first_pokemon_dex, new.dex), updated_at = now()
     where user_id = new.user_id;
  end if;
  if new.gender = 'Female' and new.dex = any (private.female_visual_dex()) then
    select not exists (
      select 1 from public.catches
       where user_id = new.user_id and dex = new.dex and id <> new.id
         and (gender = 'Female' or variant like '%female%')
    ) into first_female;
    if first_female then
      perform private.grant_xp(
        new.user_id, coalesce((cfg->>'firstFemaleXp')::int, 5), 'FIRST_FEMALE', 'First female variant',
        jsonb_build_object('idempotency', 'xp-female:' || new.user_id::text || ':' || new.dex::text)
      );
    end if;
  end if;
  if new.variant like '%shiny%' then
    select not exists (
      select 1 from public.catches
       where user_id = new.user_id and dex = new.dex and id <> new.id and variant like '%shiny%'
    ) into first_shiny;
    if first_shiny then
      perform private.grant_xp(
        new.user_id, coalesce((cfg->>'shinyXp')::int, 50), 'SHINY', 'First shiny of this species',
        jsonb_build_object('idempotency', 'xp-shiny:' || new.user_id::text || ':' || new.dex::text)
      );
      update public.trainer_stats
         set first_shiny_dex = coalesce(first_shiny_dex, new.dex), updated_at = now()
       where user_id = new.user_id;
    end if;
  end if;
  select s.catch_rate into catch_rate from public.species s where s.dex = new.dex;
  if exists (select 1 from public.species s where s.dex = new.dex and s.is_legendary) then
    pay := coalesce((cfg->>'legendaryXp')::int, 25);
  elsif coalesce(catch_rate, 255) <= 9 then
    pay := coalesce((cfg->>'ultraRareXp')::int, 15);
  elsif coalesce(catch_rate, 255) <= 25 then
    pay := coalesce((cfg->>'veryRareXp')::int, 10);
  elsif coalesce(catch_rate, 255) <= 75 then
    pay := coalesce((cfg->>'rareXp')::int, 5);
  else
    pay := 0;
  end if;
  if pay > 0 then
    perform private.grant_xp(
      new.user_id, pay, 'RARITY', 'Rare capture bonus',
      jsonb_build_object('idempotency', 'xp-rare:' || coalesce(new.id::text, new.dex::text))
    );
  end if;
  return new;
end;
$function$;

-- Safe backfill only: caught => seen (species + form when known).
insert into public.species_seen (user_id, dex)
select distinct c.user_id, c.dex
  from public.catches c
 where c.dex between 1 and 151
on conflict (user_id, dex) do nothing;

insert into public.form_seen (user_id, form_id, dex)
select distinct c.user_id,
       coalesce(nullif(c.pokemon_form_id, 0), c.dex),
       c.dex
  from public.catches c
 where c.dex between 1 and 151
on conflict (user_id, form_id) do nothing;

create or replace function public.play_pokedex(p_login text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  trainer uuid;
  login text := lower(btrim(coalesce(p_login, '')));
  seen jsonb;
  caught jsonb;
  seen_n int;
  caught_n int;
begin
  if login = '' then
    trainer := auth.uid();
    if trainer is null then
      raise exception 'Sign in to open your Pokédex.' using errcode = '42501';
    end if;
  else
    select id into trainer from public.profiles where lower(twitch_login) = login;
    if trainer is null then
      raise exception 'No Pokédex for that trainer yet.';
    end if;
  end if;

  select coalesce(jsonb_agg(dex order by dex), '[]'::jsonb)
    into seen from public.species_seen where user_id = trainer and dex between 1 and 151;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'dex', c.dex, 'name', c.name, 'variant', c.variant,
    'gender', c.gender, 'ball', c.ball, 'caughtAt', c.caught_at,
    'formId', coalesce(c.pokemon_form_id, c.dex)
  ) order by c.dex, c.caught_at), '[]'::jsonb)
    into caught from public.catches c where c.user_id = trainer and c.dex between 1 and 151;

  select count(*)::int into seen_n from public.species_seen where user_id = trainer and dex between 1 and 151;
  select count(distinct dex)::int into caught_n from public.catches where user_id = trainer and dex between 1 and 151;

  return jsonb_build_object(
    'ok', true,
    'login', (select twitch_login from public.profiles where id = trainer),
    'displayName', (select coalesce(nullif(display_name, ''), twitch_login) from public.profiles where id = trainer),
    'mine', auth.uid() is not null and auth.uid() = trainer,
    'seen', seen,
    'caught', caught,
    'seenCount', seen_n,
    'caughtCount', caught_n,
    'team', private.team_mons(trainer),
    'variants', private.collection_variant_stats(trainer),
    'generations', jsonb_build_array(jsonb_build_object(
      'id', 1, 'name', 'Kanto',
      'caught', caught_n,
      'seen', seen_n,
      'total', 151
    ))
  );
end;
$function$;

create or replace function public.play_pokedex_entry(p_dex integer)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  d int := p_dex;
  is_seen boolean := false;
  is_caught boolean := false;
  spec public.species;
  forms jsonb;
  form_seen_ids jsonb;
  catches jsonb;
begin
  if uid is null then
    raise exception 'Sign in to open your Pokédex.' using errcode = '42501';
  end if;
  if d is null or d < 1 or d > 151 then
    return jsonb_build_object(
      'ok', true,
      'unlocked', false,
      'reason', 'unreleased',
      'message', 'This Pokédex entry isn''t currently available.'
    );
  end if;

  select exists(select 1 from public.species_seen s where s.user_id = uid and s.dex = d) into is_seen;
  select exists(select 1 from public.catches c where c.user_id = uid and c.dex = d) into is_caught;
  if is_caught then
    is_seen := true;
  end if;

  if not is_seen then
    return jsonb_build_object(
      'ok', true,
      'unlocked', false,
      'reason', 'undiscovered',
      'dex', d,
      'seen', false,
      'caught', false,
      'message', 'You haven''t discovered this Pokémon yet.'
    );
  end if;

  select * into spec from public.species where dex = d;

  select coalesce(jsonb_agg(jsonb_build_object(
    'formId', pf.pokemon_form_id,
    'dex', pf.dex,
    'formKey', pf.form_key,
    'formLabel', pf.form_label,
    'kind', pf.kind,
    'isBase', pf.is_base,
    'hasFront', pf.has_front,
    'hasShinyFront', pf.has_shiny_front,
    'hasFemaleFront', pf.has_female_front,
    'eventTargetable', pf.event_targetable,
    'normalEncounterEnabled', pf.normal_encounter_enabled,
    'assetStatus', pf.asset_status,
    'forcedGender', pf.forced_gender
  ) order by pf.is_base desc, pf.pokemon_form_id), '[]'::jsonb)
    into forms
    from public.pokemon_forms pf
   where pf.dex = d
     and pf.asset_status = 'ready'
     and (
       pf.is_base
       or pf.event_targetable
     )
     and coalesce(pf.form_key, '') not in ('back')
     and pf.form_key !~* 'facing|back';

  select coalesce(jsonb_agg(fs.form_id order by fs.form_id), '[]'::jsonb)
    into form_seen_ids
    from public.form_seen fs
   where fs.user_id = uid and fs.dex = d;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'variant', c.variant,
    'gender', c.gender,
    'formId', coalesce(c.pokemon_form_id, c.dex),
    'shiny', c.variant like '%shiny%',
    'female', c.gender = 'Female' or c.variant like '%female%'
  ) order by c.caught_at), '[]'::jsonb)
    into catches
    from public.catches c
   where c.user_id = uid and c.dex = d;

  return jsonb_build_object(
    'ok', true,
    'unlocked', true,
    'dex', d,
    'seen', true,
    'caught', is_caught,
    'name', coalesce(spec.name, ''),
    'types', coalesce(to_jsonb(spec.types), '[]'::jsonb),
    'heightM', spec.height_m,
    'weightKg', spec.weight_kg,
    'baseSpeed', spec.base_speed,
    'isLegendary', coalesce(spec.is_legendary, false),
    'isMythical', coalesce(spec.mythical, false),
    'forms', forms,
    'formSeen', form_seen_ids,
    'catches', catches
  );
end;
$function$;

grant execute on function public.play_pokedex_entry(integer) to authenticated;
