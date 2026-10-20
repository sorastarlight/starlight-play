# Familiarity delivery local readiness — CODEX-32

2026-10-20. Continuation after the separately approved WIRE activation. This batch adds local delivery/reconciliation tests and reads hosted catalog/aggregate status only. No hosted delivery, reconciliation, encounter, scheduling or lifecycle action was performed.

## Result

**33/33 REAL LOCAL SQL checks passed**, including the19 current WIRE/catch-stack checks and14 delivery checks. The opt-in command is `node tools/wire-current-stack-rehearsal.js --local-only --with-familiarity-delivery`. Default mode still passed its19 checks separately. D71/D72 static suites,9 species-mastery model tests, syntax and3 process/cleanup guards passed.

The delivery mode loads117 exact catalog function bodies, the six catch triggers, actual outbox admission trigger, actual event validation trigger, event table constraints/indexes and the existing security-invoker progress view. The five added function bodies were captured read-only from the host; existing reference checksums still match the9-table baseline inside the local fixture.

Tested: bounded batches; tiers at1/3/6/12/20; no duplicate events on replay; immutable event updates and forged trainer rejection; missed-note reconciliation without another catch; paused queueing without delivery; rejection of new work during draining; transient delivery failure and retry; two concurrent delivery workers; eight-failure exhaustion; rejection of test-reward specimens and insertion before the cutoff; own-trainer SELECT versus another synthetic identity; denied authenticated delivery, reconciliation and event deletion.

Delivery/reconciliation changed no existing Pokémon, XP, candy, older mastery points, items or notices. Creating fictional catches through the existing settlement does grant their ordinary rewards; those catch effects are distinct from delivery. The final local fixture had22 specimens,20 delivered Familiarity events (Expert tier), one deliberately exhausted row and one deliberately rejected row. Those two failure fixtures are expected, not production findings. All local clusters were removed.

Evidence: [result](evidence/familiarity-current-stack-result.json), [guards](evidence/familiarity-current-stack-guards.json), [delivery catalog and view/policy metadata](evidence/familiarity-delivery-catalog-20261020.json), [hosted aggregate snapshot](evidence/familiarity-delivery-baseline-20261020.json).

## Corrections and limits

An initial tier-fixture run exhausted its20 fictional Poké Balls and correctly produced No throw/no_ball_left. The fixture now uses the existing free borrowed-throw path for tier-count setup; it does not bypass inventory validation. Failed fixture runs are not counted as passes.

The prior CODEX-30 rehearsal covered all catch triggers, but explicitly excluded nested triggers on other tables. This mode now adds the actual outbox admission and event guard triggers, rather than treating the earlier queue-only checks as delivery proof.

This remains a local integration environment, not a production clone. Forced local TEST outcomes with rewardMode live and expired deadlines are not natural odds/timing evidence. Foreign keys and unrelated nested triggers are excluded. Pause/drain states and future-cutoff changes are rolled-back/local fixtures, not lifecycle operator-function tests. Event RLS and the security-invoker view are tested with a synthetic auth.uid claim function; no real Supabase sign-in was tested. No browser or player-facing Familiarity UI is claimed.

## Hosted status and next checkpoint

Read-only aggregate/catalog snapshot at18:18:48Z: WIRE true; Familiarity active; outbox empty; event count0; no Familiarity cron jobs. Client EXECUTE denied for delivery, reconciliation, record, admission and guard functions. Events RLS enabled/forced; authenticated can SELECT the progress view and has no write privilege on it. No trainer/specimen identities or catch-history rows were selected.

There is no queued hosted work to process at that snapshot, so no speculative manual delivery or scheduling is proposed. Actual post-activation hosted capture/delivery validation remains unverified and separately gated. The public QA isolation issue remains; no public encounter should be assumed private to EmailQA. Do not create an encounter merely to fill the queue. Future bounded delivery requires an expected scope/count and its own decision before mutating the ledger. No automatic monitor or job is enabled by this report.

The next useful development slice is the planned player-facing Familiarity display/review. Current JS pages do not consume species_mastery_progress; backend recording/delivery readiness does not mean the new track is visible publicly. Preserve the existing Mastery points label separately.

Sora mutated NO; Twinkle mutated NO; PlayTester/PlayerQA/EmailQA untouched. No hosted writes, trainer reads, schema/role changes, spending, stamp or deployment commands. Routine GitHub publication only. APP20261008-rc133; final release smoke paused.
