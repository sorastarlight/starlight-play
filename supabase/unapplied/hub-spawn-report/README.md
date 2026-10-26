# Read-only spawn report

Adds only admin_spawn_rules_read(). Existing staff permission;explicit authenticated grant,anonymous denied. Calls the current pure spawn helpers,not admin_overview(),which can settle due rounds. Shows effective server band/species weights and current eligibility with the real release boundary. No random roll or state/settings/player write.

Eight isolated SQL groups include executing the report in a PostgreSQL READ ONLY transaction,real recent-spawn suppression,zero-weight/special/future exclusions and rollback drift/ACL checks. Original schema-only archive unchanged;no application data import/production export. Rollback revokes browser execution;no data/configuration to reverse. Private evidence:C:/Users/FET/AppData/Local/PokemonStreamLink/security/codex261/ .
