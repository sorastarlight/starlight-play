# CODEX-213 — proposed create-only Mart drafts

Design/source preparation only. The disconnected mock is [Create a Mart draft](design-reset/hub-mart-create-review.html). It uses fictional products, floors and availability; it does not connect to the site or implement a server create operation.

## Why this is a separate slice

The existing legacy New item form and admin_store_save_item share an upsert by SKU. A stale client-side availability check cannot guarantee a new product will not replace another entry. That is an existing save contract, not a claim that a hosted overwrite occurred. Existing editing is unchanged. Source/ACL hashes are in evidence/codex213-creation-source.json; raw definitions remain private.

## Proposed first scope

Create one hidden,unfeatured draft in an existing non-system PokéCoin floor. Staff enters public name,unique catalog code,short description,one inventory reward,quantity and whole PokéCoin price. Show friendly names,canonical item art,search and a complete review. The code is an internal immutable reference after creation;proposed new-code format is lower-case words separated by hyphens,up to40characters. Names up to120,description up to500;quantity1..2147483647,price0..2147483647. Zero price is explicit in review;it does not make a hidden draft purchasable.

Initial reward scope is the six existing core inventory keys:Berry,Honey,Poké Ball,Great Ball,Ultra Ball and Poké Radar,using current shared public labels. Coins,inventory space,multi-reward packs,Master Balls,Bits,avatars,evolution/dynamic extra items and custom uploads stay excluded. The mock has three example items only,not a final catalog. Resolve canonical art from existing validated mappings;stop rather than invent missing mappings. Initial publication state is always draft/hidden/not featured;use the already-migrated editor for any later publication decision. This does not authorize publishing a product.

## Proposed backend boundary for local preparation

Prepare a separate create-only function,not a change to the existing edit/upsert path. Preserve require_staff_edit's owner/admin check. Strictly whitelist the narrow payload and six inventory keys;validate positive integer quantity and nonnegative integer price;pin type=item,Bits=0,draft,hidden,not featured. Recheck/lock the target floor's existing non-system PokéCoin classification in the same transaction. Reject an existing SKU atomically through the unique insert boundary;never use ON CONFLICT DO UPDATE. Keep the current sort default100 rather than adding placement policy. Return a bounded receipt pinned to the created code and fields;no reward grant,inventory write or existing-product update.

Any new public function would need explicit EXECUTE scope matching the reviewed authenticated/service-role pattern and the existing owner/admin guard,with no anonymous grant. No new table,role,RLS policy,credential or provider setting is proposed. Before implementing locally,inspect complete helper,table constraint and trigger closure;stop on unexpected side effects. Local checks must include ordinary/nonstaff denial before writes,wrong floor/type,duplicate and concurrent same-code attempts,exact one insert,receipt/error/retry/reset behavior,install/rollback and drift refusal. A new endpoint is proposed only;none exists from this work.

The UI must explicitly load current data,fail closed on missing/ambiguous catalog,check identity before/after transport,send once and require reload after any save attempt. Do not automatically retry or claim a client-side concurrent-edit lock. Repeated creation with the same code must reject rather than overwrite. Do not broaden the generic RPC gateway.

## Evidence and decision

Catalog SELECT inspected the existing save and two selected helpers without querying product records or calling application functions. This is not a full dependency closure or SQL validation. Eight disconnected interaction cases and eight editor/review width states320/390/768/1024 pass with no measured horizontal overflow. No SDK,Auth,transport or persistence;CSP connect-src none. Temporary fixture server/tabs are closed. The mock's demo action changes only its in-memory set.

Important owner decision:approve this design and local implementation/testing,including preparation and isolated testing of the create-only endpoint plus guarded install/rollback packet. Production SQL installation,frontend publication,live reads/creation,uploads,deletion,Bits/provider work and APP stamp remain held. This new privileged workflow is outside CODEX-78;streamlink-project.mdc and CODEX-RUNNER.md require that design decision. It is an optional next overhaul slice,not automatically a launch blocker.

## Subsequent owner decision — October25

Owner approved this design and local implementation,including isolated endpoint/install/rollback preparation. Completed in [CODEX-215](LAUNCH-CODEX215-LOCAL-MART-CREATE.md). Earlier proposal language above is historical. Production SQL,publication and live creation remain separately held.
