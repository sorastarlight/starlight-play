# Team editor ordering stability

October 27, 2026. Owner reported team slots briefly showing different orders while adding Pokémon.

Two confirmed frontend defects: the shared team handler accepted overlapping writes while a previous save was unresolved; My Account's save callback refreshed an obsolete contextual preview selector instead of the current live stage/count.

The shared handler now holds one write at a time, disables mutation controls while pending, restores original disabled states after success/failure, and reads current team state when a picker selection completes. It rejects repeated selections of a Pokémon already present. It retains the confirmed display until the existing save completes; it does not optimistically invent a saved order.

My Account applies only the returned team to its card, preserving unrelated fields. It updates team slots, current stage, count and saved-team snapshot together. Stage refreshes do not replay the staggered party entrance animation. No changes to server permissions, ownership checks, six-member limit or saved team records were made.

LOCAL: old-source delayed-save handler test reproduces three concurrent writes where one is expected. Corrected actual-source tests cover pending edits, sequential ordering, failed-save retry, picker state changes, duplicate selection, stage/count/slot synchronization and unrelated card preservation. All188 suites and build pass. Rendered actual controllers/renderers with fictional Pokémon and a manually delayed local save show matching stage/slot order after reorder and sixth-member add; controls stay disabled while pending. No live team save or hosted account/application call.

Runtime scope: js/team.js and js/settings.js only. Existing main source is the frontend rollback reference; no data restore is necessary. APP unchanged.

TEAM-EDITOR-STABILITY LIVE:main61c6f5d205fca886f2b7cb67221084480266a1d1;Pages40569172976 SUCCESS;2/2hosted source matches.188suites/build;local actual-handler delayed-write/failure/picker tests and rendered reorder/add synchronized stage/slots/count. Existing team records untouched;no live team save,hosted application/notice call,SQL,permissionchange orAPPstamp.
