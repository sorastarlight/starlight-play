# D79 — QA encounter isolation design

**Verdict:** **D79 NO-GO — EXISTING ARCHITECTURE REQUIRES FURTHER DESIGN**  
**Status:** Read-only catalog plus a local selector model. No prototype SQL. No encounter.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `0f1acb23`  
**Work commit:** filled by the pointer commit after this report lands.  
**Production APP:** `20261008-rc133` (unchanged).  
**Project:** `dtflmlbjhttoewqgkujf`  
**Catalog check:** `2026-10-18 04:56:27.972967+00`

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · PlayerQA mutated **NO**.

No password, token, cookie, or session secret is in this report.

Do not install a QA encounter mechanism. Do not start D80.

## 1. What the engine actually does

Play has one selected round. `private.latest_round` orders open rows first, then by start time, and returns `LIMIT 1`. `private.sync_latest_round` settles that row and writes its phase. `private.pick_play_round` is the same idea for the Play page: the newest row `private.round_on_play` accepts. `private.load_play_round` is security definer, turns row security off, and returns a requested id when that row is still on Play. Otherwise it returns the picked row.

`public.play_join`, `public.play_prepare`, and `public.play_throw` all go through that loader. Join inserts `encounter_players` for `auth.uid()` with no allow-list. The client radar path `maybeRadarJoin` calls `play_join` for whatever round the snapshot is showing.

`private.launch_community_round` calls `sync_latest_round` and then raises `A community round is already running` only when `private.round_is_active` is true. The hosted body is `r is not null and not r.cancelled and private.round_phase(r) <> 'closed'`. A composite `IS NOT NULL` is false when any column is null. A read-only in-memory open round, phase `join`, not cancelled, still returned `round_is_active = false` at the catalog check. The launch guard does not see an ordinary open round.

`private.director_cancel_active_round` loads that same director round and restores bag items for every participant. `private.settle_due_rounds` settles every unresolved round from the last two hours once its throw deadline has passed. `private.settle_if_needed` is unchanged (`565c102d0a8c84a3dfd036653aca307c`). It is the canonical catch path, including the stamp and the inactive familiarity note.

`private.play_console_json` returns the newest console lines from every round. `public.play_snapshot` puts that list, and the picked round, in every Play response.

## 2. Visibility

Hosted RLS and realtime, same catalog check:

| Surface | Exposure |
|---|---|
| `encounter_rounds` | RLS on, not forced. Policy `public can read visible rounds` is `(hidden = false) OR (cancelled = false)`. A live hidden round is still readable. Realtime publishes the table. |
| `encounter_activity` | Policy `using (true)`. Realtime publishes the table. |
| `play_console_log` | Policy `using (true)`. Realtime publishes the table. |
| `encounter_players` | Authenticated users can read their own rows. |
| `capture_log` | RLS on, no public policy in this catalog. Security-definer settlement still writes it. |

`load_play_round` disables row security, so a policy change alone would not stop `play_join` by id.

Lifecycle remains `inactive`. WIRE `enabled` remains false. APP remains `20261008-rc133`.

## 3. Why a QA row is not safe yet

A second open row becomes `latest_round` even if `hidden` is true. Director sync, cancellation, and the Play snapshot then follow that row. The older public round drops out of the selector until the newer row closes. Radar clients join the row they are shown. Anyone who learns the id can call `play_join`. Console lines and activity rows are public. Honey on a shared round changes the odds for every participant, so a stranger in the round is not only a privacy leak.

A maintenance window does not fix this. With the director held and nobody else online, the new row is still the global round, still broadcast, and still joinable. The launch guard does not provide the mutex its error text describes. Shortening timers or using the test-outcome flag would also violate the stamp-smoke rules.

An allow-list only on `play_join` would still leave the snapshot, realtime, console, director, and cancel path on the same row. Hiding the row requires changing public round selection, RLS, the console feed, director selection, and the three action RPCs together. That is too wide for an unapplied prototype in this batch. No SQL file was added under `supabase/unapplied` or `supabase/migrations`.

Species Familiarity is not activated by creating a round. The note inside `settle_if_needed` runs only when the lifecycle is active or paused. A future QA catch must keep using that function rather than a second catch engine. This batch does not change it.

## 4. Security requirements

These are the controls a later design has to meet. None of them are implemented here.

1. Only an authorized operator can create a QA round. `launch_community_round` is not a player RPC, but `admin_start_round` still creates a public community round.
2. Every other trainer is rejected by the server on join, prepare, throw, and radar join. The database does not have that check.
3. A trainer cannot mark a round as QA. Nothing in the client should be able to set that flag.
4. The allow-list lives in a server table. A client argument cannot add a trainer.
5. The path spends a Poké Ball and materializes a catch. It does not grant items or currency.
6. Cancel and settlement touch only the allow-listed participant.
7. Console, activity, and snapshots omit the QA round for everyone else.
8. `director_cancel_active_round` must not be the QA cancel path, because it restores every participant on the director's selected round.
9. Audit rows record the operator, the round id, and the allow-listed trainer. They do not store secrets.
10. A disabled QA switch makes the launcher raise before insert.

Fail closed: if the allow-list or the switch cannot be read, join and launch raise.

## 5. Local evidence

Class: **REAL SQL** on disposable PostgreSQL 17.5, `127.0.0.1:55449`. Script: `tools/d79-selector-collision-rehearsal.js`. Result: 8/8.

The phase function is a stub that returns `join` or `closed`. Odds, Poké Ball spending, `settle_if_needed`, and the stamp were not executed. This is a **SIMULATED** selector model, not production parity.

| Check | Result |
|---|---|
| One open row is the global latest row | Pass |
| `round_is_active` is false while that row is still in `join` | Pass |
| The launch guard does not reject it | Pass |
| A newer hidden row replaces it in `latest_round` | Pass |
| Reading that row by id has no allow-list | Pass |
| The public console read returns the QA line | Pass |
| Closing the newer row returns the older row | Pass |

The eighteen gameplay checks in the D79 request were not run. There is no QA mechanism to test.

Hosted confirmation of the active-test gap used an in-memory row only. No hosted row was inserted.

## 6. Proposed installation GO

Do not install. There is no file to apply.

A later owner GO can authorize a design review of one selector split. It should name `latest_round`, `pick_play_round`, `load_play_round`, `play_join`, `play_prepare`, `play_throw`, `play_console_json`, the three realtime tables, `director_active_round`, and `director_cancel_active_round`. It should not authorize a catch, a hosted migration, or a familiarity change.

## 7. Proposed D80 scope

D80, if the owner asks for it, stays a design review of that selector split. It does not install SQL, create a round, or catch a Pokémon. The PlayerQA stamp smoke stays blocked until a reviewed isolation design exists and a separate GO installs it.

## 8. Stop conditions

- Do not add a hidden community round and call it isolated.
- Do not rely on `round_is_active` as a mutex until its composite test is reviewed.
- Do not change public settlement, odds, timers, or the stamp in order to build QA.
- Do not activate Species Familiarity.
- Do not run a PlayerQA encounter under this batch.

Do not start D80.
