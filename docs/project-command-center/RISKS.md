# Risk register

| ID | Status | Notes |
|---|---|---|
| R1 | **CLOSED** | CODEX-34 migration20261021011358 puts require_hub before settlement; independent catalog verification. See LAUNCH-SECURITY-HARDENING.md. |
| R2 | **CLOSED for current admin catalog** | CODEX-34 revoked PUBLIC/anon on84 functions;0 anonymous admin functions verified. Future/non-admin RPCs require review. |
| R18 | **CLOSED for recorded four legacy tools** | CODEX-34 requires owner/admin staff-edit permission for Pass/Bits/Oak QA/Pass QA; roles unchanged. Wider audit remains separate. |
| R21 | **CLOSED** | `admin_identity_inspect` fingerprint `e9091c0de1b91e67a62bade78cf8edde`, STABLE, no `evaluate_cosmetics`. |
| R-PC-STATS | **CLOSED — HOSTED VERIFIED** | Approved migration20261021021746; exact formatter hash and unchanged specimen verified. Actual EmailQA My PC22/7/9/7/7/12. See WIRE-STAT-FORMATTER-FIX.md. |
| R-UI-DUP | **MITIGATED in preview** | Duplicate grant deep-link removed from Trainers tab. Legacy still has two grant desks. |
| R-UI-OVERLAP | **MITIGATED in preview** | Viewport-only 960px + `minmax(280px,360px)` caused directory/QA overlap at 100% zoom. Container query on `.admin-next-trainers-panel` now switches at 920px of available trainer width. |
| R-UI-DENSITY | **MITIGATED in preview** | Directory rows no longer stretch full panel width. Browse and inspect share 300px cards. Dossier sections use `--admin-next-section-gap: 16px`. |
| R-UI-GALLERY | **SUPERSEDED** | Owner rejected card gallery and did not approve A7. Further widget polish is the wrong layer. |
| R-IA-LAYOUT | **DESIGN** | A8 + D10–D13: Proposal A layout accepted in principle. Visual target waits on A10. Live Trainers unchanged until A9. |
| R-EPIC-11 | **DESIGN** | Epic #11 expands beyond current read RPCs (PC, ribbons, tickets, recovery writes). #12 is presentation-only. #13/#14 must not skip security/architecture. |
| R-I16-LEGALITY | **RETIRED LEGACY MODEL** | CODEX-41 privately archived/removed110 legacy specimens; CODEX-42 retired AV schema/fallbacks.7 supported WIRE specimens preserved; no in-place IV conversion. |
| R-I19-RESET | **PREPARED / LOCAL TEST PASS / UNAPPLIED** | D45 local RESET-TEST PASS (7/7). Showcase `shinyCatchId` now stripped when it points at a reset catch. Production DELETE still unapplied. Sora/Twinkle excluded. Needs A19-RESET-GO. |
| R-I19-POKEAPI | **DESIGN** | PokéAPI VG `scarlet-violet` has an empty `move_learn_methods` array; learnsets live on pokemon move details. Runtime must not hot-fetch. Do not invent SV movesets for absent forms. |
| R-I20-GAPS | **OPEN** | Pin still leaves 12 Gigantamax + 4 Champions megas unresolved. G1/C1/F1 are approved policy (D24) and encoded in `ref_form_policies`. GENVAL must fail closed; do not silently inherit base learnsets. |
| R-I21-SQL | **SUPERSEDED** | #20 public draft and #21 review draft must not be applied. Use `supabase/unapplied/a19-schema/` as the reviewed source pin. Live apply is D35. |
| R-I22-APPLY | **CLOSED** | D35 applied `001` + seeds `00`–`10` + `002` on `starlight-play`. Source copies stay under `unapplied/`; do not copy into `supabase/migrations/`. |
| R-I23-REHEARSAL | **CLOSED** | Isolated local rehearsal passed (17/17 REAL SQL). Does not close live-apply risk. `evo_uid` collision fixed on the branch. |
| R-I24-PGRST | **CLOSED** | LIVE API: `Accept-Profile: private` → `PGRST106 Invalid schema: private`. Do not add `private` to exposed schemas. |
| R-I24-BACKUP | **CLOSED as apply blocker** | Owner reconfirmed COMPLETED `2026-10-14 07:44:26 +0000` and issued GO (D35). PITR remains disabled. Restore is still whole-DB rewind and needs a **separate** restore authorization. |
| R-I25-GENVAL | **MITIGATED / FUNCTIONALLY EQUIVALENT** | D44: live bodies match hashed `001` semantically; not byte-for-byte (six-transaction apply + whitespace/comments). `stamp_catch_row` remains the live catch writer. Hosted generate / WIRE-APPLY / reset execution still blocked. |
| R-I25-WIRE | **ENABLED / BOUNDED HOSTED CATCH VERIFIED** | CODEX-37 natural QA catch/stamp/queue and CODEX-38 one-event delivery verified. CODEX-42 removed legacy fallbacks; local post-schema integration passed. Other hosted gameplay coverage and broader D86 remain held. |
| R-AUTH-LOCAL | **OPEN** | Twitch OAuth on localhost may not return to the preview. Fixture is the layout path. |
| R-DEPLOY | **CONTROLLED** | Feature flag remains `admin-next.html`. No APP stamp. |

Do not reopen R21 without fingerprint or write-helper evidence.

CODEX-42: legacy fallback/AV schema retirement verified. Full selective schema/source/specimen recovery tested locally; retain both private archives. Hosted evolution still untested; unsupported hidden/costume mappings deliberately stop before cost. Security advisor search-path notices268 (down2), other categories unchanged; wider security triage remains open. See LEGACY-RUNTIME-SCHEMA-EXECUTION.md.
