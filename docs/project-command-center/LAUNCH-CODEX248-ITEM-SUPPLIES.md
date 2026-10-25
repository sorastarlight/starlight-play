# CODEX-248 — Item supplies migration

Status: locally complete; scoped publication next under the owner's full Hub migration/go-live direction.

Configuration gains native Item supplies: searchable reward entries beside one focused editor. Staff edits participation/capture drop chances (percentages), the event multiplier, or one existing entry's selection weight, quantity range and enabled state. Reviews identify the exact item and table. Each save targets one configuration patch or one entry; it does not combine independent writes into a misleading bulk success. Disabled entries remain disabled unless explicitly changed; paused tables stay paused.

Existing admin_loot_tables/admin_loot_save_config/admin_loot_save_entry permissions and contracts are retained. New UI refuses malformed ranges, missing data and unsupported keys. Master Balls cannot be enabled in drop tables; a focused production count confirms zero existing Master Ball entries, with no changes performed. Unknown configuration keys are not sent. Session changes and late replies are guarded, requests are single-flight, and unknown receipts require reload rather than retry. Existing server settings have no compare-and-swap lock; the confirmation explains this limit.

Validation:136 suites/build; eight rendered width/editor cases320/390/768/1024 with30 fictional reward entries; no page overflow. Native Escape preserves edits; a single fictional entry save retains disabled state, returns acknowledgement and blocks another save. Strict adapter, late-response, partial-patch, quantity/Master Ball and uncertain-receipt checks pass. Five-file frontend rollback is tested.

Also removes an unnecessary discard prompt when reloading capture rules after a completed or uncertain save. Reload still only reads and never repeats a save.

No production settings save, reward grant, encounter, SQL, provider or APP stamp. No claim that the entire Hub migration is complete: encounter timing, remaining economy settings, Director and System tools remain.
