# CODEX-38 — Explicitly approved one-event Familiarity delivery

Owner approved **one-event delivery only** after CODEX-37's first natural catch. Used the exact prepared `evidence/familiarity-one-event-proposal.sql` from commit ed1822bb; its proposal header is historical. Do not reexecute it: the approved single event is already delivered.

At02:07:27.047154 UTC October21 /10:07PM October20 EDT, the existing worker processed only catch875c6f48-60b3-42c8-b540-370407839281 for EmailQA, Caterpie #10. Transaction required exactly one expected pending row, pinned worker/recorder/guard code and cutoff, and asserted one event plus unchanged QA profile, inventory, specimen and lifecycle JSON. It committed successfully.

Independent verification02:07:37 UTC: queue delivered, attempts0, exactly one matching event; eligible count1, tier1 **Familiar**; pending queue0. Director stayed OFFLINE/held/inactive with no queue or next encounter time. No reconciliation, scheduler, lifecycle operation, encounter, reset, role change, spending or build stamp.

Actual authenticated Pokédex refresh and Your Research tab showed **Familiar · 1 recorded catch**, separate from Mastery1 point and Evolution Candy3. Screenshot: task visualization `emailqa-caterpie-familiar-delivered.png`. Evidence: `familiarity-one-event-execution.json`, `familiarity-one-event-verification.json`. Local packet/worker evidence remains38 REAL LOCAL SQL checks from CODEX-37; no repeated hosted worker invocation was used as an idempotency test.

Verdict: **PRODUCTION PASS for this single eligible catch → outbox → event → authenticated Familiarity display**. Future automatic processing remains unconfigured/unapproved. My PC Familiarity display and the separate shared-stat formatter correction remain outstanding. Protected gameplay controls were not invoked; the delivery transaction verified no profile/inventory/specimen mutation.
