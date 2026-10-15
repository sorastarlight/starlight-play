# A19-WIRE-APPLY decision (D48)

**Verdict: UNAPPROVED. This file is the owner GO request, not permission to install.**

Nothing was applied. Hosted Supabase was not written. The switch was not flipped. APP `20261008-rc133` is unchanged.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused.

Disk SHA-256 re-checked this batch on `admin-hub-overhaul` `f46be2cc`. All three match.

---

## Exact owner decision required

A later message must say **A19-WIRE-APPLY GO** in the owner’s own words and name these artifacts only:

| # | Artifact | SHA-256 |
|---|---|---|
| 1 | `supabase/unapplied/a19-wire/001_wire_switch_and_persist.sql` | `efca33ea6757e308262d0f3aec781fa0cb71e1ac907bb90fa2d142beb32d8d4e` |
| 2 | `supabase/unapplied/a19-wire/002_materialize_hook.sql` | `1e21ba666bce44c24567d9e9b8404d8e39a683005432b419a3b1bcfe9afd8ce4` |
| 3 | `supabase/unapplied/a19-wire/003_settle_integration.sql` | `1bc62eb24f27204e52f01fe66a871c320da459df7d933c9054f7d67e57edfe68` |

Required GO terms:

- Role `postgres` on project `dtflmlbjhttoewqgkujf`
- Order `001` → `002` → `003`
- Immediately before install: recheck the three hashes, project identity, and that live `private.settle_if_needed` is unchanged. **STOP on drift.**
- After install: catalog-only verification. Switch stays `false`. Client EXECUTE stays revoked. `stamp_catch_row` unchanged.
- Fail path: **STOP**. No automatic rollback script. No automatic restore.

This GO must **not** authorize: `local/*` fixtures, hosted generate/assert, catch-row SELECT or writes, A19-WIRE-GO (switch on), A19-RESET-GO, merge, deploy, or APP stamp.

Copy-paste body:

```
A19-WIRE-APPLY GO

Install only these three files as postgres on dtflmlbjhttoewqgkujf, in order 001 → 002 → 003, after rechecking the three SHA-256 hashes, project identity, and that live private.settle_if_needed is unchanged. STOP on drift.

1. supabase/unapplied/a19-wire/001_wire_switch_and_persist.sql
   SHA-256: efca33ea6757e308262d0f3aec781fa0cb71e1ac907bb90fa2d142beb32d8d4e
2. supabase/unapplied/a19-wire/002_materialize_hook.sql
   SHA-256: 1e21ba666bce44c24567d9e9b8404d8e39a683005432b419a3b1bcfe9afd8ce4
3. supabase/unapplied/a19-wire/003_settle_integration.sql
   SHA-256: 1bc62eb24f27204e52f01fe66a871c320da459df7d933c9054f7d67e57edfe68

After install: catalog-only verification. Switch stays false. EXECUTE stays revoked. stamp_catch_row unchanged.

This GO does not authorize local fixtures, hosted generate, catch-row access, switch-on, RESET-GO, automatic rollback or restore, merge, deploy, or APP stamp.

If apply fails: STOP. Do not run rollback scripts or restore.
```

**STOP.** A19-WIRE-APPLY remains **UNAPPROVED** until that exact GO arrives.
