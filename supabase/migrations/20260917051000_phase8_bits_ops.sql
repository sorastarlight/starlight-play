-- Phase 8 RPCs: pending flush, Studio validation, admin inspect/retry, health, player history.

create or replace function private.flush_bits_pending(p_uid uuid)
returns void
language plpgsql
as $function$
declare
  rec record;
  item jsonb;
  logins text[];
  idents text[];
begin
  if p_uid is null then return; end if;
  if current_setting('play.flushing_bits', true) = '1' then return; end if;
  perform set_config('play.flushing_bits', '1', true);
  select array_agg(distinct lower(x.login)) into logins
    from (
      select c.twitch_login as login from public.twitch_connections c
       where c.user_id = p_uid and c.confirmed and c.gameplay_enabled
      union
      select p.twitch_login from public.profiles p
       where p.id = p_uid and p.twitch_login is not null
    ) x
   where btrim(coalesce(x.login, '')) <> '';
  select array_agg(distinct x.id) into idents
    from (
      select c.twitch_user_id as id from public.twitch_connections c
       where c.user_id = p_uid and c.confirmed and c.gameplay_enabled
      union
      select p.twitch_user_id from public.profiles p
       where p.id = p_uid and p.twitch_user_id is not null
    ) x
   where btrim(coalesce(x.id, '')) <> '';
  if logins is null and idents is null then return; end if;
  for rec in
    select event_id, sku, twitch_login, twitch_user_id, bits, title
      from private.bits_pending
     where (logins is not null and lower(twitch_login) = any (logins))
        or (idents is not null and twitch_user_id = any (idents))
     order by created_at
  loop
    if exists (
      select 1 from public.twitch_connections c
       where c.user_id = p_uid and c.confirmed
         and (
           lower(c.twitch_login) = lower(rec.twitch_login)
           or (rec.twitch_user_id is not null and c.twitch_user_id = rec.twitch_user_id)
         )
         and not c.gameplay_enabled
    ) then
      delete from private.bits_pending where event_id = rec.event_id;
      update private.bits_events
         set detail = 'Skipped. That Twitch identity is excluded from gameplay rewards.',
             granted = false, status = 'skipped_bot', trainer_id = p_uid
       where event_id = rec.event_id;
      continue;
    end if;
    select elem into item
      from jsonb_array_elements(private.store_catalog()->'bits') as elem
     where elem->>'sku' = rec.sku;
    if item is null then
      delete from private.bits_pending where event_id = rec.event_id;
      update private.bits_events set detail = 'Unknown Bits pack.', granted = false, status = 'failed' where event_id = rec.event_id;
      continue;
    end if;
    begin
      perform private.grant_items(p_uid, item->'grants', 'BITS_REWARD', rec.sku, 'bits:' || rec.event_id, true);
      insert into public.trainer_notices (user_id, kind, title, body, payload)
      values (
        p_uid, 'support', 'THANK YOU! ★',
        (item->>'name') || ' added to your bag.',
        jsonb_build_object('type', 'support', 'sku', rec.sku, 'name', item->>'name', 'bits', rec.bits, 'grants', item->'grants', 'eventId', rec.event_id)
      );
      insert into private.bits_support_totals (user_id, bits_total, updated_at)
      values (p_uid, greatest(coalesce(rec.bits, 0), 0), now())
      on conflict (user_id) do update set bits_total = private.bits_support_totals.bits_total + excluded.bits_total, updated_at = now();
      delete from private.bits_pending where event_id = rec.event_id;
      update private.bits_events
         set granted = true, status = 'fulfilled', trainer_id = p_uid,
             detail = 'Granted ' || (item->>'name') || '.', pack_name = item->>'name', grants = coalesce(item->'grants', '{}'::jsonb)
       where event_id = rec.event_id;
    exception when others then
      update private.bits_events set status = 'failed', detail = sqlerrm, trainer_id = p_uid where event_id = rec.event_id;
    end;
  end loop;
end;
$function$;

create or replace function public.admin_store_save_item(p_row jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_sku text;
  v_extra jsonb;
  v_pack text;
  v_kind text;
  v_status text;
  v_product text;
  v_bits int;
  v_titles jsonb;
begin
  perform private.require_staff_edit();
  v_sku := btrim(coalesce(p_row->>'sku', ''));
  if v_sku = '' then raise exception 'Give this item a SKU.'; end if;
  v_extra := coalesce(p_row->'extra', '{}'::jsonb);
  v_status := lower(btrim(coalesce(p_row->>'status', v_extra->>'status', 'published')));
  if v_status not in ('draft', 'published') then v_status := 'published'; end if;
  v_product := nullif(btrim(coalesce(p_row->>'productKind', v_extra->>'productKind', '')), '');
  v_bits := coalesce((p_row->>'bits')::int, 0);
  if v_product is null then
    v_product := case
      when nullif(v_extra->>'pack','') is not null then 'avatar'
      when v_bits > 0 then 'bits'
      when jsonb_typeof(coalesce(p_row->'grants', '{}'::jsonb)) = 'object'
           and (select count(*) from jsonb_object_keys(coalesce(p_row->'grants', '{}'::jsonb))) > 1 then 'pack'
      else 'item'
    end;
  end if;
  if v_bits < 0 then raise exception 'Bits cost cannot be negative.'; end if;
  if v_bits > 0 then
    perform private.bits_validate_grants(coalesce(p_row->'grants', '{}'::jsonb));
    v_titles := coalesce(p_row->'bitsTitles', v_extra->'bitsTitles', '[]'::jsonb);
    if jsonb_typeof(v_titles) = 'string' then
      v_titles := to_jsonb(string_to_array(v_titles #>> '{}', E'\n'));
    end if;
    if v_status = 'published' then
      if v_bits < 1 then raise exception 'Live Bits products need a Bits cost greater than 0.'; end if;
      if jsonb_typeof(v_titles) <> 'array' or jsonb_array_length(v_titles) < 1 then
        raise exception 'Live Bits products need at least one Twitch Power-Up title.';
      end if;
    end if;
    v_extra := v_extra || jsonb_build_object('bitsTitles', coalesce(v_titles, '[]'::jsonb));
  end if;
  v_extra := v_extra || jsonb_build_object(
    'status', v_status,
    'productKind', v_product,
    'detail', coalesce(p_row->>'detail', v_extra->>'detail')
  );
  select c.kind into v_kind from private.store_categories c where c.id = (p_row->>'categoryId')::uuid;
  if v_kind = 'avatars' then
    v_pack := nullif(btrim(coalesce(v_extra->>'pack', '')), '');
    if v_pack is null then
      v_pack := trim(both '-' from regexp_replace(lower(v_sku), '^avatar-', ''));
      if v_pack = '' then v_pack := v_sku; end if;
      v_extra := v_extra || jsonb_build_object('pack', v_pack);
    end if;
    if v_extra->'looks' is null or jsonb_typeof(v_extra->'looks') <> 'array' then
      v_extra := v_extra || jsonb_build_object('looks', '[]'::jsonb);
    end if;
    v_product := 'avatar';
    v_extra := v_extra || jsonb_build_object('productKind', 'avatar');
  end if;
  if v_kind = 'bits' or v_bits > 0 then
    v_product := 'bits';
    v_extra := v_extra || jsonb_build_object('productKind', 'bits');
  end if;
  insert into private.store_items (
    sku, category_id, name, blurb, cost, bits, grants, sprite, thumb, featured, sort, visible, extra, status
  ) values (
    v_sku, (p_row->>'categoryId')::uuid, coalesce(nullif(p_row->>'name', ''), v_sku),
    coalesce(p_row->>'blurb', ''), coalesce((p_row->>'cost')::int, 0), v_bits,
    case when v_bits > 0 then private.bits_validate_grants(coalesce(p_row->'grants', '{}'::jsonb))
         else private.validate_store_grants(coalesce(p_row->'grants', '{}'::jsonb)) end,
    coalesce(p_row->>'sprite', ''), coalesce(p_row->>'thumb', ''),
    coalesce((p_row->>'featured')::boolean, false), coalesce((p_row->>'sort')::int, 100),
    coalesce((p_row->>'visible')::boolean, true), v_extra, v_status
  )
  on conflict (sku) do update set
    category_id = excluded.category_id, name = excluded.name, blurb = excluded.blurb,
    cost = excluded.cost, bits = excluded.bits, grants = excluded.grants, sprite = excluded.sprite,
    thumb = excluded.thumb, featured = excluded.featured, sort = excluded.sort, visible = excluded.visible,
    extra = excluded.extra, status = excluded.status;
  if v_kind = 'avatars' then
    perform private.sync_avatar_pack_looks(v_extra->>'pack', v_extra->'looks', coalesce(nullif(p_row->>'name', ''), v_sku), coalesce(v_extra->>'games', ''));
  end if;
  return public.admin_store_get() || jsonb_build_object(
    'message', 'Item saved.', 'sku', v_sku, 'status', v_status,
    'bitsCollisions', private.bits_amount_collisions()
  );
end;
$function$;

grant execute on function public.admin_store_save_item(jsonb) to authenticated;

create or replace function public.play_sync(p_round_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform private.director_tick_if_due();
  return coalesce(private.play_snapshot(auth.uid(), p_round_id), '{}'::jsonb)
    || jsonb_build_object('console', private.play_console_json(100), 'supportAlert', private.public_support_alert());
end;
$$;

create or replace function public.play_state()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform private.director_tick_if_due();
  return coalesce(private.play_snapshot(auth.uid()), '{}'::jsonb)
    || jsonb_build_object('console', private.play_console_json(100), 'supportAlert', private.public_support_alert());
end;
$$;

create or replace function public.play_support_recent()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return jsonb_build_object('ok', true, 'events', '[]'::jsonb, 'bitsTotal', 0);
  end if;
  perform private.flush_bits_pending(uid);
  return jsonb_build_object(
    'ok', true,
    'bitsTotal', coalesce((select bits_total from private.bits_support_totals where user_id = uid), 0),
    'pending', exists (select 1 from private.bits_pending p
      where lower(p.twitch_login) in (
        select lower(c.twitch_login) from public.twitch_connections c where c.user_id = uid and c.confirmed
        union select lower(pr.twitch_login) from public.profiles pr where pr.id = uid
      )),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.event_id, 'name', coalesce(nullif(e.pack_name, ''), e.sku),
        'sku', e.sku, 'bits', e.bits, 'status', e.status, 'at', e.created_at, 'grants', e.grants
      ) order by e.created_at desc)
      from private.bits_events e
      where e.trainer_id = uid
      limit 12
    ), '[]'::jsonb)
  );
end;
$$;
grant execute on function public.play_support_recent() to authenticated;

create or replace function public.admin_bits_health()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  connected text;
  last_at timestamptz;
  last_detail text;
  unresolved int := 0;
  failed int := 0;
  pending int := 0;
  duplicates int := 0;
  live_n int := 0;
  invalid int := 0;
  collisions jsonb;
  st text;
begin
  if not private.is_play_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  select eventsub_status, last_bits_at, last_bits_detail into connected, last_at, last_detail from private.stream_bridge where id = 1;
  select count(*)::int into unresolved from private.bits_events where status in ('unresolved', 'pending');
  select count(*)::int into failed from private.bits_events where status = 'failed';
  select count(*)::int into pending from private.bits_pending;
  select count(*)::int into duplicates from private.bits_events where status = 'duplicate';
  select count(*)::int into live_n from private.bits_live_products();
  select count(*)::int into invalid
    from private.store_items i
    join private.store_categories c on c.id = i.category_id
   where c.kind = 'bits' and private.store_item_is_live(i)
     and (i.bits < 1 or i.grants = '{}'::jsonb or coalesce(jsonb_array_length(i.extra->'bitsTitles'), 0) < 1
          or i.grants ? 'masterball' or i.grants ? 'odds' or i.grants ? 'random');
  collisions := private.bits_amount_collisions();
  st := case
    when failed > 0 or invalid > 0 then 'ACTION NEEDED'
    when unresolved + pending > 0 or jsonb_array_length(collisions) > 0 or coalesce(connected, '') is distinct from 'enabled' then 'WARNING'
    when last_at is null then 'UNKNOWN'
    else 'HEALTHY'
  end;
  return jsonb_build_object(
    'ok', true, 'status', st,
    'eventSub', coalesce(connected, ''),
    'lastVerifiedAt', last_at,
    'lastDetail', last_detail,
    'unresolved', unresolved, 'failed', failed, 'pending', pending, 'duplicates', duplicates,
    'liveProducts', live_n, 'invalidProducts', invalid, 'collisions', collisions,
    'detail', case
      when failed > 0 then 'A verified Bits event failed after Twitch accepted it. Use Retry fulfillment.'
      when invalid > 0 then 'A live Bits product is missing titles, contents, or a positive Bits cost.'
      when jsonb_array_length(collisions) > 0 then 'Two live Power-Ups share a Bits amount.'
      when unresolved + pending > 0 then 'Some Power-Ups are waiting for a linked Trainer.'
      when coalesce(connected, '') is distinct from 'enabled' then 'EventSub is not enabled.'
      when last_at is null then 'No verified Bits events have arrived yet. That is UNKNOWN, not broken.'
      else 'Bits fulfillment is connected.'
    end
  );
end;
$$;

create or replace function public.admin_bits_events(p_status text default null, p_limit int default 40)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  st text := lower(btrim(coalesce(p_status, '')));
  n int := least(greatest(coalesce(p_limit, 40), 1), 100);
begin
  if not private.is_play_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return jsonb_build_object(
    'ok', true,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.event_id,
        'twitchLogin', e.twitch_login,
        'twitchUserId', e.twitch_user_id,
        'bits', e.bits,
        'title', e.title,
        'sku', e.sku,
        'packName', e.pack_name,
        'status', e.status,
        'granted', e.granted,
        'detail', e.detail,
        'at', e.created_at,
        'trainerId', e.trainer_id,
        'anonymous', e.anonymous
      ) order by e.created_at desc)
      from (
        select * from private.bits_events
        where st = '' or status = st
        order by created_at desc
        limit n
      ) e
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_bits_retry(p_event_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  ev private.bits_events%rowtype;
begin
  perform private.require_staff_edit();
  select * into ev from private.bits_events where event_id = btrim(coalesce(p_event_id, ''));
  if not found then raise exception 'That Bits event was not found.'; end if;
  if ev.granted or ev.status = 'fulfilled' then
    return jsonb_build_object('ok', true, 'duplicate', true, 'message', 'Already fulfilled. Retry will not grant again.');
  end if;
  if ev.status in ('ignored', 'skipped_bot') then
    raise exception 'This event is not eligible for retry (%).', ev.status;
  end if;
  delete from private.bits_events where event_id = ev.event_id;
  return public.credit_bits_from_twitch(ev.event_id, ev.twitch_login, ev.title, ev.bits, ev.twitch_user_id);
end;
$$;

create or replace function public.admin_bits_qa_redemption(p_login text, p_title text, p_bits int, p_twitch_user_id text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  eid text := 'qa:' || replace(gen_random_uuid()::text, '-', '');
  login text := lower(btrim(coalesce(p_login, '')));
  ident text := btrim(coalesce(p_twitch_user_id, ''));
begin
  perform private.require_staff_edit();
  if login not like 'qa-%' and ident not like 'qa-%' and login not like 'qa%' then
    raise exception 'QA Bits events must use a qa- identity so they cannot grant a live Trainer.';
  end if;
  return public.credit_bits_from_twitch(eid, p_login, p_title, p_bits, p_twitch_user_id)
    || jsonb_build_object('qa', true, 'eventId', eid);
end;
$$;

create or replace function public.admin_content_health()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  missing_icon int := 0; broken_pack int := 0; missing_portrait int := 0; dual_currency int := 0; neg int := 0;
  bits_invalid int := 0; collisions jsonb;
begin
  if not private.is_play_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  select count(*)::int into missing_icon from private.store_items i where private.store_item_is_live(i) and coalesce(i.sprite,'') = '' and coalesce(i.thumb,'') = '';
  select count(*)::int into broken_pack from private.store_items i where coalesce(i.extra->>'productKind','') = 'pack' and (i.grants is null or i.grants = '{}'::jsonb);
  select count(*)::int into missing_portrait from private.trainer_looks where visible and coalesce(portrait_file,'') = '';
  select count(*)::int into dual_currency from private.store_items where cost > 0 and bits > 0;
  select count(*)::int into neg from public.inventories where coalesce(coins,0) < 0 or coalesce(pokeball,0) < 0;
  select count(*)::int into bits_invalid
    from private.store_items i join private.store_categories c on c.id = i.category_id
   where c.kind = 'bits' and private.store_item_is_live(i)
     and (i.bits < 1 or i.grants = '{}'::jsonb or coalesce(jsonb_array_length(i.extra->'bitsTitles'), 0) < 1);
  collisions := private.bits_amount_collisions();
  return jsonb_build_object(
    'ok', missing_icon + broken_pack + dual_currency + neg + bits_invalid + jsonb_array_length(collisions) = 0,
    'status', case when missing_icon + broken_pack + dual_currency + neg + bits_invalid > 0 then 'WARNING'
                   when jsonb_array_length(collisions) > 0 then 'WARNING'
                   else 'HEALTHY' end,
    'missingIcons', missing_icon, 'brokenPacks', broken_pack, 'missingPortraits', missing_portrait,
    'dualCurrency', dual_currency, 'negativeInventory', neg,
    'bitsInvalid', bits_invalid, 'bitsCollisions', collisions,
    'detail', format('%s live products, %s missing portraits, %s broken packs, %s invalid Bits products',
      (select count(*) from private.store_items i where private.store_item_is_live(i)), missing_portrait, broken_pack, bits_invalid)
  );
end;
$$;

grant execute on function public.admin_bits_health() to authenticated;
grant execute on function public.admin_bits_events(text, int) to authenticated;
grant execute on function public.admin_bits_retry(text) to authenticated;
grant execute on function public.admin_bits_qa_redemption(text, text, int, text) to authenticated;
grant execute on function public.admin_content_health() to authenticated;
