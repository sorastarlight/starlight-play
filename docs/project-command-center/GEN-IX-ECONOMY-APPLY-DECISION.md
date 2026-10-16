# D55-ECONOMY-APPLY decision (D56)

**Verdict: UNAPPROVED. This file is the owner GO request, not permission to install.**

Nothing was applied. Hosted Supabase was not written. No throw, catch-row read, or inventory change was made. WIRE stayed `false`. APP `20261008-rc133` is unchanged.

Sora mutated **NO** · Twinkle mutated **NO** · QA account **none**. PlayTester unused. `SL00025376` was not read or modified.

Disk SHA-256 re-checked this batch. It matches the reviewed candidate.

---

## Verification

| Check | Required | Observed | Result |
|---|---|---|---|
| Candidate file | `supabase/unapplied/d55-economy/001_spend_rules.sql` | same path | PASS |
| SHA-256 | `fdf5fffb50ed333d860711d127423364331de1dc0c0b7a1690b893908f36d1aa` | same hash | PASS |
| Project | `dtflmlbjhttoewqgkujf` (`starlight-play`, database `postgres`) | catalog session on that project | PASS |
| Role | `postgres` | `current_user = postgres` | PASS |
| `private.spend_bag_item` | `adb53e0a30a06224d85fa79a50d1f433` | same `src_md5`; owner `postgres`; security invoker | PASS |
| `private.announce_throws` | `6abe25af4ac01e2e9c97707c3d8e44cf` | same `src_md5`; owner `postgres`; security invoker | PASS |
| `item_ledger` shape | columns used by the insert | `user_id uuid`, `item_key text`, `amount int`, `reason text`, `source_id text` null, `idempotency text` null; `id` and `created_at` defaulted | PASS |
| `item_ledger` constraints | no rule that rejects amount −1 | primary key `id`; foreign key `user_id` → `profiles`; unique `(user_id, idempotency)` where idempotency is not null | PASS |
| `item_ledger` permissions | installer can insert | owner `postgres`, RLS on, force RLS off, only `SELECT` policy `item_ledger_own`; `postgres` has `INSERT` and bypasses RLS as owner | PASS |

`announce_throws` is called only from `private.settle_if_needed`. Player settlement reaches that function through security-definer `postgres` functions, including `private.play_snapshot`. The new ledger insert therefore runs as `postgres`.

Unchanged fingerprints recorded for the later catalog check:

| Function | `src_md5` |
|---|---|
| `public.play_throw(text, uuid)` | `c88c65372df551e1e06e7d819af2f167` |
| `private.capture_chance(...)` | `8fa515e574a89165c0adf11339ed73ba` |
| `private.grant_items` | `78553b9a85ebbda73c78f5d1c0da1156` |
| `private.settle_if_needed(encounter_rounds)` | `824058b4fbb4529163c589a41df63775` |

WIRE `enabled` is `false`.

The obsolete D54 file must not be installed. Its SHA-256 is `0a9ac044f687d359fbfd815c7e34527f49710ec59ac965df372e1929444d3c6b`.

---

## Exact owner decision required

A later message must say **D55-ECONOMY-APPLY GO** in the owner’s own words and name this one file:

| Artifact | SHA-256 |
|---|---|
| `supabase/unapplied/d55-economy/001_spend_rules.sql` | `fdf5fffb50ed333d860711d127423364331de1dc0c0b7a1690b893908f36d1aa` |

Required GO terms:

- Role `postgres` on project `dtflmlbjhttoewqgkujf`
- One transaction, this file only
- Immediately before install: recheck the SHA-256, project identity, `postgres` role, and the two live source MD5 values. **STOP on drift.**
- After install: catalog-only verification. Borrowed-ball skip, capture odds, attendance grants, and existing rows stay. WIRE stays `false`.
- Fail path: **STOP**. No automatic rollback script. No automatic restore.

This GO must **not** authorize: the D54 SQL, a production throw, a catch-row read, an inventory backfill, any other player mutation, WIRE on, RESET-GO, merge, deploy, or an APP stamp.

Copy-paste body:

```
D55-ECONOMY-APPLY GO

Install only this file as postgres on dtflmlbjhttoewqgkujf, in one transaction, after rechecking its SHA-256, project identity, the postgres role, and that live private.spend_bag_item is adb53e0a30a06224d85fa79a50d1f433 and live private.announce_throws is 6abe25af4ac01e2e9c97707c3d8e44cf. STOP on drift.

supabase/unapplied/d55-economy/001_spend_rules.sql
SHA-256: fdf5fffb50ed333d860711d127423364331de1dc0c0b7a1690b893908f36d1aa

After install: catalog-only verification. Do not apply the D54 SQL. Preserve borrowed-ball behavior, capture odds, attendance rewards, and existing account data. WIRE stays false.

This GO does not authorize the D54 file, production throws, catch-row reads, inventory backfills, other player mutations, WIRE activation, RESET-GO, automatic rollback or restore, merge, deploy, or an APP stamp.

If apply fails: STOP. Do not run rollback scripts or restore.
```

**STOP.** D55-ECONOMY-APPLY remains **UNAPPROVED** until that exact GO arrives.

**Later (D57 snapshot pointer):** The owner GO installed this hashed file as migration `20261016042345`. This file remains the D56 handoff snapshot. See [GEN-IX-ECONOMY-APPLY-REPORT.md](./GEN-IX-ECONOMY-APPLY-REPORT.md).
