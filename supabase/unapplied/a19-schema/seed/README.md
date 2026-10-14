# Unapplied pin seed

DO NOT RUN against live Supabase.

content_build: `sl-ref-20261013-227b573`
Regenerate: `node tools/emit-a19-schema-seed.js`

Load order after `001_private_ref_tables.sql`: `00` through `10`.
G1/C1 overrides live only in these SQL files. `data/gen9-ref/obtain.json` is unchanged.
F1 `streamlink_base_friendship` is derived at emit time. `data/gen9-ref/species.json` is unchanged.
