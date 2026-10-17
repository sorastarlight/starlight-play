# DO NOT APPLY

`004_species_mastery_catch_safety.sql` is a branch draft. It runs only after the unapplied D64, D65, and D66 files, and only on a disposable local database.

It drops the catch trigger that inserts into `private.catch_insert_authority`. It does not change settlement, `record_stream_catch`, or `caught_at`.

Do not apply it to project `dtflmlbjhttoewqgkujf`.

`rollback-before-activation.sql` is only for an inactive empty draft. It drops the new clock column and does not delete catch rows.
