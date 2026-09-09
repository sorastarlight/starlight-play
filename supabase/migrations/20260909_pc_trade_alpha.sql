-- My PC boxes, Alpha stamp, trade trainer sprites, pack names, admin gender/shiny.

alter table public.catches
  add column if not exists is_alpha boolean not null default false;

alter table public.profiles
  add column if not exists pc_layout jsonb;

update public.catches
  set is_alpha = (abs(hashtext(id::text || 'alpha')) % 128) = 0
  where is_alpha = false;

create or replace function private.catches_before_write()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.id is null then
      new.id := gen_random_uuid();
    end if;
    new.is_alpha := (abs(hashtext(new.id::text || 'alpha')) % 128) = 0;
  end if;
  new := private.stamp_catch_row(new);
  return new;
end;
$$;

create or replace function private.catch_json(c public.catches)
returns jsonb
language plpgsql
stable
as $$
declare
  spec public.lgpe_species;
  listed boolean;
  st_hp int;
  st_atk int;
  st_def int;
  st_spa int;
  st_spd int;
  st_spe int;
begin
  select * into spec from public.lgpe_species where dex = c.dex;
  listed := exists (select 1 from public.trade_listings t where t.catch_id = c.id and t.status = 'open');
  st_hp := private.lgpe_stat(spec.hp, c.iv_hp, c.av_hp, c.level, true);
  st_atk := private.lgpe_stat(spec.atk, c.iv_atk, c.av_atk, c.level, false);
  st_def := private.lgpe_stat(spec.def, c.iv_def, c.av_def, c.level, false);
  st_spa := private.lgpe_stat(spec.spa, c.iv_spa, c.av_spa, c.level, false);
  st_spd := private.lgpe_stat(spec.spd, c.iv_spd, c.av_spd, c.level, false);
  st_spe := private.lgpe_stat(spec.spe, c.iv_spe, c.av_spe, c.level, false);
  return jsonb_build_object(
    'id', c.id,
    'publicId', c.public_id,
    'dex', c.dex,
    'name', c.name,
    'nickname', c.nickname,
    'variant', c.variant,
    'gender', c.gender,
    'ball', c.ball,
    'caughtAt', c.caught_at,
    'level', coalesce(c.level, 12),
    'size', coalesce(c.size_class, 'M'),
    'isAlpha', coalesce(c.is_alpha, false),
    'types', coalesce(spec.types, '{}'::text[]),
    'moves', coalesce(c.moves, '{}'::text[]),
    'ivs', jsonb_build_object('hp', coalesce(c.iv_hp, 0), 'atk', coalesce(c.iv_atk, 0), 'def', coalesce(c.iv_def, 0), 'spa', coalesce(c.iv_spa, 0), 'spd', coalesce(c.iv_spd, 0), 'spe', coalesce(c.iv_spe, 0)),
    'avs', jsonb_build_object('hp', coalesce(c.av_hp, 0), 'atk', coalesce(c.av_atk, 0), 'def', coalesce(c.av_def, 0), 'spa', coalesce(c.av_spa, 0), 'spd', coalesce(c.av_spd, 0), 'spe', coalesce(c.av_spe, 0)),
    'stats', jsonb_build_object('hp', st_hp, 'atk', st_atk, 'def', st_def, 'spa', st_spa, 'spd', st_spd, 'spe', st_spe),
    'cp', greatest(10, floor((st_atk * sqrt(greatest(st_def, 1)) * sqrt(greatest(st_hp, 1)) * power((least(coalesce(c.level, 1), 40)::numeric / 40.0) * 0.7903, 2)) / 10)),
    'otName', c.ot_name,
    'otNumber', c.ot_number,
    'otUserId', c.ot_user_id,
    'metLevel', coalesce(c.met_level, c.level),
    'metLocation', c.met_location,
    'heightM', c.height_m,
    'weightKg', c.weight_kg,
    'friendship', coalesce(c.friendship, 0),
    'listed', listed,
    'transferredAt', c.transferred_at
  );
end;
$$;

create or replace function public.play_storage()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  mons jsonb;
  candy jsonb;
  ids uuid[];
  layout jsonb;
begin
  if uid is null then
    raise exception 'Sign in to open My PC.' using errcode = '42501';
  end if;
  select coalesce(team_ids, '{}'::uuid[]), coalesce(pc_layout, '{}'::jsonb)
    into ids, layout
    from public.profiles
    where id = uid;
  select coalesce(jsonb_agg(private.catch_json(c) || jsonb_build_object(
    'onTeam', c.id = any (ids)
  ) order by c.caught_at desc), '[]'::jsonb)
    into mons
    from public.catches c
    where c.user_id = uid and c.transferred_at is null;
  select coalesce(jsonb_agg(jsonb_build_object('key', candy_key, 'qty', qty) order by candy_key), '[]'::jsonb)
    into candy
    from public.candies
    where user_id = uid and qty > 0;
  return jsonb_build_object(
    'ok', true,
    'mons', coalesce(mons, '[]'::jsonb),
    'candies', coalesce(candy, '[]'::jsonb),
    'teamIds', coalesce(ids, '{}'::uuid[]),
    'layout', coalesce(layout, '{}'::jsonb),
    'message', 'My PC'
  );
end;
$$;

create or replace function public.play_save_pc(p_layout jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  src jsonb := coalesce(p_layout->'boxes', '[]'::jsonb);
  out_boxes jsonb := '[]'::jsonb;
  box jsonb;
  name text;
  slot_val text;
  slot_id uuid;
  slots jsonb;
  seen uuid[] := '{}';
  i int;
  j int;
begin
  if uid is null then
    raise exception 'Sign in to save your PC.' using errcode = '42501';
  end if;
  if jsonb_typeof(src) <> 'array' or jsonb_array_length(src) < 1 or jsonb_array_length(src) > 20 then
    raise exception 'Keep between 1 and 20 named boxes.';
  end if;
  for i in 0 .. jsonb_array_length(src) - 1 loop
    box := src->i;
    name := left(btrim(coalesce(box->>'name', format('BOX %s', i + 1))), 12);
    if name = '' then
      name := format('BOX %s', i + 1);
    end if;
    slots := '[]'::jsonb;
    for j in 0 .. 29 loop
      slot_val := null;
      if jsonb_typeof(box->'slots') = 'array' and j < jsonb_array_length(box->'slots')
         and jsonb_typeof(box->'slots'->j) <> 'null' then
        slot_val := nullif(btrim(box->'slots'->>j), '');
      end if;
      if slot_val is null then
        slots := slots || jsonb_build_array(null::text);
      else
        begin
          slot_id := slot_val::uuid;
        exception when others then
          raise exception 'Invalid Pokémon in a box slot.';
        end;
        if slot_id = any (seen) then
          raise exception 'A Pokémon cannot sit in two box slots.';
        end if;
        if not exists (
          select 1 from public.catches c
          where c.id = slot_id and c.user_id = uid and c.transferred_at is null
        ) then
          raise exception 'A box slot is not one of your Pokémon.';
        end if;
        seen := seen || slot_id;
        slots := slots || jsonb_build_array(slot_id);
      end if;
    end loop;
    out_boxes := out_boxes || jsonb_build_array(jsonb_build_object('name', name, 'slots', slots));
  end loop;
  update public.profiles
    set pc_layout = jsonb_build_object('boxes', out_boxes), updated_at = now()
    where id = uid;
  return public.play_storage();
end;
$$;

create or replace function public.play_transfer_oak(p_catch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  c public.catches;
  size_key text;
  candy_key text;
  transferred int;
  extra boolean := false;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  select * into c from public.catches where id = p_catch_id and user_id = uid and transferred_at is null for update;
  if c.id is null then
    raise exception 'That Pokémon is not in your storage.';
  end if;
  if exists (select 1 from public.profiles p where p.id = uid and c.id = any (p.team_ids)) then
    raise exception 'Take it off your team before transferring to Professor Oak.';
  end if;
  if exists (select 1 from public.trade_listings t where t.catch_id = c.id and t.status = 'open') then
    raise exception 'Take it off the trade board first.';
  end if;
  size_key := case
    when coalesce(c.is_alpha, false) or strpos(coalesce(c.variant, ''), 'shiny') > 0 then '-xl'
    else ''
  end;
  candy_key := 'species-' || c.dex::text || size_key;
  perform private.grant_candy(uid, candy_key, 1);
  insert into public.oak_transfers (user_id, dex, catch_id, candy_key)
  values (uid, c.dex, c.id, candy_key);
  select count(*)::int into transferred from public.oak_transfers where user_id = uid and dex = c.dex;
  if transferred > 0 and transferred % 50 = 0 then
    perform private.grant_candy(uid, candy_key, 1);
    extra := true;
  end if;
  update public.catches set transferred_at = now() where id = c.id;
  perform private.pull_from_team(uid, c.id);
  return public.play_storage() || jsonb_build_object(
    'ok', true,
    'message', format(
      'Professor Oak took %s. You received %s%s.',
      coalesce(nullif(c.nickname, ''), c.name),
      case when size_key = '-xl' then c.name || ' Candy XL' else c.name || ' Candy' end,
      case when extra then ' plus a bonus candy for transferring 50 of this species' else '' end
    )
  );
end;
$$;

create or replace function private.trade_listing_json(l public.trade_listings)
returns jsonb
language plpgsql
stable
as $$
declare
  c public.catches;
  trainer public.profiles;
  offers int;
begin
  select * into c from public.catches where id = l.catch_id;
  select * into trainer from public.profiles where id = l.user_id;
  select count(*)::int into offers from public.trade_offers o where o.listing_id = l.id and o.status = 'pending';
  return jsonb_build_object(
    'id', l.id,
    'createdAt', l.created_at,
    'status', l.status,
    'wantDex', l.want_dex,
    'note', l.note,
    'offers', offers,
    'mine', auth.uid() is not null and l.user_id = auth.uid(),
    'trainer', jsonb_build_object(
      'login', trainer.twitch_login,
      'displayName', coalesce(nullif(trainer.display_name, ''), trainer.twitch_login, 'Trainer'),
      'avatar', trainer.avatar_url,
      'sprite', trainer.trainer_sprite
    ),
    'mon', private.catch_json(c)
  );
end;
$$;

create or replace function private.premium_avatar_catalog()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_array(
    jsonb_build_object(
      'sku', 'avatar-sonic',
      'name', 'Sonic The Hedgehog Advance Trainer Sprite Pack',
      'cost', 200,
      'pack', 'sonic',
      'blurb', 'Unlock Sonic Advance and Sonic Origins looks for your Trainer ID.',
      'looks', jsonb_build_array(
        'sonic-sonic', 'sonic-origins-sonic',
        'sonic-tails', 'sonic-origins-tails',
        'sonic-knuckles', 'sonic-origins-knuckles',
        'sonic-amy', 'sonic-origins-amy',
        'sonic-cream'
      )
    ),
    jsonb_build_object(
      'sku', 'avatar-digimon',
      'name', 'Digimon Adventure Trainer Sprite Pack',
      'cost', 250,
      'pack', 'digimon',
      'blurb', 'Unlock Taichi, Yamato, Sora, Hikari, Takeru, Joe, Mimi, and Koushiro for your Trainer ID.',
      'looks', jsonb_build_array('taichi', 'yamato', 'sora', 'hikari', 'takeru', 'joe', 'mimi', 'koushiro')
    ),
    jsonb_build_object(
      'sku', 'avatar-genderbend',
      'name', 'Pokémon Genderbending Sprite Pack',
      'cost', 200,
      'pack', 'genderbend',
      'blurb', 'Unlock Ashley Crossdress Kanto, Alola, and Unova, plus Serena Crossdress, for your Trainer ID.',
      'looks', jsonb_build_array(
        'ashley',
        'ashley-crossdress-alola',
        'ashley-crossdress-unova',
        'serena-crossdress'
      )
    )
  );
$$;

create or replace function private.public_round_json(r encounter_rounds)
returns jsonb
language plpgsql
stable
as $$
declare
  ph text;
  participants int;
  prepared int;
  thrown int;
  bait_count int;
  rules jsonb;
  shared numeric;
  activity jsonb;
  honey jsonb;
  catchers jsonb;
begin
  if r is null then
    return null;
  end if;
  ph := private.round_phase(r);
  rules := coalesce(r.rules, private.game_settings());
  select
    count(*)::int,
    count(*) filter (where prep is not null)::int,
    count(*) filter (where ball is not null)::int,
    count(*) filter (where prep = 'bait')::int
  into participants, prepared, thrown, bait_count
  from public.encounter_players
  where round_id = r.id;
  shared := coalesce((rules->>'maxBaitBonus')::numeric, 0) * bait_count / greatest(participants, 1);
  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
    into activity
    from (
      select a.display_name as name, a.kind, a.item, a.created_at as at
      from public.encounter_activity a
      where a.round_id = r.id
      order by a.created_at desc, a.id desc
      limit 40
    ) x;
  select coalesce(jsonb_agg(jsonb_build_object(
      'name', coalesce(private.trainer_label(ep.user_id), 'Trainer')
    ) order by coalesce(private.trainer_label(ep.user_id), 'Trainer')), '[]'::jsonb)
    into honey
    from public.encounter_players ep
    where ep.round_id = r.id and ep.prep = 'bait';
  if r.resolved or ph in ('reveal', 'closed') then
    select coalesce(jsonb_agg(jsonb_build_object(
        'name', coalesce(private.trainer_label(ep.user_id), 'Trainer'),
        'ball', ep.ball
      ) order by coalesce(private.trainer_label(ep.user_id), 'Trainer')), '[]'::jsonb)
      into catchers
      from public.encounter_players ep
      where ep.round_id = r.id and coalesce(ep.caught, false);
  else
    catchers := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'id', r.id,
    'source', r.source,
    'phase', ph,
    'hidden', r.hidden,
    'cancelled', r.cancelled,
    'resolved', r.resolved,
    'dex', r.dex,
    'name', r.name,
    'variant', r.variant,
    'gender', r.gender,
    'location', coalesce(nullif(r.pokemon->>'location', ''), private.lgpe_habitat(r.dex)),
    'startedAt', r.started_at,
    'endsAt', private.phase_ends_at(r, ph),
    'deadlines', r.deadlines,
    'participants', participants,
    'prepared', prepared,
    'thrown', thrown,
    'baitBonusPercent', round(100 * shared, 1),
    'lastAction', r.last_action,
    'activity', activity,
    'honeyTrainers', coalesce(honey, '[]'::jsonb),
    'catchers', coalesce(catchers, '[]'::jsonb),
    'results', case when r.resolved or ph in ('reveal', 'closed') then (
      select jsonb_build_object(
        'caught', count(*) filter (where caught)::int,
        'escaped', count(*) filter (where result = 'Escaped')::int,
        'noThrow', count(*) filter (where coalesce(result, '') = 'No throw')::int,
        'catchers', coalesce(catchers, '[]'::jsonb)
      )
      from public.encounter_players
      where round_id = r.id
    ) else null end
  );
end;
$$;

drop function if exists public.admin_start_round(integer);

create or replace function public.admin_start_round(p_dex int default null, p_gender text default null, p_shiny boolean default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  settings jsonb;
  chosen_dex int;
  chosen_name text;
  chosen_variant text := 'normal';
  chosen_gender text;
  t timestamptz := now();
  deadlines jsonb;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  r := private.sync_latest_round();
  if private.round_is_active(r) then
    raise exception 'A community round is already running.';
  end if;
  settings := private.game_settings();
  if p_dex is null then
    chosen_dex := floor(random() * 151 + 1)::int;
  else
    chosen_dex := p_dex;
  end if;
  if chosen_dex < 1 or chosen_dex > 151 then
    raise exception 'Choose a Pokédex number from 1 to 151.';
  end if;
  select name into chosen_name from public.species where dex = chosen_dex;
  if p_gender in ('Male', 'Female', 'Genderless') then
    chosen_gender := p_gender;
  else
    chosen_gender := private.lgpe_roll_gender(chosen_dex, floor(random() * 2147483647)::int, null);
  end if;
  if p_shiny is true then
    chosen_variant := case when chosen_gender = 'Female' then 'shiny-female' else 'shiny' end;
  elsif p_shiny is false then
    chosen_variant := case when chosen_gender = 'Female' then 'female' else 'normal' end;
  elsif random() < (1.0 / 4096.0) then
    chosen_variant := case when chosen_gender = 'Female' then 'shiny-female' else 'shiny' end;
  else
    chosen_variant := case when chosen_gender = 'Female' then 'female' else 'normal' end;
  end if;
  deadlines := jsonb_build_object(
    'join', t + make_interval(secs => coalesce((settings->>'joinSeconds')::double precision, 30)),
    'prepare', t + make_interval(secs => coalesce((settings->>'joinSeconds')::double precision, 30) + coalesce((settings->>'prepareSeconds')::double precision, 20)),
    'throw', t + make_interval(secs => coalesce((settings->>'joinSeconds')::double precision, 30) + coalesce((settings->>'prepareSeconds')::double precision, 20) + coalesce((settings->>'throwSeconds')::double precision, 15)),
    'reveal', t + make_interval(secs => coalesce((settings->>'joinSeconds')::double precision, 30) + coalesce((settings->>'prepareSeconds')::double precision, 20) + coalesce((settings->>'throwSeconds')::double precision, 15) + coalesce((settings->>'revealSeconds')::double precision, 12))
  );
  insert into public.encounter_rounds (
    phase, hidden, pokemon, dex, name, variant, gender, started_at, deadlines, rules, resolved, cancelled, last_action, ends_at
  ) values (
    'join', false,
    jsonb_build_object('dex', chosen_dex, 'name', chosen_name, 'variant', chosen_variant, 'gender', chosen_gender, 'location', private.lgpe_habitat(chosen_dex)),
    chosen_dex, chosen_name, chosen_variant, chosen_gender, t, deadlines, settings, false, false,
    chosen_name || ' appeared!',
    (deadlines->>'join')::timestamptz
  ) returning * into r;
  return private.play_snapshot(auth.uid()) || jsonb_build_object(
    'ok', true,
    'message', chosen_name || ' appeared! Trainers can join on the Play page.'
  );
end;
$$;

grant execute on function public.play_storage() to authenticated;
grant execute on function public.play_save_pc(jsonb) to authenticated;
grant execute on function public.play_transfer_oak(uuid) to authenticated;
grant execute on function public.admin_start_round(integer, text, boolean) to authenticated;
