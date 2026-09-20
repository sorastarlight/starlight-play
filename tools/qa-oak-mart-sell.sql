-- Play Tester QA for Mart sell + Oak Research (no Sora/Twinkle mutation)
do $qa$
declare
  qa uuid := 'a98cbf81-a6b2-4dbf-8448-8d62f6d5f523';
  before_coins int;
  after_coins int;
  before_nugget int;
  after_nugget int;
  unit int;
  prog jsonb;
  ordinary int;
  over151 int;
  sora_coins_before int;
  sora_coins_after int;
begin
  if not exists (select 1 from public.profiles where id = qa) then
    raise exception 'Play Tester missing';
  end if;

  select coins into sora_coins_before
    from public.inventories
   where user_id = '60ff5211-6ef8-40e6-8daa-095b5600bf4c';

  perform private.ensure_inventory(qa);
  select coins, coalesce((items->>'nugget')::int, 0)
    into before_coins, before_nugget
    from public.inventories where user_id = qa;

  perform private.adjust_item(qa, 'nugget', 2);
  unit := private.item_sell_price('nugget');
  if coalesce(unit, 0) < 1 then
    raise exception 'nugget sell price missing';
  end if;

  perform private.adjust_item(qa, 'nugget', -1);
  perform private.adjust_coins(
    qa, unit, 'MART_SALE', 'QA sell nugget',
    jsonb_build_object('idempotency', 'qa-mart-sell-nugget-1')
  );
  insert into public.mart_sales (user_id, item_slug, quantity, unit_price, coins_received, idempotency, detail)
  values (qa, 'nugget', 1, unit, unit, 'qa-mart-sell-nugget-1', '{}'::jsonb)
  on conflict do nothing;

  select coins, coalesce((items->>'nugget')::int, 0)
    into after_coins, after_nugget
    from public.inventories where user_id = qa;

  if after_coins <> before_coins + unit then
    raise exception 'coin credit mismatch % vs %', after_coins, before_coins + unit;
  end if;
  if after_nugget <> before_nugget + 1 then
    raise exception 'nugget qty mismatch';
  end if;

  begin
    perform private.adjust_item(qa, 'nugget', -(after_nugget + 5));
    raise exception 'oversell should have failed';
  exception when others then
    if sqlerrm not ilike '%enough%' then raise; end if;
  end;

  if coalesce(private.item_sell_price('masterball'), 0) > 0 then
    raise exception 'masterball must not be sellable';
  end if;
  if coalesce(private.item_sell_price('rarecandy'), 0) > 0 then
    raise exception 'rarecandy must not be sellable';
  end if;

  prog := private.oak_research_progress(qa);

  insert into public.oak_research_claims (user_id, milestone_id, rewards)
  values (qa, 'transfer-1', '{"stardust":1}'::jsonb)
  on conflict do nothing;

  begin
    insert into public.oak_research_claims (user_id, milestone_id, rewards)
    values (qa, 'transfer-1', '{"stardust":1}'::jsonb);
    raise exception 'duplicate claim should fail';
  exception when unique_violation then
    null;
  end;

  delete from public.oak_research_claims
   where user_id = qa and milestone_id = 'transfer-1';

  -- restore QA inventory/coins
  perform private.adjust_item(qa, 'nugget', -1);
  perform private.adjust_coins(
    qa, -unit, 'ADMIN_QA', 'QA sell cleanup',
    jsonb_build_object('idempotency', 'qa-mart-sell-nugget-1-cleanup')
  );
  delete from public.mart_sales where user_id = qa and idempotency = 'qa-mart-sell-nugget-1';

  select coins into sora_coins_after
    from public.inventories
   where user_id = '60ff5211-6ef8-40e6-8daa-095b5600bf4c';
  if sora_coins_before is distinct from sora_coins_after then
    raise exception 'Sora coins mutated during QA';
  end if;

  select count(*) into ordinary
    from public.species s
   where s.dex between 1 and 151 and private.spawn_species_eligible(s.dex, false);
  select count(*) into over151
    from public.species s
   where s.dex > 151 and private.spawn_species_eligible(s.dex, false);
  if over151 <> 0 then
    raise exception 'containment fail over151=%', over151;
  end if;

  raise notice 'QA_OK unit=% ordinary=% prog=%', unit, ordinary, prog;
end;
$qa$;
