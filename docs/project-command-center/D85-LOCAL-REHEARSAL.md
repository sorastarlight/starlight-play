# D85 isolated canonical settlement rehearsal

Owner continued the proposed local rehearsal on 2026-10-19. This authorizes one disposable local throw, not hosted gameplay, D86, activation, reset, spending or a build stamp.

`tools/d85-stamp-rehearsal.js --one-local-throw` starts a fresh embedded PostgreSQL cluster bound to loopback, verifies the actual server address, checks every loaded body hash, and uses one synthetic trainer and one ordinary Poké Ball. It loads the current hosted settlement, materializer, insertion stamp, launch guard, spending, secure roll, odds and their executed helper bodies unchanged. It waits the full hosted 30/30/30/15-second phases using the installed deadline calculation. No forced result or retries.

Inputs are read-only catalog snapshots and public Bulbasaur/Poké Ball/capture-balance reference rows. No hosted trainer rows, passwords, tokens or gameplay calls were used. The three earlier fingerprint mismatches remain explained by the full-definition/body comparison error; see D85-FINGERPRINT-RECONCILIATION.md.

This is a focused settlement/stamp replica, not a complete production clone. Tables have catalog column shapes and synthetic constraints. Only the server insertion stamp trigger is installed; specimen generation, XP, presentation and timestamp-freeze triggers are outside this check. No result here establishes complete production readiness or the full launch/join/throw UI path.

## Observed result

REAL LOCAL SQL on PostgreSQL 17.5: 8 checks passed. One natural **escape**, chance 0.160000, secure roll 0.96509424164274548730. Exactly one ordinary Poké Ball debit; replay added neither a debit nor a specimen. WIRE false and Familiarity inactive. No specimen exists from which to prove an insertion stamp. **D85 stamp criterion remains incomplete.** No automatic reroll was performed. Disposable cluster stopped and its checked temporary directory removed.

Evidence: `evidence/d85-local-result.json`; inputs: `evidence/d85-local-replica-inputs.json` and `evidence/d85-local-timings.json`. The executable refuses without the explicit `--one-local-throw` flag. An initial address-format guard rejection happened before seeding or throwing; the guard now accepts PostgreSQL's loopback `/32` representation while still requiring loopback. The next run produced the single recorded result.

D86 remains unauthorized. Additional ordinary local attempts require the owner's decision; meanwhile issue #17 research/design can proceed without touching links or OAuth.
