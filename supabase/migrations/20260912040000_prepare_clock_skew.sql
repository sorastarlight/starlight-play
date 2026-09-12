-- Play enables Berry/Honey from the trainer's clock, which can be a few
-- seconds off the database. Accept prepare items for the whole join/prepare
-- window (and the start of throw) so a visible Berry button actually works.
-- The Play UI still greys them until Prepare.

create or replace function private.prepare_action_ok(r public.encounter_rounds)
returns boolean
language plpgsql
stable
as $$
declare
  clk timestamptz;
begin
  if r is null or coalesce(r.cancelled, false) or private.round_paused(r) then
    return false;
  end if;
  if private.round_phase(r) in ('join', 'prepare', 'throw') then
    return true;
  end if;
  if r.deadlines is null then
    return false;
  end if;
  clk := coalesce(r.paused_at, now());
  return clk < coalesce((r.deadlines->>'throw')::timestamptz, (r.deadlines->>'reveal')::timestamptz)
     + interval '2 seconds';
end;
$$;
