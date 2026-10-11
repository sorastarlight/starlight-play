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
**Sora mutated:** NO · **Twinkle mutated:** NO  
**PlayTester role:** temporary `moderator` 2026-10-11 03:09:17 UTC, then restored to `null`  
**Runtime staff inspect:** PlayTester self only · **REAL RPC PASS**

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

Apply-time staff happy path was not tested. Runtime verification is in §5.

---

## 5. Authorized runtime verification (2026-10-11)

Owner approved temporary PlayTester `moderator` for this verification only.

### 5.1 Precheck

Live inspect still `e9091c0de1b91e67a62bade78cf8edde` / STABLE / `evaluate_cosmetics` absent.  
`staff_roles` before: Twinkle `moderator` only (`2026-09-09 04:42:52+00`). PlayTester `play_staff_role` null. Sora `owner` via Twitch. Moderator satisfies `is_play_admin()` (`play_staff_role(auth.uid()) is not null`).

### 5.2 Temporary authorization

Inserted only PlayTester `a98cbf81-…` as `moderator` at `2026-10-11 03:09:17.415456+00`. Sora/Twinkle rows unchanged. `staff_roles` count = 2. No other admin RPCs were called.

### 5.3 Baseline (SELECT-only fingerprints)

Inspect remaining helpers are SELECT-only. Tables compared anyway because they were the previous write targets or adjacent trainer state:

| Account | cosmetics | notices | titles | badges | achievements | stats | inventory |
|---|---|---|---|---|---|---|---|
| PlayTester | 52 / `112df104…` | 25 / `dc17622a…` | 2 / `c5087be0…` | 3 / `0578ad67…` | 68 / `22ebd0d9…` | 1 / `ce3d176d…` | 1 / `8cb24a1b…` |
| Sora | 54 / `502ca79b…` | 61 / `58067569…` | 4 / `f6407a77…` | 13 / `788e14e6…` | 68 / `9113abd2…` | 1 / `a8ab0e61…` | 1 / `2ea80589…` |
| Twinkle | 52 / `a1f801b5…` | 3 / `39bd304b…` | 0 | 0 | 0 | 1 / `7d0e95a6…` | 1 / `4379f69d…` |

PlayTester stored cosmetics are all `source=starter` (52 ids). Notice kinds are existing pokedex/level/evolution/achievement rows; no new cosmetic-unlock notices.

### 5.4 Three authorized inspects

PlayTester legitimate JWT. Target = PlayTester self. Sanitized evidence: `docs/audits/admin-hub-gate-2a-r-shots/runtime-inspect.json`.

| Call | Result | keys | cosmetics unlocked/catalog | body md5 |
|---|---|---|---|---|
| 1 `03:09:40.477Z` | `ok=true` | expected 9, no extras | 52 / 96 | `48d6f53f852a07b4615927fcac306676` |
| 2 `03:09:40.707Z` | `ok=true` | same | 52 / 96 | same |
| 3 `03:09:40.867Z` | `ok=true` | same | 52 / 96 | same |

No Oak QA, Pass/Bits, director, grant, repair, `evaluate_cosmetics`, `unlock_cosmetic`, or `push_notice` RPCs. Session signed out after the three calls.

### 5.5 No-write comparison

After the three calls, every fingerprint in §5.3 matched exactly. No added/deleted/changed cosmetics or notices. No timestamp drift on those rows. Sora and Twinkle fingerprints unchanged. Concurrent activity: none observed on compared tables.

**Detected writes:** none.

### 5.6 Cleanup

Deleted only the temporary PlayTester `staff_roles` row created at `03:09:17`. Remaining `staff_roles`: Twinkle `moderator` only. PlayTester `play_staff_role` = null. Temporary scripts removed.

Post-cleanup PlayTester JWT `admin_identity_inspect(self)` → **42501** `not allowed`. Session signed out.

---

## 6. Status

| Item | Status |
|---|---|
| R21 | **CLOSED** for `public.admin_identity_inspect` |
| R2 | **OPEN** (out of scope) |
| Gate 2A frontend | **not started** |
| Production APP | `20261008-rc133` |

DOWN remains emergency recovery only and would restore the write-read body and reopen R21.

Remaining risks: R2 anon EXECUTE; R18 moderator-capable Pass/Bits/Oak QA if PlayTester is ever staffed again; other `admin_*` RPCs were not re-audited in this gate.
