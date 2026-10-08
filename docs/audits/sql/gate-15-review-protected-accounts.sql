-- REVIEW ARTIFACT ONLY. DO NOT APPLY.
-- Gate 1.5 / R4: server deny for QA/support mutations against protected real accounts.
-- Does not rely on frontend checkboxes.
--
-- Proposed identities (REPO / live oak_qa hardcoded Sora; Twinkle from recon migration only):
--   Sora    60ff5211-6ef8-40e6-8daa-095b5600bf4c
--   Twinkle da777b13-6879-44a8-99f4-a154e54d3d75
-- Owner must confirm both UUIDs before any apply.
--
-- Prefer a table over more hardcoded literals so the list can grow without rewriting every RPC.

create table if not exists private.protected_accounts (
  user_id uuid primary key,
  label text not null,
  created_at timestamptz not null default now()
);

-- insert into private.protected_accounts(user_id, label) values
--   ('60ff5211-6ef8-40e6-8daa-095b5600bf4c', 'Sora'),
--   ('da777b13-6879-44a8-99f4-a154e54d3d75', 'Twinkle');

create or replace function private.deny_protected_account(p_user uuid)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if p_user is not null and exists (
    select 1 from private.protected_accounts a where a.user_id = p_user
  ) then
    raise exception 'This account is protected from administrative mutation.'
      using errcode = '42501';
  end if;
end;
$$;

-- Call perform private.deny_protected_account(p_user);
-- at the top of (after staff guards):
--   admin_oak_qa, admin_oak_research_reset,
--   admin_grant_pokemon, admin_grant_bag, admin_grant_candy, admin_grant_valuable,
--   admin_grant_cosmetic, admin_revoke_cosmetic, admin_grant_title, admin_grant_badge,
--   admin_grant_achievement, admin_set_coins, admin_set_xp, admin_remove_pokemon,
--   admin_qa_grant_pass_reward (if it gains p_user),
--   admin_refill_test — or DROP this function instead of scoping it.
--
-- admin_refill_test currently updates ALL inventories. deny_protected_account(p_user)
-- cannot save Sora/Twinkle unless the UPDATE is rewritten with a WHERE user_id filter
-- or the function is dropped (recommended).
--
-- Error: 42501, message stable for UI.
-- Tests: PlayTester UUID succeeds; protected UUID fails; do not run success tests on Sora/Twinkle.
-- Rollback: drop helper; restore previous function bodies; drop table.
