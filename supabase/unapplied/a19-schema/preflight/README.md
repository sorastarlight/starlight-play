# A19-APPLY read-only preflight (issue #24)

`000_metadata_only.sql` is a **SELECT-only** catalog pack.

- Do not run it as a migration
- Do not add `COUNT(*)` on `public.catches`
- Do not invoke RPCs
- Hosted PostgREST schema lists are often **not** in `pg_settings`; treat NULL as UNKNOWN
