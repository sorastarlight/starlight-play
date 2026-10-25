# Audited expired trade hold repair recovery

Replaces the old blind Clear Lock with one exact specimen correction under the existing staff edit/private audit/revision/receipt boundary. It only clears an expired reserved_trade_id/trade_locked_until pair without an active GTS listing/offer, direct request, processing trade or live cooldown. Personal locked/favorite flags and all other fields remain unchanged. Protected trainers are denied. The old unaudited admin_unlock_catch route refuses before writes; the native Corrections pane is its replacement.

Eleven isolated PostgreSQL groups reproduce the old unsafe behavior on a fictional protected account and validate the replacement against real GTS/direct request creation, expired-but-processing state, future cooldown, stale revision, exact before/after field equality, idempotent receipt, staff/protected denial and rollback.140 suites and12 rendered width/error/protected states pass. No real account/hold/trade mutation was run.

Rollback restores the exact three old public definitions and retains every specimen and audit record. It also restores the known unsafe blind unlock, so use only after explicit security review. It does not restore cleared holds or delete audit data. New private inspector remains inaccessible to browser roles. Frontend rollback is separately drift guarded.
