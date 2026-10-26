# Special product drafts

Owner-authorized native Admin Hub migration. Adds typed create-only workflows for hidden Twitch inventory rewards and avatar collections. Existing single-item creation remains available. Existing generic product save becomes edit-only: it locks an existing product and refuses a missing code before its former upsert. No database function calls that generic saver to create products; the native creators use unique inserts.

The new read/write endpoints require the existing owner/admin helper and Auth identity. Requests have actor-scoped immutable receipts, staff reasons, SKU/category/style locks and private RLS audit records. No anonymous execution or direct browser/service table grants. Master Balls, Pokémon and random rewards cannot be purchased through this creator; existing paid-delivery configuration stays unchanged.

Avatar creation accepts only hidden, unassigned styles not referenced by profiles, with exact revisions. New collection keys cannot reuse product/style/group keys or any trainer's existing collection entitlement. Selected styles and products stay hidden. Creating a draft changes no ownership, balance, inventory, profile or existing product. Normal publication through Products is a later explicit staff action.

Eleven real isolated SQL groups pass, including actual frontend-generated creation and later edit payloads, existing helper/trigger checks, permission denial, duplicate/replay refusal, style/owned-pack protection, competing SKU/style connections and exact rollback. Rollback disables the new handlers and restores the exact original generic saver without removing any product, style or audit. It restores the former creation route, so apply it only after source review; it is not automatic.

Use the exact guarded LF packets. No hosted product read/create/save, grant, purchase, upload or provider activation was used for acceptance.
