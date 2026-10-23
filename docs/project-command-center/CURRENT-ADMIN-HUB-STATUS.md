# Current Admin Hub overhaul status

This replaces the original inventory as the current-state summary;older design proposals and approval gates remain historical records. The new workspace is admin-next.html,still labeled Admin Hub (preview). It is not a complete replacement for admin.html.

|Area|Implemented now|Remaining overhaul work|
|---|---|---|
|Trainers|Directory/full-width record,inventory/progression/connections,latest returned Pokémon and stored stats,Pass and Gifts tabs|Full PC/box inspector,Bits and broader journals are not implied by the returned snapshot|
|Starlight Pass and Gifts|Audited staff overrides/re-grants,claim/delivery history,visual/searchable gift selection and reason confirmation|Routine consistency review continues;new reward capabilities require their own scope|
|Support & Recovery|Connected owner Helpdesk,player Support,ticket history,masked account diagnostics/recovery confirmation|Attachments/notifications remain deferred;guided identity recovery remains separate|
|Operations|Observation workspace and handoff|Live encounter/director controls remain on current Dashboard|
|Mart & Content|CODEX-155 existing single-reward PokéCoin editor published; current editors/Content Studio retained|Authenticated editor/save acceptance unproven; new products, floors, Bits/avatar products, uploads/deletion remain in current tools|
|Game Configuration|CODEX-167 six-field PokéCoin editor published/source verified;local review/save-state tests pass|Authenticated editor/live save acceptance unproven;capture/timing/XP/other configuration remain in current tools|
|Analytics & Health|CODEX-162 five-view reporting workspace published/source verified;113suites and responsive/keyboard/empty/error checks pass locally|Authenticated report results/performance and owner acceptance remain unverified|
|System & Access|Owner-tool handoff|Credential/integration/role/identity operations not consolidated into new workspace|

Accepted Trainer direction was implemented through CODEX-3/23/24 and subsequent approved Pass/Gift/Helpdesk/recovery work. Earlier statements that the entire next hub is read-only,Support is links only,or no stat fields exist are obsolete. Visual/routine frontend authority does not authorize migrating privileged workflows or broadening access. See SITEWIDE-VISUAL-CONSISTENCY.md for the active presentation inspection. Real mobile/assistive/provider acceptance and final launch remain separate.

CODEX-143–148 presentation review:internal Gate/CRUD/database status wording simplified;Trainer directory/gift typography aligned;mobile search/Find targets44px;inventory capability disclaimer corrected. All7section shells×4widths and8Trainer panes×4widths reviewed locally with fictional data. This is visual polish of current workflows,not completion of the remaining editor/operations migration. Protected legacy Admin sources unchanged.

CODEX-151–154 deeper review:stored Pokémon detail labels,public-versus-owner Trainer copy,achievement/ribbon targets,Pass supply cooldown copy,Helpdesk long-reference containment and narrow Trainer directory corrected and published/source verified. Owner approved the next Mart design/local implementation; CODEX-155 editor is now published under separate explicit approval; hosted ordinary-viewer denial verified, owner/save behavior remains unproven. See LAUNCH-CODEX155-LOCAL-MART-EDITOR.md. Existing published privileged editor handoffs remain.


CODEX-156–159 routine maintenance published/source verified:Mart keyboard focus;vertical section tabs/named panels;distinct permission-lookup error copy;health retry,partial/unavailable and stale-response handling. CODEX-160 source audit/design preserves actual report populations and avoids legacy unknown-as-zero labels. Full report connection remains held.

CODEX-162 LOCAL COMPLETE:owner-approved five-view read-only Analytics workspace;113/113 suites,20 REAL DOM layouts+6empty/error/denied/escaped cases and keyboard/range checks;build31/468. Four runtime files prepared for separate publication decision. No production report call,SQL,save,provider/gameplay,protected-account action,spending or APP stamp. See LAUNCH-CODEX162-LOCAL-ANALYTICS.md.

CODEX-162 PUBLISHED by separate owner decision:exact4runtime main7f0bd440 / Pages39981888624success;100monitored+4versioned sources match;113local/static suites and20REAL DOM layouts+6states. No authenticated application navigation/report/notice/save or SQL action. New reports are published but authenticated production acceptance remains unverified. APPunchanged;Twitch/device/final-launch gates remain.

CODEX-165 PREPARED:catalog-only mapping of4configuration saves+4helpers;identified timing-save Bits-disable side effect and excluded it from first migration. Fictional six-field PokéCoin reward editor/comparison reviewed at4widths (8states),zero/negative/unavailable/focus cases. No configuration values or application endpoints read/saved;no runtime change. Design/local-implementation decision required for proposed privileged workflow;see ADMIN-HUB-CONFIGURATION-MIGRATION-REVIEW.md.

CODEX-166 VERIFIED:Settings tab accessibility exact2runtime main84f8ff6e/Pages39990990365success;115suites;100+2source matches;no account action. CODEX-167 LOCAL COMPLETE:approved six-field reward editor;116suites,12REAL DOM layouts/dialog/cancel states+9load/save states;build31/470. Exact4runtime publication and all live settings calls held. See LAUNCH-CODEX166-SETTINGS-KEYBOARD.md and LAUNCH-CODEX167-LOCAL-REWARD-EDITOR.md.

CODEX-167 publication VERIFIED after explicit owner approval:exact4runtime mainfbe1f17a / Pages39992391579success;100monitored sources and4changed versioned URLs match published Git. Main build31/470 and116local/static suites pass. No hosted application navigation,configuration read/save,SQL,provider,reward or protected-account action. APP20261008-rc133 unchanged;approval spent. Authenticated editor acceptance and any live save remain separate.
