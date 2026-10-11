# Admin Hub Gate 2A-R — identity inspect true-read remediation (review only)

**Date:** 2026-10-10  
**Production APP:** `20261008-rc133` · feature `bbf5405` · stamp `6d2517f`  
**Database:** starlight-play `dtflmlbjhttoewqgkujf`  
**SQL applied:** **NO**  
**Frontend / APP stamp:** unchanged  
**Sora mutated:** NO · **Twinkle mutated:** NO · **PlayTester role:** `null`  
**Unsafe inspect invoked:** NO

Final release smoke remains paused. **Wait for explicit owner approval before applying SQL.**

---

## 1. Root cause

`public.admin_identity_inspect(p_user uuid)` is staff-gated, then:

```
perform private.evaluate_cosmetics(p_user);
```

That helper is not a read. It loops enabled cosmetics and calls `private.unlock_cosmetic`, which **INSERT**s `public.trainer_cosmetics` and may `private.push_notice` → **INSERT** `public.trainer_notices`.

Gate 1.5 called the public body TRUE_READ because it has no local DML. The write is in the DEFINER-reachable helper chain.

---

## 2. Corrected SQL (not applied)

| File | Role |
|---|---|
| `docs/audits/sql/gate-2a-r-identity-inspect-up.sql` | One-transaction UP. Advisory xact lock. Catalog + md5 preflight. Replace inspect without `evaluate_cosmetics`. Mark **STABLE**. Postcondition fingerprint. |
| `docs/audits/sql/gate-2a-r-identity-inspect-down.sql` | Emergency rollback only. Requires exact post-UP fingerprint. Restores write-read baseline and **reopens R21**. |
| `docs/audits/sql/gate-2a-r-catalog-contract.sql` | Production-safe catalog SELECTs. Does not call inspect. |
| `docs/audits/sql/gate-2a-r-authorization-tests.sql` | Clone-only role / missing-trainer / rollback notes. |

Not copied into `supabase/migrations/`.

**Not changed:** `evaluate_cosmetics`, `unlock_cosmetic`, player progression, R1/R2/R18, grants/ACLs, staff_roles.

---

## 3. Fingerprints

| State | `md5(pg_proc.prosrc)` | length | volatility |
|---|---|---|---|
| Live / pre-UP / post-DOWN | `50058f99f73591a9bd77d4342653cd8c` | 1542 | VOLATILE |
| Approved post-UP | `e9091c0de1b91e67a62bade78cf8edde` | 1496 | STABLE |

Bodies are LF-only (`prosrc` starts and ends with ASCII 10). Windows CRLF hashes are invalid.

---

## 4. Catalog property checks

UP preflight aborts unless all of these match the live reviewed baseline:

| Property | Expected |
|---|---|
| Signature | `p_user uuid` |
| Result | `jsonb` |
| Language | `plpgsql` |
| Security | `SECURITY DEFINER` |
| Owner | `postgres` |
| Volatility | `VOLATILE` (`v`) |
| `search_path` | `{search_path=public}` |
| `md5(prosrc)` | `50058f99f73591a9bd77d4342653cd8c` |
| Call site | `perform private.evaluate_cosmetics(p_user);` |
| Staff guard | `if not private.is_play_admin()` |
| EXECUTE | anon, authenticated, service_role, postgres |

UP postcondition requires the same signature / jsonb / plpgsql / DEFINER / owner / `search_path` / EXECUTE, plus STABLE and `e9091c0de1b91e67a62bade78cf8edde`.

DOWN preflight requires the approved post-UP fingerprint and STABLE. DOWN postcondition requires the live baseline fingerprint and VOLATILE.

---

## 5. Transaction strategy

Both scripts:

1. `BEGIN`
2. `pg_advisory_xact_lock(21021021, 2)` — serializes concurrent runs of this package
3. `$preflight$` — `RAISE EXCEPTION` aborts the transaction
4. `CREATE OR REPLACE` + `ALTER OWNER`
5. `$post$` — `RAISE EXCEPTION` rolls back the replace
6. `COMMIT`

No statement between `BEGIN` and `COMMIT` commits. Run as one script. A failed preflight or postcondition leaves production unchanged. `CREATE OR REPLACE FUNCTION` takes an AccessExclusiveLock on the function; the advisory lock is extra protection against two apply sessions.

---

## 6. Function body and STABLE

Removed only:

```
perform private.evaluate_cosmetics(p_user);
```

Preserved: staff guard first, response keys, owner `postgres`, DEFINER, `search_path=public`, EXECUTE grants.

**STABLE only after helper reconfirm.** Live catalog 2026-10-10: every remaining reachable helper is STABLE or IMMUTABLE, SELECT-only, and does not call `evaluate_cosmetics` / `unlock_cosmetic` / `push_notice` / `ensure_trainer_stats`.

`private.trainer_card` (`3b7e21d51467aee55a4ff3ce8a03bc5e`) SELECTs `trainer_stats` and does **not** call VOLATILE `ensure_trainer_stats`.

`now()` in `trainer_card` is Postgres STABLE (transaction timestamp).

Write helpers left in place for player paths:

| Helper | vol | md5 |
|---|---|---|
| `evaluate_cosmetics` | v | `024bb6f7d95682dc5dbd50c676afd2af` |
| `unlock_cosmetic` | v | `90afc724cfa4362473cda04656ff432b` |
| `push_notice` | v | `0916366cfefccd66f94f2736226f733e` |

---

## 7. DOWN warning

DOWN restores `perform private.evaluate_cosmetics(p_user);` and reopens R21.

DOWN is **emergency recovery only**. Do not execute it as routine cleanup after a successful UP.

---

## 8. Response compatibility

Return keys unchanged: `ok`, `trainer`, `rankingVisible`, `rankingEligible`, `cosmetics`, `ownedAvatarPacks`, `titles`, `badges`, `catalog`.

`identity_cosmetics_json` already derives `unlocked` from stored `trainer_cosmetics` **or** starter **or** admin entitlement.

| Case | Today (write-read) | After UP |
|---|---|---|
| Stored unlock / starter | shown | shown |
| Earned but not yet evaluated | inspect **INSERTs** then shows unlocked | shows locked until the trainer’s own `play_progression` / level-up path evaluates |
| Missing UUID | card/selects empty or null; write could still evaluate | same reads; **no** insert |
| Null `p_user` | `Pick a trainer.` before write | same, still before any SELECT |

---

## 9. Tests

| Suite | Result | Class |
|---|---|---|
| `tests/admin-hub-gate-2a-r-identity-tests.js` | run this commit | **STATIC PASS** |
| Catalog contract on starlight-play | run this commit | **REAL CATALOG PASS** (SELECT `pg_proc` / `staff_roles` only) |
| Clone drift / atomicity / role-switch / inspect-of-trainer | **not run** | requires clone; inspect of real trainers forbidden while write remains |

STATIC coverage: SQL contract, drift rejection, atomicity structure, authorization contract, response keys, helper volatility records, no-write body + exact fingerprints.

Not run: staff JWT inspect of PlayTester / Sora / Twinkle.

---

## 10. Production unchanged

No migration applied. Live inspect still `50058f99f73591a9bd77d4342653cd8c` / VOLATILE / `evaluate_cosmetics` present. APP still `20261008-rc133`. Preview allowlist unchanged. PlayTester has no `staff_roles` row. Sora/Twinkle were not mutated.

Apply only after an explicit owner order. Then retry Gate 2A frontend.
