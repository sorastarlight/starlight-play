-- Titles, badges, achievements, and default progression reward tables.

insert into public.progression_titles (id, name, description, rarity, sort_order) values
  ('rookie-trainer', 'Rookie Trainer', 'Caught 10 different Kanto Pokémon.', 'common', 10),
  ('rising-trainer', 'Rising Trainer', 'Reached Trainer Level 5.', 'common', 15),
  ('trainer', 'Trainer', 'Reached Trainer Level 10.', 'common', 20),
  ('kanto-explorer', 'Kanto Explorer', 'Caught 25 Kanto species.', 'common', 25),
  ('pokedex-researcher', 'Pokédex Researcher', 'Caught 50 Kanto species.', 'rare', 30),
  ('seasoned-trainer', 'Seasoned Trainer', 'Reached Trainer Level 30.', 'rare', 35),
  ('veteran-collector', 'Veteran Collector', 'Caught 100 Kanto species.', 'rare', 40),
  ('elite-trainer', 'Elite Trainer', 'Reached Trainer Level 40.', 'rare', 45),
  ('shiny-hunter', 'Shiny Hunter', 'Caught a shiny Pokémon.', 'rare', 50),
  ('sparkling-collector', 'Sparkling Collector', 'Caught 10 different shinies.', 'epic', 55),
  ('shiny-specialist', 'Shiny Specialist', 'Caught 25 different shinies.', 'epic', 60),
  ('shiny-master', 'Shiny Master', 'Caught 50 different shinies.', 'legendary', 65),
  ('helping-hand', 'Helping Hand', 'Shared Honey 10 times.', 'common', 70),
  ('sweet-supporter', 'Sweet Supporter', 'Shared Honey 50 times.', 'rare', 75),
  ('hive-hero', 'Hive Hero', 'Shared Honey 100 times.', 'epic', 80),
  ('community-champion', 'Community Champion', 'Shared Honey 250 times.', 'legendary', 85),
  ('perfect-tool', 'Perfect Tool', 'Caught a Pokémon with the right specialist Ball.', 'rare', 90),
  ('kanto-waiting', 'Kanto Completionist-in-Waiting', 'Caught 150 Kanto species.', 'epic', 95),
  ('kanto-master', 'Kanto Master', 'Completed the Kanto Pokédex.', 'legendary', 100),
  ('starlight-veteran', 'Starlight Veteran', 'Reached Trainer Level 50.', 'legendary', 110),
  ('novice-catcher', 'Novice Trainer', 'Caught 10 Pokémon.', 'common', 120),
  ('experienced-trainer', 'Experienced Trainer', 'Caught 100 Pokémon.', 'rare', 125),
  ('veteran-trainer', 'Veteran Trainer', 'Caught 250 Pokémon.', 'epic', 130),
  ('master-catcher', 'Master Catcher', 'Caught 500 Pokémon.', 'legendary', 135),
  ('against-odds', 'Against All Odds', 'Caught a Pokémon at very long odds.', 'epic', 140)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, rarity = excluded.rarity, sort_order = excluded.sort_order;

insert into public.progression_badges (id, name, description, rarity, sort_order) values
  ('kanto-10', 'Kanto 10', '10 species caught.', 'common', 10),
  ('kanto-25', 'Kanto Explorer', '25 species caught.', 'common', 20),
  ('kanto-50', 'Kanto 50', '50 species caught.', 'rare', 30),
  ('kanto-100', 'Kanto 100', '100 species caught.', 'rare', 40),
  ('kanto-complete', 'Kanto Complete', '151/151 Kanto Pokémon.', 'legendary', 50),
  ('first-shiny', 'First Shiny', 'Caught a shiny Pokémon.', 'rare', 60),
  ('encounters-100', '100 Encounters', 'Joined 100 encounters.', 'rare', 70),
  ('legendary-catch', 'Legendary Capture', 'Caught a Legendary or Mythical Pokémon.', 'epic', 80),
  ('level-20', 'Level 20', 'Reached Trainer Level 20.', 'common', 90),
  ('level-50', 'Level 50', 'Reached Trainer Level 50.', 'epic', 100)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, rarity = excluded.rarity, sort_order = excluded.sort_order;

insert into public.progression_achievements
  (id, name, description, category, requirement_type, target_value, extra, rewards, hidden, sort_order)
values
  ('catch-10', 'Novice Trainer', 'Catch 10 Pokémon in encounters.', 'catching', 'TOTAL_CATCHES', 10, '{}', '{"title":"novice-catcher"}', false, 10),
  ('catch-25', 'Getting Started', 'Catch 25 Pokémon in encounters.', 'catching', 'TOTAL_CATCHES', 25, '{}', '{}', false, 20),
  ('catch-50', 'On a Roll', 'Catch 50 Pokémon in encounters.', 'catching', 'TOTAL_CATCHES', 50, '{}', '{}', false, 30),
  ('catch-100', 'Experienced Trainer', 'Catch 100 Pokémon in encounters.', 'catching', 'TOTAL_CATCHES', 100, '{}', '{"title":"experienced-trainer"}', false, 40),
  ('catch-250', 'Veteran Trainer', 'Catch 250 Pokémon in encounters.', 'catching', 'TOTAL_CATCHES', 250, '{}', '{"title":"veteran-trainer"}', false, 50),
  ('catch-500', 'Master Catcher', 'Catch 500 Pokémon in encounters.', 'catching', 'TOTAL_CATCHES', 500, '{}', '{"title":"master-catcher"}', false, 60),
  ('catch-1000', 'Living Pokédex', 'Catch 1,000 Pokémon in encounters.', 'catching', 'TOTAL_CATCHES', 1000, '{}', '{}', false, 70),
  ('dup-5', 'Familiar Face', 'Catch the same species 5 times.', 'catching', 'SPECIES_CATCH_COUNT', 5, '{}', '{}', false, 80),
  ('dup-10', 'Regular', 'Catch the same species 10 times.', 'catching', 'SPECIES_CATCH_COUNT', 10, '{}', '{}', false, 90),
  ('dup-25', 'Super Fan', 'Catch the same species 25 times.', 'catching', 'SPECIES_CATCH_COUNT', 25, '{}', '{}', false, 100),
  ('dup-50', 'True Fan', 'Catch the same species 50 times.', 'catching', 'SPECIES_CATCH_COUNT', 50, '{}', '{}', false, 110),
  ('dup-100', 'Number One Fan', 'Catch the same species 100 times.', 'catching', 'SPECIES_CATCH_COUNT', 100, '{}', '{}', false, 120),
  ('join-10', 'Showing Up', 'Join 10 encounters.', 'trainer', 'ENCOUNTERS_JOINED', 10, '{}', '{}', false, 130),
  ('join-50', 'Regular Viewer', 'Join 50 encounters.', 'trainer', 'ENCOUNTERS_JOINED', 50, '{}', '{}', false, 140),
  ('join-100', 'Loyal Trainer', 'Join 100 encounters.', 'trainer', 'ENCOUNTERS_JOINED', 100, '{}', '{"badge":"encounters-100"}', false, 150),
  ('join-250', 'Stream Regular', 'Join 250 encounters.', 'trainer', 'ENCOUNTERS_JOINED', 250, '{}', '{}', false, 160),
  ('join-500', 'Always Here', 'Join 500 encounters.', 'trainer', 'ENCOUNTERS_JOINED', 500, '{}', '{}', false, 170),
  ('join-1000', 'Everpresent', 'Join 1,000 encounters.', 'trainer', 'ENCOUNTERS_JOINED', 1000, '{}', '{}', false, 180),
  ('honey-10', 'Helping Hand', 'Contribute Honey 10 times.', 'community', 'HONEY_CONTRIBUTIONS', 10, '{}', '{"title":"helping-hand"}', false, 190),
  ('honey-25', 'Sweet Supporter', 'Contribute Honey 25 times.', 'community', 'HONEY_CONTRIBUTIONS', 25, '{}', '{}', false, 200),
  ('honey-50', 'Hive Helper', 'Contribute Honey 50 times.', 'community', 'HONEY_CONTRIBUTIONS', 50, '{}', '{"title":"sweet-supporter"}', false, 210),
  ('honey-100', 'Hive Hero', 'Contribute Honey 100 times.', 'community', 'HONEY_CONTRIBUTIONS', 100, '{}', '{"title":"hive-hero"}', false, 220),
  ('honey-250', 'Community Champion', 'Contribute Honey 250 times.', 'community', 'HONEY_CONTRIBUTIONS', 250, '{}', '{"title":"community-champion"}', false, 230),
  ('honey-500', 'Honey Legend', 'Contribute Honey 500 times.', 'community', 'HONEY_CONTRIBUTIONS', 500, '{}', '{}', false, 240),
  ('shiny-1', 'Shiny Hunter', 'Catch your first shiny Pokémon.', 'shiny', 'SHINY_SPECIES', 1, '{}', '{"title":"shiny-hunter","badge":"first-shiny"}', false, 250),
  ('shiny-5', 'Sparkle Watch', 'Catch 5 different shiny species.', 'shiny', 'SHINY_SPECIES', 5, '{}', '{}', false, 260),
  ('shiny-10', 'Sparkling Collector', 'Catch 10 different shiny species.', 'shiny', 'SHINY_SPECIES', 10, '{}', '{"title":"sparkling-collector"}', false, 270),
  ('shiny-25', 'Shiny Specialist', 'Catch 25 different shiny species.', 'shiny', 'SHINY_SPECIES', 25, '{}', '{"title":"shiny-specialist"}', false, 280),
  ('shiny-50', 'Shiny Master', 'Catch 50 different shiny species.', 'shiny', 'SHINY_SPECIES', 50, '{}', '{"title":"shiny-master"}', false, 290),
  ('shiny-100', 'Shiny Virtuoso', 'Catch 100 different shiny species.', 'shiny', 'SHINY_SPECIES', 100, '{}', '{}', false, 300),
  ('shiny-151', 'Kanto Shiny Living Dex', 'Catch every eligible Kanto shiny.', 'shiny', 'SHINY_SPECIES', 151, '{}', '{}', false, 310),
  ('female-1', 'Keen Eye', 'Catch your first female visual variant.', 'pokedex', 'FEMALE_VARIANTS', 1, '{}', '{}', false, 320),
  ('female-10', 'Form Finder', 'Catch 10 female visual variants.', 'pokedex', 'FEMALE_VARIANTS', 10, '{}', '{}', false, 330),
  ('female-all', 'Every Lady', 'Catch every eligible Kanto female visual variant.', 'pokedex', 'FEMALE_VARIANTS', 23, '{}', '{}', false, 340),
  ('net-10', 'Net Work', 'Catch 10 Pokémon with a Net Ball while its bonus applies.', 'items', 'SPECIALIST_BALL_CATCHES', 10, '{"ball":"netball"}', '{}', false, 350),
  ('dusk-10', 'Night Owl', 'Catch 10 Pokémon with a Dusk Ball while its bonus applies.', 'items', 'SPECIALIST_BALL_CATCHES', 10, '{"ball":"duskball"}', '{}', false, 360),
  ('repeat-10', 'Déjà Vu', 'Catch 10 Pokémon with a Repeat Ball while its bonus applies.', 'items', 'SPECIALIST_BALL_CATCHES', 10, '{"ball":"repeatball"}', '{}', false, 370),
  ('fast-10', 'Speedster', 'Catch 10 Pokémon with a Fast Ball while its bonus applies.', 'items', 'SPECIALIST_BALL_CATCHES', 10, '{"ball":"fastball"}', '{}', false, 380),
  ('perfect-1', 'Perfect Tool', 'Catch a Pokémon with a specialist Ball while its bonus is active.', 'items', 'OPTIMAL_CATCHES', 1, '{}', '{"title":"perfect-tool"}', false, 390),
  ('perfect-10', 'Right Tool', 'Make 10 specialist Ball catches with the bonus active.', 'items', 'OPTIMAL_CATCHES', 10, '{}', '{}', false, 400),
  ('perfect-50', 'Item Scholar', 'Make 50 specialist Ball catches with the bonus active.', 'items', 'OPTIMAL_CATCHES', 50, '{}', '{}', false, 410),
  ('rare-1', 'First Rare', 'Catch a Rare Pokémon.', 'rare', 'RARITY_CAPTURES', 1, '{"maxCatchRate":75,"minCatchRate":26}', '{}', false, 420),
  ('rare-10', 'Rare Hunter', 'Catch 10 Rare Pokémon.', 'rare', 'RARITY_CAPTURES', 10, '{"maxCatchRate":75,"minCatchRate":26}', '{}', false, 430),
  ('vrare-1', 'First Very Rare', 'Catch a Very Rare Pokémon.', 'rare', 'RARITY_CAPTURES', 1, '{"maxCatchRate":25,"minCatchRate":10}', '{}', false, 440),
  ('vrare-10', 'Very Rare Hunter', 'Catch 10 Very Rare Pokémon.', 'rare', 'RARITY_CAPTURES', 10, '{"maxCatchRate":25,"minCatchRate":10}', '{}', false, 450),
  ('urare-1', 'First Ultra Rare', 'Catch an Ultra Rare Pokémon.', 'rare', 'RARITY_CAPTURES', 1, '{"maxCatchRate":9,"minCatchRate":1}', '{}', false, 460),
  ('legend-1', 'Legendary Trainer', 'Catch a Legendary or Mythical Pokémon.', 'rare', 'LEGENDARY_CATCHES', 1, '{}', '{"badge":"legendary-catch"}', false, 470),
  ('fail-25', 'So Close!', 'Have 25 Pokémon break free.', 'special', 'FAILED_CATCHES', 25, '{}', '{}', false, 480),
  ('streak-5', 'Hot Streak', 'Catch Pokémon in 5 encounters in a row.', 'catching', 'CATCH_STREAK', 5, '{}', '{}', false, 490),
  ('streak-10', 'Unstoppable', 'Catch Pokémon in 10 encounters in a row.', 'catching', 'CATCH_STREAK', 10, '{}', '{}', false, 500),
  ('odds-5', 'Against All Odds', 'Catch a Pokémon at 5% or lower final chance.', 'special', 'LOW_ODDS_CAPTURE', 1, '{"maxChance":0.05}', '{"title":"against-odds"}', true, 510)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, category = excluded.category,
      requirement_type = excluded.requirement_type, target_value = excluded.target_value,
      extra = excluded.extra, rewards = excluded.rewards, hidden = excluded.hidden, sort_order = excluded.sort_order;

-- Seed configurable progression + extend dex milestones with titles.
update public.site_config
   set game_settings = coalesce(game_settings, '{}'::jsonb)
     || jsonb_build_object(
       'progressionBalance', coalesce(game_settings->'progressionBalance', '{}'::jsonb) || jsonb_build_object(
         'progressionBalanceVersion', 1,
         'xpBase', 100,
         'xpExponent', 1.35,
         'maxLevel', 100,
         'joinXp', 5,
         'catchXp', 10,
         'newDexXp', 25,
         'firstFemaleXp', 5,
         'shinyXp', 50,
         'rareXp', 5,
         'veryRareXp', 10,
         'ultraRareXp', 15,
         'legendaryXp', 25,
         'levelCatchBonus', false,
         'levelRewards', '[
            {"level":5,"label":"Level 5","grants":{"greatball":5},"title":"rising-trainer"},
            {"level":10,"label":"Level 10","title":"trainer"},
            {"level":15,"label":"Level 15","grants":{"coins":500}},
            {"level":20,"label":"Level 20","badge":"level-20"},
            {"level":25,"label":"Level 25","grants":{"ultraball":3}},
            {"level":30,"label":"Level 30","title":"seasoned-trainer"},
            {"level":40,"label":"Level 40","title":"elite-trainer"},
            {"level":50,"label":"Level 50","title":"starlight-veteran","badge":"level-50"}
          ]'::jsonb
       )
     )
     || jsonb_build_object(
       'economyBalance', coalesce(game_settings->'economyBalance', '{}'::jsonb) || jsonb_build_object(
         'dexMilestones', '[
            {"species":10,"grants":{"greatball":5},"title":"rookie-trainer","badge":"kanto-10","label":"10 species"},
            {"species":25,"grants":{"coins":500},"title":"kanto-explorer","badge":"kanto-25","label":"25 species"},
            {"species":50,"grants":{"ultraball":3},"title":"pokedex-researcher","badge":"kanto-50","label":"50 species"},
            {"species":75,"grants":{"goldenrazz":1},"label":"75 species"},
            {"species":100,"grants":{"goldenrazz":2},"title":"veteran-collector","badge":"kanto-100","label":"100 species"},
            {"species":125,"grants":{"coins":1000},"label":"125 species"},
            {"species":140,"grants":{"premierball":5},"title":"kanto-waiting","label":"140 species"},
            {"species":150,"grants":{"goldenrazz":3,"premierball":5},"label":"150 species"},
            {"species":151,"grants":{"coins":2500,"cherishball":1,"masterball":1},"title":"kanto-master","badge":"kanto-complete","label":"Kanto Pokédex Master"}
          ]'::jsonb
       )
     ),
       updated_at = now()
 where id = 1;
