# Avatar collection publication guard

Local reproduction confirmed that the native editor and existing server accepted an empty avatar collection as published. No purchase was invoked and an aggregate production inspection found none of the four current avatar products empty and published.

The editor and server now require at least one Trainer appearance before publishing a collection, including hidden published listings. Empty drafts remain editable. The server normalizes absent/malformed appearance lists as before and rejects publication before changing any product or style. This is one narrow validation correction; purchase logic, existing products and staff access remain unchanged.

Validation: 155 regression suites; seven actual isolated SQL check groups covering eight invalid publication states, staff denial, valid visible/hidden publication, empty draft editing, unchanged rows/metadata/ACLs, exact rollback and drift refusal; four rendered responsive warning states with no overflow. The client displayed the warning without making a save call. Temporary PostgreSQL stopped/removed; original archive unchanged.

Migration `20261026071051` installed source hash `b0201410e366712fe7eda1b52b255475`; prior source `df64521c901d1410d0105378a2f1bdb3`. Post-install complete product/style/category digests, function ACL and staff/purchase/cart source contracts matched the preflight. No hosted mutation handler was called. The guarded recovery pair is in `supabase/unapplied/hub-avatar-publication`, with 60 exact recovery files overall.

Frontend publication is limited to `js/admin-next-mart.js`. APP remains `20261008-rc133`. Private reproduction, actual local SQL results, rendered warning and rollback are retained outside Git in `security/codex271`. Destructive cleanup remains held for exact owner review.
