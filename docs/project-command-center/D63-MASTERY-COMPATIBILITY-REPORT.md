# D63 — Onboarding verification and Species Mastery compatibility

**Status:** VERIFICATION AND DESIGN ONLY. Species Mastery is not implemented. D64 is not authorized.  
**Branch:** `admin-hub-overhaul`  
**Starting commit before this report:** `75c1b285` (fast-forward from local `6b29b591`, which had stopped at the D59 pointer).  
**Production APP:** `20261008-rc133` (unchanged).  
**WIRE:** read once; `enabled=false`. Not switched.

No production account, catch, inventory, ledger, encounter, settlement, or SQL change.

## 1. Repository state

Working tree was clean. Local `admin-hub-overhaul` was six commits behind `origin/admin-hub-overhaul`. Those commits were fast-forwarded and not rewritten.

| Commit | What it contains |
|---|---|
| `f2153444` / `6b29b591` | D59 six-step Trainer guide |
| `695588b8` | D60: Play live rounds stay collapsed; borrowed-throw sentence added |
| `5110402e` | D60 tests for live-round precedence |
| `a9ac9457` | D61 design proposal only |
| `1749cdbf` | D62 offline model `tests/fixtures/species-mastery-model.js` |
| `7a0648ee` | D62 synthetic tests |
| `75c1b285` | D62 scope note |

No commits after `75c1b285` existed at the start of this batch. The mastery model is required only by `tests/species-mastery-tests.js`. It is not referenced by a page, `js/play.js`, or a settlement function.

## 2. D59–D62 verification

D59–D62 were treated as provisional. The files match the commits above.

| Batch | Result |
|---|---|
| D59 | Guide still has six steps, skip/resume, and no gameplay RPC. Not deployed. |
| D60 collapse | Verified. On Play, a live round returns the chip even when reopen or force is set. Join stays reachable. |
| D60 borrowed sentence | Inaccurate for the Play screen. Corrected in this batch. See section 4. |
| D61 | Still a proposal. Not a shipped feature. |
| D62 | Offline model matches the 1 / 3 / 6 / 12 / 20 ladder. 9/9 passed. Still disconnected from hosted play. |

Tier 0 is named `Unmastered` in the prototype and `Discovered` in the D61 write-up. The five catch thresholds the owner named are the ones the tests lock. Tier 0 is only the state before the first eligible catch.

## 3. Exact test results

```text
node tests/onboarding-tests.js
8 passed

node tests/species-mastery-tests.js
9/9 passed

node tests/admin-hub-overhaul-tests.js
46 passed
```

The onboarding count was 8 after the D60 tests. The hub count is 46 after the D63 document check below. No test failed.

Local harness (`tests/fixtures/d59-onboarding-harness.html`), LOCAL HARNESS:

- A live-round scene showed only the Trainer guide chip. Join stayed on the page.
- Clicking that chip during the live round left it collapsed.
- An experienced-trainer scene hid the guide and left Join in place.
- Skip on the Poké Ball step stored step 4 (`skipped`). Reopen restored “Step 5 of 6” and the corrected ball copy.

No encounter was started. No production account was used.

## 4. Narrow fix

D60 told new trainers: “If you have none, the game may provide a borrowed standard throw as a safety net.”

The server still has that safety net. `public.play_throw` can mark `standard` as a free `standard_throw`, and a Poké Ball throw is free only when the trainer has no throwable balls. Settlement does not insert a ball into the bag. The Play screen does not offer that action. Throw buttons require a quantity above zero, and an empty bag says to restock at the Mart. `js/play.js` states that it must not invent a free ball.

The guide now says to choose an owned Poké Ball, that an owned ball is spent on a catch or an escape, and that an empty bag does not offer a throw. The static test no longer requires the borrowed-throw sentence.

No catch, spend, odds, or settlement code was edited.

## 5. Database compatibility (catalog only)

Read-only catalog on project `dtflmlbjhttoewqgkujf`. No `SELECT` from `public.catches` or from any trainer row.

Confirmed live structures:

- A specimen is `public.catches.id` (uuid). `public_id` is also unique. Ownership is `catches.user_id` → `profiles(id)` on delete cascade.
- Canonical species is `catches.dex` (check 1–1025). `private.ref_species` is keyed by content build and dex. It has no form column.
- Form is `catches.pokemon_form_id` → `public.pokemon_forms(pokemon_form_id)`. Forms are unique on `(dex, form_key)`.
- Shiny and gender are specimen fields: `catches.variant` (default `normal`) and `catches.gender`. `capture_log` also has `is_shiny` and `is_female`.
- Seen species and seen forms are separate: `species_seen (user_id, dex)` and `form_seen (user_id, form_id, dex)`.
- One play catch per trainer per round is unique: `catches_round_user_uidx` on `(round_id, user_id)` where `round_id` is not null.
- `catches_source_key_uidx` is unique on non-null `source_key`.
- `capture_log_once_idx` is unique on `(round_id, user_id)`. `success` is a nullable boolean. Escapes can be logged without a catch row.
- `private.persist_streamlink_catch` requires `play:%` for context `catch`, `grant:%` for `grant`, and `event:%` for `event`. Its live body does not mention `obtained_method`. The column defaults to `CAPTURE`.
- `obtained_method` has no check constraint.

Existing mastery, already live, is a different system:

- `public.species_mastery (user_id, dex)` stores `points` and `rank`, not an eligible-catch count.
- `private.mastery_rank` maps points to ranks at 1, 5, 15, 35, and 75.
- `private.register_capture_collection` still mentions a shiny bonus and idempotency `mastery-catch:<catch id>`.
- `after_catch_xp` calls that function when `round_id` is not null, unless `obtained_method` is `ADMIN_QA` or `source_key` starts with `admin:`. It does not exclude `grant:%` or `event:%`.
- `mastery_ledger` has partial unique `(user_id, idempotency)`. RLS is on and there is no policy. `user_id` has no foreign key.
- `species_mastery` RLS allows the signed-in trainer to select their own row. Rankings already sum `points`.

## 6. Assumptions versus open questions

Confirmed:

- Duplicate play catches of one dex can be counted without adding a Pokédex species row. Seen and caught are already separate.
- Shiny and form stay on the specimen. They must not become extra mastery tracks.
- Replay of one `source_key`, or one `(round_id, user_id)` catch, cannot insert a second specimen.
- A failed throw can exist in `capture_log` with no catch row.
- Trainer A’s `species_mastery` row is not readable as trainer B’s under the current select policy.
- The D62 model does not mutate the records it summarizes and does not touch odds, coins, or inventory.
- WIRE is off.

Not confirmed, and not assumed:

- Whether every historical `source_key` that should count uses the `play:%` prefix. That needs a later authorized census. This batch did not read catch rows.
- Whether any `grant:%` or `event:%` rows also have a `round_id`. Those would receive today’s points mastery.
- Whether regional forms that share a national dex should share one mastery track. The live key is dex, not form.
- Whether the old points and shiny bonus should keep feeding Rankings. They do today. The D61 ladder must not overwrite them.

Blocker: `obtained_method = CAPTURE` does not prove a play catch. `species_mastery.points` is not an eligible-catch count. Do not backfill the new ladder from points, and do not reuse `grant_mastery` as the cosmetic counter.

## 7. Proposed persistent architecture (not implemented)

Keep the current points, rank, Rankings board, and shiny/evolution point grants untouched.

Add a separate server-owned event, not a client total:

- Table suggestion: `public.species_mastery_events (trainer_id, catch_id, dex, source_key, created_at)` with primary key `(trainer_id, catch_id)`.
- Insert only from the settlement path that already inserted a `public.catches` row whose `source_key` starts with `play:`, whose `round_id` is not null, and whose round is not a test round.
- Reject `admin:%`, `grant:%`, `event:%`, null source keys, and `capture_log.success` that is not true.
- One insert per catch id. Replay hits the primary key and does nothing.
- A view or generated total per `(trainer_id, dex)` feeds the tiers Familiar 1, Acquainted 3, Experienced 6, Specialist 12, Expert 20.
- Rewards are labels and cosmetic flags only. No coins, items, catch-rate, or bag writes.
- Releasing or trading the specimen does not delete the event.
- Forms and shinies stay on `catches`. The event stores dex only until an owner says a form is its own species.
- RLS: the trainer may select their events. Inserts and updates stay on the security-definer settlement function. No client RPC that accepts a catch id and a boolean.
- My PC and Pokédex can later read the total. They must not replace the specimen list or the seen/caught flags.
- A future Trainer profile may pin up to three species. That stays off this table’s critical path.
- Pokédex milestones, Research Tasks, and Trainer profiles stay separate features.

Rollback of a future migration is drop the new table and view. Do not drop `species_mastery` or `mastery_ledger`.

Synthetic tests for that later batch: first catch, second catch, shiny and form on the same dex, replay, escape, admin and grant source keys, two trainers, concurrent duplicate insert, and a check that `catches` columns are unchanged.

## 8. Risks

- Writing the new count into `species_mastery.points` would change Rankings and mix shiny bonuses into the cosmetic ladder.
- Treating default `CAPTURE` as proof of a play catch would count grants or imports if they were inserted with a round id.
- A client-supplied `provenanceVerified` flag, as in the D62 fixture, is not acceptable on the server.
- A historical backfill without a source census can award mastery for non-play rows.
- Turning WIRE on, or hooking the new insert into settlement, is a gameplay change and is out of this batch.

## 9. Owner decisions required

1. Keep today’s points mastery and add a separate eligible-catch track.
2. Launch prospective-only, with backfill only after a separate read of source prefixes.
3. Confirm that regional forms sharing a national dex share one mastery track.
4. Leave the live shiny and evolution point grants in place.
5. Authorize deploy of the Trainer guide separately from mastery. It is still branch-only.

## 10. Recommended D64 scope

D64, if authorized later, should be an unapplied SQL draft plus a disposable local rehearsal of the new event table. It should not apply SQL, change `grant_mastery`, change settlement, build UI, backfill, deploy, or turn WIRE on.

## Close-out

- D60’s branch behavior is verified and the borrowed-throw sentence is corrected. The guide is still not deployed, so D60 is closed as branch work only.
- D62 offline validation passes: 9/9.
- The live schema can identify a play specimen and can store a separate event. It cannot represent the D61 ladder in `species_mastery.points`.
- Sora mutated **NO**. Twinkle mutated **NO**. QA account **none**.
