# CODEX-245 — Direct trainer corrections

Status: LIVE. Migration20261025215533;production main36de40723fa035582382355ea7cf13b3eb0e1d7c;Pages40237781681 succeeded. 100 monitored and all five versioned changed sources match. All eight installed function definitions match the local candidate; private helpers deny browser execution, audit RLS is enabled, and correction history remains empty. No hosted correction or trainer mutation was invoked.

The Trainers workspace gains Corrections beside Gifts. Staff can set resulting PokéCoins, existing item and Evolution Candy quantities, and total inventory capacity. The Pokémon tool selects exact specimens, shows their stats, blocks locked/favorite/trading specimens and retains private originals and pointers when removing them. No normal release reward or progression credit is granted. Protected trainer accounts stay blocked.

The read/write pair uses staff-edit permissions, a reviewed account revision, atomic locks, exact request receipts, staff reasons and private before/after audit records. Capacity cannot discard occupied stock. Existing unlisted stock can decrease but cannot be newly created. The two old unaudited coin/removal RPCs are retired. GTS/direct-request ownership triggers serialize creation against correction removal.

Validation: 133 JavaScript suites and build validation pass. PostgreSQL 17 schema-only replay passes 17 correction groups, five trade-creation/race cases and five guarded rollback checks. It uses fictional users; no application/Auth data was imported and no hosted account action was run. Four rendered widths (320/390/768/1024) fit without page overflow or disclosure controls. Local browser selection, stat inspection, favorite denial, review/cancel and a fictional removal receipt were checked. Frontend five-file rollback passes. Full hosted correction and final trade workflows are not claimed as tested by this slice.

Review/recovery: supabase/unapplied/hub-trainer-corrections/README.md. SQL rollback disables the new browser endpoints and restores the original functions, retaining audit/recovery data. No automatic player-data reversal or deletion runs.
