begin read only;
with legacy as (select * from public.catches where ruleset_id is null),
refs as (
 select c.id,
 exists(select 1 from public.oak_transfers t where t.catch_id=c.id) oak,
 exists(select 1 from public.trade_listings t where t.catch_id=c.id) listing,
 exists(select 1 from public.trade_offers t where t.catch_id=c.id) offer,
 exists(select 1 from public.direct_trades t where t.a_catch=c.id or t.b_catch=c.id) direct_trade,
 exists(select 1 from public.candy_ledger t where t.related_catch=c.id) candy,
 exists(select 1 from public.evolution_log t where t.catch_id=c.id) evolution,
 exists(select 1 from public.species_mastery_events t where t.catch_id=c.id) mastery,
 exists(select 1 from private.species_mastery_outbox t where t.catch_id=c.id) outbox,
 exists(select 1 from private.catch_insert_authority t where t.catch_id=c.id) authority,
 exists(select 1 from public.profiles p where p.showcase::text like '%'||c.id::text||'%') showcase,
 coalesce(c.favorite,false) favorite,coalesce(c.locked,false) locked
 from legacy c
)
select jsonb_build_object('legacy_count',(select count(*) from legacy),'reference_counts',(select jsonb_build_object('oak',count(*)filter(where oak),'listing',count(*)filter(where listing),'offer',count(*)filter(where offer),'direct_trade',count(*)filter(where direct_trade),'candy',count(*)filter(where candy),'evolution',count(*)filter(where evolution),'mastery',count(*)filter(where mastery),'outbox',count(*)filter(where outbox),'authority',count(*)filter(where authority),'showcase',count(*)filter(where showcase),'favorite',count(*)filter(where favorite),'locked',count(*)filter(where locked)) from refs),'provisional_unreferenced',(select jsonb_build_object('count',count(*),'digest',md5(coalesce(string_agg(id::text,',' order by id),''))) from refs where not(oak or listing or offer or direct_trade or candy or evolution or mastery or outbox or authority or showcase or favorite or locked))) audit;
rollback;
