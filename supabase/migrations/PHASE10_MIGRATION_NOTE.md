# Phase 10 migration history

Operational note. Phase 10 gameplay is closed. Do not begin Phase 11 from this file.

## What production history is missing

`20260917070000_phase10_special_events.sql` and `20260917071000_phase10_special_rpcs.sql` were originally executed against live with:

```
supabase db query --file
```

That runs SQL. It does **not** insert `schema_migrations` rows.

Those two files remain in the repository as the historical Phase 10 prerequisite migrations. Their effects (tables, helper functions, public/admin RPCs, `kanto-legend-set`) are already on production. Their version numbers are **not** required to appear in old production history.

## What production history does contain

Recorded apply-time versions include:

- `20260917070118` `phase10_closure_integrity`
- `20260917070206` `phase10_closure_selftest`
- `20260917070437` `phase10_closure_selftest_fix`
- `20260917072000` `phase10_admin_grants`

Repository filename `20260917073000_phase10_closure_integrity.sql` is the closure function bodies that were applied as the three `20260917070*` fragments above. Do not rename those recorded rows.

## Authoritative final state

`20260917074000_phase10_reconcile_final_state.sql` is the forward-only reconciliation.

- Clean database: apply repository files in filename order. `70000` → `71000` → `72000` → `73000` → `74000` reaches the live Phase 10 schema/function/security state.
- Current production: apply **only** `74000`. It is idempotent `CREATE TABLE IF NOT EXISTS` / `CREATE OR REPLACE` / `GRANT`/`REVOKE`. It must not rewrite history.

After `74000` is recorded, it is acceptable that `70000` / `71000` remain absent from production `schema_migrations`.

Production records `74000` through the hosted `apply_migration` mechanism. That assigns apply-time version numbers (not the filename). This apply was stored as:

- `20260917114929` `phase10_reconcile_final_state`
- `20260917114948` `phase10_reconcile_final_launch_grants`
- `20260917115007` `phase10_reconcile_final_selftest`

Those recorded rows together are the `74000` final state. They are not a reason to re-run `70000` or `71000`.

## Do not

- Re-run `70000` or `71000` against production. `70000` would replace the guarded `launch_community_round` with the original body (no species spawn guard).
- Insert fake empty `schema_migrations` rows for `70000` / `71000`.
- Delete or rename recorded `20260917070*` / `72000` rows.
- Mutate trainer, economy, or Special Event data to make history look pretty.
