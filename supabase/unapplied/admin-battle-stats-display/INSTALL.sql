begin;
do $guard$ begin if md5(pg_get_functiondef('private.admin_catch_battle_json(public.catches)'::regprocedure)) <> '7cf008fa413556f2af919acc0a1916ae' or md5(pg_get_functiondef('private.catch_json(public.catches)'::regprocedure)) <> '62fc25f80384ce560a8a868cedb9fb37' then raise exception 'Stats source drift';end if;end $guard$;
CREATE OR REPLACE FUNCTION private.admin_catch_battle_json(c catches)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
select jsonb_build_object(
 'stats', private.catch_json(c)->'stats',
 'publicId', c.public_id, 'otName', c.ot_name, 'otNumber', c.ot_number,
 'ivs', jsonb_build_object('hp', c.iv_hp, 'atk', c.iv_atk, 'def', c.iv_def, 'spa', c.iv_spa, 'spd', c.iv_spd, 'spe', c.iv_spe),
 'evs', jsonb_build_object('hp', c.ev_hp, 'atk', c.ev_atk, 'def', c.ev_def, 'spa', c.ev_spa, 'spd', c.ev_spd, 'spe', c.ev_spe),
 'hpCurrent', c.hp_current, 'hpMax', c.hp_max,
 'nature', (select n.name from private.ref_natures n where n.content_build=c.content_build and n.id=c.nature_id),
 'ability', (select initcap(replace(a.slug,'-',' ')) from private.ref_abilities a where a.content_build=c.content_build and a.ability_id=c.ability_id),
 'moves', case when c.move_slots is not null then
   (select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(nullif(x.slot->>'name',''),initcap(replace(m.slug,'-',' ')))) order by x.position), '[]'::jsonb)
    from jsonb_array_elements(c.move_slots) with ordinality x(slot,position)
    left join private.ref_moves m on m.content_build=c.content_build and m.move_id::text=x.slot->>'moveId')
   else to_jsonb(c.moves) end
);
$function$;

commit;
