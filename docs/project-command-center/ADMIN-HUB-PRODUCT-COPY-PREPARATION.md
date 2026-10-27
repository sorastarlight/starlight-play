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
