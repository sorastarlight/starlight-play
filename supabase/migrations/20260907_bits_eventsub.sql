-- Auto-credit Bits Custom Power-Ups from Twitch EventSub. Play never charges Bits.

alter table private.stream_bridge
  add column if not exists eventsub_secret text,
  add column if not exists eventsub_id text,
  add column if not exists eventsub_status text,
  add column if not exists eventsub_connected_at timestamptz,
  add column if not exists last_bits_at timestamptz,
  add column if not exists last_bits_detail text not null default '';

create table if not exists private.bits_events (
  event_id text primary key,
  twitch_login text not null,
  sku text not null default '',
  granted boolean not null default false,
  detail text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists private.bits_pending (
  event_id text primary key,
  twitch_login text not null,
  sku text not null,
  created_at timestamptz not null default now()
);

create index if not exists bits_pending_login_idx
  on private.bits_pending (lower(twitch_login));

alter table private.bits_events enable row level security;
alter table private.bits_pending enable row level security;

create or replace function private.bits_sku(p_title text, p_bits int)
returns text
language plpgsql
immutable
as $$
declare
  title text := lower(btrim(coalesce(p_title, '')));
begin
  title := regexp_replace(title, '[''`´]', '', 'g');
  if title = any (array[
    'starter pack', 'trainers kit', 'trainer kit'
  ]) then
    return 'bits-starter';
  end if;
  if title = any (array[
    'picnic pack', 'camp cache', 'pantry pack'
  ]) then
    return 'bits-pantry';
  end if;
  if title = any (array[
    'adventure pack', 'great hunt', 'great pack'
  ]) then
    return 'bits-great';
  end if;
  if title = any (array[
    'explorer pack', 'explorers pouch', 'explorer pouch', 'pouch pack'
  ]) then
    return 'bits-pouch';
  end if;
  if title = any (array[
    'ultra pack', 'ultra cache'
  ]) then
    return 'bits-ultra';
  end if;
  case coalesce(p_bits, 0)
    when 100 then return 'bits-starter';
    when 150 then return 'bits-pantry';
    when 200 then return 'bits-great';
    when 250 then return 'bits-pouch';
    when 300 then return 'bits-ultra';
    else return null;
  end case;
end;
$$;

create or replace function private.flush_bits_pending(p_uid uuid)
returns void
language plpgsql
as $$
declare
  login text;
  rec record;
  item jsonb;
begin
  if p_uid is null then
    return;
  end if;
  if current_setting('play.flushing_bits', true) = '1' then
    return;
  end if;
  perform set_config('play.flushing_bits', '1', true);
  select lower(twitch_login) into login from public.profiles where id = p_uid;
  if login is null or login = '' then
    return;
  end if;
  for rec in
    select event_id, sku
    from private.bits_pending
    where lower(twitch_login) = login
    order by created_at
  loop
    select elem into item
    from jsonb_array_elements(private.store_catalog()->'bits') as elem
    where elem->>'sku' = rec.sku;
    if item is null then
      delete from private.bits_pending where event_id = rec.event_id;
      update private.bits_events
        set detail = 'Unknown Bits pack.', granted = false
        where event_id = rec.event_id;
      continue;
    end if;
    begin
      perform private.grant_known(p_uid, item->'grants');
      delete from private.bits_pending where event_id = rec.event_id;
      update private.bits_events
        set granted = true, detail = 'Granted ' || (item->>'name') || ' to ' || login || '.'
        where event_id = rec.event_id;
    exception when others then
      update private.bits_events
        set detail = sqlerrm
        where event_id = rec.event_id;
    end;
  end loop;
end;
$$;

create or replace function private.ensure_inventory(p_uid uuid)
returns public.inventories
language plpgsql
as $$
declare
  inv public.inventories;
begin
  insert into public.inventories (user_id)
  values (p_uid)
  on conflict (user_id) do nothing;
  perform private.flush_bits_pending(p_uid);
  select * into inv from public.inventories where user_id = p_uid;
  return inv;
end;
$$;

create or replace function public.credit_bits_from_twitch(
  p_event_id text,
  p_login text,
  p_title text,
  p_bits int
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  login text := lower(btrim(coalesce(p_login, '')));
  sku text;
  item jsonb;
  trainer uuid;
  inserted text;
  note text;
begin
  if btrim(coalesce(p_event_id, '')) = '' then
    raise exception 'Missing Bits event id.';
  end if;
  sku := private.bits_sku(p_title, p_bits);
  insert into private.bits_events (event_id, twitch_login, sku, granted, detail)
  values (p_event_id, login, coalesce(sku, ''), false, '')
  on conflict (event_id) do nothing
  returning event_id into inserted;
  if inserted is null then
    return jsonb_build_object('ok', true, 'duplicate', true, 'message', 'Already credited.');
  end if;
  if sku is null then
    note := 'Unknown Power-Up "' || coalesce(p_title, '') || '" (' || coalesce(p_bits, 0)::text || ' Bits).';
    update private.bits_events set detail = note where event_id = p_event_id;
    update private.stream_bridge
      set last_bits_at = now(), last_bits_detail = note
      where id = 1;
    return jsonb_build_object('ok', true, 'granted', false, 'message', note);
  end if;
  select elem into item
  from jsonb_array_elements(private.store_catalog()->'bits') as elem
  where elem->>'sku' = sku;
  if item is null then
    note := 'Unknown Bits pack.';
    update private.bits_events set detail = note where event_id = p_event_id;
    return jsonb_build_object('ok', true, 'granted', false, 'message', note);
  end if;
  if login = '' then
    note := 'Twitch did not send a viewer login.';
    update private.bits_events set detail = note where event_id = p_event_id;
    return jsonb_build_object('ok', true, 'granted', false, 'message', note);
  end if;
  select id into trainer from public.profiles where lower(twitch_login) = login;
  if trainer is null then
    insert into private.bits_pending (event_id, twitch_login, sku)
    values (p_event_id, login, sku)
    on conflict (event_id) do nothing;
    note := (item->>'name') || ' is waiting. ' || login || ' needs to sign into Play once.';
    update private.bits_events set detail = note where event_id = p_event_id;
    update private.stream_bridge
      set last_bits_at = now(), last_bits_detail = note
      where id = 1;
    return jsonb_build_object('ok', true, 'pending', true, 'sku', sku, 'message', note);
  end if;
  begin
    perform private.grant_known(trainer, item->'grants');
    note := 'Granted ' || (item->>'name') || ' to ' || login || '.';
    update private.bits_events set granted = true, detail = note where event_id = p_event_id;
    update private.stream_bridge
      set last_bits_at = now(), last_bits_detail = note
      where id = 1;
    return jsonb_build_object('ok', true, 'granted', true, 'sku', sku, 'message', note);
  exception when others then
    insert into private.bits_pending (event_id, twitch_login, sku)
    values (p_event_id, login, sku)
    on conflict (event_id) do nothing;
    note := sqlerrm;
    update private.bits_events set detail = note where event_id = p_event_id;
    update private.stream_bridge
      set last_bits_at = now(), last_bits_detail = note
      where id = 1;
    return jsonb_build_object('ok', true, 'pending', true, 'sku', sku, 'message', note);
  end;
end;
$$;

create or replace function public.bits_eventsub_prepare()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  secret text;
begin
  select eventsub_secret into secret from private.stream_bridge where id = 1;
  if secret is null or btrim(secret) = '' then
    secret := encode(extensions.gen_random_bytes(32), 'hex');
    update private.stream_bridge set eventsub_secret = secret where id = 1;
  end if;
  return jsonb_build_object('secret', secret);
end;
$$;

create or replace function public.bits_eventsub_mark(
  p_subscription_id text,
  p_status text,
  p_error text default ''
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update private.stream_bridge
    set eventsub_id = nullif(btrim(coalesce(p_subscription_id, '')), ''),
        eventsub_status = nullif(btrim(coalesce(p_status, '')), ''),
        eventsub_connected_at = case
          when btrim(coalesce(p_status, '')) = 'enabled' then now()
          else eventsub_connected_at
        end,
        last_bits_detail = case
          when btrim(coalesce(p_error, '')) = '' then last_bits_detail
          else left(p_error, 400)
        end
    where id = 1;
  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;

create or replace function private.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  cfg public.site_config%rowtype;
  seen timestamptz;
  has_token boolean;
  pending int;
  last_err text;
  bits_status text;
  bits_at timestamptz;
  bits_last timestamptz;
  bits_detail text;
  bits_waiting int;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  r := private.latest_round();
  select * into cfg from public.site_config where id = 1;
  select b.seen_at, b.token_hash is not null, b.last_error,
         b.eventsub_status, b.eventsub_connected_at, b.last_bits_at, b.last_bits_detail
    into seen, has_token, last_err, bits_status, bits_at, bits_last, bits_detail
    from private.stream_bridge b where b.id = 1;
  select count(*)::int into pending from public.stream_commands where status in ('pending','running');
  select count(*)::int into bits_waiting from private.bits_pending;
  return jsonb_build_object(
    'trainers', (select count(*)::int from public.profiles),
    'passes', (select count(*)::int from public.profiles where starlight_pass),
    'channel', cfg.broadcaster_twitch_login,
    'twitchClientId', cfg.twitch_client_id,
    'twitchBroadcasterId', cfg.twitch_broadcaster_id,
    'live', (select is_live from public.stream_status where id = 1),
    'settings', cfg.game_settings,
    'bitsStoreEnabled', false,
    'round', private.public_round_json(r),
    'bridge', jsonb_build_object(
      'configured', coalesce(has_token, false),
      'online', seen is not null and seen > now() - interval '8 seconds',
      'seenAt', seen,
      'pending', coalesce(pending, 0),
      'lastError', last_err
    ),
    'bitsAuto', jsonb_build_object(
      'connected', coalesce(bits_status, '') = 'enabled',
      'status', bits_status,
      'connectedAt', bits_at,
      'lastAt', bits_last,
      'lastDetail', bits_detail,
      'pending', coalesce(bits_waiting, 0)
    )
  );
end;
$$;

revoke all on function public.credit_bits_from_twitch(text, text, text, int) from public, anon, authenticated;
revoke all on function public.bits_eventsub_prepare() from public, anon, authenticated;
revoke all on function public.bits_eventsub_mark(text, text, text) from public, anon, authenticated;
grant execute on function public.credit_bits_from_twitch(text, text, text, int) to service_role;
grant execute on function public.bits_eventsub_prepare() to service_role;
grant execute on function public.bits_eventsub_mark(text, text, text) to service_role;
