-- Fix Evolution Candy identity: family_candy_species_id must match family_id.
-- Root cause of Chansey→Rhyhorn: Chansey had family_id=113 but family_candy_species_id=111.
-- play_transfer_oak / catch rewards preferred family_candy_species_id, granting wrong line Candy.
-- Class of bug: leftover dex-2 heuristic on many singleton Kanto species.

-- 1) Align candy species key to authoritative family_id for all species.
update public.species s
   set family_candy_species_id = s.family_id
 where s.family_id is not null
   and s.family_candy_species_id is distinct from s.family_id;

-- 2) Singletons / missing family_id: self-key.
update public.species s
   set family_id = s.dex,
       family_candy_species_id = s.dex
 where s.dex between 1 and 151
   and s.family_id is null;

-- 3) Ensure evolution_families rows exist for every Kanto family_id in use.
insert into public.evolution_families (id, name, base_dex)
select s.family_id,
       coalesce((select name from public.species b where b.dex = s.family_id), 'Family ' || s.family_id::text),
       s.family_id
  from (select distinct family_id from public.species where family_id is not null and family_id between 1 and 151) s
on conflict (id) do update
  set base_dex = excluded.base_dex,
      name = coalesce(nullif(public.evolution_families.name, ''), excluded.name);

-- 4) Authoritative Oak transfer: resolve Candy by family_id, expose display base_dex + name.
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
  fam_name text;
  candy_base int;
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
  -- Authoritative Evolution Line = species.family_id (never treat family_id as an unrelated Dex).
  fam := coalesce(spec.family_id, c.dex);
  select f.name, f.base_dex
    into fam_name, candy_base
    from public.evolution_families f
   where f.id = fam;
  if candy_base is null then
    candy_base := fam;
    fam_name := coalesce(spec.name, c.name);
  end if;
  candy_key := 'species-' || fam::text;

  if private.family_has_enabled_evo(fam) or exists (
    select 1 from public.evolution_families f where f.id = fam
  ) then
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
  if transferred > 0 and transferred % 50 = 0 and pay > 0 then
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
    'candyBaseDex', candy_base,
    'candyName', coalesce(fam_name, 'Evolution') || ' Evolution Candy',
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

-- 5) Catch/release candy paths: prefer family_id.
create or replace function private.species_family_candy_id(p_dex int)
returns int
language sql
stable
as $function$
  select coalesce(
    (select s.family_id from public.species s where s.dex = p_dex),
    p_dex
  );
$function$;

create or replace function private.register_capture_collection(p_catch public.catches)
returns void
language plpgsql
as $function$
declare
  spec public.species;
  pay int;
  first_species boolean;
  fam int;
begin
  if private.round_is_test(p_catch.round_id) then return; end if;
  select * into spec from public.species where dex = p_catch.dex;
  fam := coalesce(spec.family_id, p_catch.dex);
  if private.family_has_enabled_evo(fam) then
    pay := private.candy_for_stage(spec.evo_stage);
    perform private.grant_family_candy(
      p_catch.user_id, fam, pay, 'CATCH_REWARD', 'Catch reward',
      jsonb_build_object('idempotency', 'candy-catch:' || p_catch.id::text, 'catchId', p_catch.id::text)
    );
  end if;
  perform private.grant_mastery(p_catch.user_id, p_catch.dex, 1, 'CATCH', 'mastery-catch:' || p_catch.id::text);
  if p_catch.variant like '%shiny%' then
    perform private.grant_mastery(p_catch.user_id, p_catch.dex, 3, 'SHINY', 'mastery-shiny:' || p_catch.id::text);
  end if;
  if p_catch.gender = 'Female' and p_catch.dex = any (private.female_visual_dex()) then
    select not exists (
      select 1 from public.catches
       where user_id = p_catch.user_id and dex = p_catch.dex and id <> p_catch.id
         and (gender = 'Female' or variant like '%female%')
    ) into first_species;
    if first_species then
      perform private.grant_mastery(p_catch.user_id, p_catch.dex, 1, 'VARIANT', 'mastery-female:' || p_catch.id::text);
    end if;
  end if;
end;
$function$;

-- 6) Integrity asserts
do $$
declare
  bad int;
  chansey_candy int;
begin
  select count(*) into bad
    from public.species
   where dex between 1 and 151
     and family_id is not null
     and family_candy_species_id is distinct from family_id;
  if bad <> 0 then
    raise exception 'family_candy_species_id still mismatches family_id for % species', bad;
  end if;

  select family_candy_species_id into chansey_candy from public.species where dex = 113;
  if chansey_candy is distinct from 113 then
    raise exception 'Chansey candy key must be 113 (got %)', chansey_candy;
  end if;
  if exists (select 1 from public.species where dex = 113 and family_candy_species_id = 111) then
    raise exception 'Chansey must not point Candy at Rhyhorn';
  end if;
  if exists (select 1 from public.species where dex = 27 and family_id = 25) then
    raise exception 'Sandshrew must not be in Pikachu family';
  end if;
end $$;
