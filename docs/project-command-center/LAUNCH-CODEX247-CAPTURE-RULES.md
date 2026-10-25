# CODEX-247 — Capture rules migration

Status: locally complete; scoped publication next under the owner's full Hub migration and go-live direction.

Configuration gains a native Capture rules tool with focused views for three capture multipliers, eight species chance tiers and seven Honey participation tiers. Chances display as percentages and convert exactly to stored probabilities. Tier boundaries and unrelated fields stay unchanged. The separate chance-limit editor remains available. Staff loads settings explicitly and reviews all changed values, including edits across views, before saving once.

The existing admin_capture_overview/admin_capture_save_balance contracts and permissions are preserved. Unknown tier shapes refuse editing; missing data never receives invented defaults. Account changes discard stale replies; uncertain saves are locked until an explicit reload. This existing server save has no compare-and-swap contract; the review states that limit.

Validation:135 suites/build pass. Twelve real rendered group/width cases fit (320/390/768/1024 × three groups). Full18 fields are present across the views. A fictional34%→35% edit survives switching to Honey and reviews/saves exactly; repeat save is disabled. Strict patch tests preserve all thresholds and unrelated timezone/critical-capture/chance-limit fields. No SQL or hosted capture save, encounter, reward or APP stamp.

A focused read of stored capture configuration was used to confirm the current tier shape. Source review found the old Pinap control writes a fallback which economy settings can override; it is not copied as a misleading effective reward control. Pinap belongs in the remaining Economy extension after its effective setting is traced.

Publication scope:admin-next.html,css/admin-config.css,js/admin-next.js,js/admin-next-capture-rules.js. Exact frontend rollback tested; no stored settings are modified by publication or rollback. Remaining timing, item supply, Director and System tools are still being migrated.
