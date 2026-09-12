-- Play enables Poké Balls from the trainer's clock, which can still be on
-- Prepare according to the database. Accept throws for Prepare and Throw so a
-- visible ball button actually works. The Play UI still greys balls until Throw.

create or replace function private.throw_action_ok(r public.encounter_rounds)
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
  return clk < coalesce((r.deadlines->>'reveal')::timestamptz, (r.deadlines->>'throw')::timestamptz)
     + interval '8 seconds';
end;
$$;
