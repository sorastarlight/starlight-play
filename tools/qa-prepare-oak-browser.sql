-- Prepare Play Tester for Oak Research → Mart sell browser QA.
-- Does not touch Sora or Twinkle.
do $prep$
declare
  qa uuid := 'a98cbf81-a6b2-4dbf-8448-8d62f6d5f523';
  sora uuid := '60ff5211-6ef8-40e6-8daa-095b5600bf4c';
  prog jsonb;
  claimable int;
  coins_before int;
  nugget_before int;
begin
  perform private.ensure_inventory(qa);

  -- Clear prior research claims so backfilled progress becomes claimable again
  delete from public.oak_research_claims where user_id = qa;

  -- Clear leftover QA valuables from prior tests (keep other items)
  update public.inventories
     set items = coalesce(items, '{}'::jsonb)
       - 'stardust' - 'pearl' - 'starpiece' - 'nugget' - 'bigpearl' - 'bignugget',
         updated_at = now()
   where user_id = qa;

  select coins, coalesce((items->>'nugget')::int, 0)
    into coins_before, nugget_before
    from public.inventories where user_id = qa;

  prog := private.oak_research_progress(qa);

  select count(*) into claimable
    from public.oak_research_milestones m
   where m.enabled
     and (
       (m.track_id = 'field' and coalesce((prog->>'field')::int,0) >= m.threshold and m.id <> 'line-all')
       or (m.track_id = 'evolution' and coalesce((prog->>'evolution')::int,0) >= m.threshold)
       or (m.track_id = 'line' and m.id <> 'line-all' and coalesce((prog->>'line')::int,0) >= m.threshold)
       or (m.track_id = 'line' and m.id = 'line-all' and coalesce((prog->>'line')::int,0) >= greatest(coalesce((prog->>'lineTotal')::int,0),1) and coalesce((prog->>'lineTotal')::int,0) > 0)
       or (m.track_id = 'transfer' and coalesce((prog->>'transfer')::int,0) >= m.threshold)
     );

  raise notice 'PREP claimable=% prog=% coins=% nugget=%', claimable, prog, coins_before, nugget_before;

  -- Prove Sora untouched snapshot marker
  if not exists (select 1 from public.inventories where user_id = sora) then
    raise notice 'Sora inventory missing (ok)';
  end if;
end;
$prep$;

select private.oak_research_progress('a98cbf81-a6b2-4dbf-8448-8d62f6d5f523') as prog;
select coins, items from public.inventories where user_id = 'a98cbf81-a6b2-4dbf-8448-8d62f6d5f523';
select count(*)::int as eligible_kanto_lines
  from (
    select s.family_id
      from public.species s
     where s.family_id is not null and s.dex between 1 and 151
     group by s.family_id
  ) f;
