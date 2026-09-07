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
      jsonb_build_object(
        'sku','bits-starter','name','Starter Pack','bits',100,
        'grants',jsonb_build_object('bag_bonus',10,'pokeball',8,'greatball',4,'ultraball',1,'berry',4,'bait',3),
        'blurb','+10 bag · 8 Poké · 4 Great · 1 Ultra · 4 Berry · 3 Bait'
      ),
      jsonb_build_object(
        'sku','bits-pantry','name','Picnic Pack','bits',150,
        'grants',jsonb_build_object('bag_bonus',10,'berry',10,'bait',8,'greatball',4),
        'blurb','+10 bag · 10 Berry · 8 Bait · 4 Great'
      ),
      jsonb_build_object(
        'sku','bits-great','name','Adventure Pack','bits',200,
        'grants',jsonb_build_object('bag_bonus',10,'greatball',8,'pokeball',5,'ultraball',1,'berry',4,'bait',3),
        'blurb','+10 bag · 8 Great · 5 Poké · 1 Ultra · 4 Berry · 3 Bait'
      ),
      jsonb_build_object(
        'sku','bits-pouch','name','Explorer Pack','bits',250,
        'grants',jsonb_build_object('bag_bonus',20),
        'blurb','+20 bag space, forever'
      ),
      jsonb_build_object(
        'sku','bits-ultra','name','Ultra Pack','bits',300,
        'grants',jsonb_build_object('bag_bonus',20,'ultraball',8,'greatball',6,'pokeball',6,'lure',1,'berry',4,'bait',3),
        'blurb','+20 bag · 8 Ultra · 6 Great · 6 Poké · 1 Lure · 4 Berry · 3 Bait'
      )
    )
  );
$$;
