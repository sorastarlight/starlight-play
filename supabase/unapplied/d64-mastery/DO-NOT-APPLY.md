# DO NOT APPLY

`001_species_mastery_events.sql` is a branch draft for disposable local rehearsal.

Do not apply it to project `dtflmlbjhttoewqgkujf` or any hosted database.

Do not backfill historical catches. Do not call `private.record_species_mastery_event` from settlement. Do not alter `species_mastery.points`, `mastery_ledger`, Rankings, catch odds, or WIRE.

`rollback.sql` drops only the new view, functions, trigger, and event table. It is for the local rehearsal, not a hosted restore.
