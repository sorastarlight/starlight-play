BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $guard$ BEGIN
IF md5(pg_get_viewdef('private.hub_reward_catalog'::regclass,true)) IS DISTINCT FROM '4bc5040f4b25c7ebd00a25fbcb61a4e6' THEN RAISE EXCEPTION 'Reward names source drift'; END IF;
IF (SELECT relacl::text FROM pg_class WHERE oid='private.hub_reward_catalog'::regclass) IS DISTINCT FROM '{postgres=arwdDxtm/postgres}' OR (SELECT reloptions FROM pg_class WHERE oid='private.hub_reward_catalog'::regclass) IS DISTINCT FROM ARRAY['security_invoker=true'] THEN RAISE EXCEPTION 'Reward names permission drift'; END IF;
END $guard$;
create or replace view private.hub_reward_catalog with (security_invoker=true) as

with core(id,kind,name,sprite,category,target_key) as (values

 ('item:berry','item','Berry','images/items/oran-berry.png','Berries','berry'),

 ('item:bait','item','Honey','images/items/honey.png','Capture tools','bait'),

 ('item:pokeball','item','Poké Ball','images/items/poke-ball.png','Poké Balls','pokeball'),

 ('item:greatball','item','Great Ball','images/items/great-ball.png','Poké Balls','greatball'),

 ('item:ultraball','item','Ultra Ball','images/items/ultra-ball.png','Poké Balls','ultraball'),

 ('item:lure','item','Poké Radar','images/items/poke-radar.png','Capture tools','lure'),

 ('coins','coins','PokéCoins','images/items/pokecoin.png','Currency','coins'),

 ('space','space','Inventory Space','images/items/inventory-bag.png','Capacity','bag_bonus'),

 ('item:firestone','item','Fire Stone','images/items/fire-stone.png','Evolution items','firestone'),

 ('item:waterstone','item','Water Stone','images/items/water-stone.png','Evolution items','waterstone'),

 ('item:thunderstone','item','Thunder Stone','images/items/thunder-stone.png','Evolution items','thunderstone'),

 ('item:leafstone','item','Leaf Stone','images/items/leaf-stone.png','Evolution items','leafstone'),

 ('item:moonstone','item','Moon Stone','images/items/moon-stone.png','Evolution items','moonstone'),

 ('item:linkingcord','item','Linking Cord','images/items/linking-cord.png','Evolution items','linkingcord'),

 ('item:rarecandy','item','Rare Candy','images/items/rare-candy.png','Evolution items','rarecandy')

), all_rows as (

 select core.id,core.kind,coalesce((select b.name from public.capture_balls b where b.key=core.target_key),(select b.name from public.capture_berries b where b.key=core.target_key),core.name) name,core.sprite,core.category,core.target_key,null::int target_number,true enabled from core

 union all select 'item:'||b.key,'item',b.name,case when b.image like 'images/%' then b.image else 'images/items/'||b.image end,'Poké Balls',b.key,null,b.enabled from public.capture_balls b where not exists(select 1 from core where target_key=b.key)

 union all select 'item:'||b.key,'item',b.name,case when b.sprite like 'images/%' then b.sprite else 'images/items/'||b.sprite end,'Berries',b.key,null,b.enabled from public.capture_berries b where not exists(select 1 from core where target_key=b.key)

 union all select 'item:'||p.item_slug,'item',c.display_name,c.sprite_path,'Other items',p.item_slug,null,p.inventory_enabled and (p.admin_grant_enabled or p.mart_buy_enabled) from public.item_policy p join public.item_catalog c on c.slug=p.item_slug where p.inventory_enabled and not exists(select 1 from core where target_key=p.item_slug) and not exists(select 1 from public.capture_balls b where b.key=p.item_slug) and not exists(select 1 from public.capture_berries b where b.key=p.item_slug)

 union all select 'candy:'||f.id,'candy',f.name||' Evolution Candy','images/items/evolution-candy/'||f.id||'.png','Evolution Candy',null,f.id,true from public.evolution_families f where f.id in (select distinct coalesce(nullif(s.family_candy_species_id,0),s.family_id,s.dex) from public.species s where s.dex between 1 and 151)

 union all select 'pokemon:'||s.dex,'pokemon',s.name,'images/pokemon/home/'||s.dex||'.png','Pokémon',null,s.dex,true from public.species s where s.dex between 1 and 151

)

select id,kind,coalesce(name,initcap(id)) name,case when sprite ~ '^images/[a-zA-Z0-9_./-]+[.](png|webp|svg)$' and sprite not like '%..%' then sprite else 'images/items/secret-gift.svg' end sprite,category,target_key,target_number,coalesce(enabled,false) enabled,case when kind='pokemon' then 100 else 10000 end max_quantity,id<>'item:masterball' shop_allowed,true pass_allowed,true staff_allowed from all_rows;
COMMIT;
