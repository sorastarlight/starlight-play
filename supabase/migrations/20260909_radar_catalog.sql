-- Rename Lure to Poké Radar in the mart catalog.

create or replace function private.store_catalog()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'rule', 'Bits and PokéCoins grant a listed set of items. Catch chance is never sold.',
    'coins', jsonb_build_array(
      jsonb_build_object('sku','berry5','name','Berry ×5','cost',25,'grants',jsonb_build_object('berry',5),'blurb','Helps your throw.'),
      jsonb_build_object('sku','bait5','name','Honey ×5','cost',30,'grants',jsonb_build_object('bait',5),'blurb','Helps the whole team.'),
      jsonb_build_object('sku','lure1','name','Poké Radar ×1','cost',80,'grants',jsonb_build_object('lure',1),'blurb','Automatically detects nearby Pokémon and joins you to any encounter that appears. Lasts 30 minutes.'),
      jsonb_build_object('sku','pouch10','name','Pouch +10','cost',120,'grants',jsonb_build_object('bag_bonus',10),'blurb','+10 bag space, forever.')
    ),
    'balls', jsonb_build_array(
      jsonb_build_object('sku','poke5','name','Poké Ball ×5','cost',40,'grants',jsonb_build_object('pokeball',5),'blurb','45% catch.'),
      jsonb_build_object('sku','great3','name','Great Ball ×3','cost',55,'grants',jsonb_build_object('greatball',3),'blurb','60% catch.'),
      jsonb_build_object('sku','ultra1','name','Ultra Ball ×1','cost',50,'grants',jsonb_build_object('ultraball',1),'blurb','75% catch.'),
      jsonb_build_object('sku','premier1','name','Premier Ball','cost',8,'grants',jsonb_build_object('premierball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','luxury1','name','Luxury Ball','cost',12,'grants',jsonb_build_object('luxuryball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','heal1','name','Heal Ball','cost',10,'grants',jsonb_build_object('healball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','friend1','name','Friend Ball','cost',10,'grants',jsonb_build_object('friendball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','love1','name','Love Ball','cost',10,'grants',jsonb_build_object('loveball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','nest1','name','Nest Ball','cost',10,'grants',jsonb_build_object('nestball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','net1','name','Net Ball','cost',10,'grants',jsonb_build_object('netball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','repeat1','name','Repeat Ball','cost',10,'grants',jsonb_build_object('repeatball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','timer1','name','Timer Ball','cost',10,'grants',jsonb_build_object('timerball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','dive1','name','Dive Ball','cost',10,'grants',jsonb_build_object('diveball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','dusk1','name','Dusk Ball','cost',12,'grants',jsonb_build_object('duskball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','quick1','name','Quick Ball','cost',12,'grants',jsonb_build_object('quickball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','fast1','name','Fast Ball','cost',10,'grants',jsonb_build_object('fastball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','lureball1','name','Lure Ball','cost',10,'grants',jsonb_build_object('lureball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','moon1','name','Moon Ball','cost',10,'grants',jsonb_build_object('moonball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','heavy1','name','Heavy Ball','cost',10,'grants',jsonb_build_object('heavyball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','level1','name','Level Ball','cost',10,'grants',jsonb_build_object('levelball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','safari1','name','Safari Ball','cost',18,'grants',jsonb_build_object('safariball',1),'blurb','60% catch.'),
      jsonb_build_object('sku','sport1','name','Sport Ball','cost',18,'grants',jsonb_build_object('sportball',1),'blurb','60% catch.'),
      jsonb_build_object('sku','cherish1','name','Cherish Ball','cost',20,'grants',jsonb_build_object('cherishball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','gs1','name','GS Ball','cost',25,'grants',jsonb_build_object('gsball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','ash1','name','Ash''s Poké Ball','cost',15,'grants',jsonb_build_object('ashball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','clone1','name','Clone Ball','cost',22,'grants',jsonb_build_object('cloneball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','dark1','name','Dark Ball','cost',22,'grants',jsonb_build_object('darkball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','old1','name','Old Ball','cost',12,'grants',jsonb_build_object('oldball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','hisuipoke1','name','Hisui Poké Ball','cost',10,'grants',jsonb_build_object('hisuipokeball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','hisuigreat1','name','Hisui Great Ball','cost',14,'grants',jsonb_build_object('hisuigreatball',1),'blurb','60% catch.'),
      jsonb_build_object('sku','hisuiultra1','name','Hisui Ultra Ball','cost',18,'grants',jsonb_build_object('hisuiultraball',1),'blurb','75% catch.'),
      jsonb_build_object('sku','feather1','name','Feather Ball','cost',10,'grants',jsonb_build_object('featherball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','wing1','name','Wing Ball','cost',14,'grants',jsonb_build_object('wingball',1),'blurb','60% catch.'),
      jsonb_build_object('sku','jet1','name','Jet Ball','cost',18,'grants',jsonb_build_object('jetball',1),'blurb','75% catch.'),
      jsonb_build_object('sku','hisuiheavy1','name','Hisui Heavy Ball','cost',10,'grants',jsonb_build_object('hisuiheavyball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','leaden1','name','Leaden Ball','cost',14,'grants',jsonb_build_object('leadenball',1),'blurb','60% catch.'),
      jsonb_build_object('sku','gigaton1','name','Gigaton Ball','cost',18,'grants',jsonb_build_object('gigatonball',1),'blurb','75% catch.'),
      jsonb_build_object('sku','origin1','name','Origin Ball','cost',40,'grants',jsonb_build_object('originball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','strange1','name','Strange Ball','cost',12,'grants',jsonb_build_object('strangeball',1),'blurb','45% catch.')
    ),
    'bits', jsonb_build_array(
      jsonb_build_object(
        'sku','bits-starter','name','Starter Pack','bits',100,
        'grants',jsonb_build_object('bag_bonus',10,'pokeball',8,'greatball',4,'ultraball',1,'berry',4,'bait',3),
        'blurb','+10 bag · 8 Poké Balls · 4 Great Balls · 1 Ultra Ball · 4 Berry · 3 Honey'
      ),
      jsonb_build_object(
        'sku','bits-pantry','name','Picnic Pack','bits',150,
        'grants',jsonb_build_object('bag_bonus',10,'berry',10,'bait',8,'greatball',4),
        'blurb','+10 bag · 10 Berry · 8 Honey · 4 Great Balls'
      ),
      jsonb_build_object(
        'sku','bits-great','name','Adventure Pack','bits',200,
        'grants',jsonb_build_object('bag_bonus',10,'greatball',8,'pokeball',5,'ultraball',1,'berry',4,'bait',3),
        'blurb','+10 bag · 8 Great Balls · 5 Poké Balls · 1 Ultra Ball · 4 Berry · 3 Honey'
      ),
      jsonb_build_object(
        'sku','bits-pouch','name','Explorer Pack','bits',250,
        'grants',jsonb_build_object('bag_bonus',20),
        'blurb','+20 bag space, forever'
      ),
      jsonb_build_object(
        'sku','bits-ultra','name','Ultra Pack','bits',300,
        'grants',jsonb_build_object('bag_bonus',20,'ultraball',8,'greatball',6,'pokeball',6,'lure',1,'berry',4,'bait',3),
        'blurb','+20 bag · 8 Ultra Balls · 6 Great Balls · 6 Poké Balls · 1 Poké Radar · 4 Berry · 3 Honey'
      )
    )
  );
$$;
