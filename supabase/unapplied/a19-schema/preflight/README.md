# A19-APPLY read-only preflight (issue #24)

`000_metadata_only.sql` is a **SELECT-only** catalog pack.

- Do not run it as a migration
- Do not add `COUNT(*)` on `public.catches`
- Do not invoke RPCs
- Hosted `pgrst.db_schemas` on role `postgres` is often NULL. Exposure is proven by LIVE API `Accept-Profile: private` (`PGRST106` = not exposed).
- Backup timestamps are **not** in catalog metadata. Do not POST restore.
