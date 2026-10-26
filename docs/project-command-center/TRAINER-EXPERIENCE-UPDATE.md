# Trainer experience update — October 26

## Implemented
- Native modal backdrops dismiss on deliberate left click, respecting cancel handlers and ignoring inside clicks, right clicks and drags from content. Existing scroll lock remains.
- Trainer Inventory contains the existing audited direct-correction controls; Corrections is no longer a separate tab.
- Pokémon inspector shows calculated battle values alongside IV/EV, public Pokémon ID and Original Trainer identity. Values reuse the existing canonical catch formatter. Stat editing remains read-only; the misleading disabled button is removed.
- Trainer dropdown shows level and XP progress, plus Notifications and an unread indicator.
- Notifications combines recent own-account notices, successful gifts/supply deliveries, trade updates, public Service Desk replies and staff announcements. Read receipts are independent of celebration consumption. Internal notes, staff reasons and secret reward contents are excluded. Only existing owner/admin staff can publish an announcement, with reviewed content and request idempotency. No real announcement was sent.
- Mart cards use plus/minus and direct quantity entry with live cart feedback; coin warnings have reserved space. Details buttons removed, descriptions and featured text wrap. Collector copy and supplied Linking Cord sprite updated.
- Pass supplies are more compact and retain existing claim timing per the owner's explicit decision. Cooldown is not falsely labeled as a claimed calendar day. No missed-day history is fabricated.

## Database evidence
Installed 20261026122406_admin_battle_stats_display and 20261026123549_trainer_notifications. Exact source/ACL verified without invoking production application handlers. The stats helper hash is 3526446ff48d1ecb8f84079b3b2a2509; canonical formatter dependency unchanged. New notification tables are private, RLS enabled and have no direct browser grants. The three public notification functions require an authenticated user; publishing uses the existing staff-edit guard. Guarded rollback preserves read/announcement records.

## Validation
161 local/static regression suites, build validation, 21 isolated SQL groups against replayed schema with fictional records; rollback and tenant isolation/public-vs-internal Service Desk cases passed. REAL LOCAL BROWSER: quantities changed to1 and7 with feedback; product buttons aligned despite insufficient balance; Notifications marked fictional displayed messages read; backdrop dismissal worked and respected pending-save cancellation prevention. No hosted login, notices, application reads, purchases, gifts, claims, releases or protected-account mutations.

## Remaining
Berry type/rarity rebalance is separate from this presentation release: actual regional form types must reach the server formula, not only base Pokédex types. No berry mechanics/catalog change installed yet. Stat editing has no editor yet and needs a constrained audited design. Notifications currently displays the most recent100 entries; older pagination and status-only Service Desk updates remain future extensions. Broader physical-device and authenticated acceptance are not implied by local checks.

Publication: pending exact scoped main commit and hosted source verification. APP20261008-rc133 unchanged. Destructive cleanup remains held.

## Publication and availability follow-up
Main9d32f520, Pages40325593008success:all9files and6versioned requests match exact source. Follow-up found read-side Pass readiness omitted existing daily/weekly delivery receipts. Migration20261026125452 corrects display readiness and returns next/last claim timestamps;the claim function and timing remain unchanged. Source2148b9c29f8ce6ec27bd7ed07cc0f329 and unchanged ACL verified. Eight additional local SQL groups (29combined) cover elapsed cooldown with already-delivered period, future cooldown, first claim, inactive Pass and exact rollback;catalog/snapshot dependencies were fictional stubs in this local unit test. One-file timestamp display publication pending.
