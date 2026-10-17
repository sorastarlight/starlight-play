# D66 — Species Mastery timestamp authority and outbox lifecycle

**Status:** BRANCH DRAFT + READ-ONLY HOSTED CATALOG + DISPOSABLE LOCAL REHEARSAL. Not applied. Not activated.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `13ba51a1`  
**Production APP:** `20261008-rc133` (unchanged).  
**WIRE:** not switched. No hosted writes. No catch-row reads.

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · QA account **none**.

## 1. Hosted catalog

Project `dtflmlbjhttoewqgkujf`, catalog only.

`public.catches.caught_at` is `timestamptz NOT NULL DEFAULT now()`.

Triggers on `public.catches`:

| Trigger | When | Touches `caught_at` |
|---|---|---|
| `catches_before_write` | before insert or update of dex, level, IVs, and AVs | No |
| `catches_after_present` | after insert | No |
| `catches_xp` | after insert | No |

No trigger validates or overwrites the insert-time value.

`private.persist_streamlink_catch` does not mention `caught_at`. An ordinary Play insert therefore stores the column default, `now()`. Authenticated cannot execute that function. This is the trusted Play path, and it was not modified.

`private.record_stream_catch(p_user text, p_name text, p_dex integer, p_species text, p_variant text, p_gender text, p_ball text, p_round uuid, p_source_key text, p_caught_at timestamptz)` is a security invoker owned by `postgres`, with no pinned `search_path`. Execute is granted to `public`, `anon`, `authenticated`, and `service_role`. Its insert uses `coalesce(p_caught_at, now())`.

The live callers are:

- `public.bridge_import_catches(text, jsonb)` passes `nullif(rec.value->>'caughtAt', '')::timestamptz`. It is security definer. `anon` and `authenticated` can execute it. `private.bridge_ok(p_token)` must pass first. The timestamp itself is still taken from the JSON.
- `public.bridge_publish(text, jsonb)` passes `now()`. The client does not supply that argument.

`authenticated` and `anon` also have table insert and update privileges on `public.catches`. The only policy is `users can read own catches` for select. There is no insert or update policy, so the Data API cannot write the column directly.

A stored `caught_at` at or after an activation clock is not proof that the specimen was created then. Play's omitted value is the server default. The bridge import can store a caller-supplied time, and `record_stream_catch` will persist it. D66 does not revoke those functions and does not change their bodies. Legitimate imports can keep a historical display time.

## 2. Draft

`supabase/unapplied/d66-mastery/003_species_mastery_lifecycle.sql`  
`supabase/unapplied/d66-mastery/rollback-before-activation.sql`  
`supabase/unapplied/d66-mastery/DO-NOT-APPLY.md`

D64 and D65 files are unchanged. Installing 003 does not activate recording.

New inserts into `public.catches` also write `private.catch_insert_authority(catch_id, inserted_at = clock_timestamp())`. The trigger does not assign `caught_at`. An authority row can be inserted only in the same transaction as the specimen, and only with a server clock within five seconds. Updates and deletes of that row are rejected. A later manual row for an older specimen fails the transaction-id check.

The mastery guard compares `inserted_at` with the activation clock. It does not compare `caught_at`. A play catch inserted after activation still counts when its display time is `2001`. A specimen inserted before activation, or before this trigger existed, does not count, even when `caught_at` is `2099`.

Evolution-style `caught_at = caught_at` still succeeds. Non-play inserts keep their source key and are not queued.

## 3. Lifecycle

One activation clock. It is immutable. There is no second period and no reopen after close. Resume is allowed only from pause, because pause does not move the cutoff.

| State | New queue | Delivery | Pending rows |
|---|---|---|---|
| `inactive` | No | No | None yet |
| `active` | Yes | Yes | Delivered in order |
| `paused` | Yes | No | Kept, then delivered on resume |
| `draining` | No | Yes, only rows queued before the drain | Older work finishes; new notes return false |
| `closed` | No | No | Kept and not delivered |

`private.disable_species_mastery_recording()` now starts the drain. Under 003 it no longer abandons pending rows. `private.close_species_mastery_activation()` is the permanent stop. The D65 script does not apply 003, and its own disable test still matches 002.

Reconciliation queues a row only when the authority clock is after activation, the source key is `play:<round uuid>:<trainer uuid>`, the round is not a test round, and `capture_log.success` is true. It orders by `inserted_at, catch_id` and keeps the caller’s limit. Rows already queued or already earned are skipped. Invalid shapes never enter the batch, so they cannot starve a later valid row.

Delivery uses `FOR UPDATE SKIP LOCKED`. A check failure becomes `rejected`. Any other error increments `attempts` and stores `last_error`. The eighth failure becomes `exhausted`. `private.requeue_species_mastery_outbox` can return an exhausted row to pending while the period is active, paused, or draining. It cannot reopen a closed period.

`note`, `reconcile`, and `deliver` are a simulated integration. Settlement does not call them.

## 4. Local results

PostgreSQL **17.5**. Data directories removed.

| Suite | Class | Result |
|---|---|---|
| `node tools/d66-mastery-rehearsal.js` | REAL SQL | **14/14** on `127.0.0.1:55441` |
| `node tools/d65-mastery-rehearsal.js` | REAL SQL | **19/19** on `127.0.0.1:55440` |
| `node tools/d64-mastery-rehearsal.js` | REAL SQL | **19/19** on `127.0.0.1:55439` |
| `node tests/d66-mastery-static-tests.js` | STATIC | passed |

The local checks covered a normal capture, a historical reject, a forged `caught_at`, a pending row held through pause and resumed on the same cutoff, drain, permanent close, a transient retry, permanent rejection of an import, concurrent delivery, cross-trainer isolation, 30 invalid rows ahead of one valid row, and unchanged points at 7 / rank 2. The shiny specimen kept its display timestamp.

Not REAL DOM, not REAL RPC, not PRODUCTION.

## 5. Blockers

- Nothing is applied or activated. The authority trigger is not on the hosted database, so hosted `caught_at` is still not proof of insertion time.
- If the authority insert fails, the catch insert fails with it. That is intentional for rows created after install, and it is a behavior change to review before any apply.
- `bridge_import_catches` can still store a client `caughtAt` in the display column. This draft does not change that writer.
- Reconciliation reads catch rows. It ran only on synthetic data.
- There is still no settlement hook.

## 6. Proposed D67

D67, if authorized later, should be an independent review of whether the catch insert trigger is acceptable to install. It should not hook settlement, backfill, activate recording, or revoke the bridge import. Do not start D67 from this report.
