# D81 — Launch-guard install readiness

**Verdict:** **D81 LAUNCH-GUARD GO PACKET READY — INSTALL NOT AUTHORIZED**  
**Status:** The replacement is an unapplied file. It was not run on the hosted database.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `a256076d`  
**Work commit:** `fe2db375`  
**Production APP:** `20261008-rc133` (unchanged).  
**Project:** `dtflmlbjhttoewqgkujf`  
**Catalog check:** `2026-10-18 05:16:05.278991+00`

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · PlayerQA mutated **NO**.

Do not start D82.

## 1. Hosted baseline

`private.round_is_active(encounter_rounds)` did not drift from D80.

| Attribute | Hosted value |
|---|---|
| Identity | `private.round_is_active(encounter_rounds)` |
| Arguments | `r encounter_rounds` |
| Result | `boolean` |
| Owner | `postgres` |
| Language | `sql` |
| Security | invoker (`prosecdef` false) |
| Volatility | stable (`s`) |
| Parallel | unsafe (`u`) |
| `proconfig` | null |
| `proacl` | null, so the default PUBLIC execute grant |
| prosrc md5 | `5732cc462502e346843eedb76fada494` |

The body is `r is not null and not r.cancelled and private.round_phase(r) <> 'closed'`.

`anon`, `authenticated`, and `public` can already execute it. This draft does not add a grant.

`private.sync_latest_round` still contains `pg_advisory_xact_lock(87231001)`. Its prosrc md5 is `6f3d22707440f97e8fa51909a9ba494c`. It is security definer and is not changed.

Lifecycle is `inactive` and `activated_at` is null. WIRE `enabled` is false. `settle_if_needed` md5 remains `565c102d0a8c84a3dfd036653aca307c`. APP remains `20261008-rc133`.

## 2. Callers

The boolean is the only change. None of these function bodies are edited.

| Caller | Before | After | Mutations | Authorization |
|---|---|---|---|---|
| `launch_community_round` | A second launch continues, because the boolean is false on an ordinary open row | Raises `A community round is already running` | The blocked launch does not insert. The first launch is unchanged | Private function. Public entry is `admin_director_command`, which checks `is_play_admin`. Anon cannot execute that wrapper |
| `sync_latest_round` | Unchanged | Unchanged | Still settles the one latest row under the advisory lock | Security definer. Not part of this replacement |
| `director_active_round` | Returns null for an ordinary open row | Returns that row | None by itself | Invoker |
| `director_pause_round` | Returns immediately | Sets `paused_at` on an open, unresolved row | Pauses that round | Public wrapper `admin_pause_round` calls `require_hub`. Anon cannot execute the wrapper |
| `director_cancel_active_round` | Returns false | Cancels the selected row and calls `restore_bag_item` for each participant's prep, and for the ball unless `result_reason` is `no_ball_left` | Refunds those participants | Reached from `director_end_rpg_session` and staff director commands. The refund loop itself is unchanged |
| `director_dashboard` | Labels an ordinary open row `Closed` | Labels it `Active` | None | Read model |
| `admin_gift_joined` | Raises `Start an encounter first.` | Continues to the existing joiner check, then the existing grant | Can grant one item to joined trainers | `require_hub()` still runs first. Anon cannot execute it |
| `director_tick` / `director_start_now` | Call launch | The launch guard starts rejecting a second open round | No new grant | Same private path as today |
| `director_end_rpg_session` | Calls cancel, which currently no-ops | An open round can be cancelled and refunded when a session ends | Refund path above | Pre-existing caller |

Installation of the replacement does not call any of these. The newly reachable paths are the ones the functions already contain. They start working on the next open round.

`PUBLIC` can still execute the private director functions directly. That grant already exists. PostgREST is not given a new function, and this file does not revoke anything. Revoking `PUBLIC` execute would be a separate change. It is not in this file.

## 3. The file

`supabase/unapplied/d81-encounter/001_round_is_active.sql`  
SHA-256 `d1a408c5687f817a056a103eba1767ff971e4538355d43958e48e5c1936ffc8d`

The predicate is `r.id is not null and not r.cancelled and private.round_phase(r) <> 'closed'`.

`r.id` is null when the argument is null. A cancelled row is closed by `round_phase` and also fails `not r.cancelled`. Join, prepare, throw, and reveal stay active, including when `paused_at` or `source_id` is null. A paused clock still inside an open deadline stays active. Deadlines that have passed the reveal instant are closed. `round_phase` is not modified. No other function is in the file.

Local prosrc md5 after this file is `53d7e8a3f3894212e854618dc0663101`.

Rollback file: `supabase/unapplied/d81-encounter/002_round_is_active_rollback.sql`  
SHA-256 `89909725d0f86067b74d8016fa1a00db2e841f3abc0779a4612b8692be647994`  
It restores prosrc md5 `5732cc462502e346843eedb76fada494`. Both files say DO NOT APPLY.

## 4. Local tests

Class: **REAL SQL** on disposable PostgreSQL 17.5, `127.0.0.1:55451`. Script: `tools/d81-launch-guard-rehearsal.js`. Result: 17/17.

`round_phase` and `deadlines_complete` match the hosted bodies. Pause, cancel, the dashboard status case, and gift-joined follow the hosted control flow with stubbed console, log, and item-grant helpers. Production `settle_if_needed`, catch odds, and `grant_items` were not executed. Trainers were synthetic.

| Check | Result |
|---|---|
| Starting body md5 | Matches hosted `5732cc462502e346843eedb76fada494` |
| Before the file | Open row inactive. Pause and cancel do nothing |
| Attributes after the file | sql, stable, invoker, boolean, same signature, null proconfig |
| Null argument | Inactive |
| Join, prepare, throw, reveal with null optional columns | Active |
| Paused join | Active, and the pause model sets `paused_at` |
| Cancelled | Inactive |
| Expired deadlines with stored phase `join` | Closed and inactive |
| Dashboard predicate | `Active` |
| Cancel refund | Berry and ball restored. `no_ball_left` ball not restored |
| Gift | Non-staff rejected. Empty round rejected. Joined round increments the stub count |
| Second launch | Raises. One row remains |
| Overlapping launches | One insert, one raise, lock `87231001` |
| After close | `latest_round` returns the new row and does not call the boolean |
| Rollback | Restores the hosted md5 |

## 5. Install safety

`CREATE OR REPLACE` on the same signature keeps the owner and the existing grants. It does not run the function, so the install itself does not pause, cancel, refund, launch, or gift. It does not change phase duration, catch math, spending, settlement, or Species Familiarity.

Rollback is safe when no round is open. Restoring the old body while a round is open brings back the missed active-row test: a second launch can start, and cancel returns false again. Do not roll back in the middle of a round unless that defect is acceptable.

## 6. Proposed owner GO

This statement is not approved.

```text
OWNER GO — replace private.round_is_active only. Not yet approved.

Project: dtflmlbjhttoewqgkujf
File: supabase/unapplied/d81-encounter/001_round_is_active.sql
SHA-256: d1a408c5687f817a056a103eba1767ff971e4538355d43958e48e5c1936ffc8d

Stop if the hosted prosrc md5 is not 5732cc462502e346843eedb76fada494.
Execute that file as the transaction it already contains.
Do not wrap a second transaction around it.
Afterward the prosrc md5 must be 53d7e8a3f3894212e854618dc0663101.
Confirm lifecycle is still inactive, WIRE is still disabled,
and settle_if_needed md5 is still 565c102d0a8c84a3dfd036653aca307c.

Do not launch, pause, cancel, gift, or catch as part of this GO.
Do not edit round_phase, settlement, odds, or inventory formulas.
Do not install the QA lane. Do not activate Species Familiarity.
```

## 7. Proposed D82 scope

D82, if the owner pastes that GO, is the execution of this one file and the post-check of the new md5. It is not a catch and not a QA-lane install. This batch does not start it.

## 8. Remaining risks

- The next open round can be paused, cancelled, and refunded by the existing staff paths. That is the intended restoration.
- `PUBLIC` execute on the private director functions stays as it is.
- `latest_round` still returns one global row. This fix does not isolate a QA encounter.
- The local cancel and gift functions are models. They were not the hosted function bodies.

Do not start D82.
