-- A19-SCHEMA UNAPPLIED ROLLBACK (issue #22)
-- DO NOT RUN against live Supabase unless a later apply is being reversed.
-- Drops only objects introduced by 001 and 002. Does not touch catches rows,
-- iv_*, av_*, lgpe_species, or existing RPCs.

BEGIN;

ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_nature_id_range;
ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_ability_slot_ok;
ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_ev_hp_range;
ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_ev_atk_range;
ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_ev_def_range;
ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_ev_spa_range;
ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_ev_spd_range;
ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_ev_spe_range;
ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_ev_total_ok;
ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_move_slots_ok;
ALTER TABLE public.catches DROP CONSTRAINT IF EXISTS catches_hp_ok;

ALTER TABLE public.catches DROP COLUMN IF EXISTS nature_id;
ALTER TABLE public.catches DROP COLUMN IF EXISTS ability_id;
ALTER TABLE public.catches DROP COLUMN IF EXISTS ability_slot;
ALTER TABLE public.catches DROP COLUMN IF EXISTS ev_hp;
ALTER TABLE public.catches DROP COLUMN IF EXISTS ev_atk;
ALTER TABLE public.catches DROP COLUMN IF EXISTS ev_def;
ALTER TABLE public.catches DROP COLUMN IF EXISTS ev_spa;
ALTER TABLE public.catches DROP COLUMN IF EXISTS ev_spd;
ALTER TABLE public.catches DROP COLUMN IF EXISTS ev_spe;
ALTER TABLE public.catches DROP COLUMN IF EXISTS move_slots;
ALTER TABLE public.catches DROP COLUMN IF EXISTS ruleset_id;
ALTER TABLE public.catches DROP COLUMN IF EXISTS content_build;
ALTER TABLE public.catches DROP COLUMN IF EXISTS hp_current;
ALTER TABLE public.catches DROP COLUMN IF EXISTS hp_max;
ALTER TABLE public.catches DROP COLUMN IF EXISTS status;
ALTER TABLE public.catches DROP COLUMN IF EXISTS held_item;
ALTER TABLE public.catches DROP COLUMN IF EXISTS gigantamax_factor;

DROP TABLE IF EXISTS private.ref_form_policies;
DROP TABLE IF EXISTS private.ref_obtain;
DROP TABLE IF EXISTS private.ref_evolutions;
DROP TABLE IF EXISTS private.ref_learnsets;
DROP TABLE IF EXISTS private.ref_form_abilities;
DROP TABLE IF EXISTS private.ref_moves;
DROP TABLE IF EXISTS private.ref_abilities;
DROP TABLE IF EXISTS private.ref_forms;
DROP TABLE IF EXISTS private.ref_natures;
DROP TABLE IF EXISTS private.ref_species;
DROP TABLE IF EXISTS private.ref_meta;

COMMIT;
