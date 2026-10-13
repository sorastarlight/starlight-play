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
| A16e | Select exact game/version-group mechanics and what 'game-accurate' means? | **OPEN**: owner rejected LGPE target; choose a modern/FRLG/other canonical reference or scoped hybrid before implementation. |
| A16f | Show IVs/moves on My PC from existing `play_storage` JSON? | Frontend only. Optional honesty UX. |

## Destructive reset boundary

Owner is willing to delete or regenerate existing Pokémon when changing rulesets. Before any deletion, design an explicit scope (catches, PC, parties, trades, Pokédex/progression, events, related references), dependency audit, tested backup/restore and rollback, user notice, replacement semantics, preview counts, and a final, specific destructive execution confirmation. **No current approval authorizes executing a delete/reset.**
