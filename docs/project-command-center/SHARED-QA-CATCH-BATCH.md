# CODEX-37 — Bounded hosted catch batch

Owner explicitly approved up to10 ordinary shared EmailQA encounters, one owned Poké Ball/no item each, stopping at the first catch or error/session change/other participant. **Stopped after3 at the first natural catch. The remaining allowance is not reusable after that stop condition.** No progress delivery was authorized.

## Actual hosted results — October20 EDT / October21 UTC

|Attempt|Round|Species|Chance / roll|Result|
|---|---|---|---|---|
|1|c3327fc8-8a7f-451b-9311-06011d8a75c8|Bulbasaur|0.16 /0.916905373340068|Escape|
|2|2df8a097-9b51-4053-ac00-3887ea2d1a44|Bulbasaur|0.16 /0.6183426109188375|Escape|
|3|a4716fd6-2b68-42bf-93f7-07a75e27b2fc|Caterpie|0.34 /0.09844407804416377|Caught|

EmailQA's visible identity was checked immediately before each launch and before ball selection. Each encounter had exactly one participant, no others, one processed ordinary owned Poké Ball and no preparation item. Timers/rolls were natural. Reused the CODEX-35 guarded existing server launch to avoid director scheduling; third call selected common Kanto #10/form10 instead of #1/form1. No catch odds, outcome, deadline, config or function was altered. Public admin launch authentication was not tested by this database-operator route.

Three BAG_SPEND debits(-1 each); final Poké Ball7, Great Ball5, Ultra Ball3. No new attendance ball in this batch; the prior CODEX-36 attendance award is separate. Ordinary catch/participation rewards were retained. No refund/cancel/reset/stamp/spending command. Director remained OFFLINE/held/inactive, no queue and no next encounter time. No protected player participated and no protected gameplay control was clicked.

## Positive catch proof

Catch875c6f48-60b3-42c8-b540-370407839281, Caterpie #10, female, level6, ordinary variant. Encounter and specimen gender/level/variant agree. Source key exactly `play:<round>:<EmailQA>`. Finite server insertion timestamp01:53:33.408818 UTC is after the unchanged Familiarity cutoff. Ruleset `streamlink-gen9-xgen`, content build `sl-ref-20261013-227b573`, nature5/ability19 both valid in the pinned reference. Moves Tackle/String Shot; IVs20/4/12/7/9/23; EVs/AVs all0; stored HP22/22.

Exactly one catch and one capture log for success; no duplicate catch observed under subsequent normal polling. No explicit settlement replay RPC was called. My PC shows the retained Caterpie; Pokédex shows Caught1, female1, Mastery1 point, Evolution Candy3. Authenticated Familiarity display correctly says `Not recorded yet` while its event awaits processing.

Exactly one outbox admission for this catch: pending, attempts0, delivered_at null. No delivered Familiarity event. This proves capture/WIRE/stamp/admission, **not delivery or complete launch readiness**.

## New launch finding — R-PC-STATS

Actual My PC screenshot shows **HP23** while the stored maximum is22. Read-only catalog inspection confirmed `private.catch_json(public.catches)` (MD5 `26eb7c2e22cd998137826e094360475d`) unconditionally uses the old `lgpe_stat` calculations. This affects the shared read response, not the correctly stored WIRE specimen. Other displayed stats may also use the wrong formula. Do not mark the stats display as passed or rewrite the stored catch. Prepare a focused read-formatter correction preserving legacy-row behavior and actual stored missing values; review caller/CP effects before installation. Source baseline is archived in `evidence/wire-catch-json-formatter-baseline.json`.

## Next delivery proposal — prepared, not applied

`evidence/familiarity-one-event-proposal.sql` would process only this catch through `deliver_species_mastery_outbox(1)` once. It locks the queue, requires exactly the expected single pending identity, pins worker/recorder/guard bodies and activation cutoff, asserts exactly one event, and verifies QA profile/inventory/specimen and activation JSON remain unchanged. No reconciliation or scheduler.

**38 REAL LOCAL SQL checks passed**, including5 new checks of this concrete packet with fictional IDs: wrong trainer/extra pending/worker drift rejected, expected delivery unchanged gameplay, repeat execution rejected. The test substitutes exact PostgreSQL timestamp text; an initial fixture using JavaScript's millisecond timestamp lost microseconds and correctly failed the cutoff check. The corrected rehearsal passed and rolled its proposal fixture back. Existing worker bodies match the prior catalog rehearsal. A read-only hosted preflight of the actual guard prefix passed; no hosted worker executed.

Evidence: `shared-qa-batch-{1,2,3}-{launch,result}.json`, `shared-qa-batch-{specimen,identity,economy-outbox,final}.json`, `familiarity-current-stack-result.json`, `familiarity-one-event-preflight.json`. Actual screenshots saved in the task visualization folder: `emailqa-caterpie-catch.png`, `emailqa-caterpie-pc.png`, `emailqa-caterpie-research-pending.png`.

Verdict: hosted ordinary escapes/catch/WIRE/stamp/outbox admission verified; player stat display has an open mismatch; Familiarity delivery and other launch smoke remain unverified. No additional encounters, delivery, reconciliation, scheduling, reset, APP stamp, role changes or spending are implied.
