-- Prof. Oak transfer grants Evolution Candy (family candy), not legacy species candy keys.
create or replace function public.play_transfer_oak(p_catch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  c public.catches;
  spec public.species;
  fam int;
  pay int := 0;
  transferred int;
  extra boolean := false;
  candy_key text;
  copies int;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  select * into c from public.catches where id = p_catch_id and user_id = uid and transferred_at is null for update;
  if c.id is null then
    raise exception 'That Pokémon is not in your storage.';
  end if;
  if c.favorite or c.locked then
    raise exception 'Favorite or locked Pokémon cannot be sent to Professor Oak.';
  end if;
  if exists (select 1 from public.profiles p where p.id = uid and c.id = any (p.team_ids)) then
    raise exception 'Take it off your team before transferring to Professor Oak.';
  end if;
  if exists (select 1 from public.trade_listings t where t.catch_id = c.id and t.status = 'open') then
    raise exception 'Take it off the trade board first.';
  end if;
  select count(*) into copies
    from public.catches
   where user_id = uid and dex = c.dex and transferred_at is null;
  if copies <= 1 then
    raise exception 'This is your only currently owned %. Keep it for your Living Dex.', c.name;
  end if;

  select * into spec from public.species where dex = c.dex;
  fam := coalesce(spec.family_candy_species_id, spec.family_id, c.dex);
  candy_key := 'species-' || fam::text;
  if private.family_has_enabled_evo(fam) then
    pay := case coalesce(spec.evo_stage, 0) when 2 then 2 when 3 then 3 else 1 end;
    if coalesce(c.is_alpha, false) or strpos(coalesce(c.variant, ''), 'shiny') > 0 then
      pay := pay + 1;
    end if;
    perform private.grant_family_candy(
      uid, fam, pay, 'OAK_TRANSFER', 'Sent to Professor Oak',
      jsonb_build_object('idempotency', 'oak:' || c.id::text, 'catchId', c.id::text)
    );
  end if;

  insert into public.oak_transfers (user_id, dex, catch_id, candy_key)
  values (uid, c.dex, c.id, candy_key);
  select count(*)::int into transferred from public.oak_transfers where user_id = uid and dex = c.dex;
  if transferred > 0 and transferred % 50 = 0 and private.family_has_enabled_evo(fam) then
    perform private.grant_family_candy(
      uid, fam, 1, 'OAK_BONUS', 'Bonus for sending 50 of this species',
      jsonb_build_object('idempotency', 'oak-bonus:' || uid::text || ':' || c.dex::text || ':' || transferred::text, 'catchId', c.id::text)
    );
    extra := true;
    pay := pay + 1;
  end if;

  update public.catches set transferred_at = now() where id = c.id;
  perform private.pull_from_team(uid, c.id);

  return public.play_storage() || jsonb_build_object(
    'ok', true,
    'candyGranted', pay,
    'familyId', fam,
    'message', format(
      'Professor Oak took %s. You received %s Evolution Candy%s.',
      coalesce(nullif(c.nickname, ''), c.name),
      pay,
      case when extra then ' (including a bonus for transferring 50 of this species)' else '' end
    )
  );
end;
$function$;

grant execute on function public.play_transfer_oak(uuid) to authenticated;
