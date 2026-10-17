# D75 — Species Familiarity activation readiness

**Verdict:** **D75 ACTIVATION PLAN READY — OWNER GO REQUIRED**  
**Status:** Plan and local rehearsal only. Recording is inactive. This document is not an activation GO.  
**Branch:** `admin-hub-overhaul`  
**Starting commit:** `aade8a6e`  
**Work commit:** `f9643d2d`  
**Production APP:** `20261008-rc133` (unchanged).  
**Project:** `dtflmlbjhttoewqgkujf`  
**PostgreSQL:** 17.6 hosted. Local rehearsal 17.5.  
**WIRE:** remains disabled (`enabled = false`).

Sora mutated **NO** · Twinkle mutated **NO** · PlayTester mutated **NO** · QA account **none**.

`activate_species_mastery_events()` was not called on the host. Reconciliation and delivery were not called on the host. No encounter ran. No production catch, Trainer profile, inventory, or capture history was read.

Do not start D76. Do not activate Species Familiarity. Final release smoke stays paused.

## 1. What is already installed

D70 installed the inactive schema. D74 installed the optional settlement note, the outbox admission trigger, and the progress-view grant fix. D71 named the cosmetic track Species Familiarity. D72 and D73 reviewed the note before that install.

The hosted catalog at `2026-10-17 18:22:25.285883+00` still matches that install:

| Check | Result |
|---|---|
| Lifecycle | `inactive` |
| `activated_at` | null |
| `paused_at`, `drain_started_at`, `closed_at` | null |
| Familiarity events | 0 |
| Outbox rows | 0 |
| `pg_cron` | absent |
| WIRE `enabled` | false |
| `settle_if_needed(r encounter_rounds)` md5 | `565c102d0a8c84a3dfd036653aca307c` |
| Owner / security / result | `postgres` / invoker / `encounter_rounds` |
| Materialize calls / advisory locks / note calls | 1 / 1 / 1 |
| `authenticated` EXECUTE on settle | true |
| `grant_mastery` md5 | `d5c11cc672f2cb16ae0210023a8dd91b` |
| `mastery_rank` md5 | `04fa122f1f4424cd6e63fa1f3ffa16a4` |
| `play_rankings` md5 | `b6526a939abdba0ef106e127925c43b0` |
| Stamp md5 | `b66ad1b961b3573a2c48947dfe0413ea` |
| APP | `20261008-rc133` |

`public.catches.server_inserted_at` is `timestamptz`, nullable, with no default. Catch triggers include `catch_server_inserted_at`, `catch_server_inserted_at_freeze`, and `species_mastery_caught_at_freeze`. The admission trigger `species_mastery_outbox_admit` is on `private.species_mastery_outbox` only.

`authenticated` and `anon` cannot execute `activate_species_mastery_events`, `note_species_mastery_catch`, `reconcile_species_mastery_outbox`, `deliver_species_mastery_outbox`, `pause_species_mastery_delivery`, `resume_species_mastery_delivery`, `begin_species_mastery_drain`, `disable_species_mastery_recording`, `close_species_mastery_activation`, `enqueue_species_mastery_event`, or `record_species_mastery_event`. There is no function named `drain_species_mastery_delivery`. Drain is `private.begin_species_mastery_drain()`.

`authenticated` keeps SELECT on `public.species_mastery_progress` and does not have INSERT, UPDATE, DELETE, or TRUNCATE. The view is `security_invoker = true`. Events RLS is on and forced.

No scheduling extension is installed. This batch did not create one.

## 2. Capture preservation

The optional note sits after a successful `materialize_streamlink_catch` and inside its own `EXCEPTION WHEN OTHERS` block. `note_species_mastery_catch` also catches its own errors and returns false. A failure in that path does not roll the catch back.

Local **REAL SQL** on `127.0.0.1:55447` showed:

- Inactive recording keeps the catch and does not queue it.
- A note that raises keeps the catch and leaves the outbox empty.
- An enqueue function that raises keeps the catch.
- A malformed `catchId` keeps the catch and does not queue it.
- A drain that commits while settlement is waiting keeps the catch and skips the new note.
- Reconciliation later inserts the missed ids. Delivery then writes one event per id.

The stamp is a different failure. `private.stamp_catch_server_inserted_at()` runs `BEFORE INSERT` on `public.catches` and assigns `server_inserted_at`. `materialize_streamlink_catch` catches unique violations only. A raise from the stamp therefore leaves materialize, misses the note handler, and aborts the settlement transaction. The local rehearsal replaced the stamp with a raise: settlement failed with `stamp failed`, and no catch row remained. Restoring the original stamp definition was local only. The hosted function was not edited.

That stamp risk is unchanged from D70. A production insert has not proved it. The first hosted validation must prove the stamp before activation, because activation cannot be undone and a failed insert means the Pokémon was not created.

## 3. Local activation rehearsal

Class: **REAL SQL** on disposable PostgreSQL 17.5. Synthetic trainers only. `capture_chance` and `announce_throws` are stubs. Production odds and Poké Ball spending were not tested.

`node tools/d75-activation-rehearsal.js`: **19/19**.

| Check | Result |
|---|---|
| Inactive install, empty ledger | pass |
| Pre-activation capture kept, not eligible, reconcile returns 0 | pass |
| Activation does not enroll that earlier specimen | pass |
| Post-activation Play capture queues the catch id | pass |
| Delivery yields Familiar, 1 eligible catch, tier level 1 | pass |
| Replay does not add a second event | pass |
| Failing note keeps the catch | pass |
| Unavailable outbox keeps the catch | pass |
| Reconcile then deliver writes exactly one event for each miss | pass |
| Malformed catch id does not abort or enter the ledger | pass |
| `authenticated` cannot execute the note (`42501`) | pass |
| Two concurrent settlements each queue and deliver once | pass |
| Pause queues and does not deliver | pass |
| Resume returns the same period to `active` | pass |
| Drain delivers the earlier queued row and skips the in-flight note | pass |
| Close is permanent; a second activate raises `55000` and does not move `activated_at` | pass |
| Stamp raise aborts the catch and is not swallowed | pass |
| Points stay 7, rank stays 2, Rankings score stays 7, bag qty stays 4 | pass |

## 4. Controlled validation proposal

Do not run this sequence under D75. Each step needs its own later GO. The cutoff is one-time. `activate_species_mastery_events()` sets `activated_at` only while it is null and lifecycle is `inactive`. A second call raises `55000`. There is no supported way to clear or backdate that timestamp.

Recommended order:

1. **Stamp smoke, before activation.** One approved nonstaff QA catch. Success means one new specimen whose `server_inserted_at` is not null. That specimen is permanently ineligible for Familiarity because it predates the cutoff. Failure means the insert rolled back and activation must wait. This step creates a real Pokémon. It does not prove the cosmetic note.
2. **Activation, with no encounter in the same GO.** One call to `activate_species_mastery_events()`. Expect lifecycle `active` and a non-null cutoff. Events stay 0. This cannot be undone. It does not create a Pokémon.
3. **One post-activation catch.** A second approved specimen. Expect one pending outbox row for that catch id and still no Familiarity event until delivery. This creates another real Pokémon. It proves the note. It does not prove delivery.
4. **Bounded delivery.** One manual `deliver_species_mastery_outbox` with a small limit. Expect one delivered row and Familiar for that species. Run reconcile first only if the outbox row is missing.

Doing activation before the stamp smoke makes the first real catch carry both risks. If the stamp raises, that catch does not exist. If the note fails, the catch exists and a later reconcile can queue it. The stamp is the failure that removes the Pokémon, so it should be proved while a failure cannot also lock in the cutoff.

Sora and Twinkle are not candidates. PlayTester stays untouched unless a future GO names that account and states the mutation. This batch does not provision a QA account. The future GO must name the nonstaff identity, say whether the specimen is kept, and must not treat a kept specimen as something to delete in order to tidy the ledger.

## 5. Operator checks

These are specifications. This batch ran only the empty-ledger counts already listed. It did not select Trainer ids or specimen ids from production.

```sql
SELECT lifecycle,
       activated_at IS NULL AS activated_null,
       paused_at IS NULL AS paused_null,
       drain_started_at IS NULL AS drain_null,
       closed_at IS NULL AS closed_null
FROM private.species_mastery_activation
WHERE singleton;

SELECT status, count(*)::int AS rows, coalesce(max(attempts), 0) AS max_attempts
FROM private.species_mastery_outbox
GROUP BY status;

SELECT count(*)::int AS delivered_events
FROM public.species_mastery_events;

SELECT EXTRACT(EPOCH FROM (clock_timestamp() - min(enqueued_at))) AS oldest_pending_seconds
FROM private.species_mastery_outbox
WHERE status = 'pending';
```

Rejected rows are `status = 'rejected'`. Exhausted rows are `status = 'exhausted'` after eight failed attempts. Delivery lag is the age of the oldest pending row while lifecycle is `active`. Reconciliation lag is the count of post-cutoff Play catches that are in neither the outbox nor the events table. That count must wait for a GO that allows catch-table reads. Duplicate protection is one outbox row and one event per `catch_id`.

First use is manual. Do not schedule reconcile or deliver.

## 6. Failure responses

**A. Optional note failure.** The catch commits. The outbox may not have a row. A later reconcile, while lifecycle is `active` or `paused`, can insert that id. Do not repeat the encounter to fill the gap.

**B. Delivery failure.** Leave the outbox row pending. `deliver_species_mastery_outbox` retries until eight attempts, then marks the row `exhausted`. A `23514` eligibility reject marks it `rejected`. Neither path inserts another Pokémon. Do not delete the specimen.

**C. Stamp failure.** If the insert error is from `stamp_catch_server_inserted_at`, the catch did not commit. Stop encounters. Do not activate. Do not drop or replace the trigger without a new GO. If catches commit and only Familiarity rows are missing, use path A or B. Do not rewrite `server_inserted_at`. The freeze trigger rejects that change.

**D. Wrong Familiarity counts.** Call `pause_species_mastery_delivery()` so new notes can still queue and delivery stops. Inspect eligibility. Keep earned events. Do not update `species_mastery_events`, historical catches, `species_mastery.points`, or Rankings.

**E. Lifecycle mistakes.** `activated_at` must not be reset or backdated.

| From | Allowed | Effect |
|---|---|---|
| `inactive` | activate once | Sets the cutoff. Irreversible. |
| `active` | pause, drain, or close | Pause stops delivery and still accepts notes. |
| `paused` | resume, drain, or close | Resume does not move the cutoff. |
| `draining` | deliver existing eligible rows, or close | New notes are rejected. |
| `closed` | none | Second activate raises `55000`. Pending rows stay undelivered. |

Pause is the reversible stop. Drain finishes work queued at or before `drain_started_at` and rejects newer notes. Close is permanent.

## 7. Future GO templates

These templates are not authorization. Do not combine them.

### Template 1 — stamp smoke

Permitted action: one catch-insertion smoke on the named nonstaff QA identity, while lifecycle is still `inactive`.  
Account: named in that GO. Not Sora. Not Twinkle. PlayTester only if that GO names PlayTester.  
Mutation: one new specimen. Expect a non-null `server_inserted_at`. Expect no outbox row and no Familiarity event. Keep the specimen.  
Checks: lifecycle still `inactive`, event count still 0, WIRE still false.  
Stop: any insert error, more than one new specimen, or any outbox row.  
Recovery: do not drop the stamp. Do not activate. Leave the failed attempt rolled back.  
Prohibited: activation, delivery, backfill, a second encounter, points, Rankings, WIRE, APP, and frontend changes.

### Template 2 — one-time activation

Permitted action: `SELECT private.activate_species_mastery_events();` once.  
Account: database owner or service role. Not an authenticated trainer session.  
Mutation: `activated_at` becomes non-null and lifecycle becomes `active`. No Pokémon and no event row.  
Checks: the returned timestamp, event count still 0, WIRE still false.  
Stop: if `activated_at` is already non-null, or the call raises.  
Recovery: there is no undo. Do not update the singleton by hand.  
Prohibited: encounters, reconcile, deliver, pause, drain, close, and any second activate.

### Template 3 — one post-activation catch

Permitted action: one controlled encounter for the named nonstaff QA identity after template 2 has committed.  
Account: the same named QA identity. Not Sora. Not Twinkle.  
Mutation: one new specimen and, on success, one pending outbox row. No Familiarity event yet.  
Checks: outbox pending count increased by one. Event count unchanged. Points and Rankings hashes unchanged.  
Stop: a missing specimen, a second specimen, or an event row appearing before the delivery GO.  
Recovery: if the specimen exists and the outbox row does not, stop and use template 4's reconcile only. Do not throw again to fill the gap.  
Prohibited: delivery, a second encounter, backfill, and lifecycle changes.

### Template 4 — bounded reconcile and delivery

Permitted action: one `reconcile_species_mastery_outbox(25)` and, only if the pending count is the expected one, one `deliver_species_mastery_outbox(25)`.  
Account: database owner or service role.  
Mutation: missing eligible ids may enter the outbox. Pending eligible rows may become `delivered` and insert Familiarity events. No new Pokémon.  
Checks: delivered count, event count, and the aggregate status query.  
Stop: if the returned counts exceed the expected catch, or a row becomes `rejected` or `exhausted`.  
Recovery: pause delivery. Do not delete events or specimens.  
Prohibited: scheduling, a limit above 25, historical backfill, and activation changes.

### Template 5 — emergency pause or drain

Permitted action: the GO must choose exactly one of `pause_species_mastery_delivery()` or `begin_species_mastery_drain()`.  
Account: database owner or service role.  
Mutation: lifecycle becomes `paused` or `draining`. No Pokémon changes. Drain does not delete queued rows.  
Checks: lifecycle and the pending-age query.  
Stop: if the current lifecycle is `inactive` or `closed`.  
Recovery: resume is a separate GO and only from `paused`. Close is a separate GO because it is permanent.  
Prohibited: the other verb, close, activate, encounters, and manual edits to `activated_at`.

## 8. Player-facing plan

The name is **Species Familiarity**. Tiers are Familiar at 1 eligible catch, Acquainted at 3, Experienced at 6, Specialist at 12, and Expert at 20. Counts are eligible Play catches after the cutoff, one per specimen, shared by regional forms of the same National Dex. The track is cosmetic. It does not change catch rates, inventory, currency, Pokémon stats, mastery points, or Rankings.

A later UI batch, after a successful hosted delivery, can read `public.species_mastery_progress` for the signed-in trainer. Pokédex species details can show a Species Familiarity line beside the existing Mastery points line. My PC can show the same tier for that species. That batch must not change Join, Prepare, or Throw, and it is not part of D75. No UI was edited or deployed.

## 9. Remaining risks

- The stamp can still abort an insert. No production catch has proved it.
- `private.settle_due_rounds` is not security definer. After activation, a direct authenticated call can fail the note with `42501`. The nested handler keeps the catch, and reconcile has to queue it later. That hosted path was not run.
- Local odds and bag spending were stubbed.
- `service_role` still has broad grants on the progress view. `007` removed the extra `authenticated` grants only.
- Close cannot be reversed. Drain does not by itself deliver; someone must call deliver for rows already queued.

## 10. D76 recommendation

Do not start D76. The next owner decision, if one is requested, is template 1 only: a named nonstaff stamp smoke while recording stays inactive. That decision is not included here and does not authorize activation.

## 11. Actions that still need a separate GO

- Any catch-insertion smoke.
- `activate_species_mastery_events()`.
- Any live or QA encounter.
- Reconcile or deliver.
- Pause, resume, drain, or close.
- A QA account provision, or any PlayTester mutation.
- Backfill, points, Rankings, odds, inventory, WIRE, APP, merge, or frontend deployment.
