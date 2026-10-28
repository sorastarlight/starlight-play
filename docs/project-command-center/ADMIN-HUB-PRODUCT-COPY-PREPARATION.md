# Mart product copy — prepared design, not activated

October 27 source review. Creating a fresh draft is available in the native Hub, but does not replace copying a product. The legacy duplicate function is not wired into the new Hub.

## Proposed staff flow

Select a product, choose **Make a copy**, enter a new product name and code, then review the contents and price. The result starts hidden, unfeatured and in draft status. The original product and previous purchases remain unchanged. Reload the catalogue to edit or publish the new draft through the existing editor. Do not reuse an existing code or silently overwrite it.

For ordinary PokéCoin items and bundles, preserve the category, description, price, reward quantities, artwork and additional metadata. Only the new identity, draft/publication flags and adjacent sort position change. Preserve unknown metadata rather than silently deleting it; reject unreviewed reward types, mixed currency, Master Balls and malformed source data.

The source must be checked again on the server against the reviewed fingerprint, with a locked source/category and atomic new-code insert. Use an actor-scoped request receipt so a lost response cannot create several drafts. Retrying the same exact request returns its receipt; reusing its ID for different contents rejects. Do not automatically retry a write from the browser. These are proposed server requirements, not installed guarantees.

## Cases that cannot be copied blindly

| Product type | Required handling |
| --- | --- |
| Ordinary PokéCoin item or bundle | Independent hidden copy of current contents; strict source/reward checks and no overwrite. First proposed scope. |
| Twitch Bits product | The existing copy preserves exact Power-Up titles. A second listing with those titles is not an independent Twitch mapping. Proposed copy must clear its titles and require new mappings before publication; no provider action or activation is included. |
| Trainer appearance collection | Existing copying retains the same collection reference and appearance IDs. Saving the copied listing calls the same collection synchronizer. It is a second listing for shared collection data, not independent copies of appearances. Decide whether to deliberately reuse one collection or register separate appearance records before adding this tool. Do not silently reassign appearances or trainer ownership. |
| Master Ball placeholder, system category or invalid/empty rewards | Reject; copying must not create an alternate route around existing sale rules. |

Source-only metadata inspected the current duplicate, save, product-create and staff-edit helper definitions. No product rows were queried, no application function was invoked and no product was copied. Private source baselines remain outside Git.

## Local evidence and limits

A disconnected copy-planning model in `C:\Users\FET\AppData\Local\PokemonStreamLink\security\hub-product-copy` passed 21 fictional checks: deep preservation, hidden draft flags, unchanged source, price/quantity/code validation, source fingerprint changes and rejection of linked collections, Twitch titles, unknown rewards and Master Balls. This is **not** an SQL install, concurrency test, frontend implementation or production receipt test. No new endpoint/installation packet is claimed complete. The model hash is a local planning assertion, not an installed RPC revision contract; an actual server read must issue the fingerprint used by the server write.

The existing actual native Mart editor was also rendered at320/390/768/1280 with no horizontal overflow. A visible single-reward quantity edit from5to9 correctly reached its before/after review and survived Escape with focus restored; no save was sent. A local account transition then cleared the catalogue and editor, leaving reload disabled. An incomplete extracted form mock initially suggested a quantity bug, but real DOM inspection showed the current visible reward control already synchronizes correctly. The speculative patch was discarded before commit/publication. No runtime change was required for that path.

The next important review is the copy scope and collection semantics. Keep the old entries and destructive cleanup held while the remaining parity work continues. No production SQL, permission change, catalog save, provider call, player grant or APP stamp is authorized by this preparation.

## October 28 local component preparation

An unreferenced ordinary-product copy component is now prepared in js/admin-product-copy.js and css/admin-product-copy.css. It shows the source items beside a name/code/reason form and an explicit hidden-draft review. Review and Back perform no writes. A strict future server-envelope contract requires an actor and server-issued revision; the client sends only the reviewed source identity, revision, new identity, reason and request receipt ID. Ambiguous responses retain the same frozen request for an explicit retry; stale sources require reloading, duplicate codes return to editing, and revoked access clears the component. Epoch guards discard late account responses.

34 fictional JavaScript groups,194 selected regression suites and build validation pass. Real rendered local fixtures cover eight states at320/390/768/1280 (32 cases), with no horizontal page overflow, broken item images or raw private error text. Review/Back preserved edits and focus without a fictional write; a held fictional save response remained cleared after an account transition. Private evidence: hub-product-copy/copy-layouts.json,copy-review.png and copy-late-account.json. Fixture callbacks are fictional and CSP blocks network connections.

This is a local UI/controller prototype only. No HTML import, real transport, server-issued revision endpoint, atomic create function, SQL install packet, production concurrency test or hosted copy is complete. The server must still preserve unknown metadata and enforce the locked fingerprint, actor receipt and unique-code rules. Storage upgrades, currency rewards, Master Balls and linked appearance/Bits products are excluded from this first component. Do not publish or describe this as a working native copy tool.

## Proposed transport boundary, local only

The unreferenced component now includes an injectable adapter for proposed admin_product_copy_options/admin_product_copy_create endpoints. Neither endpoint exists as part of this work. Constructing the adapter makes no calls. Each explicit operation checks the expected staff identity, current SDK session and workspace access before admission and after success or failure. Old-account successes and failures are rejected; outgoing writes are copied before awaiting session checks, accept only the seven reviewed request fields, and require the reviewed actor. Read replies must match that actor and pass the strict item envelope; unrelated source metadata is stripped. No retry is automatic.

31 fictional adapter/session cases pass, including both delayed-success and delayed-error account changes, rejected request-field injection, wrong-session refusal with zero transport calls, denied-source sanitization, immutable admitted payload and revoked-access errors.195 selected suites/build pass. These tests verify browser-side routing only: they do not cancel a server write already admitted, establish production staff authority, implement a server receipt, or prove the future SQL endpoints. Server authorization and actor/receipt checks remain mandatory. The component still has no page import or live transport.

## Private SQL candidate rehearsal

A private three-function candidate now implements the options projection and hidden-copy transaction using the existing staff-edit gate and draft receipt table. Two metadata-only catalog queries inspected table columns/constraints and existing reward helpers; no hosted product rows or application endpoints were read. The server issues a revision over the complete source/category rows, locks and checks both before insertion, preserves unknown metadata on the server, and changes only the new identity, hidden/unfeatured/draft flags and adjacent sort position. Linked metadata, system/Bits categories, unsupported rewards and sort overflow reject.

39 REAL LOCAL PostgreSQL17 groups pass against catalog-shaped fixture tables and constraints with **fictional staff and reward-catalogue helpers**. They cover metadata preservation, source/category drift, unsupported types/quantities, denied roles, exact receipt replay, altered-request rejection, nonblocking duplicate-request/code races on two connections, concurrent source-edit refusal, receipt failure rolling back the copy, and successful retry after later source drift. Initial local SQL name ambiguities were corrected before the passing run. Temporary local clusters were stopped and deleted.

Private candidate/evidence: hub-product-copy/COPY-CANDIDATE.sql,copy-pg-local.cjs,copy-pg-evidence.json and copy-candidate-sha256.json. This is **not ready for activation**: complete dependency/authority baselines,actual reward-helper closure rehearsal,guarded install/rollback and native Hub integration are still unfinished. Existing production functions and product rows remain unchanged. No backend SQL was published to Git or installed.

## Reward helper and permission-wrapper closure

The next source-only review captured eight existing function/authority baselines and six relation column/constraint/authority contracts. The reward catalogue is a view, not a writable table; its actual definition was retained privately. No catalogue rows, role assignments, Auth identities or application functions were queried.

The disposable PostgreSQL rehearsal now also compiles the actual reward-catalogue view, shop-reward helper, immutable Evolution-item key helper, require_hub and require_staff_edit wrappers. Six additional groups verify core rewards, enabled registered Balls and Evolution items, disabled Ball refusal, existing Master Ball/storage exclusions, and moderator refusal even when Hub access is allowed. **45 groups total pass**: the original39 use fictional gate/catalogue callbacks; the additional6 use actual copied wrappers/view/helper definitions with fictional role lookup and reference rows. This remains local evidence, not production role/provider acceptance. The local cluster was stopped and deleted.

Next: finish complete source/authority guard generation and replayable install/rollback, then native Hub integration with explicit reload and account clearing. The stored relation metadata must distinguish the reward view from tables and guard its definition. Do not activate this candidate or reuse the old unguarded duplicate mutation.

## Guarded recovery preparation

Private INSTALL/ROLLBACK candidates now use nine existing function source/authority baselines,six relation contracts and the actual reward view definition. Installation refuses any pre-existing copy endpoint/helper name. Rollback additionally verifies the exact three installed definitions/permissions and refuses extra overloads; it drops only those new functions, retaining created product drafts and request receipts. No existing SQL function or player record is replaced.

The guard generator passed eight additional local PostgreSQL cases, bringing the rehearsal to **53 groups**. Forward/reverse replay preserves draft and receipt counts; already-installed, permission, column, overload, source and view-definition drift all refuse. These use fixture baselines through the same generator. The actual production-baseline pair has **not** been replayed against a complete matching source/schema closure; it is not ready to install. Private review: hub-product-copy/RECOVERY-README.md. Native Hub integration remains unfinished.

## Native Hub integration, feature branch only

The local feature branch now imports the copy component and mounts **Make a copy** from a selected ordinary PokéCoin product. Unsaved product edits disable copying and explain how to proceed. The modal reads options only after that explicit action, then reviews and creates a hidden draft through the proposed dedicated endpoints. The shell uses literal endpoint calls, closes on lost access or leaving Items & Economy, clears late replies, and restores the opener after ordinary dismissal. Escape/backdrop dismissal is blocked during a submitted save; an uncertain result retains its explicit same-request retry. Success asks staff to reload the catalogue; it does not automatically call a catalogue/report endpoint.

195 selected regression suites/build pass. Three extracted-source fixtures were reconciled with the new hook/reset dependency; existing gate assertions remain enforced. REAL DOM fixtures using the actual Hub cover16responsive states (editing/review/success/uncertain at320/390/768/1280), with no horizontal page overflow or raw private error text. The copy read count remains zero on initial catalogue selection; an explicit click makes one read. Unsaved edits disable/re-enable the action; Escape restores the opener with zero fictional writes. A cancelled held read followed by an ordinary-account switch and released response leaves zero dialogs/editors and the staff area hidden. Private screenshots/layout/account evidence are retained. Callbacks and products are fictional; no live copy is certified.

**Do not publish the current five runtime files** (admin-next.html,js/admin-next.js,js/admin-next-mart.js,js/admin-product-copy.js,css/admin-product-copy.css) under routine maintenance. They activate a new privileged workflow and require the paired SQL/recovery decision after full production-baseline replay is complete. Earlier descriptions of an unreferenced component are historical; production remains unchanged.
