# CODEX-201 — Local existing Mart floor editor

Owner approved CODEX-200 design and local implementation only. This slice is complete locally; production publication and all live catalog calls/saves remain excluded. Main remains ceefc26a / Pages40110768347. APP stays20261008-rc133.

## Contract inspection

Catalog-only SELECT retrieved admin_store_get, admin_store_save_category and four permission helpers. Definitions remain private in LOCALAPPDATA/PokemonStreamLink/security/codex201/catalog.json; safe hashes/attributes are in evidence/codex201-floor-contracts.json. The read endpoint is stable and consists of staff-gated catalog SELECTs. Save retains existing owner/admin permission through require_staff_edit. Defaulted helper signature is play_staff_role(uuid). No application endpoint was invoked.

The installed UPDATE preserves omitted columns. The editor therefore submits only the pinned existing UUID/key plus name, blurb and visible, preserving unrelated metadata by omission rather than resending a stale full row. The existing key supplies the save function's validation path but is not changed by its UPDATE. Missing IDs can enter the server's create branch, so the adapter and controller require an existing UUID; no create affordance or payload path is exposed. A removed/mismatched row cannot be accepted as a confirmed save receipt.

Current Supabase RPC documentation/changelog were checked; no SDK/package/configuration change was made. References:[RPC](https://supabase.com/docs/reference/javascript/rpc),[changelog](https://supabase.com/changelog.md). No new API/table, grant, SQL, Auth or provider setting is introduced.

## Local behavior

The existing product editor remains intact. The floor workspace is mounted closed and loads through an explicit Load floor details button; the product editor's separate existing catalog read behavior is unchanged. Only existing kind=coins, system=false rows with complete supported data are editable. System/Bits/Pass/other or malformed rows use the current-tool handoff. Frontend limits match the reviewed mock:120-character names and500-character descriptions; rows beyond these limits remain unsupported. Server permissions remain authoritative; staff read access does not confer owner/admin save access.

Search uses normalized name/description words. Preview shows the floor heading and catalog visibility. Confirmation compares only edited fields. Payloads cannot change identity, kind, icon, sort, extra/perks or products. Existing metadata is preserved by omission. No concurrent-edit guarantee is claimed; another staff edit to the same three fields can still be overwritten. Visibility is not advertised as a direct-purchase blocker.

The dedicated adapter allows only the two reviewed RPCs, validates narrow write arguments, and checks staff/session identity before and after transport. The generic read gateway is unchanged; Hub integration uses literal RPC names. Sign-out/account/access reset clears floor state and closes dialogs. Stale responses are ignored. Save is single-flight and never automatically retried. Both acknowledged and uncertain outcomes require a deliberate fresh read before editing again; reload confirmation explains that the previous save is not repeated. Returned catalog arrays outside categories are discarded, and save receipt data is used only to verify the matching category.

## Evidence and limits

-121/121 LOCAL/STATIC regression suites pass, including restricted payload/adapter calls, unsupported rows, unknown-field omission, identity changes, ambiguous/unavailable reads, denied/lost/mismatched receipts, single flight and stale reset behavior. Existing access-presentation fixture includes the new reset dependency and still verifies denial clearing.
-Actual isolated full-Hub rendering covers lazy floor workspace loading, protected-floor handoff, changed-field review, Escape focus restoration, exact one simulated save, acknowledgement lock, lost-receipt reload without a second write, duplicate-ID rejection, literal hostile labels with zero inserted images and no-match search.
-Eight long-text editor/dialog measurements at requested1280/768/390/320CSSpx (actual1265/753/375/305) show no page overflow; dialogs fit and tested visible buttons/text/search inputs are at least44px high. No physical-device or actual staff/backend acceptance is claimed.
-Build31HTML/475references passes. Protected legacy admin.html/js/admin-live.js unchanged. No real credential, protected account, catalog mutation, gameplay, spending or stamp.

Tracked evidence:codex201-regressions.json,codex201-browser-checks.json,codex201-floor-layouts.json,codex201-floor-contracts.json under evidence/. Private screenshot:LOCALAPPDATA/PokemonStreamLink/security/codex201/floor-review.png. Temporary fixture resources are closed after checks.

## Exact publication proposal and rollback

Runtime scope is four files:admin-next.html,js/admin-next.js,js/admin-next-floors.js,css/admin-floors.css. Normalized baseline/candidate hashes are in evidence/codex201-runtime-scope.json. A private frontend file fixture tested refusal on drift before writes, then restoration of the two existing files from baseline main and removal of the two new fixture files; evidence/codex201-rollback-check.json pins the tested manifest. This does not undo any real catalog edits.

Publication requires a separate owner decision because design/local approval excluded it. Proposed acceptance is deployed-source verification only, with the six inspected source/attribute contracts rechecked first and a stop on drift. No authenticated navigation, notices, hosted catalog read/save, SQL change or provider operation is proposed. Any later real floor save needs its own exact bounded scope.


CODEX-201 candidate afb2d0c85a9eac796ea101422b50d7a5e389f581 pushed to admin-hub-overhaul;exact4runtimepublication/source-only decision requested after local completion.121suites,8responsivecases,build31/475 and manifest-pinned guarded frontend rollback pass. Fixtures/tabs closed. Production remains ceefc26a;no new live catalog call,SQLchange,notice,Auth/provider/gameplay or APP action.


CODEX-201 explicit owner four-file publication approval received. All6catalog source/attribute contracts and all4runtime baseline/candidate hashes match. Only approved runtime files pushed to main4b54fb99d3a8fea8e84538373aa60ed5c945c51f. Pages40113221997 running; deployed-source acceptance pending. No authenticated navigation,notices,live catalog read/save,SQLchange,provider/gameplay or APP action.
