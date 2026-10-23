# Trainer Pokémon roster — next Admin Hub slice

CODEX-173 proposal only. No application implementation, SQL, production reads of trainer records, or publication is included.

The current installed private.admin_account_json returns at most40 currently held catches ordered by caught_at. public.admin_user_account delegates to that serializer after private.require_hub. Catalog-only inspection found no existing paginated staff Pokémon roster endpoint. A50-Pokémon gift can exceed the current inspection window. This is an inspection limitation, not evidence of a failed gift.

Proposed workflow: replace the latest40-only Pokémon pane with a read-only paginated roster. Keep the existing trainer record, name/nickname/dex search, a GenerationI selector that expands only with enabled reference data, and existing stored-stat inspector. Show current page/range and explicit empty/loading/error states. Reload discards paging state; clearly disclose that ownership can change while browsing. No box editing, grants, removals, trades, locks/favorites edits, exports or bulk mutations.

Use one bounded staff read contract with up to40 rows per page, deterministic server ordering/continuation, and target ID pinned to each request. Search must run across all current holdings rather than just the downloaded page. Preserve existing staff visibility through private.require_hub; no additional permission granted. Return only the existing Pokémon identity/stat projection, adding only required roster metadata. No email/Auth/provider/credential fields. Do not reuse a player endpoint by substituting identities. Missing stats remain unavailable. Inspect nullability/indexes before choosing a cursor; test timestamp ties, changing ownership and large rosters. No perpetual total/count accuracy or snapshot consistency claim.

Local design: design-reset/trainer-roster-review.html uses six fictional specimens, three-per-page demonstration, name/nickname/dex search and a read-only detail dialog. No Auth, transport, persistence, or external connections. Actual implementation would reuse existing renderers and stat formatters rather than those fictional placeholders.

Requested next authorization,when reviewed: design plus local implementation/tests only, including preparation of an additive read-only SQL contract and guarded rollback on fictional data. Production SQL installation and frontend publication remain separate decisions. No live staff report/roster call or hosted test is included. Validate ordinary/anonymous denial, existing staff parity, target switch/logout/stale replies, paging/search across more than40 rows, duplicate timestamps, missing stats, long names, keyboard/dialog focus, narrow layout and no writes. Existing account serializer/legacy admin files stay unchanged until exact packet review.

This is a major new read workflow outside CODEX-78 routine maintenance; do not silently implement it under the Mart search fix.

Visual preparation:fictional design inspected at320/390/768/1280 iframe CSS widths;phone layouts stack,tablet/desktop show three sample cards. Local Next advances3→6,nickname Cloud finds Eevee across the sample roster,details show unavailable fields honestly,and Escape restores Inspect Eevee focus. This is a standalone design review,not actual device or implemented server paging acceptance.

Catalog fingerprints at review:public.admin_user_account b873ae8652672154805420d069d0065b;private.admin_account_json b4a01359724baa0cd3f82a7c645af1ae. No public staff roster endpoint found by name inventory;no claim that every possible internal function was audited.
