# D85 isolated canonical settlement rehearsal

Current status: CODEX-26 completed the focused local stamp criterion on2026-10-20. See the approved bounded batch below; no production or D86 authority follows.

Owner continued the proposed local rehearsal on 2026-10-19. This authorizes one disposable local throw, not hosted gameplay, D86, activation, reset, spending or a build stamp.

`tools/d85-stamp-rehearsal.js --one-local-throw` starts a fresh embedded PostgreSQL cluster bound to loopback, verifies the actual server address, checks every loaded body hash, and uses one synthetic trainer and one ordinary Poké Ball. It loads the current hosted settlement, materializer, insertion stamp, launch guard, spending, secure roll, odds and their executed helper bodies unchanged. It waits the full hosted 30/30/30/15-second phases using the installed deadline calculation. No forced result or retries.

Inputs are read-only catalog snapshots and public Bulbasaur/Poké Ball/capture-balance reference rows. No hosted trainer rows, passwords, tokens or gameplay calls were used. The three earlier fingerprint mismatches remain explained by the full-definition/body comparison error; see D85-FINGERPRINT-RECONCILIATION.md.

This is a focused settlement/stamp replica, not a complete production clone. Tables have catalog column shapes and synthetic constraints. Only the server insertion stamp trigger is installed; specimen generation, XP, presentation and timestamp-freeze triggers are outside this check. No result here establishes complete production readiness or the full launch/join/throw UI path.

## Initial observation —2026-10-19

REAL LOCAL SQL on PostgreSQL 17.5: 8 checks passed. One natural **escape**, chance 0.160000, secure roll 0.96509424164274548730. Exactly one ordinary Poké Ball debit; replay added neither a debit nor a specimen. WIRE false and Familiarity inactive. No specimen exists from which to prove an insertion stamp. **D85 stamp criterion remains incomplete.** No automatic reroll was performed. Disposable cluster stopped and its checked temporary directory removed.

Evidence: `evidence/d85-local-result.json`; inputs: `evidence/d85-local-replica-inputs.json` and `evidence/d85-local-timings.json`. The executable refuses without the explicit `--one-local-throw` flag. An initial address-format guard rejection happened before seeding or throwing; the guard now accepts PostgreSQL's loopback `/32` representation while still requiring loopback. The next run produced the single recorded result.

At this initial stage, additional attempts required a new owner decision. The later approved batch below supersedes that incomplete local-stamp status; D86 remains unauthorized.

## Approved bounded batch —2026-10-20 (CODEX-26)

Owner explicitly approved up to10 additional ordinary isolated local attempts, stopping at the first catch. The cap was not reset after an error. Results: **8 escapes,1 local replica error (attempt7),1 completed natural catch (attempt10)**. The batch stopped immediately after attempt10. All9 completed attempts passed the same8 checks; no additional ordinary throws were run for validation.

Attempt7 reached the canonical catch materializer but failed because the local replica omitted private.streamlink_protected_trainer(uuid). Settlement did not complete; the transaction/outcome was not persisted and its roll is unknown. It is not catch/stamp proof. The batch stopped, the exact helper definition/body hash was read from the hosted catalog (no trainer rows or gameplay calls), and that helper was added to a supplemental local snapshot. The canonical settlement/materializer/odds/spending bodies were unchanged. A new preflight-only mode verified loopback, hashes and dependency existence without seeding a trainer, round or throw. Attempts8–10 used the remaining3 authorized attempts; attempt7 was not retried or removed from the count.

Attempt10: chance0.160000, cryptographic roll0.15808739928268167318, natural Caught. Server insertion stamp2026-10-20T16:27:36.578Z lies within settlement window16:27:36.565Z–16:27:36.580Z. Exactly1 ordinary Poké Ball debit and1 specimen; replay added neither another debit nor another specimen. WIRE false; Familiarity inactive. **D85's focused local stamp criterion is satisfied.** This does not establish full production readiness or authorize D86.

Evidence: evidence/d85-approved-batch-20261020/summary.json; each completed attempt JSON and all10 logs, including the failed attempt; source-lock.json and source-lock-after-repair.json; validation.json. Attempt10 retains the raw stamp and settlement interval. Exact supplemental helper snapshot: evidence/d85-local-extra-dependencies.json (body MD5 0fa172fb089bf52959bbbbee3703ccdf). Original snapshot and original one-escape evidence are preserved.

Final guards: no opt-in exits1; a banned hosted-target environment exits1 before connection; no d85-* local cluster directories remain. The replica still uses PostgreSQL17.5, catalog-shaped tables/synthetic constraints, and only the insertion stamp trigger. Specimen generation, XP, presentation triggers, full launch/join/throw UI, hosted gameplay and activation were not tested. No hosted DDL/data writes; Sora mutated NO; Twinkle mutated NO; PlayTester/PlayerQA untouched; no spending or build stamp. D86 remains unauthorized.
