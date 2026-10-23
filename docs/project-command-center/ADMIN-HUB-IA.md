# Next-hub information architecture

Historical initial IA. Later approved Trainer,Pass,Gifts,Helpdesk and recovery work supersedes several read-only/link-only statements below. See [current implementation status](./CURRENT-ADMIN-HUB-STATUS.md) and [active visual review](./SITEWIDE-VISUAL-CONSISTENCY.md).

Proposal implemented in preview only. No new write RPCs.

## One trainer dossier

Staff find a trainer on **Trainers**, then stay in one workspace:

1. Sticky identity header (name, login, role, Pass)
2. Dossier tabs: Overview · Pokémon · Inventory · Progression · Connections
3. Back to directory

| Tab | Canonical content |
|---|---|
| Overview | Who the account is |
| Pokémon | What they currently hold (40-mon snapshot) |
| Inventory | What they can spend |
| Progression | How they appear in-game |
| Connections | How they sign in via Twitch |

Fields are not repeated across tabs. Overview points at the other tabs instead of restating ranking, coins, or Twitch ids.

## One doorway per privileged action

| Need | Next-hub doorway | Current-hub landing |
|---|---|---|
| Inspect a trainer | Trainers | — |
| Grant / adjust / unlink / role | Support & Recovery | `admin.html?section=trainers` |
| Oak QA grants | Support & Recovery | `admin.html?section=content&view=oakqa` |
| Observe live RPG | Operations | `admin.html?section=dashboard` |
| Edit Mart SKUs | Mart & Content | Economy catalog |
| Edit encounter/economy numbers | Game Configuration | Encounters |
| Secrets / Pass grant | System & Access | System |

Trainers preview no longer offers a second “open grants” link. That link lived in two places and implied the inspect tab was also a grant desk.

## Navigation

Seven next-hub tabs stay. Operations remains the default. `?section=` deep links unchanged. Mobile: existing hub-nav toggle; trainer directory/dossier swap at 960px.

## Not implemented (needs approval)

- Merging Oak QA and Trainers-desk grants into one write UI
- Support history pane (no verified admin feed)
- Full PC / Bits / achievements inspectors
- Any Batch F mutation
