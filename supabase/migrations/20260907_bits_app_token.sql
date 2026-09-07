-- Twitch webhook EventSub requires an app access token (client credentials).
-- Store the Play Twitch Client Secret off the public schema. Never return it to the browser.

alter table private.stream_bridge
  add column if not exists twitch_client_secret text;

create or replace function public.admin_save_twitch_client_secret(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if btrim(coalesce(p_secret, '')) = '' then
    raise exception 'Paste the Play Twitch Client Secret from the Starlight Play app.';
  end if;
  update private.stream_bridge
    set twitch_client_secret = btrim(p_secret)
    where id = 1;
  return jsonb_build_object('ok', true, 'message', 'Play Twitch Client Secret saved. It will not be shown again.');
end;
$$;

create or replace function public.bits_twitch_client_secret()
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  secret text;
begin
  select twitch_client_secret into secret from private.stream_bridge where id = 1;
  return secret;
end;
$$;

grant execute on function public.admin_save_twitch_client_secret(text) to authenticated;
revoke all on function public.bits_twitch_client_secret() from public, anon, authenticated;
grant execute on function public.bits_twitch_client_secret() to service_role;

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
  has_app_secret boolean;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  r := private.latest_round();
  select * into cfg from public.site_config where id = 1;
  select b.seen_at, b.token_hash is not null, b.last_error,
         b.eventsub_status, b.eventsub_connected_at, b.last_bits_at, b.last_bits_detail,
         b.twitch_client_secret is not null and btrim(b.twitch_client_secret) <> ''
    into seen, has_token, last_err, bits_status, bits_at, bits_last, bits_detail, has_app_secret
    from private.stream_bridge b where b.id = 1;
  select count(*)::int into pending from public.stream_commands where status in ('pending','running');
  select count(*)::int into bits_waiting from private.bits_pending;
  return jsonb_build_object(
    'trainers', (select count(*)::int from public.profiles),
    'passes', (select count(*)::int from public.profiles where starlight_pass),
    'channel', cfg.broadcaster_twitch_login,
    'twitchClientId', cfg.twitch_client_id,
    'twitchBroadcasterId', cfg.twitch_broadcaster_id,
    'twitchClientSecretSaved', coalesce(has_app_secret, false),
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
      'pending', coalesce(bits_waiting, 0),
      'needsAppSecret', not coalesce(has_app_secret, false)
    )
  );
end;
$$;
