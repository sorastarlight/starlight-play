# Site-wide visual consistency review

Owner requested a sustained site-wide rendered inspection and routine fixes,including the Admin Hub. Preserve the accepted pearl/pink/sky,Nunito/Fredoka,raised-control direction and existing workflows. CODEX-78 allows exact tested routine frontend publication;new workflow migrations,security/SQL/provider changes and final launch remain separate. Protected admin.html/admin-live.js remain untouched.

## Findings and progress

|Finding|Status|Evidence / next step|
|---|---|---|
|GTS search fields use native tiny styling beside full-size dropdown|Fixed/live CODEX-143|Existing shared search style reused;42px controls;single-column filters on narrow screens|
|Corrupted punctuation/Poké Radar name/username range/loading text|Fixed/live CODEX-143|Home,Events,Trainer,My Account,GTS,registration,Content Studio;legitimate separator dots retained|
|Password-reset document title uses creator name instead of game|Fixed/live CODEX-143|Game title aligned;Auth behavior untouched|
|Internal Gate/CRUD/database terminology in new Admin Hub|Fixed/live CODEX-143|Plain staff-facing handoff copy;legacy destinations and permissions unchanged|
|Trainer search and gift fields fall back to Arial|Fixed/live CODEX-144|Rendered populated fixture confirmed;inherit existing site typography|
|Inventory says grant controls unavailable despite Gifts tab|Fixed/live CODEX-144|Clarify current view limits and direct staff to Gifts|
|Original Admin Hub inventory/IA describe obsolete read-only state|Completed CODEX-144|Preserve initial design history;link current implementation summary|
|Protected legacy admin contains remaining corrupted copy|Held exception|Not silently editing protected admin.html;record for a later consolidated legacy-tool decision|
|Populated public-page and expanded state consistency|Scoped pass complete;deeper variants remain|Actual PC,Inventory,Rankings,Lab,Mart,Pokédex and Trainer-record fixtures reviewed;full coverage limits in CODEX-150 handoff|
|Search term consistency|GTS/Pokédex corrections live146/149;deeper variants remain|Check names,dex numbers,clear/empty/error states against actual supported behavior;never advertise unsupported filters|
|Remaining Admin Hub tools still use legacy screens|Separate overhaul completion phase|Operations controls,Mart/Content editors,configuration,full analytics,system/account mutations need scoped workflow designs;not completed by copy/CSS polish|

## First rendered pass

21pages at1280/768/390/320CSSpx:84completed-load shell measurements,no document-wide overflow and no measured visible non-checkbox/radio control below32px in those shells. Actual HTML/CSS/nav with fictional account shell;all other page scripts removed except the existing sanitized Trainer fixture. This is not certification of every populated,error,dialog or authenticated state. The initial exploratory measurements were replaced by completed-load evidence to avoid measuring before styles loaded.

Additional visual inspection covers mobile primary/account menus,Escape dismissal,GTS listing dialog,new-hub Operations/Mart and populated Trainer Overview/Inventory/Gifts. Findings are scoped to observed states. Physical touch/keyboard/browser zoom/screen-reader/provider acceptance remain open. Screenshots/private harness retained outsideGit under LOCALAPPDATA/PokemonStreamLink/security/codex143.

## Publication and checks

CODEX-143:feature895e7b3c;exact11runtime files to main200499f4;Pages39897398820success;106non-writing suites/build31HTML/464references;100monitored source matches and11explicit changed versioned source matches. No JavaScript logic/backend/APP/provider/gameplay change. Routine fixes preserve accepted functionality;cache may require a refresh.

CODEX-144live:mainc9d29ff9/Pages39898025421success;100sources and2changed versioned sources match.32populated Trainer pane/width states pass. CODEX-145adds24actual-controller PC/Inventory populated/empty/error width cases,PC search/dialog inspection and routine mobile-target/copy candidate;106suites after updating one old copy expectation. New Admin Hub still a partial replacement;full legacy workflow migration not claimed.

CODEX-145 live:main058ee3fe/Pages39899357051success;100monitored+4versioned sources match. CODEX-146 actual GTS picker numeric search/accurate empty-state candidate passes12local cases and107suites;isolated actual-controller browser verified. Publication tracked separately.

CODEX-146 VERIFIED:main98876e6c/Pages39900131418success;100monitored+2versioned sources match. CODEX-147 reviewed24Rankings/Lab page-state widths+12Lab station widths;mobile board tabs/search/sort/View ready targets aligned to44px;107suites/build pass. Exact CSS-only publication follows;no hosted mutation/backend/provider/APP change.

CODEX-147 VERIFIED:main1f2dce52/Pages39900646934success;100monitored+1versioned source match. CODEX-148:28Admin section-width shell cases,0overflow/undersized mobile controls;staff-facing Operations wording and duplicate recovery guidance simplified;directory mobile fields44px.107suites/build pass. Exact3runtime publication follows;no hosted staff/RPC/backend/provider/APP changes.

CODEX-148 VERIFIED:main5af1d64b/Pages39901146424success;100monitored+3versioned sources match. CODEX-149 adds24Mart/Pokedex page-state cases and12Mart mode-width cases,0overflow/undersized mobile controls. Numeric #dex parser consistency corrected with invalid/unreleased/mismatched-name guards;107suites/build pass. Exact3runtime publication follows;no purchase/sale/claim/backend/provider/APP change. Total visual measurements through149:240,with stated shell/fixture limits.

CODEX-149 VERIFIED:mainbc6c1bd3/Pages39901952232success;100monitored+3versioned sources match. CODEX-150 closes remaining mobile My Account/Achievements control targets;final21shells×4widths:84complete,0document overflow/undersized mobile controls/unexpected control fonts.107suites/build pass. Exact CSS-only publication follows;no backend/provider/player/APP change. See LAUNCH-CODEX150-VISUAL-PASS-HANDOFF.md.

CODEX-150 VERIFIED:CSS-only mainfdfaf2a8/Pages39902411273success;100monitored+1changed versioned source match. All143–150routine slices live/source verified;107suites/build31/464;final84shell measurements clear,156selected-state measurements separately scoped.20recovery packet files verified without SQL. Protected legacy files unchanged;temporary tabs/servers closed. No SQL/Auth/provider/gameplay/player mutation/APP stamp/final launch. Handoff: LAUNCH-CODEX150-VISUAL-PASS-HANDOFF.md.

CODEX-151: 24 public Trainer/Achievement states +16 nested staff record cases; mobile chip/ribbon/journal targets, public-versus-owner headings and friendly staff Pokémon ball/gender labels corrected. Final107suites/build pass. Exact4runtime publication pending; no hosted RPC/player/backend/provider/APP change. See LAUNCH-CODEX151-DEEPER-PROFILES.md.

CODEX-151 VERIFIED:mainee54b763/Pages39954449578success;100monitored+4versioned sources match (one transient503 resolved). CODEX-152:36populated Pass/catalog/research cases;accurate supply cooldown/claimed labels,single check timestamp,44px research target;108suites/build pass. Exact2runtime publication pending;no hosted RPC/backend/provider/player/APP change.

CODEX-152 VERIFIED:maina05560bc/Pages39955618965success;100monitored+2versioned sources match. CODEX-153:32Helpdesk role/state/dialog widths;long reference caused1413pxcard in375pxviewport despite page-level width pass;component shrink/wrap corrected and human status/subcategory labels aligned.108suites/build pass. Exact2runtime publication pending;no hosted ticket/staff/RPC/backend/provider/APP action.

CODEX-153 VERIFIED:maine45f7adc/Pages39957022394success;100monitored+2versioned sources match. CODEX-154:24component-bound cases,Trainer directory auto-track clipping corrected;108suites/build/recovery20pass. Separate local-only Mart editor design/plan and8review widths prepared,not connected/published. Runtime CSS-only publication pending;new editor workflow needs owner design decision.


CODEX-154 VERIFIED:CSS-only main927b2f48/Pages39958731032success;100monitored+1versioned source match. Owner approved Mart design/local implementation. CODEX-155 local candidate complete:existing single-reward PokeCoin products,search/filter,preview,change review,field preservation,session reset,one-shot writes and uncertain-receipt reload.109suites/20measured REAL DOM width cases/build31/466/recovery20 pass. No hosted save or155publication;exact4runtime files held for review. See LAUNCH-CODEX155-LOCAL-MART-EDITOR.md. Sora NO;Twinkle NO;PlayTester unchanged;no SQL/provider/gameplay/spending/APP/final launch.


CODEX-155 PUBLISHED by explicit owner approval:exact4runtime files main4dad4117/Pages39964649209success;100monitored+4versioned sources match;mainbuild31/466. Hosted restored EmailQA viewer correctly denied,zero Mart forms/save controls. Acceptance caveat:legacy signed-out tab was stale;shared navigation can invoke notice acknowledgement on session restoration. No catalog save;automatic notice response/data effects not inspected;further hosted navigation stopped. Owner editor/save acceptance remains unproven. See LAUNCH-CODEX155-LOCAL-MART-EDITOR.md and evidence/codex155-publication.json.
