# October27 Admin entry parity checkpoint

This is a source inventory, not approval to retire old entry pages or proof that every control is equivalent.

The scripts actually loaded by admin.html/admin-store.html contain87 literal admin RPC names; those loaded by admin-next.html contain65. Fifty old names are absent from the native bundle. Name differences alone do not establish missing functionality: several native workflows intentionally use newer reviewed wrappers.

Verified replacement examples:

| Older surface | Native implementation |
|---|---|
| Individual encounter commands/live dashboard | admin-next-operations.js uses admin_hub_operations_read/command with revision review |
| Special Event legacy command | admin-special-events.js uses admin_hub_events_read/command |
| Pass save function | admin-pass-editor.js uses admin_pass_rewards_read/save with request/revision fields |
| Individual coin/item correction functions | admin-trainer-corrections.js uses admin_trainer_corrections_read/correction_write |
| Connection/dashboard projections | admin-next-providers.js uses admin_system_connections_read and admin_hub_operations_read |

Remaining deliberate gaps to account for before entry retirement: product/category deletion and duplication have no matching native editor control in the inspected Mart modules. Deletion stays held with the exact cleanup scope; do not silently recreate old QA resets or self-grant tools. Creating a new hidden draft is available, but is not the same as duplicating every product property. Complete the remaining feature-by-feature inventory before claiming full parity.

Static HTML inspection:32root pages have no duplicate static id attributes. This does not certify dynamically rendered markup or real screen-reader behavior. No runtime files, SQL, provider settings or player data changed. Backup check remains scheduled for after07:44UTC;hard stop13:18UTC.
