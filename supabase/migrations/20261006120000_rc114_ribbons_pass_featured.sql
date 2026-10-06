-- rc114: canonical Ribbons presentation, featured max 5, Pass QA Daily Supply

alter table public.progression_badges
  add column if not exists ribbon_id text,
  add column if not exists ribbon_origin text not null default '',
  add column if not exists ribbon_flavor text not null default '',
  add column if not exists icon_path text not null default '';

insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('catch-10', 'Effort Ribbon', 'A Ribbon for Pokémon that put forth a great deal of effort.', 'common', 200, 'effort-ribbon', 'Generation III — Hoenn', 'A Ribbon for Pokémon that put forth a great deal of effort.', 'images/ribbons/effort-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'catch-10')
   where id = 'catch-10';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('catch-25', 'Footprint Ribbon', 'A Ribbon awarded for leaving a lasting footprint on a journey.', 'common', 200, 'footprint-ribbon', 'Generation IV — Sinnoh', 'A Ribbon awarded for leaving a lasting footprint on a journey.', 'images/ribbons/footprint-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'catch-25')
   where id = 'catch-25';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('catch-50', 'Training Ribbon', 'A Ribbon awarded for completing all Secret Super Training regimens.', 'common', 200, 'training-ribbon', 'Generation VI — Super Training', 'A Ribbon awarded for completing all Secret Super Training regimens.', 'images/ribbons/training-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'catch-50')
   where id = 'catch-50';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('catch-100', 'Skillful Battler Ribbon', 'A Ribbon awarded for defeating the Battle Chatelaine at the Battle Maison.', 'rare', 200, 'skillful-battler-ribbon', 'Generation VI — Battle Maison', 'A Ribbon awarded for defeating the Battle Chatelaine at the Battle Maison.', 'images/ribbons/skillful-battler-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'catch-100')
   where id = 'catch-100';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('catch-250', 'Expert Battler Ribbon', 'A Ribbon awarded for defeating the Battle Chatelaine in Super Battles.', 'rare', 200, 'expert-battler-ribbon', 'Generation VI — Battle Maison', 'A Ribbon awarded for defeating the Battle Chatelaine in Super Battles.', 'images/ribbons/expert-battler-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'catch-250')
   where id = 'catch-250';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('catch-500', 'Battle Memory Ribbon (Gold)', 'A gold Ribbon commemorating outstanding battle accomplishments.', 'legendary', 200, 'battle-memory-ribbon-gold', 'Generation VI', 'A gold Ribbon commemorating outstanding battle accomplishments.', 'images/ribbons/battle-memory-ribbon-gold.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'catch-500')
   where id = 'catch-500';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('catch-1000', 'Tower Master Ribbon', 'A Ribbon awarded for becoming a Battle Tower Master.', 'legendary', 200, 'tower-master-ribbon', 'Generation VIII — Battle Tower', 'A Ribbon awarded for becoming a Battle Tower Master.', 'images/ribbons/tower-master-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'catch-1000')
   where id = 'catch-1000';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('dup-5', 'Alert Ribbon', 'A memorial Ribbon for a Pokémon that lived alertly.', 'common', 200, 'alert-ribbon', 'Generation IV — Sinnoh memorial', 'A memorial Ribbon for a Pokémon that lived alertly.', 'images/ribbons/alert-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'dup-5')
   where id = 'dup-5';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('dup-10', 'Shock Ribbon', 'A memorial Ribbon for a Pokémon that lived through shock.', 'common', 200, 'shock-ribbon', 'Generation IV — Sinnoh memorial', 'A memorial Ribbon for a Pokémon that lived through shock.', 'images/ribbons/shock-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'dup-10')
   where id = 'dup-10';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('dup-25', 'Careless Ribbon', 'A memorial Ribbon for a Pokémon that lived carelessly.', 'common', 200, 'careless-ribbon', 'Generation IV — Sinnoh memorial', 'A memorial Ribbon for a Pokémon that lived carelessly.', 'images/ribbons/careless-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'dup-25')
   where id = 'dup-25';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('dup-50', 'Relax Ribbon', 'A memorial Ribbon for a Pokémon that lived relaxedly.', 'rare', 200, 'relax-ribbon', 'Generation IV — Sinnoh memorial', 'A memorial Ribbon for a Pokémon that lived relaxedly.', 'images/ribbons/relax-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'dup-50')
   where id = 'dup-50';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('dup-100', 'Snooze Ribbon', 'A memorial Ribbon for a Pokémon that lived sleepily.', 'rare', 200, 'snooze-ribbon', 'Generation IV — Sinnoh memorial', 'A memorial Ribbon for a Pokémon that lived sleepily.', 'images/ribbons/snooze-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'dup-100')
   where id = 'dup-100';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('join-10', 'Country Ribbon', 'A Ribbon awarded for winning at a Pokémon League Tower challenge.', 'common', 200, 'country-ribbon', 'Generation III — Hoenn Tower', 'A Ribbon awarded for winning at a Pokémon League Tower challenge.', 'images/ribbons/country-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'join-10')
   where id = 'join-10';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('join-50', 'Marine Ribbon', 'A souvenir Ribbon from a marine-themed place.', 'common', 200, 'marine-ribbon', 'Generation III — Hoenn souvenir', 'A souvenir Ribbon from a marine-themed place.', 'images/ribbons/marine-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'join-50')
   where id = 'join-50';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('encounters-100', 'Land Ribbon', 'A souvenir Ribbon from a land-themed place.', 'rare', 200, 'land-ribbon', 'Generation III — Hoenn souvenir', 'A souvenir Ribbon from a land-themed place.', 'images/ribbons/land-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'encounters-100')
   where id = 'join-100';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('join-250', 'Sky Ribbon', 'A souvenir Ribbon from a sky-themed place.', 'rare', 200, 'sky-ribbon', 'Generation III — Hoenn souvenir', 'A souvenir Ribbon from a sky-themed place.', 'images/ribbons/sky-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'join-250')
   where id = 'join-250';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('join-500', 'National Ribbon', 'A Ribbon awarded for overcoming all difficult challenges.', 'legendary', 200, 'national-ribbon', 'Generation III — Hoenn', 'A Ribbon awarded for overcoming all difficult challenges.', 'images/ribbons/national-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'join-500')
   where id = 'join-500';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('join-1000', 'World Ribbon', 'A Ribbon awarded for being World Champions.', 'legendary', 200, 'world-ribbon', 'Generation III — Hoenn Tower', 'A Ribbon awarded for being World Champions.', 'images/ribbons/world-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'join-1000')
   where id = 'join-1000';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('honey-10', 'Smile Ribbon', 'A memorial Ribbon for a Pokémon that lived with a smile.', 'common', 200, 'smile-ribbon', 'Generation IV — Sinnoh memorial', 'A memorial Ribbon for a Pokémon that lived with a smile.', 'images/ribbons/smile-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'honey-10')
   where id = 'honey-10';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('honey-25', 'Blue Ribbon', 'A souvenir Blue Ribbon.', 'common', 200, 'blue-ribbon', 'Generation III souvenir', 'A souvenir Blue Ribbon.', 'images/ribbons/blue-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'honey-25')
   where id = 'honey-25';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('honey-50', 'Festival Ribbon', 'A Ribbon awarded during a Festival event.', 'rare', 200, 'festival-ribbon', 'Generation IV — event', 'A Ribbon awarded during a Festival event.', 'images/ribbons/festival-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'honey-50')
   where id = 'honey-50';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('honey-100', 'Carnival Ribbon', 'A Ribbon awarded during a Carnival event.', 'rare', 200, 'carnival-ribbon', 'Generation IV — event', 'A Ribbon awarded during a Carnival event.', 'images/ribbons/carnival-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'honey-100')
   where id = 'honey-100';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('honey-250', 'Premier Ribbon', 'A special Ribbon from a special occasion.', 'legendary', 200, 'premier-ribbon', 'Generation IV — event', 'A special Ribbon from a special occasion.', 'images/ribbons/premier-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'honey-250')
   where id = 'honey-250';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('honey-500', 'Special Ribbon', 'A special Ribbon for a special occasion.', 'legendary', 200, 'special-ribbon', 'Generation IV — event', 'A special Ribbon for a special occasion.', 'images/ribbons/special-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'honey-500')
   where id = 'honey-500';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('first-shiny', 'Gorgeous Ribbon', 'An extraordinarily gorgeous and extravagant Ribbon.', 'rare', 200, 'gorgeous-ribbon', 'Generation IV — Sinnoh', 'An extraordinarily gorgeous and extravagant Ribbon.', 'images/ribbons/gorgeous-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'first-shiny')
   where id = 'shiny-1';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('shiny-5', 'Royal Ribbon', 'An incredibly regal Ribbon with an air of nobility.', 'rare', 200, 'royal-ribbon', 'Generation IV — Sinnoh', 'An incredibly regal Ribbon with an air of nobility.', 'images/ribbons/royal-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'shiny-5')
   where id = 'shiny-5';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('shiny-10', 'Gorgeous Royal Ribbon', 'A gorgeous and regal Ribbon that is the highest of luxury.', 'legendary', 200, 'gorgeous-royal-ribbon', 'Generation IV — Sinnoh', 'A gorgeous and regal Ribbon that is the highest of luxury.', 'images/ribbons/gorgeous-royal-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'shiny-10')
   where id = 'shiny-10';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('shiny-25', 'Beauty Master Ribbon', 'A Ribbon awarded for becoming a Beauty Contest Master.', 'legendary', 200, 'beauty-master-ribbon', 'Generation VI — Pokémon Contests', 'A Ribbon awarded for becoming a Beauty Contest Master.', 'images/ribbons/beauty-master-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'shiny-25')
   where id = 'shiny-25';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('shiny-50', 'Contest Star Ribbon', 'A Ribbon awarded for becoming a Contest Star.', 'legendary', 200, 'contest-star-ribbon', 'Generation VI — Hoenn Contests', 'A Ribbon awarded for becoming a Contest Star.', 'images/ribbons/contest-star-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'shiny-50')
   where id = 'shiny-50';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('shiny-100', 'Wishing Ribbon', 'A Ribbon said to make a wish come true.', 'legendary', 200, 'wishing-ribbon', 'Generation IV — event', 'A Ribbon said to make a wish come true.', 'images/ribbons/wishing-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'shiny-100')
   where id = 'shiny-100';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('shiny-151', 'Legend Ribbon', 'A Ribbon awarded for setting a legendary record.', 'legendary', 200, 'legend-ribbon', 'Generation IV', 'A Ribbon awarded for setting a legendary record.', 'images/ribbons/legend-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'shiny-151')
   where id = 'shiny-151';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('female-1', 'Cute Ribbon', 'A Ribbon awarded for winning the Cute Contest Normal Rank in Hoenn.', 'common', 200, 'cute-ribbon-hoenn', 'Generation III — Hoenn Contests', 'A Ribbon awarded for winning the Cute Contest Normal Rank in Hoenn.', 'images/ribbons/cute-ribbon-hoenn.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'female-1')
   where id = 'female-1';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('female-10', 'Cute Ribbon Super', 'A Ribbon awarded for winning the Cute Contest Super Rank in Hoenn.', 'rare', 200, 'cute-ribbon-super-hoenn', 'Generation III — Hoenn Contests', 'A Ribbon awarded for winning the Cute Contest Super Rank in Hoenn.', 'images/ribbons/cute-ribbon-super-hoenn.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'female-10')
   where id = 'female-10';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('female-all', 'Cute Ribbon Master', 'A Ribbon awarded for winning the Cute Contest Master Rank in Hoenn.', 'legendary', 200, 'cute-ribbon-master-hoenn', 'Generation III — Hoenn Contests', 'A Ribbon awarded for winning the Cute Contest Master Rank in Hoenn.', 'images/ribbons/cute-ribbon-master-hoenn.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'female-all')
   where id = 'female-all';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('net-10', 'Cool Ribbon', 'A Ribbon awarded for winning the Cool Contest Normal Rank in Hoenn.', 'common', 200, 'cool-ribbon-hoenn', 'Generation III — Hoenn Contests', 'A Ribbon awarded for winning the Cool Contest Normal Rank in Hoenn.', 'images/ribbons/cool-ribbon-hoenn.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'net-10')
   where id = 'net-10';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('dusk-10', 'Smart Ribbon', 'A Ribbon awarded for winning the Smart Contest Normal Rank in Hoenn.', 'common', 200, 'smart-ribbon-hoenn', 'Generation III — Hoenn Contests', 'A Ribbon awarded for winning the Smart Contest Normal Rank in Hoenn.', 'images/ribbons/smart-ribbon-hoenn.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'dusk-10')
   where id = 'dusk-10';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('repeat-10', 'Beauty Ribbon', 'A Ribbon awarded for winning the Beauty Contest Normal Rank in Hoenn.', 'common', 200, 'beauty-ribbon-hoenn', 'Generation III — Hoenn Contests', 'A Ribbon awarded for winning the Beauty Contest Normal Rank in Hoenn.', 'images/ribbons/beauty-ribbon-hoenn.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'repeat-10')
   where id = 'repeat-10';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('fast-10', 'Tough Ribbon', 'A Ribbon awarded for winning the Tough Contest Normal Rank in Hoenn.', 'common', 200, 'tough-ribbon-hoenn', 'Generation III — Hoenn Contests', 'A Ribbon awarded for winning the Tough Contest Normal Rank in Hoenn.', 'images/ribbons/tough-ribbon-hoenn.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'fast-10')
   where id = 'fast-10';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('perfect-1', 'Cool Ribbon Super', 'A Ribbon awarded for winning the Cool Contest Super Rank in Hoenn.', 'rare', 200, 'cool-ribbon-super-hoenn', 'Generation III — Hoenn Contests', 'A Ribbon awarded for winning the Cool Contest Super Rank in Hoenn.', 'images/ribbons/cool-ribbon-super-hoenn.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'perfect-1')
   where id = 'perfect-1';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('perfect-10', 'Cool Ribbon Hyper', 'A Ribbon awarded for winning the Cool Contest Hyper Rank in Hoenn.', 'rare', 200, 'cool-ribbon-hyper-hoenn', 'Generation III — Hoenn Contests', 'A Ribbon awarded for winning the Cool Contest Hyper Rank in Hoenn.', 'images/ribbons/cool-ribbon-hyper-hoenn.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'perfect-10')
   where id = 'perfect-10';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('perfect-50', 'Cool Ribbon Master', 'A Ribbon awarded for winning the Cool Contest Master Rank in Hoenn.', 'legendary', 200, 'cool-ribbon-master-hoenn', 'Generation III — Hoenn Contests', 'A Ribbon awarded for winning the Cool Contest Master Rank in Hoenn.', 'images/ribbons/cool-ribbon-master-hoenn.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'perfect-50')
   where id = 'perfect-50';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('rare-1', 'Artist Ribbon', 'A Ribbon awarded for being chosen as a super Contest star in Hoenn.', 'rare', 200, 'artist-ribbon', 'Generation III — Hoenn Contests', 'A Ribbon awarded for being chosen as a super Contest star in Hoenn.', 'images/ribbons/artist-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'rare-1')
   where id = 'rare-1';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('rare-10', 'Record Ribbon', 'A Ribbon awarded for setting an incredible record.', 'rare', 200, 'record-ribbon', 'Generation IV', 'A Ribbon awarded for setting an incredible record.', 'images/ribbons/record-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'rare-10')
   where id = 'rare-10';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('vrare-1', 'Souvenir Ribbon', 'A souvenir Ribbon from a special location.', 'rare', 200, 'souvenir-ribbon', 'Generation IV — event', 'A souvenir Ribbon from a special location.', 'images/ribbons/souvenir-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'vrare-1')
   where id = 'vrare-1';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('vrare-10', 'Classic Ribbon', 'A Ribbon awarded during a Classic competition.', 'rare', 200, 'classic-ribbon', 'Generation IV — event', 'A Ribbon awarded during a Classic competition.', 'images/ribbons/classic-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'vrare-10')
   where id = 'vrare-10';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('urare-1', 'Event Ribbon', 'A Ribbon awarded for participating in a special Pokémon event.', 'legendary', 200, 'event-ribbon', 'Generation IV — event', 'A Ribbon awarded for participating in a special Pokémon event.', 'images/ribbons/event-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'urare-1')
   where id = 'urare-1';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('legendary-catch', 'Champion Ribbon', 'A Ribbon awarded for beating the Champion and entering the Hall of Fame.', 'legendary', 200, 'champion-ribbon', 'Generation III — Hoenn League', 'A Ribbon awarded for beating the Champion and entering the Hall of Fame.', 'images/ribbons/champion-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'legendary-catch')
   where id = 'legend-1';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('kanto-legend-set', 'Sinnoh Champion Ribbon', 'A Ribbon awarded for beating the Sinnoh Champion and entering the Hall of Fame.', 'legendary', 200, 'sinnoh-champion-ribbon', 'Generation IV — Sinnoh League', 'A Ribbon awarded for beating the Sinnoh Champion and entering the Hall of Fame.', 'images/ribbons/sinnoh-champion-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'kanto-legend-set')
   where id = 'kanto-legend-set';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('fail-25', 'Downcast Ribbon', 'A memorial Ribbon for a Pokémon that lived through melancholy.', 'common', 200, 'downcast-ribbon', 'Generation IV — Sinnoh memorial', 'A memorial Ribbon for a Pokémon that lived through melancholy.', 'images/ribbons/downcast-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'fail-25')
   where id = 'fail-25';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('streak-5', 'Winning Ribbon', 'A Ribbon awarded for clearing Hoenn''s Battle Tower''s Lv. 50 challenge.', 'rare', 200, 'winning-ribbon', 'Generation III — Hoenn Battle Tower', 'A Ribbon awarded for clearing Hoenn''s Battle Tower''s Lv. 50 challenge.', 'images/ribbons/winning-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'streak-5')
   where id = 'streak-5';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('streak-10', 'Victory Ribbon', 'A Ribbon awarded for clearing Hoenn''s Battle Tower''s Lv. 100 challenge.', 'legendary', 200, 'victory-ribbon', 'Generation III — Hoenn Battle Tower', 'A Ribbon awarded for clearing Hoenn''s Battle Tower''s Lv. 100 challenge.', 'images/ribbons/victory-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'streak-10')
   where id = 'streak-10';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('odds-5', 'Earth Ribbon', 'A Ribbon awarded for winning 100 consecutive times at the Battle Tower.', 'legendary', 200, 'earth-ribbon', 'Generation III — Hoenn Battle Tower', 'A Ribbon awarded for winning 100 consecutive times at the Battle Tower.', 'images/ribbons/earth-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'odds-5')
   where id = 'odds-5';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('evo-1', 'Best Friends Ribbon', 'A Ribbon that can be given to a Pokémon with which you share a close bond.', 'common', 200, 'best-friends-ribbon', 'Generation VI', 'A Ribbon that can be given to a Pokémon with which you share a close bond.', 'images/ribbons/best-friends-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'evo-1')
   where id = 'evo-1';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('evo-10', 'Contest Memory Ribbon', 'A Ribbon commemorating participation in Pokémon Contests.', 'rare', 200, 'contest-memory-ribbon', 'Generation VI', 'A Ribbon commemorating participation in Pokémon Contests.', 'images/ribbons/contest-memory-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'evo-10')
   where id = 'evo-10';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('evo-50', 'Contest Memory Ribbon (Gold)', 'A gold Ribbon commemorating outstanding Contest accomplishments.', 'legendary', 200, 'contest-memory-ribbon-gold', 'Generation VI', 'A gold Ribbon commemorating outstanding Contest accomplishments.', 'images/ribbons/contest-memory-ribbon-gold.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'evo-50')
   where id = 'evo-50';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('trade-1', 'History Ribbon', 'A Ribbon awarded for making history.', 'common', 200, 'history-ribbon', 'Generation IV', 'A Ribbon awarded for making history.', 'images/ribbons/history-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'trade-1')
   where id = 'trade-1';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('trade-10', 'Battle Tree Great Ribbon', 'A Ribbon awarded for a great showing at the Battle Tree.', 'rare', 200, 'battle-tree-great-ribbon', 'Generation VII — Battle Tree', 'A Ribbon awarded for a great showing at the Battle Tree.', 'images/ribbons/battle-tree-great-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'trade-10')
   where id = 'trade-10';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('master-1', 'Battle Memory Ribbon', 'A Ribbon commemorating participation in battles.', 'rare', 200, 'battle-memory-ribbon', 'Generation VI', 'A Ribbon commemorating participation in battles.', 'images/ribbons/battle-memory-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'master-1')
   where id = 'master-1';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('master-5', 'Kalos Champion Ribbon', 'A Ribbon awarded for becoming the Kalos Champion.', 'legendary', 200, 'kalos-champion-ribbon', 'Generation VI — Kalos League', 'A Ribbon awarded for becoming the Kalos Champion.', 'images/ribbons/kalos-champion-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'master-5')
   where id = 'master-5';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('master-10', 'World Champion Ribbon', 'A Ribbon awarded to a World Champion.', 'legendary', 200, 'world-champion-ribbon', 'Generation IV — World Championships', 'A Ribbon awarded to a World Champion.', 'images/ribbons/world-champion-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'master-10')
   where id = 'master-10';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('dup-catch-10', 'Birthday Ribbon', 'A Ribbon awarded on a birthday.', 'common', 200, 'birthday-ribbon', 'Generation IV — event', 'A Ribbon awarded on a birthday.', 'images/ribbons/birthday-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'dup-catch-10')
   where id = 'dup-catch-10';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('kanto-25', 'Beauty Ribbon Super', 'A Ribbon awarded for winning the Beauty Contest Super Rank in Hoenn.', 'common', 200, 'beauty-ribbon-super-hoenn', 'Generation III — Hoenn Contests', 'A Ribbon awarded for winning the Beauty Contest Super Rank in Hoenn.', 'images/ribbons/beauty-ribbon-super-hoenn.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'kanto-25')
   where id = 'dex-25';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('kanto-50', 'Smart Ribbon Super', 'A Ribbon awarded for winning the Smart Contest Super Rank in Hoenn.', 'rare', 200, 'smart-ribbon-super-hoenn', 'Generation III — Hoenn Contests', 'A Ribbon awarded for winning the Smart Contest Super Rank in Hoenn.', 'images/ribbons/smart-ribbon-super-hoenn.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'kanto-50')
   where id = 'dex-50';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('dex-75', 'Tough Ribbon Super', 'A Ribbon awarded for winning the Tough Contest Super Rank in Hoenn.', 'rare', 200, 'tough-ribbon-super-hoenn', 'Generation III — Hoenn Contests', 'A Ribbon awarded for winning the Tough Contest Super Rank in Hoenn.', 'images/ribbons/tough-ribbon-super-hoenn.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'dex-75')
   where id = 'dex-75';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('kanto-100', 'Beauty Ribbon Hyper', 'A Ribbon awarded for winning the Beauty Contest Hyper Rank in Hoenn.', 'rare', 200, 'beauty-ribbon-hyper-hoenn', 'Generation III — Hoenn Contests', 'A Ribbon awarded for winning the Beauty Contest Hyper Rank in Hoenn.', 'images/ribbons/beauty-ribbon-hyper-hoenn.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'kanto-100')
   where id = 'dex-100';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('dex-125', 'Smart Ribbon Hyper', 'A Ribbon awarded for winning the Smart Contest Hyper Rank in Hoenn.', 'legendary', 200, 'smart-ribbon-hyper-hoenn', 'Generation III — Hoenn Contests', 'A Ribbon awarded for winning the Smart Contest Hyper Rank in Hoenn.', 'images/ribbons/smart-ribbon-hyper-hoenn.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'dex-125')
   where id = 'dex-125';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('kanto-complete', 'Hoenn Champion Ribbon', 'A Ribbon awarded for becoming the Hoenn Champion.', 'legendary', 200, 'hoenn-champion-ribbon', 'Generation VI — Omega Ruby / Alpha Sapphire', 'A Ribbon awarded for becoming the Hoenn Champion.', 'images/ribbons/hoenn-champion-ribbon.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'kanto-complete')
   where id = 'dex-151';
insert into public.progression_badges (id, name, description, rarity, sort_order, ribbon_id, ribbon_origin, ribbon_flavor, icon_path)
  values ('dup-catch-50', 'Tough Ribbon Hyper', 'A Ribbon awarded for winning the Tough Contest Hyper Rank in Hoenn.', 'rare', 200, 'tough-ribbon-hyper-hoenn', 'Generation III — Hoenn Contests', 'A Ribbon awarded for winning the Tough Contest Hyper Rank in Hoenn.', 'images/ribbons/tough-ribbon-hyper-hoenn.png')
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    ribbon_id = excluded.ribbon_id,
    ribbon_origin = excluded.ribbon_origin,
    ribbon_flavor = excluded.ribbon_flavor,
    icon_path = excluded.icon_path;
update public.progression_achievements
     set rewards = coalesce(rewards, '{}'::jsonb) || jsonb_build_object('badge', 'dup-catch-50')
   where id = 'dup-catch-50';
update public.progression_badges set
    ribbon_id = 'effort-ribbon',
    name = 'Effort Ribbon',
    description = 'A Ribbon for Pokémon that put forth a great deal of effort.',
    ribbon_origin = 'Generation III — Hoenn',
    ribbon_flavor = 'A Ribbon for Pokémon that put forth a great deal of effort.',
    icon_path = 'images/ribbons/effort-ribbon.png'
  where id = 'kanto-10';
update public.progression_badges set
    ribbon_id = 'beauty-ribbon-super-hoenn',
    name = 'Beauty Ribbon Super',
    description = 'A Ribbon awarded for winning the Beauty Contest Super Rank in Hoenn.',
    ribbon_origin = 'Generation III — Hoenn Contests',
    ribbon_flavor = 'A Ribbon awarded for winning the Beauty Contest Super Rank in Hoenn.',
    icon_path = 'images/ribbons/beauty-ribbon-super-hoenn.png'
  where id = 'kanto-25';
update public.progression_badges set
    ribbon_id = 'smart-ribbon-super-hoenn',
    name = 'Smart Ribbon Super',
    description = 'A Ribbon awarded for winning the Smart Contest Super Rank in Hoenn.',
    ribbon_origin = 'Generation III — Hoenn Contests',
    ribbon_flavor = 'A Ribbon awarded for winning the Smart Contest Super Rank in Hoenn.',
    icon_path = 'images/ribbons/smart-ribbon-super-hoenn.png'
  where id = 'kanto-50';
update public.progression_badges set
    ribbon_id = 'beauty-ribbon-hyper-hoenn',
    name = 'Beauty Ribbon Hyper',
    description = 'A Ribbon awarded for winning the Beauty Contest Hyper Rank in Hoenn.',
    ribbon_origin = 'Generation III — Hoenn Contests',
    ribbon_flavor = 'A Ribbon awarded for winning the Beauty Contest Hyper Rank in Hoenn.',
    icon_path = 'images/ribbons/beauty-ribbon-hyper-hoenn.png'
  where id = 'kanto-100';
update public.progression_badges set
    ribbon_id = 'hoenn-champion-ribbon',
    name = 'Hoenn Champion Ribbon',
    description = 'A Ribbon awarded for becoming the Hoenn Champion.',
    ribbon_origin = 'Generation VI — Omega Ruby / Alpha Sapphire',
    ribbon_flavor = 'A Ribbon awarded for becoming the Hoenn Champion.',
    icon_path = 'images/ribbons/hoenn-champion-ribbon.png'
  where id = 'kanto-complete';
update public.progression_badges set
    ribbon_id = 'gorgeous-ribbon',
    name = 'Gorgeous Ribbon',
    description = 'An extraordinarily gorgeous and extravagant Ribbon.',
    ribbon_origin = 'Generation IV — Sinnoh',
    ribbon_flavor = 'An extraordinarily gorgeous and extravagant Ribbon.',
    icon_path = 'images/ribbons/gorgeous-ribbon.png'
  where id = 'first-shiny';
update public.progression_badges set
    ribbon_id = 'land-ribbon',
    name = 'Land Ribbon',
    description = 'A souvenir Ribbon from a land-themed place.',
    ribbon_origin = 'Generation III — Hoenn souvenir',
    ribbon_flavor = 'A souvenir Ribbon from a land-themed place.',
    icon_path = 'images/ribbons/land-ribbon.png'
  where id = 'encounters-100';
update public.progression_badges set
    ribbon_id = 'champion-ribbon',
    name = 'Champion Ribbon',
    description = 'A Ribbon awarded for beating the Champion and entering the Hall of Fame.',
    ribbon_origin = 'Generation III — Hoenn League',
    ribbon_flavor = 'A Ribbon awarded for beating the Champion and entering the Hall of Fame.',
    icon_path = 'images/ribbons/champion-ribbon.png'
  where id = 'legendary-catch';
update public.progression_badges set
    ribbon_id = 'training-ribbon',
    name = 'Training Ribbon',
    description = 'A Ribbon awarded for completing all Secret Super Training regimens.',
    ribbon_origin = 'Generation VI — Super Training',
    ribbon_flavor = 'A Ribbon awarded for completing all Secret Super Training regimens.',
    icon_path = 'images/ribbons/training-ribbon.png'
  where id = 'level-20';
update public.progression_badges set
    ribbon_id = 'regional-champion-ribbon',
    name = 'Regional Champion Ribbon',
    description = 'A Ribbon awarded to a Regional Champion.',
    ribbon_origin = 'Generation IV — World Championships',
    ribbon_flavor = 'A Ribbon awarded to a Regional Champion.',
    icon_path = 'images/ribbons/regional-champion-ribbon.png'
  where id = 'level-50';


insert into public.trainer_badges (user_id, badge_id)
select ta.user_id, a.rewards->>'badge'
  from public.trainer_achievements ta
  join public.progression_achievements a on a.id = ta.achievement_id
 where ta.unlocked_at is not null
   and coalesce(a.rewards->>'badge', '') <> ''
on conflict do nothing;

create or replace function public.play_set_badges(p_ids text[])
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  picked text[];
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select coalesce(array_agg(x order by n), '{}'::text[])
    into picked
    from (
      select t.x, t.n
      from unnest(coalesce(p_ids, '{}'::text[])) with ordinality as t(x, n)
      where exists (select 1 from public.trainer_badges tb where tb.user_id = uid and tb.badge_id = t.x)
      order by t.n
      limit 5
    ) s;
  update public.profiles set featured_badge_ids = coalesce(picked, '{}'::text[]), updated_at = now() where id = uid;
  return jsonb_build_object('ok', true, 'trainer', private.trainer_card(uid), 'message', 'Featured Ribbons saved.');
end;
$function$;

create or replace function public.play_save_trainer_id(
  p_sprite text default null,
  p_bg text default null,
  p_frame text default null,
  p_title text default null,
  p_badges text[] default null,
  p_showcase jsonb default null,
  p_favorite_dex integer default null,
  p_favorite_variant text default null,
  p_team_bg text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  sprite text := btrim(coalesce(p_sprite, ''));
  bg text := btrim(coalesce(p_bg, ''));
  frame text := btrim(coalesce(p_frame, ''));
  v_team_bg text := btrim(coalesce(p_team_bg, ''));
  v_title_id text := nullif(btrim(coalesce(p_title, '')), '');
  picked text[];
  pack text;
  fav_dex int := p_favorite_dex;
  fav_var text := coalesce(nullif(btrim(coalesce(p_favorite_variant, '')), ''), 'normal');
  shiny_id uuid;
  ach_id text;
  rec public.progression_titles;
  before_xp int;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  select xp into before_xp from public.profiles where id = uid;
  perform private.evaluate_cosmetics(uid);
  if sprite <> '' then
    if not private.trainer_sprite_ok(sprite) then
      raise exception 'That trainer look is not available.';
    end if;
    pack := private.premium_sprite_pack(sprite);
    if pack is not null and not private.owns_avatar_pack(uid, pack) then
      raise exception 'Unlock this series in Premium Avatars on the Store.';
    end if;
  end if;
  if bg <> '' then
    perform private.assert_cosmetic_owned(uid, 'background', bg);
  end if;
  if frame <> '' then
    perform private.assert_cosmetic_owned(uid, 'frame', frame);
  end if;
  if v_team_bg <> '' then
    perform private.assert_cosmetic_owned(uid, 'team_background', v_team_bg);
  end if;
  if v_title_id is not null then
    select t.* into rec
      from public.progression_titles t
      join public.trainer_titles tt on tt.title_id = t.id and tt.user_id = uid
     where t.id = v_title_id and t.enabled;
    if rec.id is null then
      raise exception 'That title is not unlocked yet.';
    end if;
  end if;
  if p_badges is not null then
    select coalesce(array_agg(x order by n), '{}'::text[])
      into picked
      from (
        select t.x, t.n
        from unnest(coalesce(p_badges, '{}'::text[])) with ordinality as t(x, n)
        where exists (select 1 from public.trainer_badges tb where tb.user_id = uid and tb.badge_id = t.x)
        order by t.n
        limit 5
      ) s;
  end if;
  if fav_dex is not null then
    if not exists (select 1 from public.catches c where c.user_id = uid and c.dex = fav_dex) then
      raise exception 'Favorite Pokémon must be one you have caught.';
    end if;
  end if;
  if p_showcase is not null then
    shiny_id := nullif(p_showcase->>'shinyCatchId', '')::uuid;
    ach_id := nullif(p_showcase->>'achievementId', '');
    if shiny_id is not null and not exists (
      select 1 from public.catches c where c.user_id = uid and c.id = shiny_id and c.variant like '%shiny%'
    ) then
      raise exception 'Showcase Shiny must be a Shiny Pokémon you own.';
    end if;
    if ach_id is not null and not exists (
      select 1 from public.trainer_achievements ta
      where ta.user_id = uid and ta.achievement_id = ach_id and ta.unlocked_at is not null
    ) then
      raise exception 'Showcase Achievement must be one you have completed.';
    end if;
  end if;
  update public.profiles
     set trainer_sprite = case when sprite <> '' then sprite else trainer_sprite end,
         card_bg = case when bg <> '' then bg else card_bg end,
         card_frame = case when frame <> '' then frame else card_frame end,
         team_bg = case when v_team_bg <> '' then v_team_bg else team_bg end,
         active_title_id = case
           when p_title is null then active_title_id
           when v_title_id is null then null
           else rec.id
         end,
         trainer_title = case
           when p_title is null then trainer_title
           when v_title_id is null then ''
           else rec.name
         end,
         featured_badge_ids = coalesce(picked, featured_badge_ids),
         favorite_dex = case when p_favorite_dex is null and p_showcase is null then favorite_dex else fav_dex end,
         favorite_variant = case when p_favorite_dex is null and p_showcase is null then favorite_variant else case when fav_dex is null then 'normal' else fav_var end end,
         showcase = case when p_showcase is null then showcase else jsonb_build_object(
           'shinyCatchId', shiny_id,
           'achievementId', ach_id
         ) end,
         updated_at = now()
   where id = uid;
  if (select xp from public.profiles where id = uid) is distinct from before_xp then
    raise exception 'Trainer XP must not change when saving a Trainer ID.';
  end if;
  return jsonb_build_object(
    'ok', true,
    'message', 'Trainer ID saved.',
    'trainer', private.trainer_card(uid),
    'cosmetics', private.identity_cosmetics_json(uid)
  );
end;
$function$;

create or replace function private.trainer_card(p_uid uuid)
returns jsonb
language plpgsql
stable
as $function$
declare
  p public.profiles%rowtype;
  prog jsonb;
  coins int := 0;
  caught int;
  species int;
  seen int;
  shiny_total int := 0;
  variants jsonb;
  title_name text;
  badges jsonb;
  next_reward jsonb;
  st public.trainer_stats;
  linked boolean := false;
  showcase jsonb;
  team_bg_id text;
begin
  if p_uid is null then
    return null;
  end if;
  select * into p from public.profiles where id = p_uid;
  if p.id is null then
    return null;
  end if;
  prog := private.trainer_xp_progress(p.xp);
  select coalesce(i.coins, 0) into coins from public.inventories i where i.user_id = p_uid;
  select count(*)::int, count(distinct dex)::int into caught, species from public.catches where user_id = p_uid;
  select count(*)::int into seen from public.species_seen where user_id = p_uid;
  select count(*)::int into shiny_total from public.catches where user_id = p_uid and variant like '%shiny%';
  variants := private.collection_variant_stats(p_uid);
  select t.name into title_name
    from public.progression_titles t
   where t.id = p.active_title_id;
  title_name := coalesce(title_name, nullif(p.trainer_title, ''), '');
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', b.id,
      'name', coalesce(nullif(b.name, ''), b.id),
      'ribbonId', b.ribbon_id,
      'origin', b.ribbon_origin,
      'description', coalesce(nullif(b.ribbon_flavor, ''), b.description),
      'icon', b.icon_path,
      'earnedAt', tb.unlocked_at
    ) order by b.sort_order), '[]'::jsonb)
    into badges
    from public.progression_badges b
    join public.trainer_badges tb on tb.badge_id = b.id
   where tb.user_id = p_uid
     and cardinality(coalesce(p.featured_badge_ids, '{}'::text[])) > 0
     and b.id = any (p.featured_badge_ids);
  select value into next_reward
    from jsonb_array_elements(private.progression_config()->'levelRewards')
   where coalesce((value->>'level')::int, 0) > (prog->>'level')::int
   order by (value->>'level')::int
   limit 1;
  select * into st from public.trainer_stats where user_id = p_uid;
  select exists (
    select 1 from public.twitch_connections c
    where c.user_id = p_uid
      and c.confirmed
      and c.connection_type in ('player', 'secondary')
  ) into linked;
  showcase := jsonb_build_object(
    'favoriteDex', p.favorite_dex,
    'favoriteVariant', coalesce(p.favorite_variant, 'normal'),
    'shinyCatch', private.catch_brief(p_uid, nullif(p.showcase->>'shinyCatchId', '')::uuid),
    'achievementId', nullif(p.showcase->>'achievementId', ''),
    'achievementName', (
      select a.name from public.progression_achievements a
      join public.trainer_achievements ta on ta.achievement_id = a.id and ta.user_id = p_uid
      where a.id = nullif(p.showcase->>'achievementId', '') and ta.unlocked_at is not null
    )
  );
  team_bg_id := coalesce(nullif(p.team_bg, ''), 'starlight-gradient');
  if not private.team_bg_ok(team_bg_id) then
    team_bg_id := 'starlight-gradient';
  end if;
  return jsonb_build_object(
    'login', coalesce(nullif(p.twitch_login, ''), nullif(p.username, ''), 'trainer'),
    'displayName', coalesce(nullif(p.display_name, ''), nullif(p.username, ''), nullif(p.twitch_login, ''), 'Trainer'),
    'avatar', p.avatar_url,
    'trainerSprite', case when private.trainer_sprite_ok(p.trainer_sprite) then p.trainer_sprite else 'red-gen1' end,
    'cardBg', case when private.card_bg_ok(p.card_bg) then p.card_bg else 'hoenn' end,
    'cardFrame', case when private.card_frame_ok(p.card_frame) then p.card_frame else 'plain' end,
    'teamBg', team_bg_id,
    'idNo', 10000 + (abs(hashtext(p.id::text)) % 90000),
    'startedAt', p.created_at,
    'coins', coalesce(coins, 0),
    'level', (prog->>'level')::int,
    'xp', (prog->>'xp')::int,
    'xpInto', (prog->>'xpInto')::int,
    'xpNeed', (prog->>'xpNeed')::int,
    'xpToNext', greatest(0, (prog->>'xpNeed')::int - (prog->>'xpInto')::int),
    'nextReward', next_reward,
    'watchSeconds', p.watch_seconds,
    'caught', coalesce(caught, 0),
    'species', coalesce(species, 0),
    'seen', coalesce(seen, 0),
    'shinyCaught', coalesce(shiny_total, 0),
    'evolved', coalesce(st.evolved, 0),
    'tradesDone', coalesce(st.trades_done, 0),
    'speciesMastered', coalesce(st.species_mastered, 0),
    'candyEarned', coalesce(st.candy_earned, 0),
    'masteryTop', private.mastery_top_json(p_uid),
    'kanto', jsonb_build_object(
      'caught', coalesce((variants->>'kantoCaught')::int, 0),
      'total', 151,
      'percent', round(100.0 * coalesce((variants->>'kantoCaught')::int, 0) / 151.0, 1)
    ),
    'variants', variants,
    'generations', jsonb_build_array(jsonb_build_object(
      'id', 1, 'name', 'Kanto', 'caught', coalesce((variants->>'kantoCaught')::int, 0), 'total', 151
    )),
    'pass', p.starlight_pass,
    'favoriteDex', p.favorite_dex,
    'favoriteVariant', coalesce(p.favorite_variant, 'normal'),
    'showcase', showcase,
    'title', title_name,
    'activeTitleId', p.active_title_id,
    'featuredBadgeIds', coalesce(to_jsonb(p.featured_badge_ids), '[]'::jsonb),
    'badges', coalesce(badges, '[]'::jsonb),
    'team', private.team_mons(p_uid),
    'lastSeenAt', p.last_seen_at,
    'online', p.last_seen_at is not null and p.last_seen_at > now() - interval '2 minutes',
    'twitchLinked', linked
  );
end;
$function$;

create or replace function public.play_progression()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  st public.trainer_stats;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  st := private.ensure_trainer_stats(uid);
  perform private.evaluate_cosmetics(uid);
  return jsonb_build_object(
    'ok', true,
    'trainer', private.trainer_card(uid),
    'stats', to_jsonb(st),
    'cosmetics', private.identity_cosmetics_json(uid),
    'ownedAvatarPacks', private.owned_avatar_packs_json(uid),
    'titles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'name', t.name, 'description', t.description, 'howTo', t.description,
        'rarity', t.rarity, 'unlocked', tt.title_id is not null,
        'isNew', tt.title_id is not null and tt.seen_at is null,
        'unlockedAt', tt.unlocked_at
      ) order by t.sort_order)
      from public.progression_titles t
      left join public.trainer_titles tt on tt.title_id = t.id and tt.user_id = uid
      where t.enabled
    ), '[]'::jsonb),
    'badges', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'name', b.name, 'description', coalesce(nullif(b.ribbon_flavor, ''), b.description),
        'howTo', b.description,
        'rarity', b.rarity, 'unlocked', tb.badge_id is not null,
        'featured', b.id = any (coalesce((select featured_badge_ids from public.profiles where id = uid), '{}'::text[])),
        'isNew', tb.badge_id is not null and tb.seen_at is null,
        'unlockedAt', tb.unlocked_at,
        'ribbonId', b.ribbon_id,
        'origin', b.ribbon_origin,
        'icon', b.icon_path
      ) order by b.sort_order)
      from public.progression_badges b
      left join public.trainer_badges tb on tb.badge_id = b.id and tb.user_id = uid
      where b.enabled
    ), '[]'::jsonb),
    'achievements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'name', case when a.hidden and ta.unlocked_at is null then 'Hidden Achievement' else a.name end,
        'description', case when a.hidden and ta.unlocked_at is null then 'Keep playing to find this one.' else a.description end,
        'category', a.category,
        'progress', case when a.hidden and ta.unlocked_at is null then 0 else coalesce(ta.progress, 0) end,
        'target', a.target_value,
        'unlocked', ta.unlocked_at is not null,
        'unlockedAt', ta.unlocked_at,
        'hidden', a.hidden and ta.unlocked_at is null,
        'rewards', case when a.hidden and ta.unlocked_at is null then '{}'::jsonb else a.rewards end
      ) order by a.sort_order)
      from public.progression_achievements a
      left join public.trainer_achievements ta on ta.achievement_id = a.id and ta.user_id = uid
      where a.enabled
    ), '[]'::jsonb)
  );
end;
$function$;

create or replace function public.admin_qa_grant_pass_reward(p_kind text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  admin uuid := auth.uid();
  kind text := lower(btrim(coalesce(p_kind, '')));
  v_grants jsonb;
  label text;
  supply jsonb;
  berry jsonb;
begin
  if admin is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if kind not in ('daily', 'weekly', 'supply') then
    raise exception 'Unknown Pass QA reward kind.';
  end if;
  if kind = 'supply' then
    supply := private.economy_config()->'dailySupply';
    berry := private.pick_loot_entry('DAILY_COMMON_BERRY');
    if berry is null or (berry->>'item') = 'goldenrazz' then
      berry := jsonb_build_object('item', 'berry', 'qty', 1);
    end if;
    v_grants := jsonb_build_object(
        'pokeball', coalesce((supply->>'pokeball')::int, 3),
        berry->>'item', coalesce((supply->>'berry')::int, 1),
        'coins', coalesce((supply->>'coins')::int, 50)
      ) || coalesce(private.daily_streak_bonus(1), '{}'::jsonb);
    label := 'ADMIN QA Daily Trainer Supply';
  else
    v_grants := private.pass_reward_grants(kind);
    label := case when kind = 'daily' then 'ADMIN QA Daily Pass' else 'ADMIN QA Weekly Pass' end;
  end if;
  if v_grants is null or v_grants = '{}'::jsonb then
    raise exception 'QA reward bundle is empty.';
  end if;
  perform private.grant_items(
    admin,
    v_grants,
    'ADMIN_QA',
    'pass-qa-' || kind,
    'admin-pass-qa:' || admin::text || ':' || kind || ':' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'),
    true
  );
  insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
  values (
    admin,
    admin,
    'PASS_REWARD_QA',
    jsonb_build_object('passKind', kind, 'grants', v_grants, 'label', label)
  );
  return private.play_snapshot(admin) || jsonb_build_object(
    'ok', true,
    'qa', true,
    'kind', kind,
    'grants', v_grants,
    'message', label || ' granted: ' || private.grant_summary(v_grants) || '.'
  );
end;
$function$;

revoke all on function public.admin_qa_grant_pass_reward(text) from public;
grant execute on function public.admin_qa_grant_pass_reward(text) to authenticated;
grant execute on function public.play_set_badges(text[]) to authenticated;
grant execute on function public.play_save_trainer_id(text, text, text, text, text[], jsonb, integer, text, text) to authenticated;
grant execute on function public.play_progression() to authenticated;
