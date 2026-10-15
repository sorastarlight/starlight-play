-- A19-WIRE local encounter settlement world. SYNTHETIC ONLY.
-- Enough of the live settle/throw/prepare/XP stack for REAL SQL
-- against private.settle_if_needed, not just materialize in isolation.

BEGIN;

CREATE TABLE IF NOT EXISTS public.species (
  dex integer PRIMARY KEY,
  name text NOT NULL,
  catch_rate integer NOT NULL DEFAULT 45,
  tradable boolean NOT NULL DEFAULT true
);

INSERT INTO public.species (dex, name, catch_rate) VALUES
  (1, 'Bulbasaur', 45),
  (25, 'Pikachu', 190)
ON CONFLICT (dex) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.pokemon_forms (
  pokemon_form_id integer PRIMARY KEY,
  dex integer NOT NULL,
  form_key text NOT NULL DEFAULT 'base',
  form_label text NOT NULL DEFAULT 'Base',
  is_base boolean NOT NULL DEFAULT true
);

INSERT INTO public.pokemon_forms (pokemon_form_id, dex, form_key, form_label, is_base) VALUES
  (1, 1, 'base', 'Base', true),
  (25, 25, 'base', 'Base', true),
  (10195, 3, 'gmax', 'Gmax', false)
ON CONFLICT (pokemon_form_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.encounter_rounds (
  id uuid PRIMARY KEY,
  phase text,
  hidden boolean DEFAULT false,
  pokemon jsonb,
  dex integer,
  name text,
  variant text,
  gender text,
  pokemon_form_id integer,
  started_at timestamptz DEFAULT now(),
  deadlines jsonb,
  rules jsonb DEFAULT '{}'::jsonb,
  resolved boolean DEFAULT false,
  cancelled boolean DEFAULT false,
  paused_at timestamptz,
  last_action text,
  ends_at timestamptz,
  trigger_source text,
  source text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.encounter_players (
  round_id uuid NOT NULL REFERENCES public.encounter_rounds(id),
  user_id uuid NOT NULL,
  prep text,
  prep_at timestamptz,
  ball text,
  ball_at timestamptz,
  throw_processed boolean NOT NULL DEFAULT false,
  result text,
  result_reason text,
  caught boolean,
  chance numeric,
  roll numeric,
  PRIMARY KEY (round_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.capture_log (
  round_id uuid NOT NULL,
  user_id uuid NOT NULL,
  dex integer,
  species_name text,
  variant text,
  gender text,
  is_shiny boolean,
  is_female boolean,
  canonical_catch_rate integer,
  base_chance numeric,
  ball_key text,
  ball_multiplier numeric,
  ball_condition_met boolean,
  berry_key text,
  berry_multiplier numeric,
  honey_contributors integer,
  honey_participants integer,
  honey_multiplier numeric,
  honey_contributor_multiplier numeric,
  shiny_multiplier numeric,
  event_multiplier numeric,
  other_multiplier numeric,
  raw_chance numeric,
  final_chance numeric,
  capture_roll numeric,
  success boolean,
  detail jsonb,
  PRIMARY KEY (round_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.play_console_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid,
  user_id uuid,
  display_name text,
  kind text,
  item text,
  message text
);

-- No unique index: settle uses WHERE NOT EXISTS + ON CONFLICT DO NOTHING.

CREATE TABLE IF NOT EXISTS public.encounter_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid,
  user_id uuid,
  action text,
  item text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventories (
  user_id uuid PRIMARY KEY,
  pokeball integer NOT NULL DEFAULT 0,
  greatball integer NOT NULL DEFAULT 0,
  ultraball integer NOT NULL DEFAULT 0,
  berry integer NOT NULL DEFAULT 0,
  bait integer NOT NULL DEFAULT 0,
  berries jsonb NOT NULL DEFAULT '{}'::jsonb,
  balls jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trainer_xp (
  user_id uuid PRIMARY KEY,
  xp integer NOT NULL DEFAULT 0
);

INSERT INTO public.inventories (user_id, pokeball, greatball, berry, bait)
SELECT id, 10, 4, 5, 3 FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.trainer_xp (user_id, xp)
SELECT id, 0 FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.canonical_form_id(p_dex integer, p_form_id integer)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path TO pg_catalog, public
AS $$
  SELECT coalesce(p_form_id, p_dex);
$$;

CREATE OR REPLACE FUNCTION private.form_display_name(p_dex integer, p_form_id integer)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO pg_catalog, public
AS $$
  SELECT coalesce((SELECT name FROM public.species WHERE dex = p_dex), 'the Pokémon');
$$;

CREATE OR REPLACE FUNCTION private.trainer_label(p_uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO pg_catalog, public
AS $$
  SELECT coalesce(nullif(btrim(p.display_name), ''), 'A trainer')
  FROM public.profiles p WHERE p.id = p_uid;
$$;

CREATE OR REPLACE FUNCTION private.variant_is_shiny(p_variant text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO pg_catalog
AS $$
  SELECT lower(coalesce(p_variant, '')) IN ('shiny', 'shiny-female');
$$;

CREATE OR REPLACE FUNCTION private.secure_random()
RETURNS numeric
LANGUAGE sql
VOLATILE
SET search_path TO pg_catalog
AS $$
  SELECT random();
$$;

CREATE OR REPLACE FUNCTION private.round_phase(r public.encounter_rounds)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO pg_catalog
AS $$
  SELECT coalesce(r.phase, 'reveal');
$$;

CREATE OR REPLACE FUNCTION private.phase_banner(p_round uuid, p_phase text, p_msg text)
RETURNS void
LANGUAGE plpgsql
SET search_path TO pg_catalog, public
AS $$
BEGIN
  UPDATE public.encounter_rounds
     SET phase = p_phase, last_action = p_msg, updated_at = now()
   WHERE id = p_round;
END
$$;

CREATE OR REPLACE FUNCTION private.log_activity(p_round uuid, p_uid uuid, p_action text, p_item text)
RETURNS void
LANGUAGE sql
SET search_path TO pg_catalog, public
AS $$
  INSERT INTO public.encounter_activity (round_id, user_id, action, item)
  VALUES (p_round, p_uid, p_action, p_item);
$$;

CREATE OR REPLACE FUNCTION private.item_label(p_item text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO pg_catalog
AS $$
  SELECT CASE lower(coalesce(p_item, ''))
    WHEN 'pokeball' THEN 'Poké Ball'
    WHEN 'greatball' THEN 'Great Ball'
    WHEN 'ultraball' THEN 'Ultra Ball'
    WHEN 'berry' THEN 'Berry'
    WHEN 'bait' THEN 'Honey'
    ELSE coalesce(p_item, 'item')
  END;
$$;

CREATE OR REPLACE FUNCTION private.spend_bag_item(p_uid uuid, p_item text)
RETURNS void
LANGUAGE plpgsql
SET search_path TO pg_catalog, public
AS $$
DECLARE
  spent int;
BEGIN
  IF p_item = 'berry' THEN
    UPDATE public.inventories SET berry = berry - 1, updated_at = now()
     WHERE user_id = p_uid AND berry > 0;
  ELSIF p_item = 'bait' THEN
    UPDATE public.inventories SET bait = bait - 1, updated_at = now()
     WHERE user_id = p_uid AND bait > 0;
  ELSIF p_item = 'pokeball' THEN
    UPDATE public.inventories SET pokeball = pokeball - 1, updated_at = now()
     WHERE user_id = p_uid AND pokeball > 0;
  ELSIF p_item = 'greatball' THEN
    UPDATE public.inventories SET greatball = greatball - 1, updated_at = now()
     WHERE user_id = p_uid AND greatball > 0;
  ELSIF p_item = 'ultraball' THEN
    UPDATE public.inventories SET ultraball = ultraball - 1, updated_at = now()
     WHERE user_id = p_uid AND ultraball > 0;
  ELSE
    RAISE EXCEPTION 'Unknown item.';
  END IF;
  GET DIAGNOSTICS spent = ROW_COUNT;
  IF spent = 0 THEN
    RAISE EXCEPTION 'You have no % left. No item spent.', private.item_label(p_item);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION private.announce_throws(p_round uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path TO pg_catalog, public, private
AS $$
DECLARE
  rec public.encounter_players%ROWTYPE;
  who text;
  line text;
  last_line text;
BEGIN
  FOR rec IN
    SELECT ep.* FROM public.encounter_players ep
    WHERE ep.round_id = p_round
      AND ep.ball IS NOT NULL
      AND ep.throw_processed = false
    ORDER BY ep.user_id
    FOR UPDATE
  LOOP
    who := coalesce(private.trainer_label(rec.user_id), 'A trainer');
    BEGIN
      PERFORM private.spend_bag_item(rec.user_id, rec.ball);
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.encounter_players ep
         SET throw_processed = true, result_reason = 'no_ball_left'
       WHERE ep.round_id = rec.round_id AND ep.user_id = rec.user_id;
      CONTINUE;
    END;
    UPDATE public.encounter_players ep
       SET throw_processed = true
     WHERE ep.round_id = rec.round_id AND ep.user_id = rec.user_id;
    line := who || ' has thrown ' || private.item_label(rec.ball) || '!';
    PERFORM private.log_activity(p_round, rec.user_id, 'threw', rec.ball);
    last_line := line;
  END LOOP;
  RETURN last_line;
END
$$;

CREATE OR REPLACE FUNCTION private.capture_config()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO pg_catalog
AS $$
  SELECT jsonb_build_object(
    'minChance', 0.02,
    'maxChance', 0.85,
    'honeyContributorBonus', 1.05,
    'shinyMultiplier', 1.0,
    'eventMultiplier', 1.0,
    'berryBonus', 0.10
  );
$$;

CREATE OR REPLACE FUNCTION private.capture_throw_context(
  r public.encounter_rounds,
  p_uid uuid,
  p_at timestamptz
) RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO pg_catalog
AS $$
  SELECT jsonb_build_object('userId', p_uid, 'at', p_at, 'roundId', r.id);
$$;

CREATE OR REPLACE FUNCTION private.capture_base_chance(p_catch_rate integer, cfg jsonb)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path TO pg_catalog
AS $$
  SELECT least(0.5, greatest(0.05, coalesce(p_catch_rate, 45)::numeric / 255.0));
$$;

CREATE OR REPLACE FUNCTION private.capture_chance(
  p_dex int,
  p_ball text,
  p_berry text DEFAULT NULL,
  p_honey_contributors int DEFAULT 0,
  p_honey_participants int DEFAULT 0,
  p_contributed_honey boolean DEFAULT false,
  p_owns_species boolean DEFAULT false,
  p_is_shiny boolean DEFAULT false,
  p_other_multiplier numeric DEFAULT 1.0,
  p_at timestamptz DEFAULT now(),
  p_config jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO pg_catalog, public, private
AS $$
DECLARE
  cfg jsonb := coalesce(p_config, private.capture_config());
  s public.species%ROWTYPE;
  base numeric;
  ball_mult numeric;
  berry_mult numeric;
  honey_mult numeric;
  contributor numeric;
  raw numeric;
  final numeric;
  guaranteed boolean := false;
BEGIN
  SELECT * INTO s FROM public.species WHERE dex = p_dex;
  base := private.capture_base_chance(s.catch_rate, cfg);
  ball_mult := CASE lower(coalesce(p_ball, 'pokeball'))
    WHEN 'greatball' THEN 1.5
    WHEN 'ultraball' THEN 2.0
    WHEN 'masterball' THEN 255
    ELSE 1.0
  END;
  guaranteed := lower(coalesce(p_ball, '')) = 'masterball';
  berry_mult := CASE
    WHEN p_berry IS NOT NULL AND lower(p_berry) IN ('berry', 'razz') THEN 1.0 + coalesce((cfg->>'berryBonus')::numeric, 0.10)
    ELSE 1.0
  END;
  honey_mult := CASE
    WHEN coalesce(p_honey_contributors, 0) <= 0 THEN 1
    ELSE 1 + (least(p_honey_contributors, 5) * 0.05)
  END;
  contributor := CASE WHEN coalesce(p_contributed_honey, false)
    THEN coalesce((cfg->>'honeyContributorBonus')::numeric, 1.05)
    ELSE 1.0
  END;
  raw := base * ball_mult * berry_mult * honey_mult * contributor
       * CASE WHEN p_is_shiny THEN coalesce((cfg->>'shinyMultiplier')::numeric, 1) ELSE 1 END
       * coalesce((cfg->>'eventMultiplier')::numeric, 1)
       * coalesce(p_other_multiplier, 1);
  IF guaranteed THEN
    final := 1.0;
  ELSE
    final := least(coalesce((cfg->>'maxChance')::numeric, 0.85),
                   greatest(coalesce((cfg->>'minChance')::numeric, 0.02), raw));
  END IF;
  RETURN jsonb_build_object(
    'dex', p_dex,
    'species', s.name,
    'catchRate', s.catch_rate,
    'baseChance', base,
    'ball', jsonb_build_object('key', coalesce(p_ball, 'pokeball'), 'multiplier', ball_mult, 'conditionMet', true, 'guaranteed', guaranteed),
    'berry', jsonb_build_object('key', p_berry, 'multiplier', berry_mult),
    'honey', jsonb_build_object('contributors', p_honey_contributors, 'participants', p_honey_participants, 'multiplier', honey_mult),
    'honeyContributorMultiplier', contributor,
    'shinyMultiplier', 1,
    'eventMultiplier', 1,
    'otherMultiplier', coalesce(p_other_multiplier, 1),
    'rawChance', raw,
    'finalChance', final,
    'guaranteed', guaranteed
  );
END
$$;

CREATE OR REPLACE FUNCTION private.award_xp(p_uid uuid, p_amount int)
RETURNS void
LANGUAGE plpgsql
SET search_path TO pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.trainer_xp (user_id, xp) VALUES (p_uid, coalesce(p_amount, 0))
  ON CONFLICT (user_id) DO UPDATE SET xp = public.trainer_xp.xp + coalesce(p_amount, 0);
END
$$;

CREATE OR REPLACE FUNCTION private.after_catch_xp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO pg_catalog, public, private
AS $$
DECLARE
  first_species boolean;
BEGIN
  SELECT NOT EXISTS (
    SELECT 1 FROM public.catches
    WHERE user_id = NEW.user_id AND dex = NEW.dex AND id <> NEW.id
  ) INTO first_species;
  PERFORM private.award_xp(NEW.user_id, 50 + CASE WHEN first_species THEN 25 ELSE 0 END);
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS catches_xp ON public.catches;
CREATE TRIGGER catches_xp
  AFTER INSERT ON public.catches
  FOR EACH ROW
  EXECUTE FUNCTION private.after_catch_xp();

CREATE OR REPLACE FUNCTION public.play_join_as(p_uid uuid, p_round uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path TO pg_catalog, public, private
AS $$
BEGIN
  INSERT INTO public.encounter_players (round_id, user_id) VALUES (p_round, p_uid)
  ON CONFLICT DO NOTHING;
  PERFORM private.award_xp(p_uid, 10);
END
$$;

CREATE OR REPLACE FUNCTION public.play_prepare_as(p_uid uuid, p_item text, p_round uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path TO pg_catalog, public, private
AS $$
BEGIN
  IF p_item IS NOT NULL AND p_item <> 'none' THEN
    PERFORM private.spend_bag_item(p_uid, p_item);
  END IF;
  UPDATE public.encounter_players
     SET prep = p_item, prep_at = now()
   WHERE round_id = p_round AND user_id = p_uid;
END
$$;

CREATE OR REPLACE FUNCTION public.play_throw_as(p_uid uuid, p_item text, p_round uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path TO pg_catalog, public
AS $$
BEGIN
  UPDATE public.encounter_players
     SET ball = p_item, ball_at = now()
   WHERE round_id = p_round AND user_id = p_uid;
END
$$;

CREATE OR REPLACE FUNCTION public.rehearsal_open_round(
  p_round uuid,
  p_dex integer,
  p_form_id integer,
  p_outcome text,
  p_variant text DEFAULT 'normal',
  p_gender text DEFAULT 'Male',
  p_level integer DEFAULT 5
) RETURNS void
LANGUAGE plpgsql
SET search_path TO pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.encounter_rounds (
    id, phase, hidden, pokemon, dex, name, variant, gender, pokemon_form_id,
    deadlines, rules, resolved, cancelled, trigger_source, source
  ) VALUES (
    p_round, 'reveal', false,
    jsonb_build_object('dex', p_dex, 'level', p_level, 'name', (SELECT name FROM public.species WHERE dex = p_dex)),
    p_dex,
    (SELECT name FROM public.species WHERE dex = p_dex),
    p_variant,
    p_gender,
    p_form_id,
    jsonb_build_object(
      'join', now() - interval '4 minutes',
      'prepare', now() - interval '3 minutes',
      'throw', now() - interval '2 minutes',
      'reveal', now() - interval '1 minute'
    ),
    jsonb_build_object('testOutcome', p_outcome),
    false, false, 'TEST', 'local'
  )
  ON CONFLICT (id) DO NOTHING;
END
$$;

CREATE OR REPLACE FUNCTION private.streamlink_after_materialize_hook()
RETURNS void
LANGUAGE plpgsql
SET search_path TO pg_catalog
AS $$
BEGIN
  IF current_setting('starlight.wire_test_fail', true) = 'after-materialize' THEN
    RAISE EXCEPTION 'injected-after-materialize';
  END IF;
END
$$;

COMMENT ON FUNCTION public.rehearsal_open_round(uuid, integer, integer, text, text, text, integer) IS
  'Local-only encounter opener. Not a production RPC.';

COMMIT;
