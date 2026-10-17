# DO NOT APPLY

`003_species_mastery_lifecycle.sql` is a branch draft. It runs only after the unapplied D64 and D65 files, and only on a disposable local database.

It does not change `private.persist_streamlink_catch`, `private.record_stream_catch`, or settlement. `catches.caught_at` is not rewritten.

Do not apply it to project `dtflmlbjhttoewqgkujf`.

`rollback-before-activation.sql` is only for an inactive empty draft. After activation, pause, drain, or close. Do not drop earned events.
