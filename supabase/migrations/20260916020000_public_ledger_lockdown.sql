-- Phase 0.5: lock public gameplay/economy tables against client mutation.
-- SECURITY DEFINER RPCs keep writing as the table owner. No row data is changed.

-- Classification
-- A SERVER-ONLY LEDGER: candy_ledger, evolution_log, mastery_ledger, loot_rolls, reward_events
-- D ADMIN-ONLY (via RPC): loot_tables, loot_table_entries
-- E PUBLIC REFERENCE: evolution_rules, evolution_families, evolution_config, lgpe_species

do $lock$
declare
  t text;
  ledgers text[] := array[
    'candy_ledger',
    'evolution_log',
    'mastery_ledger',
    'loot_rolls',
    'reward_events',
    'loot_tables',
    'loot_table_entries',
    'evolution_rules',
    'evolution_families',
    'evolution_config',
    'lgpe_species'
  ];
begin
  foreach t in array ledgers loop
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_anon_all', t);
    execute format('drop policy if exists %I on public.%I', t || '_auth_all', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
  end loop;
end;
$lock$;

-- Admin Hub lists enabled rules. Play clients get rules via SECURITY DEFINER RPCs.
-- SELECT-only for admins. No INSERT/UPDATE/DELETE policy.
grant select on public.evolution_rules to authenticated;
create policy evolution_rules_read
  on public.evolution_rules
  for select
  to authenticated
  using (public.is_play_admin());

-- Harden writer search_path. Bodies unchanged. These stay in private schema.
alter function private.grant_family_candy(uuid, int, int, text, text, jsonb)
  set search_path to public, pg_temp;
alter function private.grant_mastery(uuid, int, int, text, text)
  set search_path to public, pg_temp;

create or replace function private.public_ledger_lockdown_self_test()
returns table(name text, passed boolean, detail text)
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
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
$function$;

revoke all on function private.public_ledger_lockdown_self_test() from public, anon, authenticated;
