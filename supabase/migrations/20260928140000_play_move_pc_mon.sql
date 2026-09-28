-- Atomic move of one owned catch between PC boxes (server-validated).
create or replace function public.play_move_pc_mon(p_catch_id uuid, p_to_box integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
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
  slot_id uuid;
  filled int;
  name text;
  out_boxes jsonb := '[]'::jsonb;
  box jsonb;
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
    raise exception 'That Pokémon is not in your storage.';
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
      if slot_val is null then
        continue;
      end if;
      begin
        slot_id := slot_val::uuid;
      exception when others then
        continue;
      end;
      if slot_id = p_catch_id then
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
    if slot_val is null then
      if dest_slot < 0 then dest_slot := j; end if;
    else
      filled := filled + 1;
    end if;
  end loop;

  if dest_slot < 0 or filled >= 30 then
    raise exception 'That box is full.';
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
      elsif slot_val is null then
        slots := slots || jsonb_build_array(null::text);
      else
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
        slots := slots || jsonb_build_array(slot_id);
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
$$;

grant execute on function public.play_move_pc_mon(uuid, integer) to authenticated;
