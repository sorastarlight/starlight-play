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

## Needs owner approval

| ID | Question | Recommendation |
|---|---|---|
| A1 | Visual-approve Gate 2A / overhaul local preview? | Use fixture `admin-next-trainers-fixture.html` then staff-gated `admin-next.html` |
| A2 | Authorize PlayTester (or another QA login) for live read-only trainer RPCs, with restore? | Only if A1 is accepted |
| A3 | One canonical grant UI: Trainers desk, Oak QA, or a future Gate 3 Support case? | Keep both legacy tools until chosen |
| A4 | Merge `admin-hub-overhaul` / stamp an APP build? | Not recommended until A1 |
| A5 | Start Batch F privileged operations? | No until A3 and a separate authorization |
| A6 | Localhost Twitch OAuth redirect for staff sign-in? | Optional; fixture covers layout without it |
| A7 | Adopt Workspace 2.0 as the live `admin-next.html` Trainers tab? | Review `admin-next-trainers-workspace-v2.html` first. Do not replace the current tab until chosen. |
