-- Candy balances are written only by SECURITY DEFINER RPCs (grant_family_candy).
-- Clients already receive candy through play_collection / play_sync. No direct writes.
revoke all on table public.family_candy from public, anon, authenticated;
grant select on table public.family_candy to authenticated;
-- Existing policy family_candy_own (SELECT, auth.uid() = user_id) remains the only client policy.
