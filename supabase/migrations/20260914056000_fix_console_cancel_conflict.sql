-- play_sync was aborting every few seconds: settle_if_needed writes a
-- cancelled console row, then the encounter_rounds trigger writes the same
-- row and unique_violation rolled the cancel back. Play and staff pages
-- then failed to load.

create or replace function private.mirror_round_to_console()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  kind text;
  message text;
begin
  if tg_op = 'INSERT' then
    kind := 'appeared';
    message := coalesce(nullif(btrim(new.name), ''), 'A Pokémon') || ' appeared!';
  elsif new.cancelled and not coalesce(old.cancelled, false) then
    kind := 'cancelled';
    message := coalesce(nullif(btrim(new.last_action), ''), 'Encounter cancelled.');
  elsif new.resolved and not coalesce(old.resolved, false) then
    kind := 'resolved';
    message := coalesce(nullif(btrim(new.last_action), ''), 'Results locked in.');
  elsif new.hidden is distinct from old.hidden then
    kind := 'hidden';
    message := case when new.hidden then 'Encounter hidden from viewers.' else 'Encounter shown to viewers.' end;
  else
    return new;
  end if;
  begin
    insert into public.play_console_log (round_id, kind, message)
    values (new.id, kind, message);
  exception
    when unique_violation then
      null;
  end;
  return new;
end;
$function$;

update public.encounter_rounds
  set cancelled = true,
      hidden = true,
      phase = 'closed',
      resolved = true,
      paused_at = null,
      last_action = coalesce(nullif(btrim(last_action), ''), 'Encounter cancelled'),
      updated_at = now()
where cancelled = false
  and resolved = false
  and phase = 'join'
  and ends_at < now()
  and not exists (
    select 1 from public.encounter_players ep where ep.round_id = encounter_rounds.id
  );
