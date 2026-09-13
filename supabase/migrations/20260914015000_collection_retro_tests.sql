-- Seed Candy/mastery from real catch history. Oak transfer candy is left alone.

insert into public.family_candy (user_id, family_id, qty)
select c.user_id, coalesce(s.family_id, c.dex), sum(private.candy_for_stage(s.evo_stage))::int
  from public.catches c
  join public.species s on s.dex = c.dex
 where c.round_id is not null
   and not exists (
     select 1 from public.candy_ledger l
      where l.user_id = c.user_id and l.idempotency = 'candy-catch:' || c.id::text
   )
 group by c.user_id, coalesce(s.family_id, c.dex)
on conflict (user_id, family_id) do update
  set qty = public.family_candy.qty + excluded.qty;

insert into public.candy_ledger (user_id, family_id, amount, type, reason, idempotency, related_catch, qty_before, qty_after)
select c.user_id, coalesce(s.family_id, c.dex), private.candy_for_stage(s.evo_stage), 'CATCH_REWARD', 'Historic catch',
       'candy-catch:' || c.id::text, c.id, 0, private.candy_for_stage(s.evo_stage)
  from public.catches c
  join public.species s on s.dex = c.dex
 where c.round_id is not null
   and not exists (
     select 1 from public.candy_ledger l
      where l.user_id = c.user_id and l.idempotency = 'candy-catch:' || c.id::text
   );

insert into public.species_mastery (user_id, dex, points, rank)
select c.user_id, c.dex,
       (count(*) + 3 * count(*) filter (where c.variant like '%shiny%'))::int,
       private.mastery_rank((count(*) + 3 * count(*) filter (where c.variant like '%shiny%'))::int)
  from public.catches c
 where c.round_id is not null
 group by c.user_id, c.dex
on conflict (user_id, dex) do update
  set points = greatest(public.species_mastery.points, excluded.points),
      rank = private.mastery_rank(greatest(public.species_mastery.points, excluded.points)),
      updated_at = now();

update public.trainer_stats t
   set species_mastered = (select count(*) from public.species_mastery s where s.user_id = t.user_id and s.rank >= 5),
       candy_earned = coalesce((select sum(qty) from public.family_candy f where f.user_id = t.user_id), 0),
       updated_at = now();

create or replace function private.collection_self_test()
returns table(name text, passed boolean, detail text)
language plpgsql
as $function$
begin
  name := 'Family Candy never goes negative';
  passed := not exists (select 1 from public.family_candy where qty < 0);
  detail := 'ok';
  return next;

  name := 'Candy belongs to families, not every stage';
  passed := exists (select 1 from public.species where dex = 2 and family_id = 1)
        and exists (select 1 from public.species where dex = 3 and family_id = 1);
  detail := 'Bulbasaur family';
  return next;

  name := 'Pikachu needs a Thunder Stone';
  passed := exists (select 1 from public.evolution_rules where from_dex = 25 and required_item = 'thunderstone' and candy_cost = 50);
  detail := 'Pikachu';
  return next;

  name := 'Dragonite is a long-term Candy sink';
  passed := exists (select 1 from public.evolution_rules where from_dex = 148 and to_dex = 149 and candy_cost = 100);
  detail := 'Dragonair';
  return next;

  name := 'Mew is not freely tradable';
  passed := exists (select 1 from public.species where dex = 151 and tradable = false);
  detail := 'Mew';
  return next;

  name := 'Variants do not invent extra families';
  passed := (select count(distinct family_id) <= 151 from public.species where dex between 1 and 151);
  detail := (select count(distinct family_id)::text from public.species where dex between 1 and 151);
  return next;

  name := 'No Trainer Level catch bonus still';
  passed := coalesce((private.progression_config()->>'levelCatchBonus')::boolean, true) = false;
  detail := 'false';
  return next;

  name := 'Historic Candy matches encounter catches';
  passed := not exists (
    select 1 from public.catches c
     where c.round_id is not null
       and not exists (select 1 from public.candy_ledger l where l.idempotency = 'candy-catch:' || c.id::text)
  );
  detail := 'seeded';
  return next;

  name := 'Oak candy table was not mixed in';
  passed := not exists (select 1 from public.candy_ledger where type = 'OAK');
  detail := 'separate';
  return next;

  name := 'Magikarp costs 100 Candy';
  passed := exists (select 1 from public.evolution_rules where from_dex = 129 and candy_cost = 100);
  detail := 'Gyarados';
  return next;
end;
$function$;
