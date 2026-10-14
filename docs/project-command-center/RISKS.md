# Risk register

| ID | Status | Notes |
|---|---|---|
| R1 | **OPEN** | `admin_overview` authorization ordering. Preview does not call it. |
| R2 | **OPEN** | Anonymous EXECUTE on some admin RPCs. Grants unchanged this branch. |
| R18 | **OPEN** | Broad moderator privileges. Preview still uses `is_play_admin` only. |
| R21 | **CLOSED** | `admin_identity_inspect` fingerprint `e9091c0de1b91e67a62bade78cf8edde`, STABLE, no `evaluate_cosmetics`. |
| R-UI-DUP | **MITIGATED in preview** | Duplicate grant deep-link removed from Trainers tab. Legacy still has two grant desks. |
| R-UI-OVERLAP | **MITIGATED in preview** | Viewport-only 960px + `minmax(280px,360px)` caused directory/QA overlap at 100% zoom. Container query on `.admin-next-trainers-panel` now switches at 920px of available trainer width. |
| R-UI-DENSITY | **MITIGATED in preview** | Directory rows no longer stretch full panel width. Browse and inspect share 300px cards. Dossier sections use `--admin-next-section-gap: 16px`. |
| R-UI-GALLERY | **SUPERSEDED** | Owner rejected card gallery and did not approve A7. Further widget polish is the wrong layer. |
| R-IA-LAYOUT | **DESIGN** | A8 + D10–D13: Proposal A layout accepted in principle. Visual target waits on A10. Live Trainers unchanged until A9. |
| R-EPIC-11 | **DESIGN** | Epic #11 expands beyond current read RPCs (PC, ribbons, tickets, recovery writes). #12 is presentation-only. #13/#14 must not skip security/architecture. |
| R-I16-LEGALITY | **SUPERSEDED (future)** | Current rows remain LGPE-inspired (factual #16). Future target is D17 / #19, not LGPE. Do not convert old IVs in place. |
| R-I19-RESET | **DESIGN** | Owner may later wipe or replace catches. No delete is authorized. Hard FKs: oak_transfers, trade_listings, trade_offers. Soft refs: team_ids, pc_layout, direct_trades, evolution_log. Sora/Twinkle excluded. |
| R-I19-POKEAPI | **DESIGN** | PokéAPI VG `scarlet-violet` has an empty `move_learn_methods` array; learnsets live on pokemon move details. Runtime must not hot-fetch. Do not invent SV movesets for absent forms. |
| R-I20-GAPS | **OPEN** | Pin still leaves 12 Gigantamax + 4 Champions megas unresolved. #21 proposes G1/C1/F1; none are authorized. Do not silently inherit base learnsets. |
| R-I21-SQL | **SUPERSEDED** | #20 public draft and #21 review draft must not be applied. Use `supabase/unapplied/a19-schema/` instead — still unapplied. |
| R-I22-APPLY | **OPEN** | A19-SCHEMA artifacts exist but live apply is unapproved. Do not copy into `supabase/migrations/`. PostgREST must not expose `private`. |
| R-I23-REHEARSAL | **CLOSED** | Isolated local rehearsal passed (17/17 REAL SQL). Does not close live-apply risk. `evo_uid` collision fixed on the branch. |
| R-I24-PGRST | **OPEN** | Hosted PostgREST exposed-schema setting is not visible in `pg_settings`. Do not apply 001 until the owner confirms `private` is not an API schema. |
| R-I24-BACKUP | **OPEN** | Backup/PITR availability was not visible from catalog metadata. Require a restore point before any later apply. |
| R-AUTH-LOCAL | **OPEN** | Twitch OAuth on localhost may not return to the preview. Fixture is the layout path. |
| R-DEPLOY | **CONTROLLED** | Feature flag remains `admin-next.html`. No APP stamp. |

Do not reopen R21 without fingerprint or write-helper evidence.
