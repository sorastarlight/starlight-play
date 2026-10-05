-- rc113: fix Daily Trainer Supply grants ambiguity + Pass QA + PC box ops

create or replace function public.play_claim_daily_supply()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  today date := private.app_today();
  yesterday date := today - 1;
  prev int := 0;
  streak int := 1;
  berry jsonb;
  v_grants jsonb;
  supply jsonb := private.economy_config()->'dailySupply';
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  perform private.ensure_inventory(uid);
  if exists (
    select 1 from public.daily_claims
     where user_id = uid and created_at > now() - interval '12 hours'
       and claim_date is distinct from today
  ) then
    raise exception 'Daily Trainer Supply is not ready yet.';
  end if;
  insert into public.daily_claims (user_id, claim_date, streak_day, grants)
  values (uid, today, 1, '{}'::jsonb)
  on conflict (user_id, claim_date) do nothing;
  if not found then
    raise exception 'Daily Trainer Supply is not ready yet.';
  end if;
  select streak_day into prev
    from public.daily_claims
   where user_id = uid and claim_date = yesterday;
  streak := case when prev is null then 1 else (prev % 7) + 1 end;
  berry := private.pick_loot_entry('DAILY_COMMON_BERRY');
  if berry is null or (berry->>'item') = 'goldenrazz' then
    berry := jsonb_build_object('item', 'berry', 'qty', 1);
  end if;
  v_grants := jsonb_build_object(
      'pokeball', coalesce((supply->>'pokeball')::int, 3),
      berry->>'item', coalesce((supply->>'berry')::int, 1),
      'coins', coalesce((supply->>'coins')::int, 50)
    ) || private.daily_streak_bonus(streak);
  update public.daily_claims
     set streak_day = streak, grants = v_grants
   where user_id = uid and claim_date = today;
  update public.inventories
     set daily_supply_at = now(), updated_at = now()
   where user_id = uid;
  begin
    perform private.grant_items(uid, v_grants, 'DAILY_REWARD', today::text, 'daily:' || uid::text || ':' || today::text, true);
  exception when others then
    delete from public.daily_claims where user_id = uid and claim_date = today;
    update public.inventories set daily_supply_at = null, updated_at = now() where user_id = uid;
    raise;
  end;
  return private.play_snapshot(uid) || jsonb_build_object(
    'ok', true,
    'streakDay', streak,
    'grants', v_grants,
    'message', 'Daily Trainer Supply claimed. Day ' || streak::text || ' of 7.'
  );
end;
$function$;

revoke all on function public.play_claim_daily_supply() from public;
grant execute on function public.play_claim_daily_supply() to authenticated;

create or replace function public.admin_qa_grant_pass_reward(p_kind text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  admin uuid := auth.uid();
  kind text := lower(btrim(coalesce(p_kind, '')));
  v_grants jsonb;
  label text;
begin
  if admin is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if kind not in ('daily', 'weekly') then
    raise exception 'Unknown Pass QA reward kind.';
  end if;
  v_grants := private.pass_reward_grants(kind);
  if v_grants is null or v_grants = '{}'::jsonb then
    raise exception 'Pass reward bundle is empty.';
  end if;
  label := case when kind = 'daily' then 'ADMIN QA Daily Pass' else 'ADMIN QA Weekly Pass' end;
  perform private.grant_items(
    admin,
    v_grants,
    'ADMIN_QA',
    'pass-qa-' || kind,
    'admin-pass-qa:' || admin::text || ':' || kind || ':' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'),
    true
  );
  insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
  values (
    admin,
    admin,
    'PASS_REWARD_QA',
    jsonb_build_object('passKind', kind, 'grants', v_grants, 'label', label)
  );
  return private.play_snapshot(admin) || jsonb_build_object(
    'ok', true,
    'qa', true,
    'kind', kind,
    'grants', v_grants,
    'message', label || ' granted: ' || private.grant_summary(v_grants) || '.'
  );
end;
$function$;

revoke all on function public.admin_qa_grant_pass_reward(text) from public;
grant execute on function public.admin_qa_grant_pass_reward(text) to authenticated;

create or replace function public.play_pc_auto_arrange(p_box integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  layout jsonb;
  boxes jsonb;
  box_count int;
  dest int := p_box;
  i int;
  j int;
  name text;
  slots jsonb;
  out_slots jsonb := '[]'::jsonb;
  kept uuid[] := '{}';
  slot_val text;
  slot_id uuid;
  out_boxes jsonb := '[]'::jsonb;
  box jsonb;
  before_count int := 0;
begin
  if uid is null then raise exception 'Sign in to arrange your PC.' using errcode = '42501'; end if;
  select coalesce(pc_layout, '{"boxes":[]}'::jsonb) into layout
    from public.profiles where id = uid for update;
  boxes := coalesce(layout->'boxes', '[]'::jsonb);
  if jsonb_typeof(boxes) <> 'array' or jsonb_array_length(boxes) < 1 then
    raise exception 'Your PC has no boxes yet.';
  end if;
  box_count := jsonb_array_length(boxes);
  if dest is null or dest < 0 or dest >= box_count then
    raise exception 'That box is not available.';
  end if;

  for j in 0 .. 29 loop
    slot_val := null;
    if jsonb_typeof(boxes->dest->'slots') = 'array'
       and j < jsonb_array_length(boxes->dest->'slots')
       and jsonb_typeof(boxes->dest->'slots'->j) <> 'null' then
      slot_val := nullif(btrim(boxes->dest->'slots'->>j), '');
    end if;
    if slot_val is not null then
      begin
        slot_id := slot_val::uuid;
      exception when others then
        raise exception 'Invalid Pokémon in a box slot.';
      end;
      if not exists (
        select 1 from public.catches c
        where c.id = slot_id and c.user_id = uid and c.transferred_at is null
      ) then
        raise exception 'A box slot is not one of your Pokémon.';
      end if;
      kept := kept || slot_id;
      before_count := before_count + 1;
    end if;
  end loop;

  for j in 0 .. 29 loop
    if j < cardinality(kept) then
      out_slots := out_slots || jsonb_build_array(kept[j + 1]);
    else
      out_slots := out_slots || jsonb_build_array(null::text);
    end if;
  end loop;

  for i in 0 .. box_count - 1 loop
    box := boxes->i;
    name := left(btrim(coalesce(box->>'name', format('BOX %s', i + 1))), 12);
    if name = '' then name := format('BOX %s', i + 1); end if;
    if i = dest then
      slots := out_slots;
    else
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
          slots := slots || jsonb_build_array(slot_val::uuid);
        end if;
      end loop;
    end if;
    out_boxes := out_boxes || jsonb_build_array(jsonb_build_object('name', name, 'slots', slots));
  end loop;

  update public.profiles
     set pc_layout = jsonb_build_object('boxes', out_boxes), updated_at = now()
   where id = uid;

  return public.play_storage() || jsonb_build_object(
    'ok', true,
    'arranged', true,
    'box', dest,
    'count', before_count,
    'message', 'Box arranged.'
  );
end;
$function$;

revoke all on function public.play_pc_auto_arrange(integer) from public;
grant execute on function public.play_pc_auto_arrange(integer) to authenticated;

create or replace function public.play_pc_delete_box_preflight(p_box integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  layout jsonb;
  boxes jsonb;
  box_count int;
  dest int := p_box;
  i int;
  j int;
  slot_val text;
  slot_id uuid;
  occupants int := 0;
  free_slots int := 0;
  release_count int := 0;
  protected_count int := 0;
  mon public.catches;
begin
  if uid is null then raise exception 'Sign in to manage your PC.' using errcode = '42501'; end if;
  select coalesce(pc_layout, '{"boxes":[]}'::jsonb) into layout
    from public.profiles where id = uid;
  boxes := coalesce(layout->'boxes', '[]'::jsonb);
  if jsonb_typeof(boxes) <> 'array' or jsonb_array_length(boxes) < 1 then
    raise exception 'Your PC has no boxes yet.';
  end if;
  box_count := jsonb_array_length(boxes);
  if dest is null or dest < 0 or dest >= box_count then
    raise exception 'That box is not available.';
  end if;
  if box_count <= 1 then
    return jsonb_build_object(
      'ok', true,
      'canDelete', false,
      'minBoxes', 1,
      'boxCount', box_count,
      'occupants', 0,
      'freeElsewhere', 0,
      'releaseCount', 0,
      'protectedCount', 0,
      'protectedWouldRelease', 0,
      'safe', false,
      'message', 'You must keep at least one PC box.'
    );
  end if;

  for j in 0 .. 29 loop
    slot_val := null;
    if jsonb_typeof(boxes->dest->'slots') = 'array'
       and j < jsonb_array_length(boxes->dest->'slots')
       and jsonb_typeof(boxes->dest->'slots'->j) <> 'null' then
      slot_val := nullif(btrim(boxes->dest->'slots'->>j), '');
    end if;
    if slot_val is not null then
      occupants := occupants + 1;
      begin
        slot_id := slot_val::uuid;
      exception when others then
        continue;
      end;
      select * into mon from public.catches
       where id = slot_id and user_id = uid and transferred_at is null;
      if mon.id is not null and (mon.favorite or mon.locked) then
        protected_count := protected_count + 1;
      end if;
    end if;
  end loop;

  for i in 0 .. box_count - 1 loop
    if i = dest then continue; end if;
    for j in 0 .. 29 loop
      slot_val := null;
      if jsonb_typeof(boxes->i->'slots') = 'array'
         and j < jsonb_array_length(boxes->i->'slots')
         and jsonb_typeof(boxes->i->'slots'->j) <> 'null' then
        slot_val := nullif(btrim(boxes->i->'slots'->>j), '');
      end if;
      if slot_val is null then
        free_slots := free_slots + 1;
      end if;
    end loop;
  end loop;

  release_count := greatest(occupants - free_slots, 0);

  return jsonb_build_object(
    'ok', true,
    'canDelete', true,
    'minBoxes', 1,
    'boxCount', box_count,
    'boxIndex', dest,
    'boxName', coalesce(nullif(btrim(boxes->dest->>'name'), ''), format('BOX %s', dest + 1)),
    'occupants', occupants,
    'freeElsewhere', free_slots,
    'releaseCount', release_count,
    'protectedCount', protected_count,
    'protectedWouldRelease', case when release_count > 0 then protected_count else 0 end,
    'safe', release_count = 0,
    'message', case
      when occupants = 0 then 'This box is empty and can be deleted.'
      when release_count = 0 then format('All %s Pokémon can be moved to your other boxes.', occupants)
      else format('Not enough space: %s of %s Pokémon cannot be moved and would be permanently released.', release_count, occupants)
    end
  );
end;
$function$;

revoke all on function public.play_pc_delete_box_preflight(integer) from public;
grant execute on function public.play_pc_delete_box_preflight(integer) to authenticated;

create or replace function public.play_pc_delete_box(
  p_box integer,
  p_confirm_release boolean default false,
  p_confirm_text text default '',
  p_expected_release integer default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  layout jsonb;
  boxes jsonb;
  box_count int;
  dest int := p_box;
  i int;
  j int;
  slot_val text;
  slot_id uuid;
  unprotected uuid[] := '{}';
  protected uuid[] := '{}';
  queue uuid[] := '{}';
  free_box int[] := '{}';
  free_slot int[] := '{}';
  free_n int := 0;
  release_expected int := 0;
  release_actual int := 0;
  place_i int := 0;
  name text;
  out_boxes jsonb := '[]'::jsonb;
  slots jsonb;
  mon public.catches;
  copies int;
  confirm_norm text := upper(btrim(coalesce(p_confirm_text, '')));
  new_i int := 0;
  src_i int;
  target_box int;
  target_slot int;
  adj_box int;
begin
  if uid is null then raise exception 'Sign in to manage your PC.' using errcode = '42501'; end if;

  select coalesce(pc_layout, '{"boxes":[]}'::jsonb) into layout
    from public.profiles where id = uid for update;
  boxes := coalesce(layout->'boxes', '[]'::jsonb);
  box_count := case when jsonb_typeof(boxes) = 'array' then jsonb_array_length(boxes) else 0 end;
  if box_count < 1 then raise exception 'Your PC has no boxes yet.'; end if;
  if dest is null or dest < 0 or dest >= box_count then
    raise exception 'That box is not available.';
  end if;
  if box_count <= 1 then
    raise exception 'You must keep at least one PC box.';
  end if;

  for j in 0 .. 29 loop
    slot_val := null;
    if jsonb_typeof(boxes->dest->'slots') = 'array'
       and j < jsonb_array_length(boxes->dest->'slots')
       and jsonb_typeof(boxes->dest->'slots'->j) <> 'null' then
      slot_val := nullif(btrim(boxes->dest->'slots'->>j), '');
    end if;
    if slot_val is null then continue; end if;
    begin
      slot_id := slot_val::uuid;
    exception when others then
      raise exception 'Invalid Pokémon in a box slot.';
    end;
    select * into mon from public.catches
     where id = slot_id and user_id = uid and transferred_at is null for update;
    if mon.id is null then continue; end if;
    if mon.favorite or mon.locked then
      protected := protected || slot_id;
    else
      unprotected := unprotected || slot_id;
    end if;
  end loop;

  for i in 0 .. box_count - 1 loop
    if i = dest then continue; end if;
    for j in 0 .. 29 loop
      slot_val := null;
      if jsonb_typeof(boxes->i->'slots') = 'array'
         and j < jsonb_array_length(boxes->i->'slots')
         and jsonb_typeof(boxes->i->'slots'->j) <> 'null' then
        slot_val := nullif(btrim(boxes->i->'slots'->>j), '');
      end if;
      if slot_val is null then
        free_n := free_n + 1;
        free_box := free_box || i;
        free_slot := free_slot || j;
      end if;
    end loop;
  end loop;

  queue := unprotected || protected;
  release_expected := greatest(cardinality(queue) - free_n, 0);

  if p_expected_release is not null and release_expected > p_expected_release then
    raise exception 'Delete aborted: release count changed (% → %). Review the warning and try again.',
      p_expected_release, release_expected;
  end if;

  if release_expected > 0 then
    if not coalesce(p_confirm_release, false) then
      raise exception 'Not enough PC storage. Confirm destructive delete after reviewing the warning.';
    end if;
    if confirm_norm is distinct from 'YES' then
      raise exception 'Type YES to permanently release Pokémon that cannot be moved.';
    end if;
  end if;

  -- Relocate first free_n from queue; release the overflow.
  for i in 1 .. cardinality(queue) loop
    slot_id := queue[i];
    if i <= free_n then
      continue; -- placed later
    end if;
    select * into mon from public.catches
     where id = slot_id and user_id = uid and transferred_at is null;
    if mon.id is null then continue; end if;
    if mon.favorite or mon.locked then
      raise exception 'Favorite or locked Pokémon cannot be released by deleting a box. Move or unlock them first.';
    end if;
    if exists (select 1 from public.trade_listings t where t.catch_id = mon.id and t.status = 'open') then
      raise exception 'Cancel trade listings before deleting this box.';
    end if;
    select count(*) into copies from public.catches
     where user_id = uid and dex = mon.dex and transferred_at is null;
    if copies <= 1 then
      raise exception 'Cannot release your only % while deleting a box. Move it first.', mon.name;
    end if;
    if mon.variant like '%shiny%' then
      raise exception 'Shiny Pokémon cannot be auto-released by box delete. Move them first.';
    end if;
    update public.catches set transferred_at = now() where id = mon.id;
    update public.trainer_stats set released = released + 1, updated_at = now() where user_id = uid;
    perform private.pull_from_team(uid, mon.id);
    release_actual := release_actual + 1;
    queue[i] := null;
  end loop;

  -- Build remaining boxes (skip dest), preserving non-target occupants.
  for src_i in 0 .. box_count - 1 loop
    if src_i = dest then continue; end if;
    name := left(btrim(coalesce(boxes->src_i->>'name', format('BOX %s', new_i + 1))), 12);
    if name = '' then name := format('BOX %s', new_i + 1); end if;
    slots := '[]'::jsonb;
    for j in 0 .. 29 loop
      slot_val := null;
      if jsonb_typeof(boxes->src_i->'slots') = 'array'
         and j < jsonb_array_length(boxes->src_i->'slots')
         and jsonb_typeof(boxes->src_i->'slots'->j) <> 'null' then
        slot_val := nullif(btrim(boxes->src_i->'slots'->>j), '');
      end if;
      if slot_val is null then
        slots := slots || jsonb_build_array(null::text);
      else
        slots := slots || jsonb_build_array(slot_val::uuid);
      end if;
    end loop;
    out_boxes := out_boxes || jsonb_build_array(jsonb_build_object('name', name, 'slots', slots));
    new_i := new_i + 1;
  end loop;

  -- Place surviving queue into free slots (adjust box index after dest removal).
  place_i := 0;
  for i in 1 .. cardinality(queue) loop
    slot_id := queue[i];
    if slot_id is null then continue; end if;
    place_i := place_i + 1;
    if place_i > free_n then
      raise exception 'Delete aborted: ran out of destination slots.';
    end if;
    target_box := free_box[place_i];
    target_slot := free_slot[place_i];
    adj_box := case when target_box > dest then target_box - 1 else target_box end;
    out_boxes := jsonb_set(
      out_boxes,
      array[adj_box::text, 'slots', target_slot::text],
      to_jsonb(slot_id),
      false
    );
  end loop;

  update public.profiles
     set pc_layout = jsonb_build_object('boxes', out_boxes), updated_at = now()
   where id = uid;

  return public.play_storage() || jsonb_build_object(
    'ok', true,
    'deletedBox', dest,
    'released', release_actual,
    'message', case
      when release_actual > 0 then format('Box deleted. %s Pokémon were permanently released.', release_actual)
      else 'Box deleted. Pokémon were moved to your other boxes.'
    end
  );
end;
$function$;

revoke all on function public.play_pc_delete_box(integer, boolean, text, integer) from public;
grant execute on function public.play_pc_delete_box(integer, boolean, text, integer) to authenticated;
