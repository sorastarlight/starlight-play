-- A19-WIRE local schema extras. SYNTHETIC DATA ONLY.
-- Adds settle columns, unique indexes, profiles, inventory, and capture stubs
-- so persist / stamp / economy tests can run on the disposable cluster.

BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.catch_serial;

ALTER TABLE public.catches ADD COLUMN IF NOT EXISTS round_id uuid;
ALTER TABLE public.catches ADD COLUMN IF NOT EXISTS source_key text;
ALTER TABLE public.catches ADD COLUMN IF NOT EXISTS size_class text;
ALTER TABLE public.catches ADD COLUMN IF NOT EXISTS met_level integer;
ALTER TABLE public.catches ADD COLUMN IF NOT EXISTS met_location text;
ALTER TABLE public.catches ADD COLUMN IF NOT EXISTS ot_user_id uuid;
ALTER TABLE public.catches ADD COLUMN IF NOT EXISTS ot_name text;
ALTER TABLE public.catches ADD COLUMN IF NOT EXISTS ot_number integer;
ALTER TABLE public.catches ADD COLUMN IF NOT EXISTS is_alpha boolean;
ALTER TABLE public.catches ADD COLUMN IF NOT EXISTS obtained_method text;

CREATE UNIQUE INDEX IF NOT EXISTS catches_round_user_uidx
  ON public.catches (round_id, user_id)
  WHERE round_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS catches_source_key_uidx
  ON public.catches (source_key)
  WHERE source_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  twitch_login text,
  username text,
  display_name text,
  team_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  pc_layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  showcase jsonb
);

CREATE TABLE IF NOT EXISTS public.trainer_inventory (
  user_id uuid PRIMARY KEY,
  poke_balls integer NOT NULL DEFAULT 0,
  great_balls integer NOT NULL DEFAULT 0,
  razz_berries integer NOT NULL DEFAULT 0,
  poke_coins integer NOT NULL DEFAULT 0,
  honey integer NOT NULL DEFAULT 0
);

INSERT INTO public.profiles (id, twitch_login, username, display_name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'oak-synthetic', 'professor-oak', 'Professor Oak'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'leaf-synthetic', 'trainer-leaf', 'Leaf'),
  ('01010101-0101-0101-0101-010101010101', 'blue-synthetic', 'trainer-blue', 'Blue'),
  ('02020202-0202-0202-0202-020202020202', 'red-synthetic', 'trainer-red', 'Red'),
  ('ccccccc1-cccc-cccc-cccc-ccccccccccc1', 'sorastarlight', 'sorastarlight', 'Protected Login A'),
  ('ccccccc2-cccc-cccc-cccc-ccccccccccc2', 'twinklephoenixstar', 'twinklephoenixstar', 'Protected Login B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.trainer_inventory (user_id, poke_balls, great_balls, razz_berries, poke_coins, honey) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 12, 4, 3, 500, 2),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 8, 2, 1, 240, 1),
  ('01010101-0101-0101-0101-010101010101', 6, 1, 0, 80, 0),
  ('02020202-0202-0202-0202-020202020202', 6, 1, 0, 80, 0)
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.lgpe_level_bounds(p_dex integer)
RETURNS integer[]
LANGUAGE sql
IMMUTABLE
SET search_path TO pg_catalog
AS $$
  SELECT ARRAY[3, 10]::integer[];
$$;

CREATE OR REPLACE FUNCTION private.lgpe_pick_moves(p_dex integer, p_level integer)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path TO pg_catalog
AS $$
  SELECT ARRAY['tackle', 'growl']::text[];
$$;

CREATE OR REPLACE FUNCTION private.lgpe_roll_gender(p_dex integer, p_seed integer, p_gender text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO pg_catalog
AS $$
  SELECT coalesce(nullif(btrim(p_gender), ''), 'M');
$$;

CREATE OR REPLACE FUNCTION private.lgpe_habitat(p_dex integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO pg_catalog
AS $$
  SELECT 'route-1'::text;
$$;

CREATE OR REPLACE FUNCTION private.encounter_pokemon_level(p_dex integer, p_round_id uuid)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO pg_catalog
AS $$
  SELECT 5;
$$;

-- Frozen capture/economy stubs. Persist must not rewrite these bodies.
CREATE OR REPLACE FUNCTION private.ball_catch_chance(rules jsonb, ball text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path TO pg_catalog
AS $$
  SELECT CASE lower(coalesce(ball, 'poke'))
    WHEN 'great' THEN 1.5
    WHEN 'ultra' THEN 2.0
    WHEN 'master' THEN 255
    ELSE 1.0
  END;
$$;

CREATE OR REPLACE FUNCTION private.berry_catch_bonus(prep text, rules jsonb)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path TO pg_catalog
AS $$
  SELECT CASE WHEN lower(coalesce(prep, '')) = 'berry'
    THEN coalesce((rules->>'berryBonus')::numeric, 0.1)
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION private.honey_catch_multiplier(contributors integer)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path TO pg_catalog
AS $$
  SELECT CASE
    WHEN coalesce(contributors, 0) <= 0 THEN 1
    ELSE 1 + (least(contributors, 5) * 0.05)
  END;
$$;

COMMENT ON FUNCTION private.ball_catch_chance(jsonb, text) IS
  'WIRE rehearsal replica. Production odds stay in supabase/migrations/. Persist must not change this.';

COMMIT;
