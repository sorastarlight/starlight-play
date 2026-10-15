-- A19-WIRE local stamp replica. Disposable clusters only.
-- Mirrors production null-only fills (LG public_id, md5 IVs, friendship 0).
-- Does not write nature_id, ability_*, ev_*, move_slots, hp_*, ruleset_id,
-- content_build, or gigantamax_factor. Used to prove stamp does not corrupt
-- newly inserted Gen IX attributes.

BEGIN;

CREATE OR REPLACE FUNCTION private.stamp_catch_row(c public.catches)
RETURNS public.catches
LANGUAGE plpgsql
SET search_path TO pg_catalog, public, private
AS $function$
DECLARE
  seed int;
BEGIN
  IF c.public_id IS NULL OR btrim(c.public_id) = '' THEN
    c.public_id := 'LG' || lpad(nextval('public.catch_serial')::text, 8, '0');
  END IF;
  seed := abs(('x' || substr(md5(c.id::text), 1, 8))::bit(32)::int);
  IF c.level IS NULL THEN
    IF c.round_id IS NOT NULL THEN
      c.level := private.encounter_pokemon_level(c.dex, c.round_id);
    ELSE
      c.level := 5;
    END IF;
  END IF;
  IF c.iv_hp IS NULL THEN c.iv_hp := (('x' || substr(md5(c.id::text || 'hp'), 1, 2))::bit(8)::int) % 32; END IF;
  IF c.iv_atk IS NULL THEN c.iv_atk := (('x' || substr(md5(c.id::text || 'atk'), 1, 2))::bit(8)::int) % 32; END IF;
  IF c.iv_def IS NULL THEN c.iv_def := (('x' || substr(md5(c.id::text || 'def'), 1, 2))::bit(8)::int) % 32; END IF;
  IF c.iv_spa IS NULL THEN c.iv_spa := (('x' || substr(md5(c.id::text || 'spa'), 1, 2))::bit(8)::int) % 32; END IF;
  IF c.iv_spd IS NULL THEN c.iv_spd := (('x' || substr(md5(c.id::text || 'spd'), 1, 2))::bit(8)::int) % 32; END IF;
  IF c.iv_spe IS NULL THEN c.iv_spe := (('x' || substr(md5(c.id::text || 'spe'), 1, 2))::bit(8)::int) % 32; END IF;
  IF c.av_hp IS NULL THEN c.av_hp := 0; END IF;
  IF c.av_atk IS NULL THEN c.av_atk := 0; END IF;
  IF c.av_def IS NULL THEN c.av_def := 0; END IF;
  IF c.av_spa IS NULL THEN c.av_spa := 0; END IF;
  IF c.av_spd IS NULL THEN c.av_spd := 0; END IF;
  IF c.av_spe IS NULL THEN c.av_spe := 0; END IF;
  IF c.moves IS NULL OR cardinality(c.moves) = 0 THEN
    c.moves := private.lgpe_pick_moves(c.dex, c.level);
  END IF;
  c.gender := private.lgpe_roll_gender(c.dex, seed, c.gender);
  IF c.friendship IS NULL THEN
    c.friendship := 0;
  END IF;
  IF c.ot_user_id IS NULL THEN
    c.ot_user_id := c.user_id;
  END IF;
  RETURN c;
END
$function$;

CREATE OR REPLACE FUNCTION private.catches_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO pg_catalog, public, private
AS $fn$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;
  NEW := private.stamp_catch_row(NEW);
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS catches_before_write ON public.catches;
CREATE TRIGGER catches_before_write
  BEFORE INSERT OR UPDATE OF dex, level, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe
  ON public.catches
  FOR EACH ROW
  EXECUTE FUNCTION private.catches_before_write();

COMMENT ON FUNCTION private.stamp_catch_row(public.catches) IS
  'WIRE rehearsal replica of production null-only stamp. Does not overwrite supplied IVs or GENVAL columns.';

COMMIT;
