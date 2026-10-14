# A19-SCHEMA local rehearsal (issue #23)

Disposable **synthetic** PostgreSQL only. Not a live apply.

```
node tools/a19-schema-rehearsal.js
```

- Host `127.0.0.1:55432`, database `a19_rehearsal`
- Embedded Postgres binaries live in gitignored `tools/.cache/a23-pg-harness/`
- Baseline trainers are fictional Oak/Leaf/Blue ids — not Sora or Twinkle
- Refuses `SUPABASE_URL` / `DATABASE_URL` that look hosted
- Does **not** start GENVAL, WIRE, or any reset

`003_rollback.sql` is exercised on a `TEMPLATE` clone (`a19_rollback_clone`), not against production.
