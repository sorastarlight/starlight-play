# Do not apply

`001_spend_ledger.sql` is superseded by `supabase/unapplied/d55-economy/001_spend_rules.sql`.

D54 removed the safety-net skip for `standard_throw`. D55 restores that borrowed Poké Ball and keeps the `BAG_SPEND` ledger row for owned throws. Do not apply either file to `dtflmlbjhttoewqgkujf`.

Do not backfill PlayTester inventory. Do not modify catch `SL00025376`. Leave WIRE off.
