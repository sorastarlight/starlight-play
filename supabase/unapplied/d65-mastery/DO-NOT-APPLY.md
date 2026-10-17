# DO NOT APPLY

`002_species_mastery_hardening.sql` is a branch draft. Apply it only after `supabase/unapplied/d64-mastery/001_species_mastery_events.sql`, and only on a disposable local database.

Installing it does not activate cosmetic mastery. `private.activate_species_mastery_events()` is a separate server call and takes no client timestamp.

Do not apply either file to project `dtflmlbjhttoewqgkujf`.

`rollback-before-activation.sql` is only for an inactive empty draft. After activation, disable recording with `private.disable_species_mastery_recording()`. That keeps the events.

`rollback-destructive.sql` deletes the ledger. It refuses to run until the session sets `starlight.confirm_mastery_destructive_rollback` to `BACKUP_VERIFIED`. It is not the routine recovery path.
