# CODEX-256 — Audited expired trade hold repair

Status: LIVE. Migration20261025234842;main54e3b3d83038a2e25342b701625323535bbb815f;Pages40246446510success. All four installed definitions/ACLs match tested candidates;correction audit0.100 monitored and three changed versioned sources match. No actual hold or account repair was invoked.

The old Clear Lock directly cleared a trainer's personal locked flag and transaction fields. A local fictional protected-account case reproduced this. Its replacement is native Trainers / Corrections / Trade holds. Staff inspect a specific held specimen, see whether it is eligible, add a reason and review the exact repair. An active listing/offer/direct request, a processing exchange even after expiry, a future received cooldown or a protected account refuses the action. Only the expired transaction reservation/timer can change; personal lock/favorite, ownership, stats, balances and rewards remain unchanged.

The existing correction request receipt, snapshot revision, immediate specimen/profile locks and full private before/after archive protect the repair. The old unaudited direct unlock refuses before writes. No new staff role or broader authority is added. The inventory inspector's stale Service Desk handoff now points to native Corrections.

Validation:140 regression suites;11 SQL groups on schema-only PostgreSQL17 with fictional users and actual GTS/direct creation. Exact row comparison proves only the two trade-hold fields change. Protected/staff denial, future cooldown, changed reservation, processing trade, idempotency and guarded rollback pass. Twelve responsive/error/protected layouts fit320/390/768/1024. Local review/cancel, disabled active-trade state, fake acknowledgement and status focus pass. No production hold, trade, account, notice or reward action was invoked.

Runtime:css/admin-corrections.css,js/admin-trainer-corrections.js,js/admin-next-record.js. SQL recovery:supabase/unapplied/audited-trade-hold-repairs/README.md. Rollback retains data but restores the known unsafe old route and needs security review.
