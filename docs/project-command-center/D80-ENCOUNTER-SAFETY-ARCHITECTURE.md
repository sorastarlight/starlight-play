# D80 — Encounter safety architecture

**Verdict:** **D80 ARCHITECTURE REVIEW READY — OWNER DECISION REQUIRED**  
**Status:** Read-only catalog and a local model. Nothing installed.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `aa4c9243`  
**Work commit:** filled by the pointer commit after this report lands.  
**Production APP:** `20261008-rc133` (unchanged).  
**Project:** `dtflmlbjhttoewqgkujf`  
**Catalog check:** `2026-10-18 05:09:46.061694+00`

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · PlayerQA mutated **NO**.

The launch-guard correction below is a draft. It is not an owner GO. The QA lane is a design, not SQL to apply.

Do not start D81.

## 1. Hosted findings

`private.round_phase` is plpgsql. Its `r is null` test is the record test, so a row with null columns still receives a real phase. `private.round_is_active` is SQL:

```sql
select r is not null and not r.cancelled and private.round_phase(r) <> 'closed';
```

In SQL, a composite `IS NOT NULL` is true only when every column is non-null. `encounter_rounds.paused_at` and `source_id` are nullable. The latest hosted round has both null. Reopening that row in memory, with future deadlines and `cancelled = false`, returned phase `join`, `id` present, `r IS NOT NULL` false, and `round_is_active` false.

A local row with every nullable column filled makes the same hosted expression true. The defect is therefore confirmed for ordinary open rounds, whose `paused_at` stays null until a pause. It is not an unresolved risk.

`private.latest_round` does not call `round_is_active`. It orders by `round_phase` and `LIMIT 1`, so Play can still see an open round while the launch guard ignores it.

`private.sync_latest_round` takes `pg_advisory_xact_lock(87231001)`, then settles and rewrites that one latest row. `private.launch_community_round` calls sync and then raises `A community round is already running` only when `round_is_active` is true. The lock serializes those launches. It does not stop the second launch, because the boolean is false. `director_start_now` and `director_tick` reach that same function. `settle_due_rounds` does not take the lock.

The same boolean is also used by `director_active_round`, `director_pause_round`, `director_dashboard`, and `public.admin_gift_joined`. `director_cancel_active_round` calls `director_active_round`. On an ordinary open round those callers currently miss it: cancel returns false, pause returns immediately, the dashboard labels the row Closed, and gift-joined raises `Start an encounter first.`

Lifecycle remains `inactive`. Settlement md5 remains `565c102d0a8c84a3dfd036653aca307c`. WIRE remains disabled.

## 2. Draft launch-guard correction

Not approved. Not applied. One expression, same signature, same phase function.

```sql
CREATE OR REPLACE FUNCTION private.round_is_active(r public.encounter_rounds)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT r.id IS NOT NULL
     AND NOT r.cancelled
     AND private.round_phase(r) <> 'closed';
$$;
```

`r.id` is null when the argument itself is null. Cancelled rows still take the phase function's closed result. A paused row stays active while its paused clock is inside an open deadline. A row remains active through reveal, because deadlines, not the stored phase text, decide the phase. Odds, spending, and RPC signatures stay as they are.

No new uniqueness constraint is in this draft. After the boolean is fixed, the existing transaction lock is enough for launches that call `sync_latest_round` before insert. A direct insert still bypasses it. That path is not a player RPC.

Installing this expression also restores the other callers listed above. Cancel would again restore bags for participants of the selected public round. That is the written cancel behavior, and it is why this fix needs its own GO rather than being folded into a QA change.

## 3. Public and QA selectors

These points treat one global row as the encounter:

| Point | Collision |
|---|---|
| `latest_round`, `sync_latest_round`, `director_active_round` | Newest open row wins, including a hidden row |
| `pick_play_round`, `round_on_play`, `load_play_round` | Play and direct id lookup use that row. `load_play_round` turns row security off |
| `play_join`, `play_prepare`, `play_throw` | No allow-list |
| `maybeRadarJoin` | Joins the snapshot round |
| `play_console_json`, `encounter_activity` | Newest rows from every round, policies `using (true)`, both on realtime |
| `encounter_rounds` RLS | `(hidden = false) OR (cancelled = false)`. Realtime publishes the table |
| `settle_due_rounds` | Every due row from the last two hours |
| `director_cancel_active_round` | Restores every participant on the director's selected row |

A public selector has to skip QA rows. A QA selector has to return a row only when `auth.uid()` is on a server allow-list for that round id. Admin and director community controls stay on the public selector. `settle_due_rounds` may still settle a QA row, because that is the canonical settlement function, but it must not change a public row's identity. Snapshot, join, prepare, throw, console, activity, and realtime have to enforce the same allow-list. A client flag is not a source of authorization.

Security-definer functions bypass RLS. Hiding a row in policy is not enough while `load_play_round` disables row security. Each definer that loads or mutates a round has to check the allow-list and fail closed.

Supabase realtime can hide a row only when RLS denies `SELECT`. The current policies do not. A correct policy could give per-row privacy for direct reads and realtime. It cannot cover definer RPCs. Both layers are required, and the definer layer touches the public encounter contract. That is a major change. This batch does not add it.

Canonical gameplay for any future lane stays on the existing phase durations, `play_throw` spending, `settle_if_needed`, `materialize_streamlink_catch`, and the stamp trigger. No second catch engine.

## 4. Alternatives

| | Public impact | Privacy | Capture fidelity | Production change | Repeatable | Complexity |
|---|---|---|---|---|---|---|
| Option 1, private QA lane in production | High until every selector, policy, and definer is split | Possible only with RLS and definer checks | Full, once built | Large | Yes | High |
| Option 2, disposable database with the same canonical code | None on the live project | No live trainers involved | Full if the schema and functions match | None on hosted play | Yes, per rehearsal | Medium |
| Option 3, a narrower stamp probe on production | A public or hand-built insert still risks the live round | Poor if it uses the live round | Weak if it skips join, spend, and settle | Small, but not representative | Low | Low |

Preferred direction: keep the launch-guard expression as its own later GO. Do not build Option 1 in production for the stamp smoke. Use Option 2 when the owner wants the catch-path proof. Option 3 does not represent the real insert path.

The launch-guard fix does not require the QA architecture, and the QA architecture does not repair the boolean.

## 5. Local evidence

Class: **REAL SQL** on disposable PostgreSQL 17.5, `127.0.0.1:55450`. Script: `tools/d80-launch-guard-rehearsal.js`. Result: 15/15.

`round_phase`, `deadlines_complete`, and the hosted `round_is_active` body are copied. The launch function is a model: it uses the same advisory lock and the id check, and it marks a due row resolved. It does not call production `settle_if_needed`. Odds and spending were not executed. The QA allow-list is a design model. RLS was not installed, and the unfiltered console read still returned the QA line.

| Check | Result |
|---|---|
| Null argument | Both checks false |
| Open row with null optional columns | Hosted check false, id check true, phase `join` |
| Every nullable column filled | Both checks true |
| Paused clock still inside join | Id check true |
| Cancelled row | Not active |
| Reveal deadline passed | Not active |
| Second launch | Raises, one row remains |
| Two overlapping launches | One insert, one raise |
| Reveal window still open | Next launch raises |
| Closed row, then a new launch | `latest_round` returns the new public row |
| `latest_round` definition | Does not call the active boolean |
| Newer QA row beside a public row | Unfiltered latest prefers QA; lane filter keeps public |
| Allow-list | PlayerQA admitted, other trainer rejected |

## 6. Proposed D81 scope

D81, if requested, is a GO packet for the one `round_is_active` expression and the caller restoration listed in section 2. It does not install that expression, does not add a QA lane, and does not run a catch. A staging stamp smoke is a different authorization.

## 7. Stop conditions

- Do not install the draft expression under this batch.
- Do not treat a hidden production row as a private QA round.
- Do not change odds, timers, settlement, or the stamp to fix the boolean.
- Do not activate Species Familiarity.

Do not start D81.
