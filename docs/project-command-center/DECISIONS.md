# Decision log

## Recorded (this session)

| ID | Decision | Why |
|---|---|---|
| D1 | New branch `admin-hub-overhaul` from `gate-2a-trainer-management` | Preserves Gate 2A review history; does not merge to `main` |
| D2 | Overview holds account identity only | Removes duplicate ranking / coins / Twitch fields from the first pane |
| D3 | Support & Recovery is the only next-hub doorway to trainer grants | Eliminates the second “Open current Trainers for grants” link |
| D4 | No new RPCs, no legacy admin edits | Authorized batch is local frontend + docs |
| D5 | Trainer workspace uses container queries, not viewport-only 960px | Owner 100% zoom overlap was caused by `minmax(280px,360px)` inside a narrower hub-main |
| D6 | Directory cards stay 300px in browse and inspect; dossier sections share a 16px stack gap | Owner #4: full-bleed rows and collapsed sequential card outlines |
| D7 | Workspace 2.0 is a separate localhost prototype, not the live Trainers tab | Owner #5 rejected further card-gallery polish; A1 stays open until a direction is chosen |
| D8 | Owner selected **Proposal A — Record Workspace** as next Admin Hub **design direction (A8)** | Proceed with design specifications/review only. A1 remains OPEN; no live-tab replacement, merge, or deployment. |
| D9 | Issue #7 delivers the A8 spec and static hub prototype | Still not A1. Implementation waits on A9. |
| D10 | Owner approves Proposal A's **core hub layout in principle**, but requests a more modern, dynamic, StreamLink-fitting visual presentation | Preserve the approved structural hierarchy while refining look and feel in a static prototype. This is **not A1 full visual acceptance or A9 implementation authorization**. |
| D11 | Pokémon collection is summary-first; detail is on demand | Owner #9: rows should not repeat level and date. Dedicated read-only pane uses `mons[]` fields only. Not A1. Not A9. Not A10. |
| D12 | Collection uses official PNG art; nav is raised; directory rows are full-width buttons | Owner #10 usability. Art is dex + verified shiny only. Not A1. Not A9. Not A10. |
| D13 | Trainer record IA: simplified identity header, Starlight Pass, readable Connections, Inventory/Unlockables category managers, Tickets placement | Owner #12 / epic #11 design. Ribbons and tickets have no inspect/ticket contract. Not A1. Not A9. Not A10. Not #13/#14. |
| D14 | Current catch persistence is LGPE-inspired StreamLink, not PokéAPI legality and not FR/LG or modern ability/nature/EV | Issue #16 source audit. IVs/AVs/moves persist via `stamp_catch_row`; abilities in the Pokédex are encyclopedia only. Do not mix generations. Do not rewrite stored IVs. Inspector/editor need A16b/A16d. |

| D15 | Owner **rejects LGPE-inspired mechanics as the future target**; wants game-accurate Pokémon generation/individuals and permits replacing or wiping currently caught Pokémon if required | Supersedes the D14 recommendation for future direction, not its source audit of current state. A new explicit target game/version-group and legality scope must be selected; permission to plan a reset is **not an instruction to delete now**. No production writes, deletes, grants, or release approved. |

| D16 | Owner selects **modern mainline Pokémon mechanics** as the future mechanical foundation, rather than LGPE | Exact canonical game/version-group and strict target-game legality versus cross-generation StreamLink legality remain open; Scarlet/Violet Gen IX is a recommendation, **not yet selected**. No implementation or collection wipe authorized. |

| D17 | **Owner APPROVED target architecture:** modern **cross-generation StreamLink Pokémon rules**, with Generation IX **Pokémon Scarlet/Violet** (`scarlet-violet`) as the baseline mechanics and **verified, versioned, generation-specific reference data** for species, forms, moves, abilities and exceptional mechanics outside that version group | StreamLink-valid means internally consistent with the explicit ruleset, **not necessarily legal/transferable to Scarlet/Violet, HOME, BANK or cartridges**. Do not claim strict game-specific exchange legality. This is **architecture approval only**; no code/schema/RPC changes, catch deletion/replacement, editor, merge or deployment authorized. |
| D18 | Issue #19 plan is the implementation blueprint for D17: versioned pin, `generate_streamlink_mon`, `assert_streamlink_legal`, inspector/editor, reset options R-A/R-B/R-C | Planning only. Does not authorize A19-REF or A19-RESET-GO. |

| D19 | Owner settled A19-Q1–Q6 as **architecture policy only**: per-catcher IV/Nature rolls; hidden abilities only via events/special grants; future reset R-A; Sword/Shield fallback only where verified with per-form exceptions; initialize current HP to full with no status; protected accounts excluded unless later separately authorized | Supersedes #19 planning recommendations where different (especially Q1). No generator, pin, SQL/RPC, catch write, reset, protected-account mutation or deploy authorized. |

| D20 | Owner explicitly said **proceed** following the A19-REF offer | Authorizes **A19-REF reference-pin implementation in the working branch only**: offline dataset/tooling, tests, and unapplied seed SQL for review. Does NOT authorize live schema application, generator/validator, Pokémon changes, A19-SCHEMA onward, reset, merge or deployment. |

## Needs owner approval

| ID | Question | Recommendation |
|---|---|---|
| A1 | Visual-approve Gate 2A / overhaul local preview? | Use fixture `admin-next-trainers-fixture.html` then staff-gated `admin-next.html` |
| A2 | Authorize PlayTester (or another QA login) for live read-only trainer RPCs, with restore? | Only if A1 is accepted |
| A3 | One canonical grant UI: Trainers desk, Oak QA, or a future Gate 3 Support case? | Keep both legacy tools until chosen |
| A4 | Merge `admin-hub-overhaul` / stamp an APP build? | Not recommended until A1 |
| A5 | Start Batch F privileged operations? | No until A3 and a separate authorization |
| A6 | Localhost Twitch OAuth redirect for staff sign-in? | Optional; fixture covers layout without it |
| A7 | Adopt Workspace 2.0 as the live `admin-next.html` Trainers tab? | **Not approved** after owner #6 review. Keep the fixture for comparison only. |
| A8 | Implement Proposal A (record workspace) or Proposal B (inbox split)? | **APPROVED** — Proposal A is the design direction. Not a live-tab swap. |
| A9 | Frontend-only implementation of the issue #7 spec into `admin-next.html`? | Do not start until explicitly authorized. Keep comparison fixtures. |
| A10 | Accept a polished presentation as the visual target? | Review `hub-a-visual-v5.html` beside v4. Still not A9. |
| A16a | Confirm LGPE-inspired StreamLink v1 as the **future target**? | **REJECTED by owner**. Keep only as a factual label for the current implementation. New target: game-accurate Pokémon; exact games/version-group TBD. |
| A16b | New staff read RPC exposing `catch_json` (IVs/AVs/moves/stats)? | After SQL review. Not `admin_overview`. Not A9 by itself. |
| A16c | Change catch generation mechanics after selecting the new game-accurate target? | Requires new design, reviewed migration, and separate implementation approval; existing Pokémon may be reset later by owner choice, but **not yet deleted**. |
| A16d | Owner-only audited catch editor (dry-run, diff, reason, history, protected accounts)? | Separate write approval. Not grant/remove. Not Batch F. |
| A16e | Choose exact modern game/version-group and legality scope? | **APPROVED for architecture**: Gen IX `scarlet-violet` as mechanics baseline, with separately pinned generation-specific reference data across generations. **Not strict Scarlet/Violet or HOME compatibility.** No implementation/reset authorization. |
| A16f | Show IVs/moves on My PC from existing `play_storage` JSON? | Frontend only. Optional honesty UX. |
| A19-Q1 | Shared wild specimen per community round, or per-catcher rolls? | **APPROVED POLICY:** generate different individual IVs and Natures **per catcher**; preserve shared encounter species/form/context without cloning IVs/Natures. No implementation authorized. |
| A19-Q2 | Ordinary hidden-ability rate? | **APPROVED POLICY:** no ordinary encounter hidden abilities; only permitted by an explicitly authorized event or special grant, with species/form legality checks. No implementation authorized. |
| A19-Q3 | Reset option when authorized? | **APPROVED FUTURE SCOPE:** R-A resets caught Pokémon, party/team/PC pointers and affected trades; **retains Pokédex history and economy**. Not approval to execute; impact/restore and final A19-RESET-GO required. |
| A19-Q4 | Fallback version-group for non-SV forms? | **APPROVED POLICY:** use `sword-shield` **only where verified for that exact species/form**, with explicit per-form exceptions to other verified source groups; fail closed on missing/mismatched learnsets. Exact exception map to be derived from pinned evidence later. No implementation authorized. |
| A19-Q5 | Persist current HP/status before battle exists? | **APPROVED POLICY:** initialize current HP to computed maximum and status to null/none until battles exist. No schema change authorized. |
| A19-Q6 | Include Sora/Twinkle in a future reset? | **APPROVED CONDITIONAL POLICY:** inclusion may be considered **only after** a later, explicit protected-account authorization; **exclude both by default**, including all current planning/testing and any unapproved reset. No protected-account mutation authorized. |
| A19-REF | Build the offline reference pin and seed tables? | **APPROVED FOR DEVELOPMENT ON `admin-hub-overhaul` ONLY** by owner 'proceed': offline version-pinned reference extract, deterministic generator tooling, checksums, isolated fixtures and **reviewable, unapplied** seed-table SQL artifacts. No live database migration, deployed tables, RPC/generator wiring or production data writes. Stop for review. |
| A19-SCHEMA | Add nature/ability/EV/move/ruleset columns? | After A19-REF. No combat UPDATE of live rows. |
| A19-GENVAL | Ship generator + validator functions? | After schema. No player-row writes. |
| A19-WIRE | Wire launch/settle/grant/evolve to the validator? | New catches only; QA account. |
| A19-INSPECT | Staff read RPC for full PC combat fields? | After generator exists. |
| A19-EDIT | Owner-only audited editor? | After inspector. |
| A19-RESET-TEST | Dry-run + restore drill on a clone? | Required before any production wipe. |
| A19-RESET-GO | Execute production collection reset? | Separate destructive confirmation. Not now. |

## Destructive reset boundary

Owner is willing to delete or regenerate existing Pokémon when changing rulesets. Before any deletion, design an explicit scope (catches, PC, parties, trades, Pokédex/progression, events, related references), dependency audit, tested backup/restore and rollback, user notice, replacement semantics, preview counts, and a final, specific destructive execution confirmation. **No current approval authorizes executing a delete/reset.**
