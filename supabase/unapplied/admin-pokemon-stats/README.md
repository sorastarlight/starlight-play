# Admin Pokémon stored stats

Read-only enrichment of the existing staff account contract. No new public RPC, specimen updates, generation, backfill, or stat editing. Installation and rollback pin the current helper definition. Existing public staff gate and execute ACL remain unchanged.

`battleData` contains stored IVs, EVs, AVs, HP, moves, nature and ability; nulls remain null. New reference names match the specimen's own content build. Legacy move names are a fallback only when structured slots are absent. Derived Attack/Defense totals are not invented or calculated in the browser.
