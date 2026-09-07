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
        'sku','bits-starter','name','Trainer''s Kit','bits',100,
        'grants',jsonb_build_object('pokeball',5,'greatball',2,'ultraball',1,'berry',3,'bait',2),
        'blurb','5 Poké · 2 Great · 1 Ultra · 3 Berry · 2 Bait'
      ),
      jsonb_build_object(
        'sku','bits-pantry','name','Camp Cache','bits',150,
        'grants',jsonb_build_object('pokeball',3,'berry',8,'bait',8),
        'blurb','8 Berry · 8 Bait · 3 Poké Balls'
      ),
      jsonb_build_object(
        'sku','bits-great','name','Great Hunt','bits',200,
        'grants',jsonb_build_object('pokeball',3,'greatball',5,'berry',5,'bait',3),
        'blurb','5 Great · 3 Poké · 5 Berry · 3 Bait'
      ),
      jsonb_build_object(
        'sku','bits-pouch','name','Explorer''s Pouch','bits',250,
        'grants',jsonb_build_object('bag_bonus',10,'pokeball',5,'berry',5,'bait',3),
        'blurb','+10 bag · 5 Poké · 5 Berry · 3 Bait'
      ),
      jsonb_build_object(
        'sku','bits-ultra','name','Ultra Cache','bits',300,
        'grants',jsonb_build_object('pokeball',5,'greatball',3,'ultraball',2,'lure',1,'berry',5,'bait',3),
        'blurb','2 Ultra · 3 Great · 5 Poké · 1 Lure · 5 Berry · 3 Bait'
      )
    )
  );
$$;
