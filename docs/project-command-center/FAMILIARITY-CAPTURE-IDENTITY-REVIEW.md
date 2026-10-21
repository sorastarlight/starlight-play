# Launch blocker — preserve the original capture identity

Current evidence: five REAL LOCAL SQL checks reproduce the failure using the exact hosted delivery, record, event guard and reconciliation functions. Only fictional records were changed. The live queue has one delivered record and zero pending/rejected/exhausted records; no live repair or new delivery was performed.

## Current failure

Delivery constructs the event from the current catches row. The event guard compares it to the original successful capture log. A caught Caterpie evolved into Metapod before delivery fails the dex check. Trading it changes the owner and fails the source-key check. Releasing it removes the specimen and fails the existence check. Each valid queued catch becomes rejected rather than earning Familiarity. Reconciliation also fails to recover an evolved catch after missed queue admission. Running a worker every minute reduces the window but cannot eliminate this race.

Reproduce: `node tools/familiarity-mutation-race-rehearsal.js`. Evidence: `evidence/familiarity-mutation-race-local-result.json`. This harness directly edits fictional rows to represent mutation outcomes; it does not test actual evolution/trade/release RPCs. Exact hosted definitions and relevant column types were used; unrelated triggers/FKs/Auth policies are excluded. A reproduced defect is not a fix or a launch pass.

## Recommended behavior and correction scope

Every eligible capture should permanently credit its original catcher and originally caught species. For example, EmailQA catching Caterpie earns one Caterpie Familiarity event even if Caterpie becomes Metapod, moves to another trainer, or is released before delivery. Evolution and trade do not create another capture event or transfer Familiarity. Staff gifts, unsupported/test catches and pre-cutoff data remain excluded. Existing events stay immutable; existing activation cutoff remains unchanged.

Implement immutable capture identity at server-side queue admission: original trainer, caught dex, round, source key and server insertion timestamp. Bind that identity to the server's successful capture record and activation rules before accepting it. Delivery validates the trusted queued identity rather than mutable ownership/dex/existence. Queue lifecycle/status/retry fields remain mutable through existing controlled helpers; capture identity fields do not. Browser roles get no queue writes or worker EXECUTE. Preserve current duplicate, pause/drain/close and retry guards.

Reconciliation should recover only provable identities from authoritative capture evidence and immutable identifiers. Do not guess dex from a later form or credit a trade recipient. If both a specimen and its queue identity are absent and existing logs cannot bind the original catch ID, mark the evidence gap for review rather than inventing a backfill. Existing historical rows need explicit conservative migration rules; the single already-delivered live event should remain unchanged.

Required tests before installation: delayed evolution/trade/release credit to original trainer/dex; no recipient progress; no duplicate on replay; no additional reward/economy/specimen mutation; tamper denial; failed/test/gift/pre-cutoff denial; pause/drain/close; rejected/exhausted handling; missed-admission reconciliation with and without adequate evidence; concurrent mutation/delivery; exact rollback and existing-event invariance. Keep pending delivery empty while validating the migration guard.

This is a proposed durable progression behavior correction and schema change, not an applied migration. Owner decision is needed on the original-capture credit semantics before implementation/installation. No worker, schedule, bulk delivery, retrospective reset or gameplay allowance follows from that decision.

## Automatic delivery remains a separate launch decision

pg_cron already exists. The only current jobs are the approved recovery and support retention jobs; no Familiarity job exists. After this race is fixed and tested, propose a private bounded worker using the established lifecycle and retry rules, with overlap prevention, health visibility, explicit enable/disable and no public EXECUTE. Scheduling/reconciliation/delivery was excluded from previous gameplay approvals, so no job is created by this review. Do not buy an add-on or add an external credential merely to run it.
