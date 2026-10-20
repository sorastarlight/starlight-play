# Pokémon StreamLink — project command center

**Species Familiarity recording is active**, with cutoff2026-10-20T16:55:59.896904Z, after [explicit recording-only approval](./FAMILIARITY-RECORDING-ACTIVATION.md). Verified0 events/outbox; no delivery or scheduling. WIRE remains off; further gameplay/D86 actions remain held.

Post-D85 [next-stage decision](./POST-D85-NEXT-STEP.md): current inactive/empty/off baseline verified read-only. Activation-only proposal remains pending; no D86 execution.

Trainer [keyboard navigation and390px stats review](./TRAINER-KEYBOARD-ACCESSIBILITY.md) completed. Arrow/Home/End focus navigation and retained activation focus; zoom/motion emulation remains open.

Trainer Pokémon [stored stats](./ADMIN-POKEMON-STATS.md) connected after explicit owner approval: moves, nature/ability, HP and IV/EV/Awakening values. Missing older fields remain unavailable; editing disabled.

Trainer v6 [presentation slice](./TRAINER-UI-V6-IMPLEMENTATION.md) applied after owner proceeded; Gym Badges remain unavailable. Full viewport/motion QA remains open.

Trainer UI: [v6 static draft](./design-reset/hub-a-visual-v6.html), [checks and remaining limits](./TRAINER-UI-V6-REVIEW.md). Product integration remains held for visual review.

Twitch policy [installed disabled](./TWITCH-LINKING-HOSTED-STAGING.md) after owner approval. Provider QA has no separate Twitch test identity; owner/protected identities stay excluded. General activation remains held.

Twitch linking: [issue17 audit and proposed policy](./TWITCH-LINKING-ISSUE-17.md) completed read-only; [local enforcement core](./TWITCH-LINKING-IMPLEMENTATION.md) passes65 SQL checks. Full workflow and hosted activation remain incomplete. D85: [bounded local rehearsal](./D85-LOCAL-REHEARSAL.md) now proves the focused stamp criterion;8 escapes,1 replica error and1 natural catch. D86 held.

Helpdesk review: [specification](./HELPDESK-ISSUE-14.md), [interactive desktop/player/staff review](./design-reset/helpdesk-review.html), [390px mobile review](./design-reset/helpdesk-mobile-review.html). Prototype uses fictional data; [connected implementation](./HELPDESK-IMPLEMENTATION.md) is live for signed-in players after real EmailQA player/staff/privacy verification; staff access remains owner-only, completed retention90 days. Staff recovery is enabled owner-only after approved90-day audit retention and real EmailQA staff delivery verification.

D85 investigation: [fingerprint reconciliation](./D85-FINGERPRINT-RECONCILIATION.md) — all three historical hashes match current full definitions; the earlier comparison used body hashes. The later bounded local batch proved the stamp criterion; D86 remains unauthorized.

Current runner: [Codex runner trial](./CODEX-RUNNER.md). The owner's later instructions supersede the Gemini/Cursor handoff pause for routine development and GitHub publication; D86 and database/gameplay changes remain gated.

Account email copy: [friendly hosted templates](./ACCOUNT-EMAIL-TEMPLATES.md) — signup, email-change and reset templates saved; EmailQA real reset completed successfully per owner.

SMTP connected: [Resend configuration and delivery evidence](./RESEND-SMTP-CONNECTION.md) — domain verified, scoped credential saved, one provider simulator message delivered. Full Supabase Auth recovery QA remains separate.

Recovery email staging: [guarded sender and branded template](./CODEX-RECOVERY-EMAIL.md) — staff sending enabled under owner-only safeguards;90-day audit retention and real EmailQA staff dispatch verified.

Latest recovery implementation: [owner-only masked diagnostics](./CODEX-ACCOUNT-DIAGNOSTICS.md). Prior phase: [password recovery foundation](./CODEX-PASSWORD-RECOVERY.md).

Prior design: [account-recovery audit/design](./ACCOUNT-RECOVERY-ISSUE-13.md) and [existing owner-disconnect security repair](./OWNER-DISCONNECT-SECURITY-FIX.md). Trainer gifts/Pass controls are published; frames are retired. Current gift visual direction is accepted; authenticated grant verification remains separate. Owner accepted the recovery proposal; reset completion and read-only diagnostics are implemented. Staff sends and identity changes remain future phases.

Persistent working set for approved development batches. Historical audits stay in `docs/audits/` and are not rewritten here.

**Bootstrap source:** [`STREAMLINK_CURSOR_COMMAND_CENTER.md`](../../STREAMLINK_CURSOR_COMMAND_CENTER.md)

| Document | Role |
|---|---|
| [ROADMAP.md](./ROADMAP.md) | Batches A–F and sequencing |
| [TASKS.md](./TASKS.md) | Human-readable queue |
| [TASKS.json](./TASKS.json) | Machine-readable index |
| [DECISIONS.md](./DECISIONS.md) | Recorded choices and owner approvals needed |
| [RISKS.md](./RISKS.md) | Open/closed risks including R1/R2/R18/R21 |
| [TEST-MATRIX.md](./TEST-MATRIX.md) | What is automated vs untested |
| [RUN-LOG.md](./RUN-LOG.md) | Session evidence |
| [ADMIN-HUB-INVENTORY.md](./ADMIN-HUB-INVENTORY.md) | Source-traced Admin Hub map |
| [ADMIN-HUB-IA.md](./ADMIN-HUB-IA.md) | Proposed next-hub information architecture (implemented preview) |
| [DESIGN-RESET-ISSUE-6.md](./DESIGN-RESET-ISSUE-6.md) | Issue #6 research, journeys, field map |
| [DESIGN-RESET-DECISION.md](./DESIGN-RESET-DECISION.md) | A vs B owner choice (A8) |
| [design-reset/](./design-reset/index.html) | Annotated wireframes for proposals A and B |
| [DESIGN-SPEC-ISSUE-7.md](./DESIGN-SPEC-ISSUE-7.md) | A8 Proposal A implementation spec |
| [design-reset/hub-a.html](./design-reset/hub-a.html) | Integrated hub static prototype |
| [VISUAL-STYLE-GUIDE-ISSUE-8.md](./VISUAL-STYLE-GUIDE-ISSUE-8.md) | Issue #8 tokens and before/after |
| [design-reset/hub-a-visual-v2.html](./design-reset/hub-a-visual-v2.html) | Polished Proposal A comparison prototype |
| [POKEMON-UX-ISSUE-9.md](./POKEMON-UX-ISSUE-9.md) | Issue #9 collection rows and detail contract |
| [design-reset/hub-a-visual-v3.html](./design-reset/hub-a-visual-v3.html) | Pokémon collection comparison prototype |
| [TRAINER-UX-ISSUE-10.md](./TRAINER-UX-ISSUE-10.md) | Issue #10 art source, raised nav, full-row directory |
| [design-reset/hub-a-visual-v4.html](./design-reset/hub-a-visual-v4.html) | Trainer UX polish comparison prototype |
| [TRAINER-RECORD-ISSUE-12.md](./TRAINER-RECORD-ISSUE-12.md) | Issue #12 field matrix, header, Connections, Inventory, Unlockables, Tickets |
| [design-reset/hub-a-visual-v5.html](./design-reset/hub-a-visual-v5.html) | Trainer record IA comparison prototype |
| [POKEMON-LEGALITY-AUDIT-ISSUE-16.md](./POKEMON-LEGALITY-AUDIT-ISSUE-16.md) | Issue #16 catch schema, legality matrix; errata: LGPE has natures |
| [GEN-IX-REBUILD-PLAN-ISSUE-19.md](./GEN-IX-REBUILD-PLAN-ISSUE-19.md) | Issue #19 Gen IX cross-gen rebuild plan, validator, reset playbook |
| [GEN-IX-REF-ISSUE-20.md](./GEN-IX-REF-ISSUE-20.md) | Issue #20 offline pin, checksums, Mega/regional coverage |
| [GEN-IX-REF-READINESS-REVIEW.md](./GEN-IX-REF-READINESS-REVIEW.md) | Issue #21 Gmax, Champions, friendship, secure SQL review |
| [GEN-IX-SCHEMA-ISSUE-22.md](./GEN-IX-SCHEMA-ISSUE-22.md) | Issue #22 unapplied private.ref_* + catch extensions |
| [GEN-IX-SCHEMA-REHEARSAL.md](./GEN-IX-SCHEMA-REHEARSAL.md) | Issue #23 disposable local Postgres rehearsal |
| [GEN-IX-PRODUCTION-PREFLIGHT.md](./GEN-IX-PRODUCTION-PREFLIGHT.md) | Issue #24 read-only production catalog + PostgREST preflight |
| [GEN-IX-APPLY-CHECKLIST.md](./GEN-IX-APPLY-CHECKLIST.md) | Historical D34 controlled apply checklist (UNAPPROVED snapshot) |
| [GEN-IX-APPLY-DECISION.md](./GEN-IX-APPLY-DECISION.md) | Historical D33 packet; backup recorded; apply UNAPPROVED snapshot |
| [GEN-IX-APPLY-HANDOFF.md](./GEN-IX-APPLY-HANDOFF.md) | Historical D34 go/no-go handoff (**BLOCKED** snapshot) |
| [GEN-IX-APPLY-REPORT.md](./GEN-IX-APPLY-REPORT.md) | D35 owner GO schema-only apply + catalog verification |
| [GEN-IX-GENVAL-SPEC.md](./GEN-IX-GENVAL-SPEC.md) | D36 A19-GENVAL specification snapshot |
| [GEN-IX-GENVAL-ISSUE-25.md](./GEN-IX-GENVAL-ISSUE-25.md) | D39 specimen-binding + additive install snapshot; production apply UNAPPROVED |
| [GEN-IX-GENVAL-READINESS.md](./GEN-IX-GENVAL-READINESS.md) | D40 read-only production compatibility; apply UNAPPROVED |
| [GEN-IX-GENVAL-APPLY-CHECKLIST.md](./GEN-IX-GENVAL-APPLY-CHECKLIST.md) | D41 controlled GENVAL-APPLY runbook (not authorized to run; restore never automatic) |
| [GEN-IX-GENVAL-APPLY-DECISION.md](./GEN-IX-GENVAL-APPLY-DECISION.md) | D42 incomplete `[GO]` template snapshot; nothing applied that batch |
| [GEN-IX-GENVAL-APPLY-REPORT.md](./GEN-IX-GENVAL-APPLY-REPORT.md) | D43 owner GO hashed `001` apply + LIVE CATALOG verification |
| [GEN-IX-RESET-SCOPE.md](./GEN-IX-RESET-SCOPE.md) | D43 R-A reset inventory; script unapplied |
| [GEN-IX-GENVAL-RECONCILIATION.md](./GEN-IX-GENVAL-RECONCILIATION.md) | D44 read-only catalog vs hashed `001` |
| [GEN-IX-WIRE-PLAN.md](./GEN-IX-WIRE-PLAN.md) | D44 A19-WIRE architecture; D45 branch persist; APPLY UNAPPROVED |
| [GEN-IX-WIRE-DEV-REPORT.md](./GEN-IX-WIRE-DEV-REPORT.md) | D45 unapplied persist + local REAL SQL + RESET-TEST |
| [GEN-IX-WIRE-INTEGRATE-REPORT.md](./GEN-IX-WIRE-INTEGRATE-REPORT.md) | D46 unapplied settle integration + local REAL SQL |
| [GEN-IX-WIRE-PARITY-REPORT.md](./GEN-IX-WIRE-PARITY-REPORT.md) | D47 LIVE CATALOG settle diff + hook isolation + REAL SQL |
| [GEN-IX-WIRE-APPLY-DECISION.md](./GEN-IX-WIRE-APPLY-DECISION.md) | D48 A19-WIRE-APPLY GO request snapshot |
| [GEN-IX-WIRE-APPLY-REPORT.md](./GEN-IX-WIRE-APPLY-REPORT.md) | D49 owner GO hashed `001`→`002`→`003` apply + LIVE CATALOG |
| [GEN-IX-WIRE-GO-READINESS.md](./GEN-IX-WIRE-GO-READINESS.md) | D50 one-catch activation plan; **WIRE-GO UNAPPROVED** |
| [GEN-IX-WIRE-GO-PROPOSAL.md](./GEN-IX-WIRE-GO-PROPOSAL.md) | D51 PlayTester access + copy-paste WIRE-GO |
| [GEN-IX-WIRE-GO-REPORT.md](./GEN-IX-WIRE-GO-REPORT.md) | D53 PlayTester Bulbasaur catch; switch off again |
| [GEN-IX-ECONOMY-D54.md](./GEN-IX-ECONOMY-D54.md) | D54 unapplied ball debit; local REAL SQL |
| [GEN-IX-ECONOMY-D55.md](./GEN-IX-ECONOMY-D55.md) | D55 safety-net kept; NB001; atomic JSON debit |
| [GEN-IX-ECONOMY-APPLY-DECISION.md](./GEN-IX-ECONOMY-APPLY-DECISION.md) | D56 D55-ECONOMY-APPLY request snapshot |
| [GEN-IX-ECONOMY-APPLY-REPORT.md](./GEN-IX-ECONOMY-APPLY-REPORT.md) | D57 owner GO install + LIVE CATALOG |
| [GEN-IX-D58-LIVE-TEST.md](./GEN-IX-D58-LIVE-TEST.md) | D58 three PlayTester encounters; WIRE off again |
| [GEN-IX-D59-ONBOARDING.md](./GEN-IX-D59-ONBOARDING.md) | D59 skippable Trainer guide; branch only |
| [D61-SPECIES-MASTERY-DESIGN.md](./D61-SPECIES-MASTERY-DESIGN.md) | D61 Species Mastery proposal; not implemented |
| [D62-SPECIES-MASTERY-PROTOTYPE.md](./D62-SPECIES-MASTERY-PROTOTYPE.md) | D62 offline mastery model; not hosted |
| [D63-MASTERY-COMPATIBILITY-REPORT.md](./D63-MASTERY-COMPATIBILITY-REPORT.md) | D63 verification and schema audit |
| [D64-MASTERY-SCHEMA-REPORT.md](./D64-MASTERY-SCHEMA-REPORT.md) | D64 unapplied event ledger; local rehearsal only |
| [D65-MASTERY-HARDENING-REPORT.md](./D65-MASTERY-HARDENING-REPORT.md) | D65 cutoff and recovery draft; not applied |
| [D66-MASTERY-LIFECYCLE-REPORT.md](./D66-MASTERY-LIFECYCLE-REPORT.md) | D66 insert clock and outbox lifecycle; not applied |
| [D67-MASTERY-CATCH-SAFETY-REPORT.md](./D67-MASTERY-CATCH-SAFETY-REPORT.md) | D67 catch preservation draft; not applied |
| [D68-MASTERY-INSTALL-READINESS.md](./D68-MASTERY-INSTALL-READINESS.md) | D68 install review; ready for a separate owner GO; not applied |
| [D69-MASTERY-SCHEMA-GO-PACKET.md](./D69-MASTERY-SCHEMA-GO-PACKET.md) | D69 schema GO packet; not installed |
| [D70-MASTERY-SCHEMA-INSTALL-REPORT.md](./D70-MASTERY-SCHEMA-INSTALL-REPORT.md) | D70 schema installed; mastery inactive |
| [D71-MASTERY-INTEGRATION-PLAN.md](./D71-MASTERY-INTEGRATION-PLAN.md) | D71 integration plan; ledger stays inactive |
| [D72-MASTERY-SETTLEMENT-DRAFT.md](./D72-MASTERY-SETTLEMENT-DRAFT.md) | D72 settlement draft; unapplied |
| [D73-FAMILIARITY-INSTALL-READINESS.md](./D73-FAMILIARITY-INSTALL-READINESS.md) | D73 install packet; not authorized |
| [D74-FAMILIARITY-INSTALL-REPORT.md](./D74-FAMILIARITY-INSTALL-REPORT.md) | D74 integration installed; familiarity inactive |
| [D75-FAMILIARITY-ACTIVATION-READINESS.md](./D75-FAMILIARITY-ACTIVATION-READINESS.md) | D75 activation plan; owner GO required |
| [D76-FAMILIARITY-STAMP-SMOKE-GO-PACKET.md](./D76-FAMILIARITY-STAMP-SMOKE-GO-PACKET.md) | D76 stamp-smoke packet; not approved |
| [D77-PLAYERQA-ACCOUNT-REPORT.md](./D77-PLAYERQA-ACCOUNT-REPORT.md) | D77 PlayerQA provisioning blocked |
| [D77-R1-PLAYERQA-PROVISIONING.md](./D77-R1-PLAYERQA-PROVISIONING.md) | D77-R1 registration blocked; password channel missing |
| [D77-R2-PLAYERQA-VERIFICATION.md](./D77-R2-PLAYERQA-VERIFICATION.md) | D77-R2 PlayerQA verified; encounter GO required |
| [D78-PLAYERQA-STAMP-SMOKE-REPORT.md](./D78-PLAYERQA-STAMP-SMOKE-REPORT.md) | D78 stamp smoke blocked; no encounter |
| [D79-QA-ENCOUNTER-ISOLATION-DESIGN.md](./D79-QA-ENCOUNTER-ISOLATION-DESIGN.md) | D79 isolation design is a no-go |
| [D80-ENCOUNTER-SAFETY-ARCHITECTURE.md](./D80-ENCOUNTER-SAFETY-ARCHITECTURE.md) | D80 launch guard confirmed; QA lane not chosen |
| [D81-LAUNCH-GUARD-INSTALL-READINESS.md](./D81-LAUNCH-GUARD-INSTALL-READINESS.md) | D81 launch-guard packet; install not authorized |
| [D82-LAUNCH-GUARD-SECURITY-GATE.md](./D82-LAUNCH-GUARD-SECURITY-GATE.md) | D82 security gate passed; install still needs a GO |
| [D83-LAUNCH-GUARD-INSTALL-REPORT.md](./D83-LAUNCH-GUARD-INSTALL-REPORT.md) | D83 launch-guard installed; no encounter |
| [D84-VERIFICATION-PLAN.md](./D84-VERIFICATION-PLAN.md) | D84 verification plan; production stamp still blocked |
| [D85-STAMP-REHEARSAL.md](./D85-STAMP-REHEARSAL.md) | D85 historical stop; see CODEX-17 hash reconciliation |
| [GEN-IX-RESET-REHEARSAL.md](./GEN-IX-RESET-REHEARSAL.md) | D45 local RESET-TEST; showcase cleanup implemented; production UNAPPLIED |

Cursor operating limits: `.cursor/rules/streamlink-project.mdc`. That file does not schedule unattended work.

**Current boundaries:** routine GitHub publication authorized by owner; APP `20261008-rc133`, final gameplay smoke pending, protected-account testing and gameplay activation/reset remain gated, PlayTester nonstaff, legacy `admin.html` / `js/admin-live.js` untouched.

## Agent coordination

[GEMINI-HANDOFF.md](./GEMINI-HANDOFF.md) is archival. Codex is the active sole runner. D83 is installed; D85 hash mismatch is explained and its focused local stamp rehearsal passed; D86 not authorized.

[COORDINATION.md](./COORDINATION.md) defines GitHub handoffs and approval gates. Repository protocol only; monitoring and Cursor execution are disabled. A later owner GO installed the launch-guard function as D83.
