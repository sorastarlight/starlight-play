-- Hidden TEST rounds must stay on Play through the result hold so joiners
-- can see their catch. Overlay still uses round.hidden to hide from stream.
-- Does not change capture math, spawn, or phase durations.

create or replace function private.round_on_play(r public.encounter_rounds)
returns boolean
language plpgsql
stable
as $$
declare
  hold interval := interval '12 seconds';
  unresolved_keep interval := interval '2 minutes';
  ph text;
begin
  if r is null then
    return false;
  end if;
  if r.paused_at is not null then
    return true;
  end if;
  if coalesce(r.cancelled, false) then
    return now() < coalesce(r.updated_at, r.started_at, now()) + hold;
  end if;
  ph := private.round_phase(r);
  if coalesce(r.resolved, false) then
    return now() < coalesce(r.updated_at, (r.deadlines->>'reveal')::timestamptz, r.ends_at, now()) + hold;
  end if;
  if r.deadlines is not null then
    return now() < coalesce((r.deadlines->>'reveal')::timestamptz, r.ends_at, '-infinity'::timestamptz) + unresolved_keep;
  end if;
  return ph <> 'closed';
end;
$$;
