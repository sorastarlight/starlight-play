# Admin Hub Gate 2A-R — identity inspect true-read apply

**Date:** 2026-10-11  
**Source commit:** `522adce90e6c74361844c1101026e525c00b44cd`  
**Approved file:** `docs/audits/sql/gate-2a-r-identity-inspect-up.sql`  
**Migration:** `20261011024514` `gate_2a_r_identity_inspect_true_read`  
**Applied:** 2026-10-11 02:45:14 UTC  
**Verified:** 2026-10-11 02:45:30 UTC  
**Database:** starlight-play `dtflmlbjhttoewqgkujf` / `postgres`  
**Production APP:** `20261008-rc133` (unchanged)  
**DOWN:** not executed  
**Frontend / APP stamp:** unchanged  
**Sora mutated:** NO · **Twinkle mutated:** NO · **PlayTester role:** `null`  
**Unsafe staff inspect of real trainers:** NO

Final release smoke remains paused. Gate 2A frontend not started.

---

## 1. Preflight (all matched)

| Check | Result |
|---|---|
| Project | `starlight-play` `dtflmlbjhttoewqgkujf` `ACTIVE_HEALTHY` |
| Working UP vs `522adce` | exact byte match, LF, body md5 `e9091c0de1b91e67a62bade78cf8edde` / 1496 |
| Function exists | yes `public.admin_identity_inspect(p_user uuid)` |
| Live `md5(prosrc)` | `50058f99f73591a9bd77d4342653cd8c` |
| Length | 1542 |
| Volatility | VOLATILE |
| Owner | postgres |
| SECURITY DEFINER | true |
| `search_path` | `{search_path=public}` |
| Result / language | jsonb / plpgsql |
| Staff guard | present |
| `evaluate_cosmetics` call | present |
| EXECUTE | anon, authenticated, service_role, postgres |
| ACL | `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}` |
| Concurrent inspect DDL | none |
| Latest prior migration | `20261009183910` `gate_17_s1_admin_live_snapshot` |
| PlayTester staff row | none |

---

## 2. SQL execution

`apply_migration` `gate_2a_r_identity_inspect_true_read` on `dtflmlbjhttoewqgkujf`.

The approved script’s preflight, `CREATE OR REPLACE`, `ALTER OWNER`, and postcondition ran in one migration transaction with `pg_advisory_xact_lock(21021021, 2)`. Outer `BEGIN`/`COMMIT` were omitted because the migration runner already wraps the script. Function body was the approved LF `$function$` text.

Result: **success**. Recorded as `20261011024514`.

DOWN was not executed. No other function was rewritten. `evaluate_cosmetics` / `unlock_cosmetic` / `push_notice` checksums unchanged.

---

## 3. Postcondition (live catalog)

| Property | Expected | Live |
|---|---|---|
| exists | yes | yes |
| `md5(prosrc)` | `e9091c0de1b91e67a62bade78cf8edde` | match |
| length | 1496 | 1496 |
| volatility | STABLE | `s` |
| DEFINER | true | true |
| owner | postgres | postgres |
| `search_path` | public | `{search_path=public}` |
| args | `p_user uuid` | match |
| result | jsonb | jsonb |
| language | plpgsql | plpgsql |
| `evaluate_cosmetics` | absent | position 0 |
| staff guard | first | position 10 |
| EXECUTE / ACL | unchanged | unchanged |

Response keys still in `prosrc`: `ok`, `trainer`, `rankingVisible`, `rankingEligible`, `cosmetics`, `ownedAvatarPacks`, `titles`, `badges`, `catalog`.

---

## 4. Authorization (safe nonstaff only)

Session: `current_user=postgres`, `auth.uid()=null`, `private.is_play_admin()=false`.

| Call | Target | Result |
|---|---|---|
| inspect as postgres / no JWT | unused `00000000-0000-0000-0000-000000000000` | **42501** `not allowed` at line 4 |
| `set local role anon` | same unused UUID | **42501** `not allowed` at line 4 |
| `set local role authenticated` | same unused UUID | **42501** `not allowed` at line 4 |

Staff happy path was **not** tested. Sora / Twinkle were not impersonated. PlayTester was not promoted.

Runtime no-write verification (staff inspect leaves `trainer_cosmetics` / notices unchanged): **not performed**.

---

## 5. Remaining QA

Authorized dedicated QA staff read of PlayTester only, after a separate staff-role approval if needed. Then retry Gate 2A frontend.

R21: **PENDING RUNTIME**  
R2: **OPEN** (out of scope; anon EXECUTE unchanged)

---

## 6. Production after apply

APP remains `20261008-rc133`. Preview allowlist unchanged. No staff_roles change. No cosmetic grants. No player progression change. No legacy admin JS change.

DOWN remains emergency recovery only and would restore the write-read body and reopen R21.
