begin;set local lock_timeout='5s';set local statement_timeout='30s';
lock table public.catches,private.legacy_retirement_runs,private.legacy_retirement_rows in access exclusive mode;
lock table private.retired_lgpe_species in access exclusive mode;
do $guard$ begin
 if (select md5(coalesce(string_agg(s,E'\n' order by s),'')) from (
 select 'column:'||n.nspname||'.'||c.relname||':'||a.attnum||':'||a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||a.attidentity::text||':'||a.attgenerated::text||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),'') s from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attnum>0 and not a.attisdropped and (n.nspname||'.'||c.relname)=any(array['public.catches','public.profiles','public.oak_transfers','public.trade_listings','public.trade_offers','public.direct_trades'])
 union all select 'constraint:'||conrelid::regclass::text||':'||conname||':'||pg_get_constraintdef(oid) from pg_constraint where conrelid=any(array['public.catches'::regclass,'public.profiles'::regclass,'public.oak_transfers'::regclass,'public.trade_listings'::regclass,'public.trade_offers'::regclass,'public.direct_trades'::regclass]) or confrelid=any(array['public.catches'::regclass,'public.profiles'::regclass,'public.oak_transfers'::regclass,'public.trade_listings'::regclass,'public.trade_offers'::regclass,'public.direct_trades'::regclass])
 union all select 'trigger:'||pg_get_triggerdef(t.oid)||':'||t.tgenabled::text||':'||md5(p.prosrc) from pg_trigger t join pg_proc p on p.oid=t.tgfoid where not t.tgisinternal and tgrelid=any(array['public.catches'::regclass,'public.profiles'::regclass,'public.oak_transfers'::regclass,'public.trade_listings'::regclass,'public.trade_offers'::regclass,'public.direct_trades'::regclass])
 union all select 'runtime:'||p.proname||':'||md5(p.prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('stamp_catch_row','catch_json','admin_catch_battle_json','persist_streamlink_catch','persist_staff_gift')
) fingerprints) is distinct from '45e3e3649ea953a68e2a654deb7f1a94' or (select md5(coalesce(string_agg((to_jsonb(c)-array['av_hp','av_atk','av_def','av_spa','av_spd','av_spe'])::text,E'\n' order by (to_jsonb(c)-array['av_hp','av_atk','av_def','av_spa','av_spd','av_spe'])::text),'')) from public.catches c) is distinct from '62a30076d38ae7c0cec63621ffe6a32e' then raise exception 'Schema rollback drift';end if;
 if not exists(select 1 from private.legacy_retirement_runs where run_key='legacy-schema-v1' and status='archived' and archive_hash=(select md5(coalesce(string_agg(relation||':'||row_key||':'||payload::text,E'\n' order by relation,row_key),'')) from private.legacy_retirement_rows where run_key='legacy-schema-v1')) then raise exception 'Schema archive integrity/state';end if;
end $guard$;
alter table public.catches add column av_hp integer;
alter table public.catches add column av_atk integer;
alter table public.catches add column av_def integer;
alter table public.catches add column av_spa integer;
alter table public.catches add column av_spd integer;
alter table public.catches add column av_spe integer;
update public.catches c set av_hp=(a.payload->>'av_hp')::int,av_atk=(a.payload->>'av_atk')::int,av_def=(a.payload->>'av_def')::int,av_spa=(a.payload->>'av_spa')::int,av_spd=(a.payload->>'av_spd')::int,av_spe=(a.payload->>'av_spe')::int from private.legacy_retirement_rows a where a.run_key='legacy-schema-v1' and a.relation='catch_av' and a.row_key=c.id::text;
drop trigger catches_before_write on public.catches;
CREATE TRIGGER catches_before_write BEFORE INSERT OR UPDATE OF dex, level, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe, av_hp, av_atk, av_def, av_spa, av_spd, av_spe ON public.catches FOR EACH ROW EXECUTE FUNCTION private.catches_before_write();
alter table private.retired_lgpe_species rename to lgpe_species;
alter table private.lgpe_species set schema public;
alter table public.lgpe_species enable row level security;
grant DELETE on public.lgpe_species to postgres;
grant INSERT on public.lgpe_species to postgres;
grant MAINTAIN on public.lgpe_species to postgres;
grant REFERENCES on public.lgpe_species to postgres;
grant SELECT on public.lgpe_species to postgres;
grant TRIGGER on public.lgpe_species to postgres;
grant TRUNCATE on public.lgpe_species to postgres;
grant UPDATE on public.lgpe_species to postgres;
grant DELETE on public.lgpe_species to service_role;
grant INSERT on public.lgpe_species to service_role;
grant MAINTAIN on public.lgpe_species to service_role;
grant REFERENCES on public.lgpe_species to service_role;
grant SELECT on public.lgpe_species to service_role;
grant TRIGGER on public.lgpe_species to service_role;
grant TRUNCATE on public.lgpe_species to service_role;
grant UPDATE on public.lgpe_species to service_role;
CREATE OR REPLACE FUNCTION private.lgpe_pick_moves(p_dex integer, p_level integer)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  picked text[];
begin
  select coalesce(array_agg(x.n order by x.ord), '{}'::text[])
    into picked
    from (
      select m->>'n' as n, row_number() over (order by coalesce((m->>'l')::int, 0) desc, m->>'n') as ord
      from public.lgpe_species s
      cross join lateral jsonb_array_elements(s.moves) m
      where s.dex = p_dex
        and coalesce(m->>'m', 'level-up') = 'level-up'
        and coalesce((m->>'l')::int, 0) <= greatest(coalesce(p_level, 1), 1)
      limit 4
    ) x;
  if coalesce(cardinality(picked), 0) = 0 then
    select coalesce(array_agg(x.n order by x.ord), '{}'::text[])
      into picked
      from (
        select m->>'n' as n, row_number() over (order by coalesce((m->>'l')::int, 0), m->>'n') as ord
        from public.lgpe_species s
        cross join lateral jsonb_array_elements(s.moves) m
        where s.dex = p_dex
        limit 4
      ) x;
  end if;
  if coalesce(cardinality(picked), 0) = 0 then
    picked := array['Tackle'];
  end if;
  return picked;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.lgpe_stat(p_base integer, p_iv integer, p_av integer, p_level integer, p_hp boolean)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case when p_hp
    then floor(((2 * coalesce(p_base, 50) + coalesce(p_iv, 0) + coalesce(p_av, 0)) * coalesce(p_level, 1)) / 100.0)::int + coalesce(p_level, 1) + 10
    else floor(((2 * coalesce(p_base, 50) + coalesce(p_iv, 0) + coalesce(p_av, 0)) * coalesce(p_level, 1)) / 100.0)::int + 5
  end;
$function$
;
do $acl$ declare f record;g record;begin
 for f in select p.oid,p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in('lgpe_stat','lgpe_pick_moves') loop
  for g in select grantee from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where p.oid=f.oid loop
   execute format('revoke all on function %s from %s',f.signature,case when g.grantee=0 then 'PUBLIC' else quote_ident(pg_get_userbyid(g.grantee)) end);
  end loop;
 end loop;
end $acl$;
grant execute on function private.lgpe_stat(integer,integer,integer,integer,boolean) to PUBLIC;
grant execute on function private.lgpe_stat(integer,integer,integer,integer,boolean) to postgres;
grant execute on function private.lgpe_pick_moves(integer,integer) to PUBLIC;
grant execute on function private.lgpe_pick_moves(integer,integer) to postgres;
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
    'loot_tables','loot_table_entries','evolution_families','evolution_config','lgpe_species'
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
do $verify$ begin if (select md5(coalesce(string_agg(s,E'\n' order by s),'')) from (
 select 'column:'||n.nspname||'.'||c.relname||':'||a.attnum||':'||a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||a.attidentity::text||':'||a.attgenerated::text||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),'') s from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attnum>0 and not a.attisdropped and (n.nspname||'.'||c.relname)=any(array['public.catches','public.profiles','public.oak_transfers','public.trade_listings','public.trade_offers','public.direct_trades'])
 union all select 'constraint:'||conrelid::regclass::text||':'||conname||':'||pg_get_constraintdef(oid) from pg_constraint where conrelid=any(array['public.catches'::regclass,'public.profiles'::regclass,'public.oak_transfers'::regclass,'public.trade_listings'::regclass,'public.trade_offers'::regclass,'public.direct_trades'::regclass]) or confrelid=any(array['public.catches'::regclass,'public.profiles'::regclass,'public.oak_transfers'::regclass,'public.trade_listings'::regclass,'public.trade_offers'::regclass,'public.direct_trades'::regclass])
 union all select 'trigger:'||pg_get_triggerdef(t.oid)||':'||t.tgenabled::text||':'||md5(p.prosrc) from pg_trigger t join pg_proc p on p.oid=t.tgfoid where not t.tgisinternal and tgrelid=any(array['public.catches'::regclass,'public.profiles'::regclass,'public.oak_transfers'::regclass,'public.trade_listings'::regclass,'public.trade_offers'::regclass,'public.direct_trades'::regclass])
 union all select 'runtime:'||p.proname||':'||md5(p.prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('stamp_catch_row','catch_json','admin_catch_battle_json','persist_streamlink_catch','persist_staff_gift')
) fingerprints) is distinct from 'c9bc5838a02c5d466c51824d9641e835' then raise exception 'Restored schema shape mismatch';end if;
if (select md5(coalesce(string_agg(to_jsonb(c)::text,E'\n' order by to_jsonb(c)::text),'')) from public.catches c) is distinct from '63b6a3794b396c66107e6ae7d35a2824' then raise exception 'AV restoration mismatch';end if;
end $verify$;
update private.legacy_retirement_runs set status='schema-restored',restored_at=clock_timestamp() where run_key='legacy-schema-v1';commit;
