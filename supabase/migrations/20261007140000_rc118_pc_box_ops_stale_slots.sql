-- rc118: Auto-Arrange / Move must not abort a valid owned Pokémon
-- because a leftover layout UUID is no longer a live catch.
--
-- Root cause: play_pc_auto_arrange validated every occupied slot in the
-- current box, and play_move_pc_mon re-validated every remaining occupied
-- slot in EVERY box while rewriting pc_layout. Oak transfer / release leave
-- catch UUIDs in pc_layout (transferred_at set, row gone from live storage).
-- Those ghost IDs raised: 'A box slot is not one of your Pokémon.'
--
-- Client already sends catches.id (not public_id / slot index). The selected
-- Pokémon was valid; a sibling ghost slot poisoned the transaction.
--
-- Fix: treat unowned / transferred / unparsable slot values as empty.
-- Auto-Arrange still compacts the current box only, preserving relative order.
-- Move is still storage relocation of the same catch UUID.

create or replace function private.pc_live_catch_id(p_uid uuid, p_slot_val text)
returns uuid
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  slot_id uuid;
begin
  if p_uid is null or p_slot_val is null or btrim(p_slot_val) = '' then
    return null;
  end if;
  begin
    slot_id := btrim(p_slot_val)::uuid;
  exception when others then
    return null;
  end;
  if exists (
    select 1 from public.catches c
    where c.id = slot_id
      and c.user_id = p_uid
      and c.transferred_at is null
  ) then
    return slot_id;
  end if;
  return null;
end;
$function$;

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
  live_id uuid;
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
    live_id := private.pc_live_catch_id(uid, slot_val);
    if live_id is not null and not (live_id = any (kept)) then
      kept := kept || live_id;
    end if;
  end loop;
  before_count := coalesce(cardinality(kept), 0);

  for j in 0 .. 29 loop
    if j < before_count then
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
        if jsonb_typeof(box->'slots') = 'array' and j < jsonb_array_length(box->'slots') then
          slots := slots || jsonb_build_array(box->'slots'->j);
        else
          slots := slots || jsonb_build_array(null::text);
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

create or replace function public.play_move_pc_mon(p_catch_id uuid, p_to_box integer)
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
  dest int := p_to_box;
  src_box int := -1;
  src_slot int := -1;
  dest_slot int := -1;
  i int;
  j int;
  slots jsonb;
  slot_val text;
  live_id uuid;
  filled int;
  name text;
  out_boxes jsonb := '[]'::jsonb;
  box jsonb;
  seen uuid[] := '{}';
begin
  if uid is null then
    raise exception 'Sign in to move Pokémon.' using errcode = '42501';
  end if;
  if p_catch_id is null then
    raise exception 'Choose a Pokémon to move.';
  end if;
  if not exists (
    select 1 from public.catches c
    where c.id = p_catch_id and c.user_id = uid and c.transferred_at is null
  ) then
    raise exception 'That Pokémon could not be moved.';
  end if;

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

  for i in 0 .. box_count - 1 loop
    slots := coalesce(boxes->i->'slots', '[]'::jsonb);
    for j in 0 .. least(29, greatest(0, jsonb_array_length(slots) - 1)) loop
      if jsonb_typeof(slots->j) = 'null' then
        continue;
      end if;
      slot_val := nullif(btrim(slots->>j), '');
      live_id := private.pc_live_catch_id(uid, slot_val);
      if live_id is not null and live_id = p_catch_id then
        src_box := i;
        src_slot := j;
        exit;
      end if;
    end loop;
    exit when src_box >= 0;
  end loop;

  if src_box < 0 then
    raise exception 'That Pokémon is not in a PC box.';
  end if;

  if src_box = dest then
    return public.play_storage() || jsonb_build_object('ok', true, 'moved', false, 'message', 'Already in that box.');
  end if;

  slots := coalesce(boxes->dest->'slots', '[]'::jsonb);
  filled := 0;
  dest_slot := -1;
  for j in 0 .. 29 loop
    slot_val := null;
    if jsonb_typeof(slots) = 'array' and j < jsonb_array_length(slots)
       and jsonb_typeof(slots->j) <> 'null' then
      slot_val := nullif(btrim(slots->>j), '');
    end if;
    live_id := private.pc_live_catch_id(uid, slot_val);
    if live_id is null then
      if dest_slot < 0 then dest_slot := j; end if;
    else
      filled := filled + 1;
    end if;
  end loop;

  if dest_slot < 0 or filled >= 30 then
    raise exception 'That storage slot is no longer available.';
  end if;

  for i in 0 .. box_count - 1 loop
    box := boxes->i;
    name := left(btrim(coalesce(box->>'name', format('BOX %s', i + 1))), 12);
    if name = '' then name := format('BOX %s', i + 1); end if;
    slots := '[]'::jsonb;
    for j in 0 .. 29 loop
      slot_val := null;
      if jsonb_typeof(box->'slots') = 'array' and j < jsonb_array_length(box->'slots')
         and jsonb_typeof(box->'slots'->j) <> 'null' then
        slot_val := nullif(btrim(box->'slots'->>j), '');
      end if;
      if i = src_box and j = src_slot then
        slots := slots || jsonb_build_array(null::text);
      elsif i = dest and j = dest_slot then
        slots := slots || jsonb_build_array(p_catch_id);
        if not (p_catch_id = any (seen)) then
          seen := seen || p_catch_id;
        end if;
      else
        live_id := private.pc_live_catch_id(uid, slot_val);
        if live_id is null or live_id = p_catch_id or live_id = any (seen) then
          slots := slots || jsonb_build_array(null::text);
        else
          seen := seen || live_id;
          slots := slots || jsonb_build_array(live_id);
        end if;
      end if;
    end loop;
    out_boxes := out_boxes || jsonb_build_array(jsonb_build_object('name', name, 'slots', slots));
  end loop;

  update public.profiles
    set pc_layout = jsonb_build_object('boxes', out_boxes), updated_at = now()
    where id = uid;

  return public.play_storage() || jsonb_build_object(
    'ok', true,
    'moved', true,
    'message', format('Moved to %s.', coalesce(out_boxes->dest->>'name', format('BOX %s', dest + 1)))
  );
end;
$function$;

revoke all on function public.play_move_pc_mon(uuid, integer) from public;
grant execute on function public.play_move_pc_mon(uuid, integer) to authenticated;
