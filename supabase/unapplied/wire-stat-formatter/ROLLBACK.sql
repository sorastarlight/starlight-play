-- Restores old display mismatch; review before use.
begin;
do $guard$ begin
 if (select md5(prosrc) from pg_proc where oid='private.catch_json(public.catches)'::regprocedure) is distinct from 'ec15d532dd58053ee4ac6c24e5e901de' then raise exception 'Rollback source drift'; end if;
end $guard$;
CREATE OR REPLACE FUNCTION private.catch_json(c catches)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  spec public.lgpe_species;
  listed boolean;
  st_hp int;
  st_atk int;
  st_def int;
  st_spa int;
  st_spd int;
  st_spe int;
  fid int;
  f public.pokemon_forms;
begin
  select * into spec from public.lgpe_species where dex = c.dex;
  listed := exists (select 1 from public.trade_listings t where t.catch_id = c.id and t.status = 'open');
  st_hp := private.lgpe_stat(spec.hp, c.iv_hp, c.av_hp, c.level, true);
  st_atk := private.lgpe_stat(spec.atk, c.iv_atk, c.av_atk, c.level, false);
  st_def := private.lgpe_stat(spec.def, c.iv_def, c.av_def, c.level, false);
  st_spa := private.lgpe_stat(spec.spa, c.iv_spa, c.av_spa, c.level, false);
  st_spd := private.lgpe_stat(spec.spd, c.iv_spd, c.av_spd, c.level, false);
  st_spe := private.lgpe_stat(spec.spe, c.iv_spe, c.av_spe, c.level, false);
  fid := private.canonical_form_id(c.dex, coalesce(c.pokemon_form_id, c.dex));
  select * into f from public.pokemon_forms where pokemon_form_id = fid;
  return jsonb_build_object(
    'id', c.id,
    'publicId', c.public_id,
    'dex', c.dex,
    'name', coalesce(nullif(btrim(c.name), ''), private.form_display_name(c.dex, fid)),
    'nickname', c.nickname,
    'variant', c.variant,
    'gender', c.gender,
    'ball', c.ball,
    'caughtAt', c.caught_at,
    'level', coalesce(c.level, 12),
    'size', coalesce(c.size_class, 'M'),
    'isAlpha', coalesce(c.is_alpha, false),
    'types', coalesce(spec.types, '{}'::text[]),
    'moves', coalesce(c.moves, '{}'::text[]),
    'ivs', jsonb_build_object('hp', coalesce(c.iv_hp, 0), 'atk', coalesce(c.iv_atk, 0), 'def', coalesce(c.iv_def, 0), 'spa', coalesce(c.iv_spa, 0), 'spd', coalesce(c.iv_spd, 0), 'spe', coalesce(c.iv_spe, 0)),
    'avs', jsonb_build_object('hp', coalesce(c.av_hp, 0), 'atk', coalesce(c.av_atk, 0), 'def', coalesce(c.av_def, 0), 'spa', coalesce(c.av_spa, 0), 'spd', coalesce(c.av_spd, 0), 'spe', coalesce(c.av_spe, 0)),
    'stats', jsonb_build_object('hp', st_hp, 'atk', st_atk, 'def', st_def, 'spa', st_spa, 'spd', st_spd, 'spe', st_spe),
    'cp', greatest(10, floor((st_atk * sqrt(greatest(st_def, 1)) * sqrt(greatest(st_hp, 1)) * power((least(coalesce(c.level, 1), 40)::numeric / 40.0) * 0.7903, 2)) / 10)),
    'otName', c.ot_name,
    'otNumber', c.ot_number,
    'otUserId', c.ot_user_id,
    'metLevel', coalesce(c.met_level, c.level),
    'metLocation', c.met_location,
    'heightM', c.height_m,
    'weightKg', c.weight_kg,
    'friendship', coalesce(c.friendship, 0),
    'listed', listed,
    'transferredAt', c.transferred_at,
    'favorite', coalesce(c.favorite, false),
    'locked', coalesce(c.locked, false),
    'obtainedMethod', coalesce(c.obtained_method, 'CAPTURE'),
    'tradeEvoReady', coalesce(c.trade_evo_ready, false),
    'tradable', coalesce((select s.tradable from public.species s where s.dex = c.dex), true),
    'formId', fid,
    'formKey', coalesce(f.form_key, 'base'),
    'formLabel', coalesce(f.form_label, 'Base'),
    'isBaseForm', coalesce(f.is_base, true),
    'displayName', private.form_display_name(c.dex, fid)
  );
end;
$function$
;
commit;
