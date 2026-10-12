# Risk register

| ID | Status | Notes |
|---|---|---|
| R1 | **OPEN** | `admin_overview` authorization ordering. Preview does not call it. |
| R2 | **OPEN** | Anonymous EXECUTE on some admin RPCs. Grants unchanged this branch. |
| R18 | **OPEN** | Broad moderator privileges. Preview still uses `is_play_admin` only. |
| R21 | **CLOSED** | `admin_identity_inspect` fingerprint `e9091c0de1b91e67a62bade78cf8edde`, STABLE, no `evaluate_cosmetics`. |
| R-UI-DUP | **MITIGATED in preview** | Duplicate grant deep-link removed from Trainers tab. Legacy still has two grant desks. |
| R-UI-OVERLAP | **MITIGATED in preview** | Viewport-only 960px + `minmax(280px,360px)` caused directory/QA overlap at 100% zoom. Container query on `.admin-next-trainers-panel` now switches at 920px of available trainer width. |
| R-AUTH-LOCAL | **OPEN** | Twitch OAuth on localhost may not return to the preview. Fixture is the layout path. |
| R-DEPLOY | **CONTROLLED** | Feature flag remains `admin-next.html`. No APP stamp. |

Do not reopen R21 without fingerprint or write-helper evidence.
