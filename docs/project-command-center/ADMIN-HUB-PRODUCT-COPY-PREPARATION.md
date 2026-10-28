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
