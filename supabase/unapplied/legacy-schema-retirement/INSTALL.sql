begin;set local lock_timeout='5s';set local statement_timeout='30s';
lock table public.catches,private.legacy_retirement_runs,private.legacy_retirement_rows in access exclusive mode;
lock table public.lgpe_species in access exclusive mode;
do $guard$ begin
 if (select md5(coalesce(string_agg(s,E'\n' order by s),'')) from (
 select 'column:'||n.nspname||'.'||c.relname||':'||a.attnum||':'||a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||a.attidentity::text||':'||a.attgenerated::text||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),'') s from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attnum>0 and not a.attisdropped and (n.nspname||'.'||c.relname)=any(array['public.catches','public.profiles','public.oak_transfers','public.trade_listings','public.trade_offers','public.direct_trades'])
 union all select 'constraint:'||conrelid::regclass::text||':'||conname||':'||pg_get_constraintdef(oid) from pg_constraint where conrelid=any(array['public.catches'::regclass,'public.profiles'::regclass,'public.oak_transfers'::regclass,'public.trade_listings'::regclass,'public.trade_offers'::regclass,'public.direct_trades'::regclass]) or confrelid=any(array['public.catches'::regclass,'public.profiles'::regclass,'public.oak_transfers'::regclass,'public.trade_listings'::regclass,'public.trade_offers'::regclass,'public.direct_trades'::regclass])
 union all select 'trigger:'||pg_get_triggerdef(t.oid)||':'||t.tgenabled::text||':'||md5(p.prosrc) from pg_trigger t join pg_proc p on p.oid=t.tgfoid where not t.tgisinternal and tgrelid=any(array['public.catches'::regclass,'public.profiles'::regclass,'public.oak_transfers'::regclass,'public.trade_listings'::regclass,'public.trade_offers'::regclass,'public.direct_trades'::regclass])
 union all select 'runtime:'||p.proname||':'||md5(p.prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('stamp_catch_row','catch_json','admin_catch_battle_json','persist_streamlink_catch','persist_staff_gift')
) fingerprints) is distinct from '7d674f58ad70d64c4e66ac3a578c5c33' then raise exception 'Schema/source drift before AV retirement';end if;
 if (select md5(coalesce(string_agg((to_jsonb(c)-array['av_hp','av_atk','av_def','av_spa','av_spd','av_spe'])::text,E'\n' order by (to_jsonb(c)-array['av_hp','av_atk','av_def','av_spa','av_spd','av_spe'])::text),'')) from public.catches c) is distinct from '62a30076d38ae7c0cec63621ffe6a32e' or (select count(*) from public.catches)<>7 or exists(select 1 from public.catches where ruleset_id is distinct from 'streamlink-gen9-xgen' or coalesce(av_hp,0)<>0 or coalesce(av_atk,0)<>0 or coalesce(av_def,0)<>0 or coalesce(av_spa,0)<>0 or coalesce(av_spd,0)<>0 or coalesce(av_spe,0)<>0) then raise exception 'Modern specimen scope changed';end if;
 if exists(select 1 from private.legacy_retirement_runs where run_key='legacy-schema-v1') or to_regclass('private.retired_lgpe_species') is not null then raise exception 'Schema archive already exists';end if;
 if not exists(select 1 from private.legacy_retirement_runs where run_key='legacy110-v1' and status='archived') then raise exception 'Expected specimen recovery archive missing';end if;
 if (select md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' order by dex),'')) from public.lgpe_species t) is distinct from 'a97d2e471963ffb7128722fd3ca24ce7' then raise exception 'Legacy reference data drift';end if;
 if (select md5(prosrc) from pg_proc where oid='private.lgpe_pick_moves(integer,integer)'::regprocedure) is distinct from 'faa2757753e14d77b977086896cfbd9c' then raise exception 'Legacy helper source drift';end if;
if (select md5(prosrc) from pg_proc where oid='private.lgpe_stat(integer,integer,integer,integer,boolean)'::regprocedure) is distinct from 'e3ec3d20ee4b5b593789f3447f746bd8' then raise exception 'Legacy helper source drift';end if;
 if (select md5(prosrc) from pg_proc where oid='private.public_ledger_lockdown_self_test()'::regprocedure) is distinct from '5f306e56d4ba4fe46b59370c2977131a' then raise exception 'Lockdown selftest drift';end if;
end $guard$;
insert into private.legacy_retirement_runs(run_key,status,manifest) values('legacy-schema-v1','archived','{"trigger":"CREATE TRIGGER catches_before_write BEFORE INSERT OR UPDATE OF dex, level, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe, av_hp, av_atk, av_def, av_spa, av_spd, av_spe ON public.catches FOR EACH ROW EXECUTE FUNCTION private.catches_before_write()","reference":{"hash":"a97d2e471963ffb7128722fd3ca24ce7","count":151},"specimens":{"hash":"63b6a3794b396c66107e6ae7d35a2824","count":7,"legacy":0,"nonzero_av":0,"supported_hash":"62a30076d38ae7c0cec63621ffe6a32e"},"schema_hash":"7d674f58ad70d64c4e66ac3a578c5c33","max_attribute":62,"reference_rls":true,"restore_grants":"grant DELETE on public.lgpe_species to postgres;\ngrant INSERT on public.lgpe_species to postgres;\ngrant MAINTAIN on public.lgpe_species to postgres;\ngrant REFERENCES on public.lgpe_species to postgres;\ngrant SELECT on public.lgpe_species to postgres;\ngrant TRIGGER on public.lgpe_species to postgres;\ngrant TRUNCATE on public.lgpe_species to postgres;\ngrant UPDATE on public.lgpe_species to postgres;\ngrant DELETE on public.lgpe_species to service_role;\ngrant INSERT on public.lgpe_species to service_role;\ngrant MAINTAIN on public.lgpe_species to service_role;\ngrant REFERENCES on public.lgpe_species to service_role;\ngrant SELECT on public.lgpe_species to service_role;\ngrant TRIGGER on public.lgpe_species to service_role;\ngrant TRUNCATE on public.lgpe_species to service_role;\ngrant UPDATE on public.lgpe_species to service_role;","function_grants":{"lgpe_stat":"grant execute on function private.lgpe_stat(integer,integer,integer,integer,boolean) to PUBLIC;\ngrant execute on function private.lgpe_stat(integer,integer,integer,integer,boolean) to postgres;","lgpe_pick_moves":"grant execute on function private.lgpe_pick_moves(integer,integer) to PUBLIC;\ngrant execute on function private.lgpe_pick_moves(integer,integer) to postgres;"},"after_hash":"45e3e3649ea953a68e2a654deb7f1a94","rollback_hash":"c9bc5838a02c5d466c51824d9641e835","recovery_hash":"80391089fb1d57103864192afdc5a409"}'::jsonb);
insert into private.legacy_retirement_rows select 'legacy-schema-v1','catch_av',id::text,jsonb_build_object('id',id,'av_hp',av_hp,'av_atk',av_atk,'av_def',av_def,'av_spa',av_spa,'av_spd',av_spd,'av_spe',av_spe) from public.catches;
update private.legacy_retirement_runs set archive_hash=(select md5(coalesce(string_agg(relation||':'||row_key||':'||payload::text,E'\n' order by relation,row_key),'')) from private.legacy_retirement_rows where run_key='legacy-schema-v1') where run_key='legacy-schema-v1';
drop trigger catches_before_write on public.catches;
CREATE TRIGGER catches_before_write BEFORE INSERT OR UPDATE OF dex, level, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe ON public.catches FOR EACH ROW EXECUTE FUNCTION private.catches_before_write();
alter table public.catches drop column av_hp restrict;
alter table public.catches drop column av_atk restrict;
alter table public.catches drop column av_def restrict;
alter table public.catches drop column av_spa restrict;
alter table public.catches drop column av_spd restrict;
alter table public.catches drop column av_spe restrict;
CREATE OR REPLACE FUNCTION private.public_ledger_lockdown_self_test()
 RETURNS TABLE(name text, passed boolean, detail text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  t text;
  can_ins boolean;
  can_upd boolean;
  can_del boolean;
  can_sel_anon boolean;
begin
  foreach t in array array[
    'candy_ledger','evolution_log','mastery_ledger','loot_rolls','reward_events',
    'loot_tables','loot_table_entries','evolution_families','evolution_config'
  ] loop
    execute format('select has_table_privilege(''anon'', ''public.%I'', ''insert'')', t) into can_ins;
    execute format('select has_table_privilege(''anon'', ''public.%I'', ''update'')', t) into can_upd;
    execute format('select has_table_privilege(''anon'', ''public.%I'', ''delete'')', t) into can_del;
    name := t || ' anon cannot mutate';
    passed := (not can_ins) and (not can_upd) and (not can_del);
    detail := format('ins=%s upd=%s del=%s', can_ins, can_upd, can_del);
    return next;

    execute format('select has_table_privilege(''authenticated'', ''public.%I'', ''insert'')', t) into can_ins;
    execute format('select has_table_privilege(''authenticated'', ''public.%I'', ''update'')', t) into can_upd;
    execute format('select has_table_privilege(''authenticated'', ''public.%I'', ''delete'')', t) into can_del;
    name := t || ' authenticated cannot mutate';
    passed := (not can_ins) and (not can_upd) and (not can_del);
    detail := format('ins=%s upd=%s del=%s', can_ins, can_upd, can_del);
    return next;
  end loop;

  select has_table_privilege('anon', 'public.evolution_rules', 'insert') into can_ins;
  select has_table_privilege('anon', 'public.evolution_rules', 'update') into can_upd;
  select has_table_privilege('anon', 'public.evolution_rules', 'delete') into can_del;
  select has_table_privilege('anon', 'public.evolution_rules', 'select') into can_sel_anon;
  name := 'evolution_rules anon cannot mutate or select';
  passed := (not can_ins) and (not can_upd) and (not can_del) and (not can_sel_anon);
  detail := format('sel=%s ins=%s upd=%s del=%s', can_sel_anon, can_ins, can_upd, can_del);
  return next;

  select has_table_privilege('authenticated', 'public.evolution_rules', 'select') into can_sel_anon;
  select has_table_privilege('authenticated', 'public.evolution_rules', 'insert') into can_ins;
  name := 'evolution_rules authenticated can select only';
  passed := can_sel_anon and (not can_ins);
  detail := format('sel=%s ins=%s', can_sel_anon, can_ins);
  return next;
end;
$function$
;
drop function private.lgpe_pick_moves(integer,integer) restrict;
drop function private.lgpe_stat(integer,integer,integer,integer,boolean) restrict;
alter table public.lgpe_species set schema private;
alter table private.lgpe_species rename to retired_lgpe_species;
alter table private.retired_lgpe_species enable row level security;
revoke all on private.retired_lgpe_species from public,anon,authenticated;
do $verify$ begin
 if (select md5(coalesce(string_agg(s,E'\n' order by s),'')) from (
 select 'column:'||n.nspname||'.'||c.relname||':'||a.attnum||':'||a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||a.attidentity::text||':'||a.attgenerated::text||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),'') s from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attnum>0 and not a.attisdropped and (n.nspname||'.'||c.relname)=any(array['public.catches','public.profiles','public.oak_transfers','public.trade_listings','public.trade_offers','public.direct_trades'])
 union all select 'constraint:'||conrelid::regclass::text||':'||conname||':'||pg_get_constraintdef(oid) from pg_constraint where conrelid=any(array['public.catches'::regclass,'public.profiles'::regclass,'public.oak_transfers'::regclass,'public.trade_listings'::regclass,'public.trade_offers'::regclass,'public.direct_trades'::regclass]) or confrelid=any(array['public.catches'::regclass,'public.profiles'::regclass,'public.oak_transfers'::regclass,'public.trade_listings'::regclass,'public.trade_offers'::regclass,'public.direct_trades'::regclass])
 union all select 'trigger:'||pg_get_triggerdef(t.oid)||':'||t.tgenabled::text||':'||md5(p.prosrc) from pg_trigger t join pg_proc p on p.oid=t.tgfoid where not t.tgisinternal and tgrelid=any(array['public.catches'::regclass,'public.profiles'::regclass,'public.oak_transfers'::regclass,'public.trade_listings'::regclass,'public.trade_offers'::regclass,'public.direct_trades'::regclass])
 union all select 'runtime:'||p.proname||':'||md5(p.prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('stamp_catch_row','catch_json','admin_catch_battle_json','persist_streamlink_catch','persist_staff_gift')
) fingerprints) is distinct from '45e3e3649ea953a68e2a654deb7f1a94' or (select md5(coalesce(string_agg((to_jsonb(c)-array['av_hp','av_atk','av_def','av_spa','av_spd','av_spe'])::text,E'\n' order by (to_jsonb(c)-array['av_hp','av_atk','av_def','av_spa','av_spd','av_spe'])::text),'')) from public.catches c) is distinct from '62a30076d38ae7c0cec63621ffe6a32e' then raise exception 'Supported schema/data verification failed';end if;
 if has_table_privilege('anon','private.retired_lgpe_species','SELECT') or has_table_privilege('authenticated','private.retired_lgpe_species','SELECT') then raise exception 'Retired reference access';end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prokind='f' and p.prosrc ~* '(public[.]lgpe_species|private[.]lgpe_stat[(]|private[.]lgpe_pick_moves[(]|(^|[^a-z0-9_])av_(hp|atk|def|spa|spd|spe)([^a-z0-9_]|$))') then raise exception 'Live legacy source reference remains';end if;
end $verify$;commit;
