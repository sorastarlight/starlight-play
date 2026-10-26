do $guard$ begin
if md5(pg_get_functiondef('private.normal_spawn_max_dex()'::regprocedure)) is distinct from '9831c7d8d94900a6d6de6c6a6946c5ff' then raise exception 'Spawn report source drift';end if;
if md5(pg_get_functiondef('private.spawn_band(integer)'::regprocedure)) is distinct from 'a284bf7c1b35709676247a3f1304a00a' then raise exception 'Spawn report source drift';end if;
if md5(pg_get_functiondef('private.spawn_band_weight(text)'::regprocedure)) is distinct from 'f7f2c28af83cbd0c26372310bfd3a993' then raise exception 'Spawn report source drift';end if;
if md5(pg_get_functiondef('private.spawn_candidate_bands(boolean)'::regprocedure)) is distinct from '34bf69015a819d683da67341f15631a7' then raise exception 'Spawn report source drift';end if;
if md5(pg_get_functiondef('private.spawn_config()'::regprocedure)) is distinct from 'eb85b3036343b9b55f6bb0cc57e717a3' then raise exception 'Spawn report source drift';end if;
if md5(pg_get_functiondef('private.spawn_defaults()'::regprocedure)) is distinct from 'd58d1a66ac5cf6e0e2db7e3d249631bb' then raise exception 'Spawn report source drift';end if;
if md5(pg_get_functiondef('private.spawn_species_effective_weight(integer)'::regprocedure)) is distinct from '6bc416aba7fc4e11cf2515688e3f900f' then raise exception 'Spawn report source drift';end if;
if md5(pg_get_functiondef('private.spawn_species_eligible(integer,boolean)'::regprocedure)) is distinct from '14e275607202076e8eb0fcbfea50a419' then raise exception 'Spawn report source drift';end if;
if md5(pg_get_functiondef('private.is_play_admin()'::regprocedure)) is distinct from 'e1449c28be1cd6f6c5208638d5a1df6f' then raise exception 'Spawn report source drift';end if;
if md5(pg_get_functiondef('private.game_settings()'::regprocedure)) is distinct from '3963b75b9790583ba5aab40e2d120eae' then raise exception 'Spawn report source drift';end if;
if md5(pg_get_functiondef('private.spawn_recent_dex()'::regprocedure)) is distinct from '7c7275a4f07c2ee5da64e44460e87e5e' then raise exception 'Spawn report source drift';end if;
if md5(pg_get_functiondef('private.spawn_recent_families()'::regprocedure)) is distinct from '19d91ea7b518d5a39e386f26684c95ea' then raise exception 'Spawn report source drift';end if;
if to_regprocedure('public.admin_spawn_rules_read()') is not null then raise exception 'Spawn report already exists';end if;end $guard$;
create function public.admin_spawn_rules_read() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare cfg jsonb;bands jsonb;rows jsonb;allow_special boolean;max_dex int;begin
 if auth.uid() is null or private.is_play_admin() is not true then raise exception 'Staff access required.' using errcode='42501';end if;
 cfg:=private.spawn_config();max_dex:=private.normal_spawn_max_dex();
 if max_dex not between 1 and 1025 then raise exception 'Spawn boundary unavailable.';end if;
 allow_special:=coalesce((cfg->>'allowLegendaryAuto')::boolean,false) or coalesce((cfg->>'allowEventAuto')::boolean,false);
 bands:=private.spawn_candidate_bands(allow_special);
 select coalesce(jsonb_agg(jsonb_build_object('dex',s.dex,'name',s.name,'band',private.spawn_band(s.dex),'baseWeight',greatest(coalesce(s.spawn_weight,0),0),'currentWeight',private.spawn_species_effective_weight(s.dex),'available',private.spawn_species_eligible(s.dex,allow_special) and exists(select 1 from jsonb_array_elements(bands)b where b->>'key'=private.spawn_band(s.dex))) order by s.dex),'[]'::jsonb) into rows from public.species s where s.dex between 1 and max_dex;
 return jsonb_build_object('ok',true,'asOf',now(),'maxDex',max_dex,'bands',bands,'species',rows,'repeatRules',jsonb_build_object('recentWindow',coalesce((cfg->>'recentWindow')::int,8),'sameAsLastMultiplier',coalesce((cfg->>'sameAsLastMultiplier')::numeric,0),'recentSpeciesMultiplier',coalesce((cfg->>'recentSpeciesMultiplier')::numeric,0.25),'recentFamilyMultiplier',coalesce((cfg->>'recentFamilyMultiplier')::numeric,0.6)));
end $$;
revoke all on function public.admin_spawn_rules_read() from public,anon;
grant execute on function public.admin_spawn_rules_read() to authenticated;
