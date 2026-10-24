# Current Admin Hub overhaul status

This replaces the original inventory as the current-state summary;older design proposals and approval gates remain historical records. The new workspace is admin-next.html,still labeled Admin Hub (preview). It is not a complete replacement for admin.html.

|Area|Implemented now|Remaining overhaul work|
|---|---|---|
|Trainers|Directory/full-width record,inventory/progression/connections,CODEX-174 paginated current Pokémon roster and stored stats,Pass and Gifts tabs|EmailQA1record/detail hosted inspection passed;multi-page remains local-only. Box-layout editing,Bits and broader journals remain outside this read-only roster|
|Starlight Pass and Gifts|Audited staff overrides/re-grants,claim/delivery history,visual/searchable gifts,atomic Pokémon quantities1–100,and simplified reason confirmation|Routine consistency review continues;new reward capabilities require their own scope|
|Support & Recovery|Connected owner Helpdesk,player Support,ticket history,masked account diagnostics/recovery confirmation|Attachments/notifications remain deferred;guided identity recovery remains separate|
|Operations|Observation workspace and handoff|Live encounter/director controls remain on current Dashboard|
|Mart & Content|CODEX-155 existing single-reward PokéCoin editor published; current editors/Content Studio retained|Owner catalog/search/selection/preview passedCODEX-178;live save untested;new products, floors, Bits/avatar products, uploads/deletion remain in current tools|
|Game Configuration|CODEX-167 six-field PokéCoin editor published/source verified;local review/save-state tests pass|Owner six-field loading passedCODEX-178;live save untested;capture/timing/XP/other configuration remain in current tools|
|Analytics & Health|CODEX-162 five-view reporting workspace published/source verified;113suites and responsive/keyboard/empty/error checks pass locally|All5views loaded once in approved owner sessionCODEX-178;broader performance/semantics/device acceptance remains bounded|
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

CODEX-168/169 published:Pokémon quantities1–100 use an audited atomic batch;confirmation omits account disclosure/dex number and separates name/quantity/level.117suites;source verification mainbdd2e07f/Pages39997890946success. No live batch acceptance or grants performed.

CODEX-172 VERIFIED:Mart product search now matches independent words,accent-free names,SKU tokens and full descriptions while preserving floor filters.117suites/build31/470;REAL DOM fictional bundle poke→Poké Ball Bundle and floor exclusion/reset pass. Scoped routine1file publication main6446b326/Pages40002401454success;100monitored+1versioned URL matches. No catalog/application RPC or save.

CODEX-173 proposes a read-only paginated Trainer roster to replace the current40-row inspection window;design/local implementation decision held. See ADMIN-HUB-TRAINER-ROSTER-REVIEW.md. No application/SQL implementation or production trainer read occurred.

CODEX-174 LOCAL COMPLETE:owner-approved read-only roster local implementation. New bounded staff endpoint prepared,not installed;40-row keyset pages/search across holdings,existing stat inspector reused.118suites/29REAL LOCAL SQL/4REAL DOM widths;empty-schema11installed+1proposed forward/reverse restores585functions/143relations/56policies. No production roster/application calls,SQL installation/publication or player writes. Exact5runtime files andnew endpoint held for separate decision;see LAUNCH-CODEX174-LOCAL-TRAINER-ROSTER.md.

CODEX-174 publication VERIFIED after exact owner approval: migration20261023190339 installed one staff-only read endpoint;source87826acc977c4de0191dc981d992b53a/owner/ACL/STABLE/SECURITY DEFINER/search_path verified;threecontrols unchanged. Exact5runtime files main2ea586f1/Pages40008418332success;100monitored+5versioned source matches.118suites/29localSQL/build31/471;12installed deltas replay/reverse locally restore metadata. No live roster/application RPC,player edits,grants,Auth/provider change or APPstamp. Hosted authenticated behavior/performance remains unverified;approval spent.


CODEX-175 VERIFIED: routine Analytics roving focus and Unicode Mart search;118/118 suites/build31HTML/471refs;actual local keyboard exit/re-entry and delayed response focus plus Japanese match/no-match. Exact2runtime main d7082278 / Pages40021246367 success;100monitored+2versioned source matches. No production application/report/save/SQL/Auth/provider/grant/APP action. See LAUNCH-CODEX175-HUB-KEYBOARD-SEARCH.md.


CODEX-176 VERIFIED: Unicode gift/Pokémon queries retain text and the picker no-results message spans the grid.118/118 suites/build31/471;actual rendered fictional matching/unmatched choices and empty picker checked. Exact2runtime main bae76909 / Pages40021856876 success;100monitored+2versioned sources match. No real catalog/application/grant/SQL/Auth/provider/APP action. See LAUNCH-CODEX176-GIFT-SEARCH.md.


CODEX-178 PARTIAL HOSTED ACCEPTANCE:owner-approved single Hub load;Mart76products/search/selection and six-field rewards loaded without edits. Stopped at partial Health;remaining reports/EmailQA roster untested. Exact-source Health42702/Captures42803 reproduced locally;combined two-function correction/rollback held with19health/15capture/22combined cases. Owner notice acknowledgement permitted,not inspected. See LAUNCH-CODEX178-HOSTED-HUB-REVIEW.md.


CODEX-178 COMPLETE:owner-approved migration20261024044601 replaces exact Health/Captures functions;candidate hashes/attributes match and3controls unchanged. One Health refresh succeeded;all5report views loaded once;EmailQA single-page roster/Caterpie stored details inspected. No product/config edits,save,grant,gameplay or additional notice acknowledgement. Hosted pagination remains local-only;approval spent.


CODEX-179 VERIFIED:Admin Mart classes isolated from public .mart-card grid.118suites/build31/471;4widths/long text/focus rendered locally;exact2runtime main23ae1878/Pages40063590255success;100monitored+2versioned source matches. No hosted reload/save/app action.


CODEX-180 PASS:all13installed deltas forward/reverse on empty loopbackPG17;585functions/143relations/56policies restored,142tables empty.24tracked packets+private gift pair retained;no new export/production restore. Runtime stopped and original archive unchanged.


CODEX-181 VERIFIED:healthy/OK Application uses active styling;missing/non-boolean stream status stays UNKNOWN;Berry/tier headings aligned.118suites/build31/471;actual local health classes/headings. Exact2runtime main84a56029/Pages40064027714success;100monitored+2versioned sources match. No hosted report/notice/SQL/provider or save/grant action.
