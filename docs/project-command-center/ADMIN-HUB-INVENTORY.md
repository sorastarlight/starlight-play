# Admin Hub inventory

Traced from source on `admin-hub-overhaul`. Unknowns are marked. No write-risk RPCs were invoked for this inventory.

## Navigation

### Current hub (`admin.html`) — default staff entry

| Tab | Subnav / notable tools | Source |
|---|---|---|
| Dashboard | Live director, console | `admin.html`, `js/admin-live.js` |
| Encounters | Commands, settings, balance, specials | `js/admin.js` |
| Trainers | Search, grant pack, inspect PC/role, gift desk | `js/admin-tools.js` |
| Game Content | Evolution validate, progression, Oak QA | `js/admin.js`, `js/admin-oak-qa.js` |
| Economy & Store | Coin/loot editors, catalog, studio | `js/admin.js`, `js/admin-store.js`, `js/admin-studio.js` |
| Analytics | Health, reports, presentation lab | `js/admin.js` |
| System & Integrations | Twitch/GitHub/bridge secrets, pass grant, QA pass | `js/admin.js`, `js/admin-tools.js` |

### Next hub (`admin-next.html`) — feature flag = this URL exists

| Tab | Preview behavior | Live RPC |
|---|---|---|
| Operations | Observation cards; 30s poll of snapshot only | `admin_live_snapshot` |
| Trainers | Directory + read-only dossier | `admin_list_users`, `admin_user_account`, `admin_identity_inspect` |
| Support & Recovery | Copy + deep links only | none |
| Mart & Content | Copy + deep link | none |
| Game Configuration | Copy + deep link | none |
| Analytics & Health | Build/game health once | `admin_build_health`, `admin_game_health` |
| System & Access | Copy + deep link | none |

Staff gate: `is_play_admin` after session. Same as preview shell. Frontend visibility is not authorization.

## Trainer profile sections

### Next-hub dossier (this overhaul)

| Pane | Shows | Does not show |
|---|---|---|
| Overview | Account identity, role, Pass, password-login boolean, registered, last seen | Email, ranking, coins, Twitch details (moved) |
| Pokémon | Newest 40 live catches | Full PC, favorite, locked |
| Inventory | Bag counts, family candy qty | Bits entitlements |
| Progression | Level/XP/title, ranking flags, titles, badges, cosmetics, packs, catalog | Achievements, Oak research |
| Connections | Twitch linkage indicators | Link/unlink controls |

### Current-hub trainer desk (`js/admin-tools.js`)

Inspects the same list/account/inspect RPCs **and** exposes grants, coin edits, Pokémon remove, Twitch unlink/flags, ranking visibility write, role set. Untouched this branch.

## Duplicate administrative actions (legacy still authoritative)

| Action | Locations today | Canonical until Batch F |
|---|---|---|
| Grant Pokémon | Trainers desk + Oak QA | Oak QA for QA provenance; Trainers desk for ordinary grant. **Owner must pick one later.** |
| Grant items / candy | Trainers desk + Oak QA | Same split. Design: one entry from Support. |
| Set coins / XP | Trainers desk | Trainers desk |
| Credit Bits pack | Trainers desk | Trainers desk |
| Grant / remove Pass | System tab | System |
| QA Pass bundles | System tab | System (QA-only) |
| Set role | Trainers desk | Trainers desk |
| Twitch primary / flags / unlink | Trainers desk | Trainers desk |
| Ranking visible write | Trainers desk via `admin_set_ranking_visible` | Trainers desk |
| Remove Pokémon | Trainers desk | Trainers desk |
| Oak research reset | Oak QA | Oak QA |
| Live start/stop | Dashboard (`admin-live.js`) | Dashboard |
| Store CRUD | Economy catalog + studio | Economy |
| Secrets | System | System |

Next hub must **not** grow a second control for any row above. Support & Recovery is the single preview doorway to privileged trainer actions.

## Read-only RPCs used by next hub

`admin_build_health`, `admin_game_health`, `admin_live_snapshot`, `admin_list_users`, `admin_user_account`, `admin_identity_inspect`.

## Known mutating / unsafe RPCs (do not add to preview)

`admin_overview` (R1), `admin_live_dashboard` (tick/read mix), `admin_director_command`, `admin_grant_*`, `admin_set_coins`, `admin_set_role`, `admin_remove_pokemon`, `admin_oak_qa`, `admin_oak_research_reset`, `admin_set_twitch_*`, `admin_disconnect_twitch`, `admin_set_ranking_visible`, `admin_store_save_*`, `admin_save_*` secrets, `admin_queue_stream_command`, and related editors.

## Tests that already exist

`tests/admin-hub-next-tests.js`, `admin-hub-gate-2a-trainer-tests.js`, `admin-hub-gate-2a-r-identity-tests.js`, `admin-hub-gate-17-s1-snapshot-tests.js`, `admin-hub-gate-17-s1b-tests.js`, plus this branch `tests/admin-hub-overhaul-tests.js`.

## Unknowns

- Whether owner wants Oak QA vs Trainers desk as the only Pokémon-grant entry (Batch F).
- Moderator vs owner field visibility beyond current `emailLogin` boolean (R18).
- Full PC / Bits / achievements admin reads (no verified true-read RPC yet).
