# CODEX-243 — ticket workspace and native product editing

Owner October25 direction: remove disclosure-driven tickets and legacy-editor handoffs, make the new Hub primary, implement and deploy replacements/migration. This supersedes local-only preview presentation. Recoverable migration remains preferred; this slice requires no data deletion or backend mutation.

## Implemented

Service Desk filters remain visible. Ticket conversation/reply sits beside status, assignment, priority, account help and activity. Ticket and recovery dialog no longer use details/summary disclosures. Reply template explicitly targets the reply textarea after layout movement. Staff account menu opens admin-next.html. Header no longer calls this a preview. Obsolete Operations/Analytics/Mart handoff links removed.

Mart editor now handles existing multi-reward products, Bits amount/title fields and avatar appearances through the existing admin_store_save_item endpoint. Editable bundle quantities render individually with before/after review. Unknown product metadata is retained rather than silently discarded. Missing/invalid catalog structures fail closed. Master Balls remain excluded from shop products. No product or purchase history was removed.

## Evidence

LOCAL130 suites pass; build31HTML/483references, APP unchanged. Guarded six-file rollback reproduces baseline. REAL LOCAL DOM bundle quantity review shows only the changed quantity; no save invoked. Staff ticket320/390/768/1024 all fit, internal note remains distinct, literal malicious-looking text stays escaped, zero fictional writes. Source-only production inspection: admin_store_save_item md5 27b621632ab941a950ee405132df05d5 matches inspected implementation; ACL unchanged. No hosted application reads/saves/notices, real emails, grants or gameplay.

## Remaining full migration

This is not completion of the full redesign. Typed all-item Pass delivery/Secret Gift server concealment, direct trainer correction endpoints, broader product creation and remaining System/Encounter workflows still require implementation and validation. Legacy data cleanup has not run. No claim that every old product has been read or migrated. Publication evidence to follow.
