# PC item transfer dialog

The item box now opens a visual Bag picker from **Transfer Items from My Bag**. Sprite cards select a stack, with Bag/PC counts, quantity shortcuts and a transfer button alongside it. The stored-item inspector uses the same compact layout for withdrawals. The separate move-to-slot mode and its layout-shifting instructions are removed; immediate drag-and-drop arrangement remains.

The native dialog contains keyboard focus, closes with Escape, Close or an outside click when idle, and locks background scrolling. In-dialog feedback reserves space so completion messages do not move controls. Unconfirmed transfers close the dialog and expose the existing same-request retry. Capacity, waiting rewards, account checks, receipts and serialized arrangement saves are unchanged.

Validation: 173 regression suites and build pass; fictional rendered deposit and withdrawal update both counts; Escape restores focus; 320/390/768/1024 dialog layouts have no horizontal overflow and lock the page. Existing sprite DOM identity, rapid arrangement queue, stale read and uncertain retry tests pass. No live transfer or SQL was performed. Pokémon storage code is untouched.

Publication scope: js/pc-items.js and css/pc-items.css only. Routine frontend/user-requested presentation authorization. Rollback is restoring those two files from production parent df81f273.
