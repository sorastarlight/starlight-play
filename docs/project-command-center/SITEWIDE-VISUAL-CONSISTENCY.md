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
|Populated public-page and expanded state consistency|Continue inspection|PC,inventory,Mart,Oak,progression,Trainer,Helpdesk;use actual presenters with fictional data,not live mutations|
|Search term consistency|Continue inspection|Check names,dex numbers,clear/empty/error states against actual supported behavior;never advertise unsupported filters|
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
