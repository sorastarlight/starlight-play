-- A19-SCHEMA REHEARSAL BASELINE (issue #23)
-- SYNTHETIC DATA ONLY. DO NOT RUN against live Supabase.
-- Creates a disposable public.catches + lgpe_species stand-in and mock roles.
-- Trainers are fictional Oak/Leaf/Blue ids — not Sora, Twinkle, or any live account.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$roles$;

CREATE TABLE IF NOT EXISTS public.lgpe_species (
  dex integer PRIMARY KEY,
  types text[] NOT NULL DEFAULT '{}',
  hp integer, atk integer, def integer, spa integer, spd integer, spe integer,
  moves jsonb NOT NULL DEFAULT '[]'::jsonb
);

INSERT INTO public.lgpe_species (dex, types, hp, atk, def, spa, spd, spe, moves) VALUES
  (1, ARRAY['grass','poison'], 45, 49, 49, 65, 65, 45, '[]'::jsonb),
  (25, ARRAY['electric'], 35, 55, 40, 50, 50, 90, '[]'::jsonb)
ON CONFLICT (dex) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.catches (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  dex integer NOT NULL,
  name text,
  variant text,
  gender text,
  ball text,
  caught_at timestamptz NOT NULL DEFAULT now(),
  public_id text UNIQUE,
  nickname text,
  level integer,
  pokemon_form_id integer,
  iv_hp integer, iv_atk integer, iv_def integer,
  iv_spa integer, iv_spd integer, iv_spe integer,
  av_hp integer, av_atk integer, av_def integer,
  av_spa integer, av_spd integer, av_spe integer,
  moves text[],
  friendship integer,
  height_m numeric,
  weight_kg numeric
);

-- Fictional rehearsal trainers only.
INSERT INTO public.catches (
  id, user_id, dex, name, variant, gender, ball, public_id, nickname, level, pokemon_form_id,
  iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe,
  av_hp, av_atk, av_def, av_spa, av_spd, av_spe,
  moves, friendship, height_m, weight_kg
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    1, 'Bulbasaur', 'normal', 'M', 'poke', 'syn-bulb-1', NULL, 5, 1,
    10, 11, 12, 13, 14, 15,
    0, 0, 0, 0, 0, 0,
    ARRAY['tackle','growl','vine-whip'], 70, 0.7, 6.9
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    25, 'Pikachu', 'normal', 'F', 'great', 'syn-pika-1', 'Spark', 12, 25,
    20, 21, 22, 23, 24, 25,
    0, 0, 0, 0, 0, 0,
    ARRAY['thunder-shock','growl','quick-attack'], 90, 0.4, 6.0
  )
ON CONFLICT (id) DO NOTHING;

COMMIT;
