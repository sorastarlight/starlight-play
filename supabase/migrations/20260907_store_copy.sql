create or replace function private.store_catalog()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'rule', 'Bits and PokéCoins grant a listed set of items. Catch chance is never sold.',
    'coins', jsonb_build_array(
      jsonb_build_object('sku','poke5','name','Poké Ball ×5','cost',40,'grants',jsonb_build_object('pokeball',5),'blurb','45% catch.'),
      jsonb_build_object('sku','great3','name','Great Ball ×3','cost',55,'grants',jsonb_build_object('greatball',3),'blurb','60% catch.'),
      jsonb_build_object('sku','ultra1','name','Ultra Ball ×1','cost',50,'grants',jsonb_build_object('ultraball',1),'blurb','75% catch.'),
      jsonb_build_object('sku','berry5','name','Berry ×5','cost',25,'grants',jsonb_build_object('berry',5),'blurb','Helps your throw.'),
      jsonb_build_object('sku','bait5','name','Bait ×5','cost',30,'grants',jsonb_build_object('bait',5),'blurb','Helps the whole team.'),
      jsonb_build_object('sku','lure1','name','Lure ×1','cost',80,'grants',jsonb_build_object('lure',1),'blurb','Auto-join the next encounter.'),
      jsonb_build_object('sku','pouch10','name','Pouch +10','cost',120,'grants',jsonb_build_object('bag_bonus',10),'blurb','+10 bag space, forever.')
    ),
    'bits', jsonb_build_array(
      jsonb_build_object('sku','bits-starter','name','Starter Pack','bits',100,'grants',jsonb_build_object('pokeball',5,'berry',5),'blurb','5 Poké Balls + 5 Berries'),
      jsonb_build_object('sku','bits-great','name','Great Pack','bits',200,'grants',jsonb_build_object('greatball',3,'bait',5),'blurb','3 Great Balls + 5 Bait'),
      jsonb_build_object('sku','bits-ultra','name','Ultra Pack','bits',300,'grants',jsonb_build_object('ultraball',1,'lure',1),'blurb','1 Ultra Ball + 1 Lure'),
      jsonb_build_object('sku','bits-pantry','name','Pantry Pack','bits',150,'grants',jsonb_build_object('berry',5,'bait',5),'blurb','5 Berries + 5 Bait'),
      jsonb_build_object('sku','bits-pouch','name','Pouch Pack','bits',250,'grants',jsonb_build_object('bag_bonus',10),'blurb','+10 bag space')
    )
  );
$$;
