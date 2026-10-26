# Native shop categories

The primary Hub now creates hidden Shop items, Twitch rewards and Avatar collections categories and edits names, descriptions and visibility across all five existing category types, including system categories. Creation does not duplicate the special Pass or automatic Poké Ball categories. The compact list/editor layout replaces the old editor handoff and redundant preview.

The existing `admin_store_save_category(jsonb)` already supports these operations. There is no SQL migration or new permission. Updates send only the pinned ID/code and the three presentation fields, preserving type, system flag, icon, sort and extra metadata. New categories use a unique code and always start hidden. The client checks the returned identity and fields, refuses uncertain retries and clears drafts on account changes.

Local evidence: 154 regression suites; five real schema-only SQL check groups covering role denial, three create types, duplicate codes, all ten kind/system combinations, preserved metadata and unchanged product/profile/economy state; 44 rendered responsive states at 390/600/900/1280 widths with no horizontal overflow or injected markup. Full disconnected Hub routing, keyboard Escape/focus restoration, fictional create receipt and account-switch clearing passed. Guarded three-file frontend rollback passed. The temporary PostgreSQL runtime was stopped and removed; the original reviewed schema archive was unchanged.

Publication scope is exactly `admin-next.html`, `js/admin-next-floors.js`, and `css/admin-floors.css`. Private evidence and rollback are outside Git in `security/codex270`. Recovery inventory remains 58 exact files and APP remains `20261008-rc133`. No authenticated hosted navigation, category creation/update, product action or destructive cleanup is included.

Hosted source contracts rechecked before publication: category saver `2acddf09c0a18a55363e34aa67095f69`, catalog read `6c63ea0f5135ea06637e5e2a426c5dc9`, product saver `df64521c901d1410d0105378a2f1bdb3`.
