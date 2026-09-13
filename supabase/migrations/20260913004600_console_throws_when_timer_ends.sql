-- When Throw hits 0, LIVE should list every trainer who locked in a ball.
-- Publish throwers on the round payload and give throw console rows a message.

create or replace function private.announce_throws(p_round uuid)
returns text
language plpgsql
as $$
declare
  rec record;
  who text;
  line text;
  last_line text;
begin
  for rec in
    select ep.user_id, ep.ball
    from public.encounter_players ep
    where ep.round_id = p_round
      and ep.ball is not null
      and not exists (
        select 1 from public.encounter_activity a
        where a.round_id = ep.round_id and a.user_id = ep.user_id and a.kind = 'threw'
      )
    order by coalesce(private.trainer_label(ep.user_id), 'Trainer'), ep.user_id
  loop
    who := coalesce(private.trainer_label(rec.user_id), 'A trainer');
    line := who || ' threw a ' || private.item_label(rec.ball);
    perform private.log_activity(p_round, rec.user_id, 'threw', rec.ball);
    update public.play_console_log l
      set message = line
      where l.round_id = p_round
        and l.user_id = rec.user_id
        and l.kind = 'threw'
        and coalesce(l.message, '') = '';
    last_line := line;
  end loop;
  return last_line;
end;
$$;

create or replace function private.public_round_json(r public.encounter_rounds)
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
  throwers jsonb;
  settled boolean;
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
  select coalesce(jsonb_agg(jsonb_build_object(
      'name', coalesce(private.trainer_label(ep.user_id), 'Trainer'),
      'ball', ep.ball
    ) order by coalesce(private.trainer_label(ep.user_id), 'Trainer')), '[]'::jsonb)
    into throwers
    from public.encounter_players ep
    where ep.round_id = r.id and ep.ball is not null;
  select exists (
    select 1 from public.encounter_players ep
    where ep.round_id = r.id and ep.result is not null
  ) into settled;
  if settled then
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
    'overlayPhase', r.phase,
    'paused', private.round_paused(r),
    'hidden', r.hidden,
    'cancelled', r.cancelled,
    'resolved', r.resolved,
    'pausedAt', r.paused_at,
    'dex', r.dex,
    'name', r.name,
    'variant', r.variant,
    'gender', r.gender,
    'location', coalesce(nullif(r.pokemon->>'location', ''), private.lgpe_habitat(r.dex)),
    'startedAt', r.started_at,
    'endsAt', private.phase_display_ends(r, ph),
    'deadlines', r.deadlines,
    'participants', participants,
    'prepared', prepared,
    'thrown', thrown,
    'baitBonusPercent', round(100 * shared, 1),
    'lastAction', r.last_action,
    'activity', activity,
    'honeyTrainers', coalesce(honey, '[]'::jsonb),
    'throwers', coalesce(throwers, '[]'::jsonb),
    'catchers', coalesce(catchers, '[]'::jsonb),
    'results', case when settled then (
      select jsonb_build_object(
        'caught', count(*) filter (where coalesce(caught, false))::int,
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

notify pgrst, 'reload schema';
