-- Hub was keeping the last fight on screen because overview always returned
-- latest_round. Match Play: idle after results, skip cleared/hidden ended
-- rounds, and let staff dismiss a finished card immediately.

create or replace function private.round_on_play(r public.encounter_rounds)
returns boolean
language plpgsql
stable
as $$
declare
  grace interval := interval '8 seconds';
  ph text;
begin
  if r is null or coalesce(r.cancelled, false) then
    return false;
  end if;
  if r.paused_at is not null then
    return true;
  end if;
  ph := private.round_phase(r);
  if coalesce(r.hidden, false) and (coalesce(r.resolved, false) or ph in ('reveal', 'closed')) then
    return false;
  end if;
  if r.deadlines is not null then
    return now() < coalesce((r.deadlines->>'reveal')::timestamptz, r.ends_at, '-infinity'::timestamptz) + grace;
  end if;
  return ph <> 'closed';
end;
$$;

create or replace function private.pick_play_round()
returns public.encounter_rounds
language plpgsql
stable
as $$
declare
  r public.encounter_rounds;
begin
  select x.* into r
  from public.encounter_rounds x
  where private.round_on_play(x)
  order by coalesce(x.started_at, x.updated_at) desc, x.updated_at desc
  limit 1;
  return r;
end;
$$;

create or replace function private.load_play_round(p_round_id uuid default null)
returns public.encounter_rounds
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
begin
  perform set_config('row_security', 'off', true);
  perform private.settle_due_rounds();
  if p_round_id is not null then
    select x.* into r
    from public.encounter_rounds x
    where x.id = p_round_id
      and private.round_on_play(x);
    if r is not null then
      return r;
    end if;
  end if;
  return private.pick_play_round();
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
  has_app_secret boolean;
  has_github boolean;
  staff_role text;
  secrets boolean;
begin
  perform private.require_hub();
  staff_role := private.play_staff_role();
  secrets := staff_role = 'owner';
  r := private.pick_play_round();
  select * into cfg from public.site_config where id = 1;
  select b.seen_at, b.token_hash is not null, b.last_error,
         b.eventsub_status, b.eventsub_connected_at, b.last_bits_at, b.last_bits_detail,
         b.twitch_client_secret is not null and btrim(b.twitch_client_secret) <> '',
         b.github_token is not null and btrim(b.github_token) <> ''
    into seen, has_token, last_err, bits_status, bits_at, bits_last, bits_detail, has_app_secret, has_github
    from private.stream_bridge b where b.id = 1;
  select count(*)::int into pending from public.stream_commands where status in ('pending','running');
  select count(*)::int into bits_waiting from private.bits_pending;
  return jsonb_build_object(
    'trainers', (select count(*)::int from public.profiles),
    'passes', (select count(*)::int from public.profiles where starlight_pass),
    'channel', cfg.broadcaster_twitch_login,
    'twitchClientId', case when secrets then cfg.twitch_client_id else null end,
    'twitchBroadcasterId', case when secrets then cfg.twitch_broadcaster_id else null end,
    'twitchClientSecretSaved', case when secrets then coalesce(has_app_secret, false) else null end,
    'githubTokenSaved', case when secrets then coalesce(has_github, false) else null end,
    'live', (select is_live from public.stream_status where id = 1),
    'settings', cfg.game_settings,
    'bitsStoreEnabled', false,
    'staffRole', staff_role,
    'canManageSecrets', secrets,
    'bitsPacks', private.store_catalog()->'bits',
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

create or replace function public.admin_clear_round()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  ph text;
begin
  perform private.require_hub();
  r := private.pick_play_round();
  if r is null then
    raise exception 'No encounter to clear.';
  end if;
  ph := private.round_phase(r);
  if r.paused_at is null
     and coalesce(r.resolved, false) = false
     and ph in ('join', 'prepare', 'throw') then
    raise exception 'Cancel a live encounter instead of clearing it.';
  end if;
  update public.encounter_rounds
    set hidden = true,
        phase = 'closed',
        last_action = coalesce(nullif(btrim(last_action), ''), 'Encounter cleared'),
        updated_at = now()
    where id = r.id;
  return private.admin_overview() || jsonb_build_object('ok', true, 'message', 'Encounter cleared from Play and the hub.');
end;
$$;

grant execute on function public.admin_clear_round() to authenticated;

notify pgrst, 'reload schema';
