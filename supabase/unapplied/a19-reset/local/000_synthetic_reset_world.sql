-- A19-RESET local synthetic world. DO NOT RUN against live Supabase.
-- Fictional UUIDs only. Login strings match the protected denylist so the
-- script can be rehearsed without copying production identities.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  twitch_login text,
  username text,
  display_name text,
  team_ids uuid[],
  pc_layout jsonb,
  showcase jsonb
);

CREATE TABLE IF NOT EXISTS public.catches (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  dex integer NOT NULL,
  name text,
  public_id text
);

CREATE TABLE IF NOT EXISTS public.trade_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catch_id uuid
);

CREATE TABLE IF NOT EXISTS public.trade_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catch_id uuid
);

CREATE TABLE IF NOT EXISTS public.direct_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  a_catch uuid,
  b_catch uuid
);

CREATE TABLE IF NOT EXISTS public.oak_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catch_id uuid
);

CREATE TABLE IF NOT EXISTS public.evolution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid
);

CREATE TABLE IF NOT EXISTS public.encounter_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid
);

CREATE TABLE IF NOT EXISTS public.encounter_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid
);

CREATE TABLE IF NOT EXISTS public.capture_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid
);

CREATE TABLE IF NOT EXISTS public.play_console_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid
);

CREATE TABLE IF NOT EXISTS public.encounter_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cancelled boolean,
  resolved boolean,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.candy_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  related_catch uuid,
  amount integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.trainer_stats (
  user_id uuid PRIMARY KEY,
  captures integer DEFAULT 0,
  catch_streak integer DEFAULT 0,
  best_catch_streak integer DEFAULT 0,
  fails integer DEFAULT 0,
  fail_streak integer DEFAULT 0,
  best_fail_streak integer DEFAULT 0,
  released integer DEFAULT 0,
  traded_away integer DEFAULT 0,
  traded_in integer DEFAULT 0,
  trades_done integer DEFAULT 0,
  evolved integer DEFAULT 0,
  encounters integer DEFAULT 0,
  optimal_catches integer DEFAULT 0,
  first_pokemon_dex integer,
  first_shiny_dex integer,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.species_seen (
  user_id uuid NOT NULL,
  dex integer NOT NULL,
  PRIMARY KEY (user_id, dex)
);

CREATE TABLE IF NOT EXISTS public.trainer_inventory (
  user_id uuid PRIMARY KEY,
  poke_coins integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS private.streamlink_hidden_tickets (
  ticket_id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Protected denylist logins on fictional ids (not production accounts).
INSERT INTO public.profiles (id, twitch_login, username, display_name, team_ids, pc_layout, showcase) VALUES
  (
    'ccccccc1-cccc-cccc-cccc-ccccccccccc1',
    'sorastarlight', 'sorastarlight', 'Protected Login A',
    ARRAY[]::uuid[],
    '{"box1":[]}'::jsonb,
    '{"achievementId":"syn-ach-keep","shinyCatchId":"aaaa0000-0000-0000-0000-000000000001"}'::jsonb
  ),
  (
    'ccccccc2-cccc-cccc-cccc-ccccccccccc2',
    'twinklephoenixstar', 'twinklephoenixstar', 'Protected Login B',
    ARRAY[]::uuid[],
    '{"box1":[]}'::jsonb,
    '{"achievementId":"syn-ach-keep"}'::jsonb
  ),
  (
    'ddddddd1-dddd-dddd-dddd-ddddddddddd1',
    'oak-synthetic', 'professor-oak', 'Professor Oak',
    ARRAY[]::uuid[],
    '{"box1":["dead"]}'::jsonb,
    '{"achievementId":"syn-ach-oak","shinyCatchId":"bbbb0000-0000-0000-0000-000000000001"}'::jsonb
  ),
  (
    'ddddddd2-dddd-dddd-dddd-ddddddddddd2',
    'leaf-synthetic', 'trainer-leaf', 'Leaf',
    ARRAY[]::uuid[],
    '{"box1":[]}'::jsonb,
    '{"achievementId":"syn-ach-leaf"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- 98 protected-shaped catches (49 each).
INSERT INTO public.catches (id, user_id, dex, name, public_id)
SELECT
  ('aaaa0000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
  'ccccccc1-cccc-cccc-cccc-ccccccccccc1',
  1 + ((g - 1) % 20),
  'ProtectedA-' || g,
  'LG-PROT-A-' || g
FROM generate_series(1, 49) g
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.catches (id, user_id, dex, name, public_id)
SELECT
  ('aaaa0000-0000-0000-0001-' || lpad(g::text, 12, '0'))::uuid,
  'ccccccc2-cccc-cccc-cccc-ccccccccccc2',
  21 + ((g - 1) % 20),
  'ProtectedB-' || g,
  'LG-PROT-B-' || g
FROM generate_series(1, 49) g
ON CONFLICT (id) DO NOTHING;

-- 12 disposable catches (6 each).
INSERT INTO public.catches (id, user_id, dex, name, public_id)
SELECT
  ('bbbb0000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
  'ddddddd1-dddd-dddd-dddd-ddddddddddd1',
  g,
  'Oak-' || g,
  'LG-OAK-' || g
FROM generate_series(1, 6) g
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.catches (id, user_id, dex, name, public_id)
SELECT
  ('bbbb0000-0000-0000-0001-' || lpad(g::text, 12, '0'))::uuid,
  'ddddddd2-dddd-dddd-dddd-ddddddddddd2',
  10 + g,
  'Leaf-' || g,
  'LG-LEAF-' || g
FROM generate_series(1, 6) g
ON CONFLICT (id) DO NOTHING;

-- Protected team includes own catch + leaked disposable id.
UPDATE public.profiles
SET team_ids = ARRAY[
  'aaaa0000-0000-0000-0000-000000000001'::uuid,
  'bbbb0000-0000-0000-0000-000000000001'::uuid
]
WHERE id = 'ccccccc1-cccc-cccc-cccc-ccccccccccc1';

UPDATE public.profiles
SET team_ids = ARRAY[
  'aaaa0000-0000-0000-0001-000000000001'::uuid
]
WHERE id = 'ccccccc2-cccc-cccc-cccc-ccccccccccc2';

UPDATE public.profiles
SET team_ids = ARRAY[
  'bbbb0000-0000-0000-0000-000000000001'::uuid,
  'bbbb0000-0000-0000-0000-000000000002'::uuid
]
WHERE id = 'ddddddd1-dddd-dddd-dddd-ddddddddddd1';

INSERT INTO public.trade_offers (catch_id) VALUES
  ('bbbb0000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

INSERT INTO public.trade_listings (catch_id) VALUES
  ('bbbb0000-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;

INSERT INTO public.direct_trades (a_catch, b_catch) VALUES
  ('bbbb0000-0000-0000-0000-000000000005', 'aaaa0000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

INSERT INTO public.oak_transfers (catch_id) VALUES
  ('bbbb0000-0000-0000-0000-000000000006')
ON CONFLICT DO NOTHING;

INSERT INTO public.evolution_log (user_id) VALUES
  ('ddddddd1-dddd-dddd-dddd-ddddddddddd1'),
  ('ccccccc1-cccc-cccc-cccc-ccccccccccc1');

INSERT INTO public.encounter_players (user_id) VALUES
  ('ddddddd1-dddd-dddd-dddd-ddddddddddd1'),
  ('ccccccc1-cccc-cccc-cccc-ccccccccccc1');

INSERT INTO public.encounter_activity (user_id) VALUES
  ('ddddddd2-dddd-dddd-dddd-ddddddddddd2'),
  ('ccccccc2-cccc-cccc-cccc-ccccccccccc2');

INSERT INTO public.capture_log (user_id) VALUES
  ('ddddddd1-dddd-dddd-dddd-ddddddddddd1'),
  ('ccccccc1-cccc-cccc-cccc-ccccccccccc1');

INSERT INTO public.play_console_log (user_id) VALUES
  ('ddddddd2-dddd-dddd-dddd-ddddddddddd2'),
  ('ccccccc2-cccc-cccc-cccc-ccccccccccc2');

INSERT INTO public.encounter_rounds (cancelled, resolved) VALUES
  (false, false);

INSERT INTO public.candy_ledger (related_catch, amount) VALUES
  ('bbbb0000-0000-0000-0000-000000000001', 3),
  ('aaaa0000-0000-0000-0000-000000000001', 9);

INSERT INTO public.trainer_stats (
  user_id, captures, catch_streak, encounters, first_pokemon_dex, updated_at
) VALUES
  ('ddddddd1-dddd-dddd-dddd-ddddddddddd1', 6, 2, 10, 1, now()),
  ('ccccccc1-cccc-cccc-cccc-ccccccccccc1', 49, 5, 80, 1, now())
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.species_seen (user_id, dex) VALUES
  ('ddddddd1-dddd-dddd-dddd-ddddddddddd1', 1),
  ('ccccccc1-cccc-cccc-cccc-ccccccccccc1', 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.trainer_inventory (user_id, poke_coins) VALUES
  ('ddddddd1-dddd-dddd-dddd-ddddddddddd1', 777),
  ('ccccccc1-cccc-cccc-cccc-ccccccccccc1', 999)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO private.streamlink_hidden_tickets DEFAULT VALUES;

COMMIT;
