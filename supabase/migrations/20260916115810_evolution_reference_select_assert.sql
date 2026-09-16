-- Phase 0.5 assert (no row data).
-- Remote history applied public_ledger_lockdown AFTER evolution_reference_select
-- (versions 20260916050510 vs 20260916021000). Re-assert the intended model so
-- a replay cannot make evolution_rules admin-only SELECT again.
--
-- Pre-migration row counts (2026-09-16 07:51 EDT, live dtflmlbjhttoewqgkujf):
--   evolution_rules 107
--   evolution_families 151
--   evolution_config 1
--   loot_tables 8
--   loot_table_entries 66
--   lgpe_species 151
--   candy_ledger 82
--   evolution_log 10
--   mastery_ledger 20
--   loot_rolls 2
--   reward_events 10
--   canary evolution_rules id=1-2 candy_cost=40
--   canary evolution_config id=1 balance_version=1 enabled_generations={1}
--
-- Classification of the 11 audited public tables:
--   REFERENCE DATA (authenticated SELECT, no client mutation):
--     evolution_rules, evolution_families
--   ADMIN CONFIG (no Data API access; SECURITY DEFINER RPCs read/write):
--     evolution_config, loot_tables, loot_table_entries
--   SERVER INTERNAL (no Data API access):
--     lgpe_species
--   LEDGER (no Data API access; DEFINER / nested INVOKER writers):
--     candy_ledger, evolution_log, mastery_ledger, loot_rolls, reward_events
--
-- Do NOT restrict evolution_rules SELECT to is_play_admin().
-- That table is ordinary gameplay reference data (from/to, candy, items, trade).

drop policy if exists evolution_rules_read on public.evolution_rules;
grant select on table public.evolution_rules to authenticated;
create policy evolution_rules_read
  on public.evolution_rules
  for select
  to authenticated
  using (true);

drop policy if exists evolution_families_read on public.evolution_families;
grant select on table public.evolution_families to authenticated;
create policy evolution_families_read
  on public.evolution_families
  for select
  to authenticated
  using (true);

revoke insert, update, delete on table public.evolution_rules from public, anon, authenticated;
revoke insert, update, delete on table public.evolution_families from public, anon, authenticated;
revoke all on table public.evolution_rules from anon;
revoke all on table public.evolution_families from anon;
