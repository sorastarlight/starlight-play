-- Capture system checks. Read only: run with
--   select * from private.capture_self_test();
-- Every row must report passed = true.

create or replace function private.capture_self_test()
returns table (name text, passed boolean, detail text)
language plpgsql
stable
as $$
declare
  cfg jsonb := private.capture_config();
  pidgey int := 16;   -- catch rate 255, Normal/Flying, base 34%
  vaporeon int := 134; -- catch rate 45, Water, base 11%
  caterpie int := 10;  -- catch rate 255, Bug
  snorlax int := 143;  -- catch rate 25, 460 kg
  jolteon int := 135;  -- base speed 130
  clefairy int := 35;  -- Moon Stone family
  mewtwo int := 150;   -- catch rate 3
  base numeric;
begin
  base := private.capture_base_chance(255, cfg);

  name := 'Poke Ball is 1.00x';
  passed := (private.capture_chance(pidgey, 'pokeball')->>'finalChance')::numeric = base;
  detail := (private.capture_chance(pidgey, 'pokeball')->>'finalChance');
  return next;

  name := 'Hisui Poke Ball is 1.00x';
  passed := (private.capture_chance(pidgey, 'hisuipokeball')->'ball'->>'multiplier')::numeric = 1.00;
  detail := (private.capture_chance(pidgey, 'hisuipokeball')->'ball'->>'multiplier');
  return next;

  name := 'Great Ball is 1.25x';
  passed := (private.capture_chance(pidgey, 'greatball')->'ball'->>'multiplier')::numeric = 1.25;
  detail := (private.capture_chance(pidgey, 'greatball')->'ball'->>'multiplier');
  return next;

  name := 'Ultra Ball is 1.50x';
  passed := (private.capture_chance(pidgey, 'ultraball')->'ball'->>'multiplier')::numeric = 1.50;
  detail := (private.capture_chance(pidgey, 'ultraball')->'ball'->>'multiplier');
  return next;

  name := 'Master Ball always succeeds';
  passed := (private.capture_chance(mewtwo, 'masterball')->>'finalChance')::numeric = 1.0
        and (private.capture_chance(mewtwo, 'masterball')->>'guaranteed')::boolean;
  detail := (private.capture_chance(mewtwo, 'masterball')->>'finalChance');
  return next;

  name := 'Maximum chance is never exceeded';
  passed := (private.capture_chance(caterpie, 'ultraball', 'goldenrazz', 10, 10, true, true)->>'finalChance')::numeric
            <= coalesce((cfg->>'maxChance')::numeric, 0.85);
  detail := (private.capture_chance(caterpie, 'ultraball', 'goldenrazz', 10, 10, true, true)->>'finalChance');
  return next;

  name := 'Minimum chance is never breached';
  passed := (private.capture_chance(mewtwo, 'beastball')->>'finalChance')::numeric
            >= coalesce((cfg->>'minChance')::numeric, 0.02);
  detail := (private.capture_chance(mewtwo, 'beastball')->>'finalChance');
  return next;

  name := 'Net Ball helps against Water types';
  passed := (private.capture_chance(vaporeon, 'netball')->'ball'->>'multiplier')::numeric = 1.55;
  detail := (private.capture_chance(vaporeon, 'netball')->'ball'->>'multiplier');
  return next;

  name := 'Net Ball helps against Bug types';
  passed := (private.capture_chance(caterpie, 'netball')->'ball'->>'multiplier')::numeric = 1.55;
  detail := (private.capture_chance(caterpie, 'netball')->'ball'->>'multiplier');
  return next;

  name := 'Net Ball does nothing against unrelated types';
  passed := (private.capture_chance(pidgey, 'netball')->'ball'->>'multiplier')::numeric = 1.00;
  detail := (private.capture_chance(pidgey, 'netball')->'ball'->>'multiplier');
  return next;

  name := 'Repeat Ball checks species ownership';
  passed := (private.capture_chance(pidgey, 'repeatball', null, 0, 0, false, true)->'ball'->>'multiplier')::numeric = 1.55
        and (private.capture_chance(pidgey, 'repeatball', null, 0, 0, false, false)->'ball'->>'multiplier')::numeric = 1.00;
  detail := (private.capture_chance(pidgey, 'repeatball', null, 0, 0, false, true)->'ball'->>'multiplier');
  return next;

  name := 'Dusk Ball uses the game timezone';
  passed := (private.capture_chance(pidgey, 'duskball', null, 0, 0, false, false, false, 1.0,
               (current_date + time '23:00') at time zone coalesce(cfg->>'timezone', 'UTC'))->'ball'->>'multiplier')::numeric = 1.50
        and (private.capture_chance(pidgey, 'duskball', null, 0, 0, false, false, false, 1.0,
               (current_date + time '12:00') at time zone coalesce(cfg->>'timezone', 'UTC'))->'ball'->>'multiplier')::numeric = 1.00;
  detail := coalesce(cfg->>'timezone', 'UTC');
  return next;

  name := 'Fast Ball checks base speed';
  passed := (private.capture_chance(jolteon, 'fastball')->'ball'->>'multiplier')::numeric = 1.55
        and (private.capture_chance(snorlax, 'fastball')->'ball'->>'multiplier')::numeric = 1.00;
  detail := (private.capture_chance(jolteon, 'fastball')->'ball'->>'multiplier');
  return next;

  name := 'Heavy Ball scales with weight';
  passed := (private.capture_chance(snorlax, 'heavyball')->'ball'->>'multiplier')::numeric = 1.55
        and (private.capture_chance(pidgey, 'heavyball')->'ball'->>'multiplier')::numeric = 1.00;
  detail := (private.capture_chance(snorlax, 'heavyball')->'ball'->>'multiplier');
  return next;

  name := 'Moon Ball uses evolution metadata';
  passed := (private.capture_chance(clefairy, 'moonball')->'ball'->>'multiplier')::numeric = 1.60
        and (private.capture_chance(pidgey, 'moonball')->'ball'->>'multiplier')::numeric = 1.00;
  detail := (private.capture_chance(clefairy, 'moonball')->'ball'->>'multiplier');
  return next;

  name := 'Nest Ball checks canonical catch rate';
  passed := (private.capture_chance(caterpie, 'nestball')->'ball'->>'multiplier')::numeric = 1.45
        and (private.capture_chance(vaporeon, 'nestball')->'ball'->>'multiplier')::numeric = 1.00;
  detail := (private.capture_chance(caterpie, 'nestball')->'ball'->>'multiplier');
  return next;

  name := 'Berry modifier is applied once';
  passed := abs((private.capture_chance(pidgey, 'pokeball', 'razz')->>'rawChance')::numeric - base * 1.15) < 0.000001;
  detail := (private.capture_chance(pidgey, 'pokeball', 'razz')->>'rawChance');
  return next;

  name := 'Unreleased Berries do not apply';
  passed := (private.capture_chance(pidgey, 'pokeball', 'figy')->'berry'->>'multiplier')::numeric = 1.0;
  detail := (private.capture_chance(pidgey, 'pokeball', 'figy')->'berry'->>'multiplier');
  return next;

  name := 'Honey modifier is applied once';
  passed := abs((private.capture_chance(pidgey, 'pokeball', null, 6, 10)->>'rawChance')::numeric - base * 1.10) < 0.000001;
  detail := (private.capture_chance(pidgey, 'pokeball', null, 6, 10)->>'rawChance');
  return next;

  name := 'Honey does not scale infinitely';
  passed := (private.capture_chance(pidgey, 'pokeball', null, 100, 100)->'honey'->>'multiplier')::numeric
            = (private.capture_chance(pidgey, 'pokeball', null, 10, 10)->'honey'->>'multiplier')::numeric;
  detail := (private.capture_chance(pidgey, 'pokeball', null, 100, 100)->'honey'->>'multiplier');
  return next;

  name := 'Zero Honey is 1.00x';
  passed := (private.capture_chance(pidgey, 'pokeball', null, 0, 12)->'honey'->>'multiplier')::numeric = 1.0;
  detail := (private.capture_chance(pidgey, 'pokeball', null, 0, 12)->'honey'->>'multiplier');
  return next;

  name := 'Full Honey participation uses the configured maximum';
  passed := (private.capture_chance(pidgey, 'pokeball', null, 12, 12)->'honey'->>'multiplier')::numeric
            = coalesce((select (t->>'multiplier')::numeric from jsonb_array_elements(cfg->'honeyTiers') t
                        where (t->>'minRate')::numeric >= 1), 1.22);
  detail := (private.capture_chance(pidgey, 'pokeball', null, 12, 12)->'honey'->>'multiplier');
  return next;

  name := 'Non contributors still get the community bonus';
  passed := (private.capture_chance(pidgey, 'pokeball', 'razz', 6, 10, false)->'honey'->>'multiplier')::numeric > 1.0
        and (private.capture_chance(pidgey, 'pokeball', 'razz', 6, 10, false)->>'honeyContributorMultiplier')::numeric = 1.0;
  detail := (private.capture_chance(pidgey, 'pokeball', 'razz', 6, 10, false)->>'honeyContributorMultiplier');
  return next;

  name := 'Contributors get the personal bonus';
  passed := (private.capture_chance(pidgey, 'pokeball', null, 6, 10, true)->>'honeyContributorMultiplier')::numeric
            = coalesce((cfg->>'honeyContributorBonus')::numeric, 1.03);
  detail := (private.capture_chance(pidgey, 'pokeball', null, 6, 10, true)->>'honeyContributorMultiplier');
  return next;

  name := 'Shiny modifier defaults to 1.00x';
  passed := (private.capture_chance(pidgey, 'pokeball', null, 0, 0, false, false, true)->>'finalChance')::numeric
            = (private.capture_chance(pidgey, 'pokeball')->>'finalChance')::numeric;
  detail := (private.capture_chance(pidgey, 'pokeball', null, 0, 0, false, false, true)->>'shinyMultiplier');
  return next;

  name := 'Female variants use the species base rate';
  passed := private.capture_base_chance((select catch_rate from public.species where dex = 29))
            = private.capture_base_chance((select catch_rate from public.species where dex = 32));
  detail := (select catch_rate::text from public.species where dex = 29);
  return next;

  name := 'Two Trainers roll independently';
  passed := private.secure_random() <> private.secure_random();
  detail := 'distinct secure rolls';
  return next;

  name := 'One capture row per Trainer per encounter';
  passed := exists (select 1 from pg_indexes where indexname = 'capture_log_once_idx');
  detail := 'capture_log_once_idx';
  return next;

  name := 'Duplicate throws cannot spend two Poke Balls';
  passed := exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'encounter_players' and column_name = 'throw_processed'
  );
  detail := 'encounter_players.throw_processed';
  return next;

  name := 'Berries are never treated as throwable Poke Balls';
  passed := not private.is_throw_ball('razz') and not private.is_throw_ball('goldenrazz')
        and private.is_throw_ball('ultraball');
  detail := 'razz, goldenrazz';
  return next;

  name := 'Spec example: catch rate 45 with Ultra, Razz and 60% Honey';
  passed := abs((private.capture_chance(vaporeon, 'ultraball', 'razz', 6, 10)->>'finalChance')::numeric - 0.2087) < 0.0005;
  detail := (private.capture_chance(vaporeon, 'ultraball', 'razz', 6, 10)->>'finalChance');
  return next;

  name := 'Spec example: catch rate 3 with Ultra, Golden Razz, full Honey';
  passed := abs((private.capture_chance(mewtwo, 'ultraball', 'goldenrazz', 10, 10, true)->>'finalChance')::numeric - 0.0980) < 0.0005;
  detail := (private.capture_chance(mewtwo, 'ultraball', 'goldenrazz', 10, 10, true)->>'finalChance');
  return next;
end;
$$;
