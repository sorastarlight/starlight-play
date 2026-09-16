-- Phase 0.5 correction: evolution_rules / evolution_families are ordinary
-- gameplay reference data. Signed-in Trainers may READ them. Nobody may
-- INSERT/UPDATE/DELETE from the client. SECURITY DEFINER RPCs still write
-- as the table owner. No row data is changed.

drop policy if exists evolution_rules_read on public.evolution_rules;

grant select on table public.evolution_rules to authenticated;
create policy evolution_rules_read
  on public.evolution_rules
  for select
  to authenticated
  using (true);

grant select on table public.evolution_families to authenticated;
drop policy if exists evolution_families_read on public.evolution_families;
create policy evolution_families_read
  on public.evolution_families
  for select
  to authenticated
  using (true);

-- Mutation stays revoked. No INSERT/UPDATE/DELETE policies.
revoke insert, update, delete on table public.evolution_rules from public, anon, authenticated;
revoke insert, update, delete on table public.evolution_families from public, anon, authenticated;
revoke all on table public.evolution_rules from anon;
revoke all on table public.evolution_families from anon;
