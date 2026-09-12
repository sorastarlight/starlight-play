-- Hub testing: skip the rest of the current Play phase by sliding the
-- frozen deadline clock forward.

create or replace function public.admin_advance_phase()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  ph text;
  next_ph text;
  clk timestamptz;
  current_end timestamptz;
  delta interval;
  label text;
begin
  perform private.require_hub();
  r := private.pick_play_round();
  if r is null or coalesce(r.cancelled, false) then
    raise exception 'No encounter to skip.';
  end if;
  if not private.deadlines_complete(r.deadlines) then
    raise exception 'This encounter has no phase clock to skip.';
  end if;
  ph := private.round_phase(r);
  if ph is null or ph = 'closed' then
    raise exception 'This encounter is already finished.';
  end if;
  clk := coalesce(r.paused_at, now());
  current_end := (r.deadlines->>ph)::timestamptz;
  if current_end is null then
    raise exception 'This encounter has no phase clock to skip.';
  end if;
  delta := current_end - clk + interval '80 milliseconds';
  if delta < interval '80 milliseconds' then
    delta := interval '80 milliseconds';
  end if;

  update public.encounter_rounds
    set deadlines = jsonb_build_object(
          'join', (deadlines->>'join')::timestamptz - delta,
          'prepare', (deadlines->>'prepare')::timestamptz - delta,
          'throw', (deadlines->>'throw')::timestamptz - delta,
          'reveal', (deadlines->>'reveal')::timestamptz - delta
        ),
        ends_at = ends_at - delta,
        updated_at = now()
    where id = r.id
    returning * into r;

  r := coalesce(private.settle_if_needed(r), r);
  next_ph := private.round_phase(r);
  label := case next_ph
    when 'join' then 'Join'
    when 'prepare' then 'Prepare'
    when 'throw' then 'Throw'
    when 'reveal' then 'the throw animation'
    else 'the end of the encounter'
  end;
  return private.admin_overview() || jsonb_build_object(
    'ok', true,
    'message', 'Skipped to ' || label || '.'
  );
end;
$$;

grant execute on function public.admin_advance_phase() to authenticated;

notify pgrst, 'reload schema';
