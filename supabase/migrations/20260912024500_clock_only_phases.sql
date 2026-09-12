-- Play was blending overlay phase into the clock and letting later publishes
-- replace a complete timer set. That skipped join/prepare/throw and left
-- rounds unsettled when the tab was in the background. Drive every Play
-- phase from the frozen deadline clock, and settle due rounds on the server.

create or replace function private.deadlines_complete(d jsonb)
returns boolean
language sql
immutable
as $$
  select d is not null
    and nullif(d->>'join', '') is not null
    and nullif(d->>'prepare', '') is not null
    and nullif(d->>'throw', '') is not null
    and nullif(d->>'reveal', '') is not null;
$$;

create or replace function private.round_phase(r public.encounter_rounds)
returns text
language plpgsql
stable
as $$
declare
  clk timestamptz;
begin
  if r is null or r.cancelled then
    return 'closed';
  end if;
  if not private.deadlines_complete(r.deadlines) then
    return coalesce(nullif(r.phase, ''), 'closed');
  end if;
  clk := coalesce(r.paused_at, now());
  return case
    when clk < (r.deadlines->>'join')::timestamptz then 'join'
    when clk < (r.deadlines->>'prepare')::timestamptz then 'prepare'
    when clk < (r.deadlines->>'throw')::timestamptz then 'throw'
    when clk < (r.deadlines->>'reveal')::timestamptz then 'reveal'
    else 'closed'
  end;
end;
$$;

create or replace function private.settle_due_rounds()
returns void
language plpgsql
as $$
declare
  rec public.encounter_rounds;
begin
  for rec in
    select *
    from public.encounter_rounds
    where coalesce(cancelled, false) = false
      and coalesce(resolved, false) = false
      and paused_at is null
      and deadlines is not null
      and coalesce(started_at, updated_at) > now() - interval '2 hours'
      and now() >= coalesce(
        (deadlines->>'throw')::timestamptz,
        (deadlines->>'reveal')::timestamptz,
        '-infinity'::timestamptz
      )
  loop
    perform private.settle_if_needed(rec);
  end loop;
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
  grace interval := interval '8 seconds';
begin
  perform set_config('row_security', 'off', true);
  perform private.settle_due_rounds();
  if p_round_id is not null then
    select x.* into r
    from public.encounter_rounds x
    where x.id = p_round_id
      and coalesce(x.cancelled, false) = false;
    if r is not null then
      if r.paused_at is not null then
        return r;
      end if;
      if r.deadlines is not null
         and now() < coalesce((r.deadlines->>'reveal')::timestamptz, r.ends_at, now()) + grace then
        return r;
      end if;
      if r.deadlines is null and private.round_phase(r) <> 'closed' then
        return r;
      end if;
    end if;
  end if;
  select x.* into r
  from public.encounter_rounds x
  where coalesce(x.cancelled, false) = false
    and (
      x.paused_at is not null
      or (
        x.deadlines is not null
        and now() < coalesce((x.deadlines->>'reveal')::timestamptz, x.ends_at, '-infinity'::timestamptz) + grace
      )
      or (x.deadlines is null and coalesce(x.phase, 'closed') <> 'closed')
    )
  order by coalesce(x.started_at, x.updated_at) desc
  limit 1;
  return r;
end;
$$;

create or replace function public.bridge_publish(p_token text, p_round jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  source_key text;
  round_id uuid;
  rec record;
  v_phase text;
  v_hidden boolean;
  v_cancelled boolean;
  v_resolved boolean;
  existing public.encounter_rounds;
begin
  if not private.bridge_ok(p_token) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update private.stream_bridge set seen_at = now() where id = 1;
  perform private.settle_due_rounds();
  if p_round is null or coalesce(p_round->>'id', '') = '' then
    update public.encounter_rounds
      set hidden = true, phase = 'closed', last_action = coalesce(p_round->>'lastAction', last_action), updated_at = now()
      where source = 'mixitup'
        and coalesce(cancelled, false) = false
        and paused_at is null
        and coalesce(resolved, false) = true
        and phase <> 'closed'
        and (
          deadlines is null
          or coalesce((deadlines->>'reveal')::timestamptz, '-infinity'::timestamptz) <= now()
        );
    return jsonb_build_object('ok', true);
  end if;
  source_key := 'mixitup:' || (p_round->>'id');
  select * into existing from public.encounter_rounds where source_id = source_key;
  v_phase := coalesce(p_round->>'phase', 'closed');
  v_cancelled := coalesce((p_round->>'cancelled')::boolean, false);
  v_resolved := coalesce((p_round->>'resolved')::boolean, false);
  v_hidden := coalesce((p_round->>'hidden')::boolean, false);
  if not v_cancelled then
    v_hidden := false;
  end if;
  if existing.paused_at is not null and not v_cancelled and not v_resolved then
    return jsonb_build_object('ok', true, 'id', existing.id, 'paused', true);
  end if;
  insert into public.encounter_rounds (
    source_id, source, phase, hidden, pokemon, dex, name, variant, gender,
    started_at, deadlines, rules, resolved, cancelled, last_action, ends_at, players
  ) values (
    source_key, 'mixitup', v_phase,
    v_hidden,
    jsonb_build_object('dex', (p_round->>'dex')::int, 'name', p_round->>'name', 'variant', coalesce(p_round->>'variant', 'normal'), 'gender', coalesce(p_round->>'gender', 'Unknown')),
    nullif(p_round->>'dex', '')::int, p_round->>'name', coalesce(p_round->>'variant', 'normal'), coalesce(p_round->>'gender', 'Unknown'),
    nullif(p_round->>'startedAt', '')::timestamptz, p_round->'deadlines', p_round->'rules',
    v_resolved, v_cancelled,
    coalesce(p_round->>'lastAction', ''), nullif(p_round->>'endsAt', '')::timestamptz, '{}'::jsonb
  )
  on conflict (source_id) do update set
    source = 'mixitup',
    phase = excluded.phase,
    hidden = excluded.hidden, pokemon = excluded.pokemon,
    dex = excluded.dex, name = excluded.name, variant = excluded.variant, gender = excluded.gender,
    started_at = coalesce(public.encounter_rounds.started_at, excluded.started_at),
    deadlines = case
      when private.deadlines_complete(public.encounter_rounds.deadlines) then public.encounter_rounds.deadlines
      else coalesce(excluded.deadlines, public.encounter_rounds.deadlines)
    end,
    rules = excluded.rules,
    resolved = case
      when public.encounter_rounds.deadlines is not null
           and now() < coalesce((public.encounter_rounds.deadlines->>'throw')::timestamptz, now())
           and not excluded.cancelled
        then public.encounter_rounds.resolved
      else excluded.resolved or public.encounter_rounds.resolved
    end,
    cancelled = excluded.cancelled,
    last_action = case
      when excluded.last_action is null or btrim(excluded.last_action) = '' then public.encounter_rounds.last_action
      when excluded.last_action ~* 'joined'
           and exists (
             select 1 from public.encounter_players ep
             where ep.round_id = public.encounter_rounds.id
               and (ep.prep is not null or ep.ball is not null)
           )
           and not v_cancelled then public.encounter_rounds.last_action
      when exists (
        select 1 from public.encounter_players ep
        where ep.round_id = public.encounter_rounds.id and ep.ball is not null
      ) and excluded.last_action ~* 'berry|honey|bait' and not v_resolved then public.encounter_rounds.last_action
      else excluded.last_action
    end,
    paused_at = case
      when excluded.cancelled or (
        excluded.resolved
        and (
          public.encounter_rounds.deadlines is null
          or now() >= coalesce((public.encounter_rounds.deadlines->>'throw')::timestamptz, now())
        )
      ) then null
      else public.encounter_rounds.paused_at
    end,
    ends_at = excluded.ends_at, updated_at = now()
  returning id into round_id;
  select * into existing from public.encounter_rounds where id = round_id;
  existing := coalesce(private.settle_if_needed(existing), existing);
  if v_resolved then
    for rec in select value from jsonb_array_elements(coalesce(p_round->'results', '[]'::jsonb)) as t(value)
    loop
      if coalesce((rec.value->>'caught')::boolean, false) then
        perform private.record_stream_catch(
          rec.value->>'user', rec.value->>'name', nullif(p_round->>'dex', '')::int, p_round->>'name',
          coalesce(p_round->>'variant', 'normal'), coalesce(p_round->>'gender', 'Unknown'), rec.value->>'ball',
          round_id, 'mixitup:' || (p_round->>'id') || ':' || coalesce(rec.value->>'user', rec.value->>'name', ''), now()
        );
      end if;
    end loop;
  end if;
  return jsonb_build_object('ok', true, 'id', round_id);
end;
$$;

notify pgrst, 'reload schema';
