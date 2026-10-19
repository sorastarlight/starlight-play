# Pokémon StreamLink — Gemini project handoff

Prepared October 18, 2026 for the owner to give to Gemini and Cursor.

## Handoff status and authority

The owner is moving planning and project supervision to Gemini. Pause further development and production actions from this ChatGPT conversation. This handoff does not shut down the running website, database, Twitch bridge or encounters, and no production pause switch was changed. Existing player services must not be interrupted to perform the handoff.

Gemini is the intended planning/review workspace. Cursor remains the implementation agent unless the owner subsequently replaces it. The owner wants concrete Cursor prompts, minimal repeated context, low Cursor usage, and prompts for critical decisions. There is no verified automatic Gemini↔Cursor connection. Until a supported bridge is separately authorized, the owner passes prompts/reports between them; GitHub holds durable project state.

Current authorization is handoff documentation and planning only. The owner's earlier broad permission to progress reasonably is not an instruction to bypass the present pause or perform destructive/production actions. Do not start D86, choose an authoritative drifted database function, or resume D85 during handoff. A future continuation needs a new scoped instruction in Gemini. Historical GO templates are not approvals; historical STOP statements remain as history and must be interpreted with later scoped approvals.

## Verified repository snapshot

- Repository: https://github.com/sorastarlight/starlight-play
- Development branch: `admin-hub-overhaul`
- Inspected remote head: `cd3303b7494ac58270d381ac5c2376cfce6924c1`
- Snapshot inspected through authenticated GitHub reads, not a local RPG checkout.
- No open pull requests returned at inspection.
- Live site: https://play.sorastarlight.net ; README describes GitHub Pages from `main`.
- Supabase project reference: `dtflmlbjhttoewqgkujf` (identifier, not a credential).
- Reported production APP: `20261008-rc133`; release smoke paused.
- No live database checks were performed to create this handoff. Production facts below are attributed to repository reports and may change. Recheck drift before future execution.

Cursor must re-read current branch HEAD, local working state, rules and reports before finalizing its side. Preserve concurrent/uncommitted work; no reset, force push, branch deletion or merge into main.

## Cursor verification — 2026-10-18

Local checkout `play-site` on `admin-hub-overhaul` matches the attached snapshot. `git rev-parse HEAD` is `cd3303b7494ac58270d381ac5c2376cfce6924c1`, even with `origin/admin-hub-overhaul`. The working tree was clean before this handoff file. No newer commit exists after the D85 pointer `cd3303b7`. Work commit for D85 remains `1d1f9ec2`.

`gh pr list --repo sorastarlight/starlight-play --state open` returned no open pull requests. This checkout has no `AGENTS.md` and no checked-in `.github/workflows`. The only GitHub template found is `.github/ISSUE_TEMPLATE/agent-job.md`. No repository development monitor or running terminal job was found. Nothing was paused because nothing development-side was running. The live site, Supabase, and the Twitch bridge were not touched.

This handoff did not query the database. The D85 fingerprints below stay report-derived from `docs/project-command-center/D85-STAMP-REHEARSAL.md` and its catalog clock. D83 remains the installed launch-guard report. D85 remains blocked. D86 is not authorized. RPG development batches are paused until the owner or Gemini sends a new scoped task.

Provenance conflict, not resolved here: `spend_bag_item`, `announce_throws`, and `capture_chance` differ from the last recorded fingerprints. Neither the recorded text nor the D85 live text is chosen as authority.

## Product and architecture

Product: **Pokémon StreamLink: A Community-Driven Streaming RPG**. Sora Starlight is the creator identity; feature names stay short (Play, My PC, Pokédex, My Inventory, Prof. Oak's Lab, Trainer ID, Rankings, Events, Achievements, GTS, How to Play, Mart, Admin Hub).

The repository is separate from the card binder, local stream overlay and stream-PC encounter tools. The README describes a bridge that publishes community encounters and Twitch phase/result messages. Do not conflate those projects or their secrets.

Keep static HTML, vanilla JS modules, shared `play.css`, Supabase Auth/Postgres RPCs through established `playCall`/supabase-js paths. Do not introduce React, Tailwind, a state framework or a wholesale architecture rewrite. Some rules retain a `play-site/` prefix; check actual paths rather than assuming a directory relocation.

Gameplay authority belongs on the server: capture settlement, inventory, coins, Pass claims, shop operations, evolution, destructive PC actions, entitlements, rankings and identity mapping. Presentation can preview; it cannot become authority. Keep realtime/Supabase/Twitch logic in established controllers.

The legacy admin surface (`admin.html`, `js/admin-live.js`) is protected from this overhaul. Next-hub work belongs in `admin-next.html` and associated modules. Local fixtures support layout review without privileged login.

Economic policy: Bits buy guaranteed item quantities, not Pokémon, random paid prizes or boosted catch/shiny odds. PokéCoins are earned, noncash and nontradable. Starlight Pass is subscription status. Preserve current economic behavior pending explicit design/implementation approval.

## Sources of truth and reading order

Use files on `admin-hub-overhaul`, not the default branch by accident:

1. All applicable `.cursor/rules/streamlink-*.mdc`, especially project, authority, core, supabase and qa-release. Discover any applicable AGENTS.md in Cursor's checkout.
2. `docs/project-command-center/README.md`, `TASKS.md`, `TASKS.json`, latest `RUN-LOG.md` entries.
3. `D83-LAUNCH-GUARD-INSTALL-REPORT.md`, `D84-VERIFICATION-PLAN.md`, `D85-STAMP-REHEARSAL.md` in that directory.
4. `DECISIONS.md`, `RISKS.md`, `ROADMAP.md`, `TEST-MATRIX.md`.
5. For the blocked stamp path: D75–D82 reports; for changes to generation/economy: GEN-IX reports and exact referenced SQL/source artifacts.
6. For Admin Hub design: `ADMIN-HUB-INVENTORY.md`, `ADMIN-HUB-IA.md`, issue #7 spec, issue #12 trainer record, comparison prototypes.

Root README contains older navigation descriptions. ROADMAP/RISKS also retain historical snapshot statements. Prefer dated implementation reports and current queue entries for what actually happened. A directory named `supabase/unapplied/` and a SQL file's historical DO NOT APPLY header do not prove it was never installed: D83 explicitly documents an exception. Never reapply based on filename alone.

## Current checkpoint: D85 blocked, not completed

D85 attempted preparation for one disposable local catch using canonical settlement and a stamp trigger. Its prerequisite definition check failed. **No local database started, no synthetic trainer was created, no ball spent, no specimen inserted, and no stamp proof obtained.** It was not a failed throw. Reported hosted access was catalog-only; no gameplay RPC.

The report's catalog timestamp is `2026-10-18 06:19:15.963884+00`. Work commit `1d1f9ec2`; current branch head listed above includes subsequent tracking.

Matching recorded/live source MD5s:

| Function | MD5 |
|---|---|
| private.settle_if_needed(encounter_rounds) | 565c102d0a8c84a3dfd036653aca307c |
| private.stamp_catch_server_inserted_at() | b66ad1b961b3573a2c48947dfe0413ea |
| private.round_is_active(encounter_rounds) | 53d7e8a3f3894212e854618dc0663101 |
| private.materialize_streamlink_catch(...) | e88c6cbec313a4cc0b81a5df1f5691b3 |
| private.note_species_mastery_catch(uuid) | 313944ac139f33465e57d86c0a1c5678 |

Unresolved differences:

| Dependency | Previously recorded MD5 | D85 live MD5 |
|---|---|---|
| private.spend_bag_item(uuid,text) | 5419a99d0c1735f44564b84338e32578 | b30712a5a082f00ce45fd2c214e7029d |
| private.announce_throws(uuid) | 0cd4a8e2a647ba388ce19b14b6f5a8c4 | 1145a36f2a1a2e93f9d99e91c4d24916 |
| private.capture_chance(...) | 8fa515e574a89165c0adf11339ed73ba | 205d43359e90971f790816cf6e45c889 |

A fingerprint difference proves differing text, not necessarily a semantic defect. Neither copy has been chosen as authoritative. Do not silently use live bodies, revert to old bodies, change odds or debit rules, or declare compromise without evidence. Future reconciliation should compare full definitions, provenance and behavior before an owner decision.

## Installed versus inactive versus unverified

| Area | Latest reported state and limit |
|---|---|
| Reference schema | D35 installed reviewed schema/seeds; not permission to replay scripts. |
| Generator/validator | D43 catalog install complete. Exact behavior/coverage requires its reports. |
| Generation wiring | D49 installed; D58 tested with WIRE temporarily on and turned it off. Last reported WIRE false. |
| Economy | D57 installed D55 spend rules. D58 ran three PlayTester encounters; two catches kept. Later dependency drift now blocks parity assumptions. |
| Onboarding | D59 guide and D60 encounter protection are branch work, not deployed. |
| Species Familiarity | D70 schema and D74 integration installed; reported lifecycle inactive and activated_at null. Distinct from existing species_mastery.points ladder. No activation permission. |
| Launch guard | D83 installed only unchanged D81 001 file. Old composite IS NOT NULL predicate replaced with r.id IS NOT NULL. D85 reconfirmed its source fingerprint. |
| Stamp verification | D78 blocked by global-round isolation; D85 blocked by dependency drift. No successful new stamp rehearsal proof. |
| Collection reset | R-A planning/local synthetic work exists; production reset remains unapproved. |

D83 file: `supabase/unapplied/d81-encounter/001_round_is_active.sql`, SHA-256 `d1a408c5687f817a056a103eba1767ff971e4538355d43958e48e5c1936ffc8d`. Before MD5 `5732cc462502e346843eedb76fada494`; after MD5 `53d7e8a3f3894212e854618dc0663101`. The existing BEGIN/COMMIT ran unchanged; rollback file did not run; no migration row was added. Last reported migration row: `20261016042345`, `d55_economy_001_spend_rules`.

D83 attributes stayed postgres owner, boolean SQL stable security invoker, parallel unsafe, proconfig/proacl null and existing EXECUTE privileges unchanged. It proved source/attribute installation, not hosted encounter behavior. D81's 17/17 local SQL rehearsal is earlier modeled evidence, not full hosted path coverage.

D82 found private was not exposed through PostgREST, and mapped staff authorization plus existing director ticking through play_state/play_sync. Corrected active-round detection can make existing ad-pause and offline-session cancel/refund paths act on a round. No new remote mutation path was found by that report. Do not execute gameplay RPCs just to inspect security.

## Approved future game policies

These are policy decisions, not new implementation authorization:

- Gen IX Scarlet/Violet mechanics baseline with separately pinned cross-generation reference data; not strict SV or HOME compatibility.
- Reference pin `sl-ref-20261013-227b573`; use local pinned data, no runtime hot-fetch of PokéAPI.
- Shared encounter species/form/context; different individual IVs and Nature per catcher.
- Ordinary abilities selected among legal non-hidden slots per catcher. Hidden abilities only via explicitly authorized event/special grant.
- Gender per catcher respecting species data; current HP initially maximum, status none until battle mechanics.
- Sword/Shield fallback only for exact verified species/forms; explicit verified exceptions; fail closed on missing learnsets.
- Gigantamax is a future battle transformation/base individual plus possible factor, not a separate wild form. Champions/Z-A Mega entries remain fail-closed; no invented learnsets or silent remapping.
- Preserve raw friendship values in the pin; eventual Gen IX generation maps 70 to 50 without rewriting old Pokémon.
- Production randomness is server-generated; deterministic fixture randomness is separate. Validate identity/specimen binding.
- R-A future reset scope covers catches, party/team/PC pointers and affected trades while retaining Pokédex history and economy. Execution is still prohibited. Sora/Twinkle are excluded by default.

## Admin Hub and other open work

Proposal A (record workspace) is the approved design direction, not approval to swap the live tab. Workspace 2.0 gallery was not approved as the live solution. Keep comparison prototypes. A1 visual approval, A10 visual target and A9 frontend implementation gate remain distinct. Do not infer one approval from another.

Open work includes owner recovery/security design (#13), helpdesk/ticket architecture (#14), trainer UI refinement (#15), Twitch linking policy audit (#17), and trainer management/helpdesk epic #11. Issues #16/#18/#25 contain legality/rebuild/GENVAL history; an open issue does not mean all its work is unstarted. Issue #1 holds owner/release gates; #6 holds design-reset history. No new feature implementation is authorized by this handoff.

Known risk register: R1 admin_overview authorization ordering OPEN; R2 anonymous EXECUTE on some admin RPCs OPEN; R18 broad moderator privileges OPEN; R21 identity-inspection issue CLOSED unless new evidence. Private schema must not be exposed. Production restore is a separate high-risk decision; old backup evidence is not a current restore guarantee.

## Recommended future sequence (proposals only)

1. **Complete handoff:** Cursor verifies this snapshot, records the pause, reconciles stale coordination status, lists local-only work and provides its final receipt. Gemini acknowledges the same checkpoint. Do not spend a batch repeating completed audits.
2. **Resolve D85 provenance:** if the owner chooses to resume, propose a narrowly scoped read-only reconciliation of the three mismatches. Compare recorded source, current full definitions and git/migration/install history; explain semantic differences and provenance gaps. No install/revert and no gameplay calls. Owner chooses which definitions become the baseline after review. This is a proposed D86, not started or authorized here.
3. **Rehearse locally after reconciliation:** canonical settlement/dependency/trigger definitions in an isolated disposable localhost database; one synthetic trainer, one owned ball, one ordinary attempt with real odds, no forced success or retry. A miss does not prove a successful catch stamp. Evidence must distinguish branch fixture, actual SQL and production.
4. **Review verification sufficiency:** production still has one global round; PlayerQA-only stamp smoke cannot safely exclude other trainers. Do not introduce a production QA lane or targeted catch insert as a shortcut. Consider an explicitly approved isolated environment; no paid hosting by default.
5. **Consider Familiarity activation only after proof:** separate scope, rollback/lifecycle safeguards and owner GO. Do not combine activation, catch testing, reset and release.
6. **Advance approved UI/product work in independent batches:** finish visual decisions before A9; recovery/helpdesk need security/architecture designs before writes. Respect server authority and existing style.
7. **Release or reset only through their own gates:** focused checks, current backup/recovery plan where relevant, owner-approved exact scope, protected-account rules and explicit merge/deploy/build or destructive authorization. No automatic release from a passing test.

## Operating contract for Gemini and Cursor

- Gemini supplies one scoped prompt at a time: objective, permitted paths/actions, evidence required, prohibited operations, stop condition and next decision.
- Cursor reads current authoritative files, performs the batch, preserves concurrent work and reports completed/blocked/next with branch/base/work/pointer SHAs.
- Label checks accurately: STATIC, LOCAL HARNESS, REAL DOM, REAL SQL, REAL RPC, READ-ONLY LIVE CATALOG, PRODUCTION. Do not treat model tests or successful script exit as end-to-end proof.
- Report Sora/Twinkle/PlayTester/PlayerQA mutation status accurately. Keep test accounts nonstaff unless separately approved. No protected-account mutation.
- No secrets, auth passwords, tokens, service-role keys, private connection strings or trainer data in reports, commits or Gemini uploads. This handoff intentionally excludes account email and account UUID details.
- No automatic catches, activations, SQL/grant/RLS/auth/economy writes, restores, merges, deployment, APP stamps, purchases or next-task loops. Production reads require their own scoped purpose; handoff itself needs GitHub/local reads only.
- Do not move hosting, Supabase data or production services merely because planning moves to Gemini. Do not create cloud projects, credentials or subscriptions for the handoff.

## Coordination artifacts already present

Commit `f4ab0d3971fe17bd9840067a249ffec4c70c83a1` added `COORDINATION.md`, `.github/ISSUE_TEMPLATE/agent-job.md`, `.cursor/rules/streamlink-coordination.mdc` and tracking. No scheduler or Cursor run was enabled. Those documents contain a now-historical D82 STOP and need a small current-status addendum pointing to D83 installed / D85 blocked / handoff pause. Preserve historical records; do not erase approval provenance.

This ChatGPT workspace also contains an unscheduled read-only GitHub report checker. Its presence is not an active monitor, and it has no verified Gemini wake-up bridge. Do not transfer checkpoints or install automation as part of this handoff.

## Cursor handoff receipt required

Return: current branch/base/work/pointer SHA; clean/dirty checkout and preserved work; last completed batch and exact blocked step; files added/updated; local artifacts not pushed; test coverage and limitations; no credentials included; no production action taken; any active jobs/monitors found and their disposition; recommended first Gemini prompt. A running production bridge is not a development job and must not be disabled.

If this snapshot differs from the checkout, document the difference rather than overwriting either source. The handoff can finish with an unresolved D85 decision clearly recorded.
