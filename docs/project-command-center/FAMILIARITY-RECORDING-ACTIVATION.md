# Species Familiarity recording activation

CODEX-28, 2026-10-20. Owner explicitly answered **Approve activation only** to the recording-only proposal. This is a narrow completed exception to earlier inactive/held records; it does not authorize encounters, progress delivery, WIRE, scheduling or broader D86 work.

Exactly one call to the existing private.activate_species_mastery_events() ran inside a guarded transaction. The transaction locked the activation singleton, required inactive/null-cutoff and empty ledgers, pinned activation/settlement/guard/note bodies, verified all3 enabled stamp/freeze triggers, and required WIRE false. It then verified a finite cutoff and active state before commit. No helper definition, table schema, role or grant was changed.

**Committed cutoff:2026-10-20T16:55:59.896904+00:00**, October20 at12:55:59 PM America/New_York (EDT). Lifecycle active. Immediate and independent subsequent verification both showed events0, outbox0, WIRE false. Subsequent verification found0 Familiarity jobs by either job name or command. Activation body MD5 remains75abaf722451fbc4b1818986ce6cbd71.

This starts recording eligibility for future catches after the cutoff. Existing earlier catches are not retroactively counted. Recording is separate from awarding/delivering cosmetic Familiarity progress: no reconcile or delivery ran. No supported cutoff reset/backdating exists; activation was not called twice. No pause/drain/close operation ran.

Evidence: evidence/familiarity-activation-executed.sql is the exact transaction run (do not rerun); evidence/familiarity-activation-result.json records its committed result. The public gameplay/UI was not exercised. No trainer, specimen, inventory or capture-history rows were selected or changed by this task. Sora mutated NO; Twinkle mutated NO; PlayTester/PlayerQA untouched. No ordinary throw, encounter, direct catch insert, Gen IX WIRE change, collection reset, APP stamp, email, scheduling or spending. APP20261008-rc133 unchanged.

Owner instructed activation, verification and stop. Further post-activation catch tests and bounded delivery remain separate decisions. The historical global QA isolation gap remains; a public encounter must not be assumed private to EmailQA/PlayerQA. Twitch one-link enforcement remains disabled independently.
