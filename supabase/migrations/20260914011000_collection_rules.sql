-- Data-driven Kanto evolution rules. Costs are configurable.

insert into public.evolution_rules (id, from_dex, to_dex, family_id, candy_cost, required_item, condition_type, sort_order) values
  ('1-2',1,2,1,25,null,'CANDY_ONLY',10),
  ('2-3',2,3,1,50,null,'CANDY_ONLY',20),
  ('4-5',4,5,4,25,null,'CANDY_ONLY',30),
  ('5-6',5,6,4,50,null,'CANDY_ONLY',40),
  ('7-8',7,8,7,25,null,'CANDY_ONLY',50),
  ('8-9',8,9,7,50,null,'CANDY_ONLY',60),
  ('10-11',10,11,10,25,null,'CANDY_ONLY',70),
  ('11-12',11,12,10,50,null,'CANDY_ONLY',80),
  ('13-14',13,14,13,25,null,'CANDY_ONLY',90),
  ('14-15',14,15,13,50,null,'CANDY_ONLY',100),
  ('16-17',16,17,16,25,null,'CANDY_ONLY',110),
  ('17-18',17,18,16,50,null,'CANDY_ONLY',120),
  ('19-20',19,20,19,50,null,'CANDY_ONLY',130),
  ('21-22',21,22,21,50,null,'CANDY_ONLY',140),
  ('23-24',23,24,23,50,null,'CANDY_ONLY',150),
  ('25-26',25,26,25,50,'thunderstone','STONE',160),
  ('27-28',27,28,27,50,null,'CANDY_ONLY',170),
  ('29-30',29,30,29,25,null,'CANDY_ONLY',180),
  ('30-31',30,31,29,50,null,'CANDY_ONLY',190),
  ('32-33',32,33,32,25,null,'CANDY_ONLY',200),
  ('33-34',33,34,32,50,null,'CANDY_ONLY',210),
  ('35-36',35,36,35,50,'moonstone','STONE',220),
  ('37-38',37,38,37,50,'firestone','STONE',230),
  ('39-40',39,40,39,50,'moonstone','STONE',240),
  ('41-42',41,42,41,50,null,'CANDY_ONLY',250),
  ('43-44',43,44,43,25,null,'CANDY_ONLY',260),
  ('44-45',44,45,43,50,'leafstone','STONE',270),
  ('46-47',46,47,46,50,null,'CANDY_ONLY',280),
  ('48-49',48,49,48,50,null,'CANDY_ONLY',290),
  ('50-51',50,51,50,50,null,'CANDY_ONLY',300),
  ('52-53',52,53,52,50,null,'CANDY_ONLY',310),
  ('54-55',54,55,54,50,null,'CANDY_ONLY',320),
  ('56-57',56,57,56,50,null,'CANDY_ONLY',330),
  ('58-59',58,59,58,50,'firestone','STONE',340),
  ('60-61',60,61,60,25,null,'CANDY_ONLY',350),
  ('61-62',61,62,60,50,'waterstone','STONE',360),
  ('63-64',63,64,63,25,null,'CANDY_ONLY',370),
  ('64-65',64,65,63,50,'linkingcord','TRADE_OR_ITEM',380),
  ('66-67',66,67,66,25,null,'CANDY_ONLY',390),
  ('67-68',67,68,66,50,'linkingcord','TRADE_OR_ITEM',400),
  ('69-70',69,70,69,25,null,'CANDY_ONLY',410),
  ('70-71',70,71,69,50,'leafstone','STONE',420),
  ('72-73',72,73,72,50,null,'CANDY_ONLY',430),
  ('74-75',74,75,74,25,null,'CANDY_ONLY',440),
  ('75-76',75,76,74,50,'linkingcord','TRADE_OR_ITEM',450),
  ('77-78',77,78,77,50,null,'CANDY_ONLY',460),
  ('79-80',79,80,79,50,null,'CANDY_ONLY',470),
  ('81-82',81,82,81,50,null,'CANDY_ONLY',480),
  ('84-85',84,85,84,50,null,'CANDY_ONLY',490),
  ('86-87',86,87,86,50,null,'CANDY_ONLY',500),
  ('88-89',88,89,88,50,null,'CANDY_ONLY',510),
  ('90-91',90,91,90,50,'waterstone','STONE',520),
  ('92-93',92,93,92,25,null,'CANDY_ONLY',530),
  ('93-94',93,94,92,50,'linkingcord','TRADE_OR_ITEM',540),
  ('96-97',96,97,96,50,null,'CANDY_ONLY',550),
  ('98-99',98,99,98,50,null,'CANDY_ONLY',560),
  ('100-101',100,101,100,50,null,'CANDY_ONLY',570),
  ('102-103',102,103,102,50,'leafstone','STONE',580),
  ('104-105',104,105,104,50,null,'CANDY_ONLY',590),
  ('109-110',109,110,109,50,null,'CANDY_ONLY',600),
  ('111-112',111,112,111,50,null,'CANDY_ONLY',610),
  ('116-117',116,117,116,50,null,'CANDY_ONLY',620),
  ('118-119',118,119,118,50,null,'CANDY_ONLY',630),
  ('120-121',120,121,120,50,'waterstone','STONE',640),
  ('129-130',129,130,129,100,null,'CANDY_ONLY',650),
  ('133-134',133,134,133,50,'waterstone','STONE',660),
  ('133-135',133,135,133,50,'thunderstone','STONE',670),
  ('133-136',133,136,133,50,'firestone','STONE',680),
  ('138-139',138,139,138,50,null,'CANDY_ONLY',690),
  ('140-141',140,141,140,50,null,'CANDY_ONLY',700),
  ('147-148',147,148,147,50,null,'CANDY_ONLY',710),
  ('148-149',148,149,147,100,null,'CANDY_ONLY',720)
on conflict (id) do update
  set candy_cost = excluded.candy_cost,
      required_item = excluded.required_item,
      condition_type = excluded.condition_type,
      enabled = true;

insert into public.progression_titles (id, name, description, rarity, sort_order) values
  ('first-evolution', 'Evolution Trainer', 'Evolved a Pokémon for the first time.', 'common', 200),
  ('link-cable', 'Link Cable', 'Evolved a Pokémon through a trade.', 'rare', 210),
  ('species-master', 'Species Master', 'Reached Master rank with a species.', 'epic', 220),
  ('trader', 'Pokémon Trader', 'Completed a trainer-to-trainer trade.', 'common', 230)
on conflict (id) do update set name = excluded.name, description = excluded.description;

insert into public.progression_achievements
  (id, name, description, category, requirement_type, target_value, rewards, sort_order)
values
  ('evo-1', 'First Evolution', 'Evolve a Pokémon.', 'pokedex', 'EVOLUTIONS', 1, '{"title":"first-evolution"}', 600),
  ('evo-10', 'Evolution Fan', 'Evolve 10 Pokémon.', 'pokedex', 'EVOLUTIONS', 10, '{}', 610),
  ('evo-50', 'Evolution Expert', 'Evolve 50 Pokémon.', 'pokedex', 'EVOLUTIONS', 50, '{}', 620),
  ('trade-1', 'Pokémon Trader', 'Complete a trainer-to-trainer trade.', 'community', 'TRADES', 1, '{"title":"trader"}', 630),
  ('trade-10', 'Trade Partner', 'Complete 10 trades.', 'community', 'TRADES', 10, '{}', 640),
  ('master-1', 'First Species Mastered', 'Reach Master rank with one species.', 'pokedex', 'SPECIES_MASTERED', 1, '{"title":"species-master"}', 650),
  ('master-5', 'Five Masters', 'Master 5 species.', 'pokedex', 'SPECIES_MASTERED', 5, '{}', 660),
  ('master-10', 'Ten Masters', 'Master 10 species.', 'pokedex', 'SPECIES_MASTERED', 10, '{}', 670),
  ('dup-catch-10', 'Another One', 'Catch 10 duplicate Pokémon.', 'catching', 'DUPLICATE_CATCHES', 10, '{}', 680),
  ('dup-catch-50', 'Familiar Faces', 'Catch 50 duplicate Pokémon.', 'catching', 'DUPLICATE_CATCHES', 50, '{}', 690)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, target_value = excluded.target_value, rewards = excluded.rewards;

insert into private.store_categories (id, key, name, kind, sort, visible, system)
values ('11111111-1111-1111-1111-111111111007', 'evolution', 'Evolution Items', 'coins', 28, true, true)
on conflict (id) do update set name = excluded.name, visible = true, key = excluded.key;

insert into private.store_items (category_id, sku, name, blurb, cost, grants, sprite, thumb, sort, featured, visible)
values
  ('11111111-1111-1111-1111-111111111007','firestone1','Fire Stone','Evolves Vulpix, Growlithe, or Eevee when you also have enough Candy.',600,'{"firestone":1}','fire-stone.png','',10,true,true),
  ('11111111-1111-1111-1111-111111111007','waterstone1','Water Stone','Evolves Poliwhirl, Shellder, Staryu, or Eevee when you also have enough Candy.',600,'{"waterstone":1}','water-stone.png','',20,true,true),
  ('11111111-1111-1111-1111-111111111007','thunderstone1','Thunder Stone','Evolves Pikachu or Eevee when you also have enough Candy.',600,'{"thunderstone":1}','thunder-stone.png','',30,true,true),
  ('11111111-1111-1111-1111-111111111007','leafstone1','Leaf Stone','Evolves Gloom, Weepinbell, or Exeggcute when you also have enough Candy.',600,'{"leafstone":1}','leaf-stone.png','',40,true,true),
  ('11111111-1111-1111-1111-111111111007','moonstone1','Moon Stone','Evolves Clefairy or Jigglypuff when you also have enough Candy.',600,'{"moonstone":1}','moon-stone.png','',50,true,true),
  ('11111111-1111-1111-1111-111111111007','linkingcord1','Linking Cord','Lets trade-evolution Pokémon evolve without a partner trade.',900,'{"linkingcord":1}','linking-cord.png','',60,false,true)
on conflict (sku) do update
  set name = excluded.name, blurb = excluded.blurb, cost = excluded.cost, grants = excluded.grants, visible = true;
