# CODEX-246 — Compact Configuration and Trainer XP

Status: locally complete; scoped publication next under the owner's full Hub migration/go-live direction.

Configuration now uses focused tabs for PokéCoin rewards, Pass rewards, capture limits and Trainer XP. The XP editor migrates the existing four controls: first-level XP cost, level-up curve, encounter participation XP and capture XP. It uses the existing read/save contracts and permissions, sends only changed approved keys, preserves unknown settings, and never exposes the prohibited trainer-level catch bonus. Nothing is loaded or saved through the new tool until staff explicitly loads it.

Review shows exact before/after values and explains that existing player XP is not rewritten. Session changes clear stale results; saves are single-flight, uncertain receipts require reload, and unknown/missing settings never become invented defaults. Existing server configuration does not provide compare-and-swap locking; the review explains this limit.

Service Desk no longer sends staff to the retired account coin/removal tools or old Oak QA. Trainer corrections and gifts point to the native Trainer records. Remaining Director, advanced capture/supply and System migration is still in progress; this slice does not claim completion of the entire Hub.

Validation:134 suites/build pass; four rendered widths320/390/768/1024 fit with all four XP controls. Native Escape preserves a draft and restores Review focus; fictional save acknowledgement disables repeat submission. Adapter tests cover strict fields, ranges, partial patches, account switches, late replies and uncertain writes. No hosted settings read/save, SQL, provider, player action or APP stamp.

Publication scope:admin-next.html,css/admin-config.css,js/admin-next.js,js/admin-next-progression.js. Private exact frontend rollback is tested;rollback removes only this interface and does not change stored configuration.
