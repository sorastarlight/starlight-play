-- Seed multiple claimable Oak Research milestones for Play Tester browser UX.
do $seed$
declare
  qa uuid := 'a98cbf81-a6b2-4dbf-8448-8d62f6d5f523';
  i int;
  need int;
  prog jsonb;
begin
  perform private.ensure_inventory(qa);
  delete from public.oak_research_claims where user_id = qa;

  update public.inventories
     set items = coalesce(items, '{}'::jsonb)
       - 'stardust' - 'pearl' - 'starpiece' - 'nugget' - 'bigpearl' - 'bignugget',
         updated_at = now()
   where user_id = qa;

  for i in 1..12 loop
    if not exists (select 1 from public.catches where user_id = qa and dex = i) then
      insert into public.catches (id, user_id, dex, name, variant, gender, level, favorite, locked, obtained_method, ot_user_id, ot_name)
      values (
        gen_random_uuid(), qa, i,
        (select name from public.species where dex = i),
        'normal', 'Unknown', 5, false, false, 'ADMIN_QA', qa, 'ADMIN_QA'
      );
    end if;
  end loop;

  select greatest(0, 6 - count(*))::int into need from public.evolution_log where user_id = qa;
  for i in 1..need loop
    insert into public.evolution_log (user_id, catch_id, from_dex, to_dex, candy_spent, method)
    values (
      qa,
      coalesce(
        (select id from public.catches where user_id = qa order by caught_at desc nulls last limit 1),
        (select id from public.catches where user_id = qa limit 1)
      ),
      1, 2, 0, 'ADMIN_QA'
    );
  end loop;

  select greatest(0, 12 - count(*))::int into need from public.oak_transfers where user_id = qa;
  for i in 1..need loop
    insert into public.oak_transfers (user_id, dex, catch_id, candy_key)
    values (
      qa, 25,
      coalesce(
        (select id from public.catches where user_id = qa and dex = 25 limit 1),
        (select id from public.catches where user_id = qa limit 1)
      ),
      'species-25'
    );
  end loop;

  prog := private.oak_research_progress(qa);
  raise notice 'SEED prog=%', prog;
end;
$seed$;

select private.oak_research_progress('a98cbf81-a6b2-4dbf-8448-8d62f6d5f523') as prog;
select coins, items from public.inventories where user_id = 'a98cbf81-a6b2-4dbf-8448-8d62f6d5f523';
