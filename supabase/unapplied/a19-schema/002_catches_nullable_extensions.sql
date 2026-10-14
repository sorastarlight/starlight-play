-- A19-SCHEMA UNAPPLIED ARTIFACT (issue #22)
-- DO NOT RUN against live Supabase or any connected project.
-- Additive, nullable columns only. No backfill. No UPDATE of existing rows.
-- Does not rewrite iv_*, av_*, moves text[], friendship, or public.lgpe_species.
-- Does not change private.stamp_catch_row. Old rows stay legacy-valid.

BEGIN;

ALTER TABLE public.catches
  ADD COLUMN IF NOT EXISTS nature_id integer,
  ADD COLUMN IF NOT EXISTS ability_id integer,
  ADD COLUMN IF NOT EXISTS ability_slot text,
  ADD COLUMN IF NOT EXISTS ev_hp integer,
  ADD COLUMN IF NOT EXISTS ev_atk integer,
  ADD COLUMN IF NOT EXISTS ev_def integer,
  ADD COLUMN IF NOT EXISTS ev_spa integer,
  ADD COLUMN IF NOT EXISTS ev_spd integer,
  ADD COLUMN IF NOT EXISTS ev_spe integer,
  ADD COLUMN IF NOT EXISTS move_slots jsonb,
  ADD COLUMN IF NOT EXISTS ruleset_id text,
  ADD COLUMN IF NOT EXISTS content_build text,
  ADD COLUMN IF NOT EXISTS hp_current integer,
  ADD COLUMN IF NOT EXISTS hp_max integer,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS held_item text,
  ADD COLUMN IF NOT EXISTS gigantamax_factor boolean;

-- Constraints are NULL-tolerant so existing Pokémon keep working.
ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_nature_id_range;
ALTER TABLE public.catches ADD CONSTRAINT catches_nature_id_range
  CHECK (nature_id IS NULL OR nature_id BETWEEN 1 AND 25);

ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_ability_slot_ok;
ALTER TABLE public.catches ADD CONSTRAINT catches_ability_slot_ok
  CHECK (ability_slot IS NULL OR ability_slot IN ('1', '2', 'hidden'));

ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_ev_hp_range;
ALTER TABLE public.catches ADD CONSTRAINT catches_ev_hp_range
  CHECK (ev_hp IS NULL OR ev_hp BETWEEN 0 AND 252);
ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_ev_atk_range;
ALTER TABLE public.catches ADD CONSTRAINT catches_ev_atk_range
  CHECK (ev_atk IS NULL OR ev_atk BETWEEN 0 AND 252);
ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_ev_def_range;
ALTER TABLE public.catches ADD CONSTRAINT catches_ev_def_range
  CHECK (ev_def IS NULL OR ev_def BETWEEN 0 AND 252);
ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_ev_spa_range;
ALTER TABLE public.catches ADD CONSTRAINT catches_ev_spa_range
  CHECK (ev_spa IS NULL OR ev_spa BETWEEN 0 AND 252);
ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_ev_spd_range;
ALTER TABLE public.catches ADD CONSTRAINT catches_ev_spd_range
  CHECK (ev_spd IS NULL OR ev_spd BETWEEN 0 AND 252);
ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_ev_spe_range;
ALTER TABLE public.catches ADD CONSTRAINT catches_ev_spe_range
  CHECK (ev_spe IS NULL OR ev_spe BETWEEN 0 AND 252);

ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_ev_total_ok;
ALTER TABLE public.catches ADD CONSTRAINT catches_ev_total_ok
  CHECK (
    ev_hp IS NULL OR ev_atk IS NULL OR ev_def IS NULL
    OR ev_spa IS NULL OR ev_spd IS NULL OR ev_spe IS NULL
    OR (ev_hp + ev_atk + ev_def + ev_spa + ev_spd + ev_spe) <= 510
  );

ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_move_slots_ok;
ALTER TABLE public.catches ADD CONSTRAINT catches_move_slots_ok
  CHECK (
    move_slots IS NULL
    OR (
      jsonb_typeof(move_slots) = 'array'
      AND jsonb_array_length(move_slots) <= 4
    )
  );

ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_hp_ok;
ALTER TABLE public.catches ADD CONSTRAINT catches_hp_ok
  CHECK (
    hp_current IS NULL OR hp_max IS NULL
    OR (hp_max > 0 AND hp_current BETWEEN 0 AND hp_max)
  );

COMMENT ON COLUMN public.catches.nature_id IS
  'Gen IX nature. NULL on legacy rows. Filled only by a later generator.';
COMMENT ON COLUMN public.catches.move_slots IS
  'Up to 4 {moveId,pp,ppMax,method,versionGroup}. Legacy moves text[] stays.';
COMMENT ON COLUMN public.catches.gigantamax_factor IS
  'G1 reserved flag. Unused until a later approved phase. Not a distinct form id.';
COMMENT ON COLUMN public.catches.content_build IS
  'Pin id for new rows. NULL means pre-Gen-IX / legacy stamp.';
COMMENT ON COLUMN public.catches.friendship IS
  'Existing individual friendship. Not rewritten here. F1 applies at future generate.';

-- No FK to private.ref_* (old NULL rows and apply-order safety).
-- No trigger changes. No backfill UPDATE. No GRANT/REVOKE change on catches.

COMMIT;
