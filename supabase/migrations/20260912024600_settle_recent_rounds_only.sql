-- settle_due_rounds must not touch days-old hub test rounds; that spammed
-- the Play console as if a new Pokémon had appeared.

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
